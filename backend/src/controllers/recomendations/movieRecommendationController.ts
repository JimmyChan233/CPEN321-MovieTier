import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RankedMovie from '../../models/movie/RankedMovie';
import { getTmdbClient } from '../../services/tmdb/tmdbClient';

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const tmdb = getTmdbClient();

    // Step 1: Fetch ranked movies
    const rankedMovies = await RankedMovie.find({ userId: userObjectId }).sort({ rank: 1 });
    if (rankedMovies.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Step 2: Randomly select from top 30% movies (not always the same ones)
    const topCount = Math.max(2, Math.ceil(rankedMovies.length * 0.3));
    const topMoviePool = rankedMovies.slice(0, topCount);

    // Shuffle the pool and take 2-3 random movies each time
    const shuffledPool = topMoviePool.sort(() => Math.random() - 0.5);
    const numToUse = Math.min(3, Math.max(2, shuffledPool.length));
    const selectedMovies = shuffledPool.slice(0, numToUse);

    // Step 3: Collect recommendations from multiple pages for maximum variety
    const allRecs: any[] = [];
    const seenMovieIds = new Set(rankedMovies.map((m: any) => m.movieId));

    for (const movie of selectedMovies) {
      // Fetch from 2 random pages per movie for more variety
      const pages = [
        Math.floor(Math.random() * 5) + 1,
        Math.floor(Math.random() * 5) + 1
      ];

      for (const page of pages) {
        try {
          const { data } = await tmdb.get(`/movie/${movie.movieId}/recommendations`, {
            params: { language: 'en-US', page },
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
                rankWeight: movie.rank,
              }));
            allRecs.push(...recs);
          }
        } catch (err) {
          console.error(`TMDB error for movie ${movie.movieId}, page ${page}:`, err);
        }
      }
    }

    if (allRecs.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Step 4: Remove duplicates first
    const uniqueMovies = Array.from(
      new Map(allRecs.map((m: any) => [m.id, m])).values()
    );

    // Fisher-Yates shuffle for true randomization
    for (let i = uniqueMovies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueMovies[i], uniqueMovies[j]] = [uniqueMovies[j], uniqueMovies[i]];
    }

    // Step 5: Lightly sort by quality, but keep high randomness
    const sorted = uniqueMovies.sort((a, b) => {
      // Add significant randomness to ratings (±2.0) for more variety
      const aRating = (a.voteAverage ?? 0) + (Math.random() * 4 - 2);
      const bRating = (b.voteAverage ?? 0) + (Math.random() * 4 - 2);
      return bRating - aRating;
    });

    // Step 6: Take a random window of 15-20 movies (not always from the start)
    const totalMovies = sorted.length;
    const desiredCount = Math.min(totalMovies, 15 + Math.floor(Math.random() * 6)); // 15-20
    const maxStartIndex = Math.max(0, totalMovies - desiredCount);
    const startIndex = Math.floor(Math.random() * (maxStartIndex + 1));
    const finalList = sorted.slice(startIndex, startIndex + desiredCount);

    res.json({ success: true, data: finalList });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations' });
  }
};
