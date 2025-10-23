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

    // 3️⃣ Collect all recommended movies (with randomization for variety)
    const allRecs: any[] = [];
    const seenMovieIds = new Set(rankedMovies.map((m: any) => m.movieId));

    for (const movie of topMovies) {
      try {
        // Randomly fetch from pages 1-3 for variety on each refresh
        const randomPage = Math.floor(Math.random() * 3) + 1;
        const { data } = await tmdb.get(`/movie/${movie.movieId}/recommendations`, {
          params: { language: 'en-US', page: randomPage },
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

    // 4️⃣ Shuffle for variety, then prioritize highly-rated movies
    const shuffled = allRecs.sort(() => Math.random() - 0.5);

    // Still prefer higher-rated movies, but with randomization
    const topMovieTitle = topMovies[0].title;
    const sorted = shuffled.sort((a, b) => {
      // Add some randomness to ratings (±0.5) to vary results
      const aRating = (a.voteAverage ?? 0) + (Math.random() - 0.5);
      const bRating = (b.voteAverage ?? 0) + (Math.random() - 0.5);

      if (a.relatedTo === topMovieTitle && b.relatedTo !== topMovieTitle) return -1;
      if (b.relatedTo === topMovieTitle && a.relatedTo !== topMovieTitle) return 1;
      return bRating - aRating;
    });

    // 5️⃣ Remove duplicates by movieId and slice final list 10–20
    const uniqueMovies = Array.from(
      new Map(sorted.map((m: any) => [m.id, m])).values()
    );
    const finalList = uniqueMovies.slice(0, Math.min(20, Math.max(10, uniqueMovies.length)));

    res.json({ success: true, data: finalList });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations' });
  }
};
