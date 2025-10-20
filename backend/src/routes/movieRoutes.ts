import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import RankedMovie from '../models/movie/RankedMovie';
import FeedActivity from '../models/feed/FeedActivity';
import { Friendship } from '../models/friend/Friend';
import { sseService } from '../services/sse/sseService';
import axios from 'axios';
import { getTmdbClient } from '../services/tmdb/tmdbClient';

const router = Router();

router.get('/search', authenticate, async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
    }

    const apiKey = process.env.TMDB_API_KEY || process.env.TMDB_KEY;
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

    const mapped = (data.results || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      overview: m.overview || null,
      posterPath: m.poster_path || null,
      releaseDate: m.release_date || null,
      voteAverage: m.vote_average ?? null
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to search movies' });
  }
});

router.get('/ranked', authenticate, async (req: AuthRequest, res) => {
  try {
    const movies = await RankedMovie.find({ userId: req.userId }).sort({ rank: 1 });
    const shaped = movies.map((m) => ({
      _id: m._id,
      userId: m.userId,
      movie: {
        id: m.movieId,
        title: m.title,
        overview: null,
        posterPath: m.posterPath ?? null,
        releaseDate: null,
        voteAverage: null
      },
      rank: m.rank,
      createdAt: (m as any).createdAt
    }));
    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get ranked movies' });
  }
});

router.post('/rank', authenticate, async (req: AuthRequest, res) => {
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
        const apiKey = process.env.TMDB_API_KEY || process.env.TMDB_KEY;
        if (apiKey) {
          const tmdb = getTmdbClient();
          const { data } = await tmdb.get(`/movie/${movieId}`, {
            params: { language: 'en-US' }
          });
          if (!finalOverview) finalOverview = data.overview || undefined;
          if (!finalPoster) finalPoster = data.poster_path || undefined;
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
    const shaped = {
      _id: rankedMovie._id,
      userId: rankedMovie.userId,
      movie: {
        id: rankedMovie.movieId,
        title: rankedMovie.title,
        overview: finalOverview ?? null,
        posterPath: finalPoster ?? rankedMovie.posterPath ?? null,
        releaseDate: null,
        voteAverage: null
      },
      rank: rankedMovie.rank,
      createdAt: (rankedMovie as any).createdAt
    };
    res.json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to rank movie' });
  }
});

router.post('/compare', authenticate, async (req, res) => {
  res.json({ success: true, message: 'Compare movies route - placeholder' });
});

// Get watch providers for a TMDB movie id
router.get('/:movieId/providers', authenticate, async (req, res) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!movieId || Number.isNaN(movieId)) {
      return res.status(400).json({ success: false, message: 'Invalid movie id' });
    }

    const country = (req.query.country as string)?.toUpperCase?.() || 'CA';

    const apiKey = process.env.TMDB_API_KEY || process.env.TMDB_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'TMDB API key not configured' });
    }

    const tmdb = getTmdbClient();
    const { data } = await tmdb.get(`/movie/${movieId}/watch/providers`);
    const result = data?.results?.[country] || {};

    const link: string | null = result.link || null;
    const mapProviders = (arr: any[] | undefined) =>
      Array.isArray(arr) ? arr.map((p: any) => p.provider_name).filter(Boolean) : [];

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
    res.status(500).json({ success: false, message: 'Failed to get watch providers' });
  }
});

export default router;
