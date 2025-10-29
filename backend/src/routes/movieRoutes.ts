import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import RankedMovie from '../models/movie/RankedMovie';
import FeedActivity from '../models/feed/FeedActivity';
import { Friendship } from '../models/friend/Friend';
import { sseService } from '../services/sse/sseService';
import {
  addMovie,
  compareMovies,
} from '../controllers/movieComparisionController';
import { startRerank } from '../controllers/rerankController';
import { getTmdbClient } from '../services/tmdb/tmdbClient';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/search', authenticate, asyncHandler(async (req, res) => {
  try {
    const query = String(req.query.query ?? '').trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
    }

    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'TMDB API key not configured' });
    }

    const tmdb = getTmdbClient();
    const { data } = await tmdb.get('/search/movie', {
      params: {
        query,
        include_adult: false,
        language: 'en-US',
        page: 1
      }
    });

    const includeCast = String(req.query.includeCast ?? 'false').toLowerCase() === 'true';

    interface MovieResult {
      id: number;
      title: string;
      overview: string | null;
      posterPath: string | null;
      releaseDate: string | null;
      voteAverage: number | null;
      cast?: string[];
    }

    let baseResults: MovieResult[] = (data.results ?? []).map((m: unknown) => {
      const movie = m as { id: number; title: string; overview?: string; poster_path?: string; release_date?: string; vote_average?: number };
      return {
        id: movie.id,
        title: movie.title,
        overview: movie.overview ?? null,
        posterPath: movie.poster_path ?? null,
        releaseDate: movie.release_date ?? null,
        voteAverage: movie.vote_average ?? null
      };
    });

    // If no results and query likely Chinese, search zh-CN and return English titles via detail fetch
    const hasCjk = /[\u3400-\u9FBF\uF900-\uFAFF]/.test(query);
    if (baseResults.length === 0 && hasCjk) {
      try {
        const { data: zh } = await tmdb.get('/search/movie', {
          params: { query, include_adult: false, language: 'zh-CN', page: 1 }
        });
        const zhResults: unknown[] = Array.isArray(zh?.results) ? zh.results : [];
        const limit = Math.min(zhResults.length, 10);
        const detailed = await Promise.all(
          zhResults.slice(0, limit).map(async (m: unknown) => {
            const movie = m as { id: number; title: string; overview?: string; poster_path?: string; release_date?: string; vote_average?: number };
            try {
              const { data: det } = await tmdb.get(`/movie/${movie.id}`, { params: { language: 'en-US' } });
              return {
                id: det.id ?? movie.id,
                title: det.title ?? movie.title,
                overview: det.overview ?? movie.overview ?? null,
                posterPath: det.poster_path ?? movie.poster_path ?? null,
                releaseDate: det.release_date ?? movie.release_date ?? null,
                voteAverage: det.vote_average ?? movie.vote_average ?? null
              };
            } catch {
              return {
                id: movie.id,
                title: movie.title,
                overview: movie.overview ?? null,
                posterPath: movie.poster_path ?? null,
                releaseDate: movie.release_date ?? null,
                voteAverage: movie.vote_average ?? null
              };
            }
          })
        );
        baseResults = detailed;
      } catch {
        // ignore fallback failures; proceed with empty results
      }
    }

    if (!includeCast || baseResults.length === 0) {
      return res.json({ success: true, data: baseResults });
    }

    // Enrich with top cast names (up to 3) for first up to 10 results
    const limit = Math.min(baseResults.length, 10);
    const enriched = await Promise.all(
      baseResults.slice(0, limit).map(async (r) => {
        try {
          const { data: credits } = await tmdb.get(`/movie/${r.id}/credits`, { params: { language: 'en-US' } });
          const cast = Array.isArray(credits?.cast)
            ? credits.cast.slice(0, 3).map((c: unknown) => {
              const castMember = c as { name?: string };
              return castMember.name;
            }).filter(Boolean)
            : [];
          return { ...r, cast };
        } catch {
          return { ...r, cast: [] };
        }
      })
    );
    const remaining = baseResults.slice(limit).map(r => ({ ...r, cast: [] }));
    const combined = enriched.concat(remaining);
    res.json({ success: true, data: combined });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to search movies. Please try again' });
  }
}));

router.get('/ranked', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const movies = await RankedMovie.find({ userId: req.userId }).sort({ rank: 1 });
    const shaped = movies.map((m) => {
      const movieDoc = m as unknown as { _id: unknown; userId: unknown; movieId: number; title: string; posterPath?: string; rank: number; createdAt?: Date };
      return {
        _id: movieDoc._id,
        userId: movieDoc.userId,
        movie: {
          id: movieDoc.movieId,
          title: movieDoc.title,
          overview: null,
          posterPath: movieDoc.posterPath ?? null,
          releaseDate: null,
          voteAverage: null
        },
        rank: movieDoc.rank,
        createdAt: movieDoc.createdAt
      };
    });
    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load rankings. Please try again' });
  }
}));

router.post('/rank', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { movieId, title, posterPath, overview } = req.body as { movieId: number; title: string; posterPath?: string; overview?: string };
    const count = await RankedMovie.countDocuments({ userId: req.userId });

    const rankedMovie = new RankedMovie({
      userId: req.userId,
      movieId,
      title,
      posterPath,
      rank: count + 1
    });

    await rankedMovie.save();

    // Determine overview/poster via TMDB if not provided
    let finalOverview = overview;
    let finalPoster = posterPath;
    try {
      if ((!finalOverview || !finalPoster) && movieId) {
        const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
        if (apiKey) {
          const tmdb = getTmdbClient();
          const { data } = await tmdb.get(`/movie/${movieId}`, {
            params: { language: 'en-US' }
          });
          if (!finalOverview) finalOverview = data.overview ?? undefined;
          if (!finalPoster) finalPoster = data.poster_path ?? undefined;
        }
      }
    } catch {
      // ignore TMDB fetch errors; proceed without
    }

    // Record feed activity
    const activity = new FeedActivity({
      userId: req.userId,
      activityType: 'ranked_movie',
      movieId,
      movieTitle: title,
      posterPath: finalPoster,
      overview: finalOverview,
      rank: rankedMovie.rank
    });
    await activity.save();

    // Notify friends via SSE
    const friendships = await Friendship.find({ userId: req.userId });
    friendships.forEach(f => {
      sseService.send(String(f.friendId), 'feed_activity', {
        activityId: activity._id
      });
    });

    // Shape response to match frontend model (movie nested)
    const rankedMovieDoc = rankedMovie as unknown as {
      _id: unknown;
      userId: unknown;
      movieId: number;
      title: string;
      posterPath?: string;
      rank: number;
      createdAt?: Date;
    };
    const shaped = {
      _id: rankedMovieDoc._id,
      userId: rankedMovieDoc.userId,
      movie: {
        id: rankedMovieDoc.movieId,
        title: rankedMovieDoc.title,
        overview: finalOverview ?? null,
        posterPath: finalPoster ?? rankedMovieDoc.posterPath ?? null,
        releaseDate: null,
        voteAverage: null
      },
      rank: rankedMovieDoc.rank,
      createdAt: rankedMovieDoc.createdAt
    };
    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to rank movie. Please try again' });
  }
}));

// router.post('/compare', authenticate, asyncHandler(async (req, res) => {
//   res.json({ success: true, message: 'Compare movies route - placeholder' });
// });
// use interactive add logic instead of static rank
router.post('/add', authenticate, asyncHandler(addMovie));

//placeholder compare
router.post('/compare', authenticate, asyncHandler(compareMovies));

// start re-rank session for an existing ranked item
router.post('/rerank/start', authenticate, asyncHandler(startRerank));

// Delete a ranked movie and re-sequence ranks
router.delete('/ranked/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { id } = req.params as { id: string };
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const doc = await RankedMovie.findOne({ _id: id, userId: req.userId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Ranked movie not found' });
    }
    const removedRank = doc.rank;
    const removedMovieId = doc.movieId;
    await doc.deleteOne();
    await RankedMovie.updateMany(
      { userId: req.userId, rank: { $gt: removedRank } },
      { $inc: { rank: -1 } }
    );
    // remove related feed activities
    try {
      await FeedActivity.deleteMany({ userId: req.userId, movieId: removedMovieId });
    } catch {}
    res.json({ success: true, message: 'Removed from rankings' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to remove from rankings. Please try again' });
  }
}));

// Get watch providers for a TMDB movie id
router.get('/:movieId/providers', authenticate, asyncHandler(async (req, res) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!movieId || Number.isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie id' });
    }

    const country = String(req.query.country ?? 'CA').toUpperCase();

    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'TMDB API key not configured' });
    }

    const tmdb = getTmdbClient();
  const { data } = await tmdb.get(`/movie/${movieId}/watch/providers`);

  interface WatchProvider {
    provider_name?: string;
  }

  interface WatchProvidersResult {
    link?: string;
    flatrate?: unknown[];
    rent?: unknown[];
    buy?: unknown[];
  }

  const results = data?.results ?? {};
  const result = (Object.prototype.hasOwnProperty.call(results, country) ? results[country as keyof typeof results] : {}) as WatchProvidersResult;

  let link: string | null = result.link ?? null;
  if (!link) {
    // Fallback to TMDB movie watch page for the exact movie
    link = `https://www.themoviedb.org/movie/${movieId}/watch?locale=${country}`;
  }
    const mapProviders = (arr: unknown[] | undefined): string[] =>
      Array.isArray(arr)
        ? arr.map((p: unknown) => {
          const provider = p as WatchProvider;
          return provider.provider_name;
        }).filter((name): name is string => Boolean(name))
        : [];

    const payload = {
      link,
      providers: {
        flatrate: mapProviders(result.flatrate),
        rent: mapProviders(result.rent),
        buy: mapProviders(result.buy)
      }
    };

    res.json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load watch providers. Please try again' });
  }
}));

// Get movie details + top cast from TMDB
router.get('/:movieId/details', authenticate, asyncHandler(async (req, res) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!movieId || Number.isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie id' });
    }
    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'TMDB API key not configured' });
    }
    const tmdb = getTmdbClient();
    const [detailsResp, creditsResp] = await Promise.all([
      tmdb.get(`/movie/${movieId}`, { params: { language: 'en-US' } }),
      tmdb.get(`/movie/${movieId}/credits`, { params: { language: 'en-US' } })
    ]);
    const d = detailsResp.data ?? {};
    const cast = Array.isArray(creditsResp.data?.cast)
      ? creditsResp.data.cast.slice(0, 5).map((c: unknown) => {
          const castMember = c as { name?: string };
          return castMember.name;
        }).filter(Boolean)
      : [];
    const shaped = {
      id: d.id,
      title: d.title,
      overview: d.overview ?? null,
      posterPath: d.poster_path ?? null,
      releaseDate: d.release_date ?? null,
      voteAverage: d.vote_average ?? null,
      cast
    };
    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load movie details. Please try again' });
  }
}));

// Get movie videos/trailers from TMDB
router.get('/:movieId/videos', authenticate, asyncHandler(async (req, res) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!movieId || Number.isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie id' });
    }
    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'TMDB API key not configured' });
    }
    const tmdb = getTmdbClient();
    const { data } = await tmdb.get(`/movie/${movieId}/videos`, { params: { language: 'en-US' } });

    // Filter for YouTube trailers, prioritize official trailers
    const videos = Array.isArray(data?.results) ? data.results : [];
    const youtubeVideos = videos.filter((v: unknown) => {
      const video = v as { site?: string };
      return video.site === 'YouTube';
    });

    // Prioritize: Official Trailer > Trailer > Teaser
    const trailer = youtubeVideos.find((v: unknown) => {
      const video = v as { type?: string; official?: boolean };
      return video.type === 'Trailer' && video.official;
    })
      ?? youtubeVideos.find((v: unknown) => {
        const video = v as { type?: string };
        return video.type === 'Trailer';
      })
      ?? youtubeVideos.find((v: unknown) => {
        const video = v as { type?: string };
        return video.type === 'Teaser';
      })
      ?? youtubeVideos[0];

    const shaped = trailer
      ? {
        key: trailer.key,
        name: trailer.name,
        type: trailer.type,
        site: trailer.site
      }
      : null;

    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load movie videos. Please try again' });
  }
}));

export default router;
