import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RankedMovie from '../../models/movie/RankedMovie';
import { getTmdbClient } from '../../services/tmdb/tmdbClient';

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const tmdb = getTmdbClient();

    // 1️⃣ Fetch ranked movies
    const rankedMovies = await RankedMovie.find({ userId: userObjectId }).sort({ rank: 1 });
    if (rankedMovies.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 2️⃣ Take top 20% (minimum 1)
    const topCount = Math.max(1, Math.ceil(rankedMovies.length * 0.2));
    const topMovies = rankedMovies.slice(0, topCount);

    // 3️⃣ Collect all recommended movies
    const allRecs: any[] = [];
    const seenMovieIds = new Set(rankedMovies.map((m: any) => m.movieId));

    for (const movie of topMovies) {
      try {
        const { data } = await tmdb.get(`/movie/${movie.movieId}/recommendations`, {
          params: { language: 'en-US', page: 1 },
        });

        if (data?.results?.length) {
          const recs = data.results
            .filter((r: any) => !seenMovieIds.has(r.id)) // remove already ranked
            .map((r: any) => ({
              id: r.id,
              title: r.title,
              overview: r.overview || null,
              posterPath: r.poster_path || null,
              releaseDate: r.release_date || null,
              voteAverage: r.vote_average ?? null,
              relatedTo: movie.title,
              rankWeight: movie.rank, // to help with sorting
            }));
          allRecs.push(...recs);
        }
      } catch (err) {
        console.error(`TMDB error for movie ${movie.movieId}:`, err);
      }
    }

    if (allRecs.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 4️⃣ Sort by relatedTo top movie
    const topMovieTitle = topMovies[0].title;
    const sorted = allRecs.sort((a, b) => {
      if (a.relatedTo === topMovieTitle && b.relatedTo !== topMovieTitle) return -1;
      if (b.relatedTo === topMovieTitle && a.relatedTo !== topMovieTitle) return 1;
      return b.voteAverage - a.voteAverage;
    });

    // 5️⃣ Slice final list 10–20
    const finalList = sorted.slice(0, Math.min(20, Math.max(10, sorted.length)));

    res.json({ success: true, data: finalList });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations' });
  }
};
