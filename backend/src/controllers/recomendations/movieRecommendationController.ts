import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RankedMovie from '../../models/movie/RankedMovie';
import { getTmdbClient } from '../../services/tmdb/tmdbClient';

interface UserPreferences {
  topGenres: number[];
  languages: string[];
  minVoteAverage: number;
}

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

    // Step 2: Analyze user preferences from top 50% of ranked movies
    const topHalfCount = Math.max(3, Math.ceil(rankedMovies.length * 0.5));
    const topMovies = rankedMovies.slice(0, topHalfCount);

    const preferences = await analyzeUserPreferences(tmdb, topMovies);
    const seenMovieIds = new Set(rankedMovies.map((m: any) => m.movieId));

    // Step 3: Fetch recommendations from multiple sources
    const allRecs: any[] = [];

    // 3a. Use TMDB discover with user's preferred genres and languages
    try {
      const discoverResults = await fetchDiscoverRecommendations(tmdb, preferences, seenMovieIds);
      allRecs.push(...discoverResults);
    } catch (err) {
      console.error('Discover error:', err);
    }

    // 3b. Get similar movies for top 5 ranked (language-aware)
    const top5 = rankedMovies.slice(0, Math.min(5, rankedMovies.length));
    for (const movie of top5) {
      try {
        const { data } = await tmdb.get(`/movie/${movie.movieId}/similar`, {
          params: { language: 'en-US', page: 1 }
        });
        if (data?.results?.length) {
          const similar = data.results
            .filter((r: any) => !seenMovieIds.has(r.id))
            .slice(0, 5)
            .map((r: any) => ({
              id: r.id,
              title: r.title,
              overview: r.overview || null,
              posterPath: r.poster_path || null,
              releaseDate: r.release_date || null,
              voteAverage: r.vote_average ?? null,
              genreIds: r.genre_ids || [],
              originalLanguage: r.original_language || 'en'
            }));
          allRecs.push(...similar);
        }
      } catch (err) {
        console.error(`Similar movies error for ${movie.movieId}:`, err);
      }
    }

    // 3c. Get recommendations for top 3 ranked (no language forcing)
    const top3 = rankedMovies.slice(0, Math.min(3, rankedMovies.length));
    for (const movie of top3) {
      try {
        const { data } = await tmdb.get(`/movie/${movie.movieId}/recommendations`, {
          params: { page: 1 }
        });
        if (data?.results?.length) {
          const recs = data.results
            .filter((r: any) => !seenMovieIds.has(r.id))
            .slice(0, 5)
            .map((r: any) => ({
              id: r.id,
              title: r.title,
              overview: r.overview || null,
              posterPath: r.poster_path || null,
              releaseDate: r.release_date || null,
              voteAverage: r.vote_average ?? null,
              genreIds: r.genre_ids || [],
              originalLanguage: r.original_language || 'en'
            }));
          allRecs.push(...recs);
        }
      } catch (err) {
        console.error(`Recommendations error for ${movie.movieId}:`, err);
      }
    }

    if (allRecs.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Step 4: Remove duplicates
    const uniqueMovies = Array.from(
      new Map(allRecs.map((m: any) => [m.id, m])).values()
    );

    // Step 5: Score each movie based on preference matching
    const scoredMovies = uniqueMovies.map((movie: any) => {
      let score = 0;

      // Base score from TMDB rating
      score += (movie.voteAverage ?? 5) * 10;

      // Genre match bonus (high weight)
      const genreMatches = (movie.genreIds || []).filter((gid: number) =>
        preferences.topGenres.includes(gid)
      ).length;
      score += genreMatches * 15;

      // Language match bonus (very high for matching user's languages)
      if (preferences.languages.includes(movie.originalLanguage)) {
        score += 40;
      }

      // Quality threshold bonus
      if ((movie.voteAverage ?? 0) >= preferences.minVoteAverage) {
        score += 20;
      }

      // Recency bonus (movies from last 5 years)
      const releaseYear = movie.releaseDate ? parseInt(movie.releaseDate.substring(0, 4)) : 0;
      const currentYear = new Date().getFullYear();
      if (releaseYear >= currentYear - 5) {
        score += 10;
      }

      return { ...movie, score };
    });

    // Step 6: Sort by score and add slight randomness to top tier
    scoredMovies.sort((a, b) => {
      // Add small randomness (±5) to prevent same order every time
      const aScore = a.score + (Math.random() * 10 - 5);
      const bScore = b.score + (Math.random() * 10 - 5);
      return bScore - aScore;
    });

    // Step 7: Return top 20 recommendations
    const finalList = scoredMovies.slice(0, 20).map((m: any) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      posterPath: m.posterPath,
      releaseDate: m.releaseDate,
      voteAverage: m.voteAverage
    }));

    res.json({ success: true, data: finalList });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Unable to load recommendations. Please try again' });
  }
};

async function analyzeUserPreferences(tmdb: any, topMovies: any[]): Promise<UserPreferences> {
  const genreCounts = new Map<number, number>();
  const languageCounts = new Map<string, number>();
  let totalVoteAverage = 0;
  let voteCount = 0;

  // Fetch details for top movies to get genres and languages
  for (const movie of topMovies) {
    try {
      const { data } = await tmdb.get(`/movie/${movie.movieId}`, {
        params: { language: 'en-US' }
      });

      // Count genres
      if (data.genres) {
        data.genres.forEach((g: any) => {
          genreCounts.set(g.id, (genreCounts.get(g.id) || 0) + 1);
        });
      }

      // Count languages
      if (data.original_language) {
        languageCounts.set(
          data.original_language,
          (languageCounts.get(data.original_language) || 0) + 1
        );
      }

      // Track vote averages
      if (data.vote_average) {
        totalVoteAverage += data.vote_average;
        voteCount++;
      }
    } catch (err) {
      console.error(`Error fetching details for movie ${movie.movieId}:`, err);
    }
  }

  // Get top 3 most frequent genres
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genreId]) => genreId);

  // Get languages that appear in at least 20% of top movies
  const languageThreshold = Math.max(1, topMovies.length * 0.2);
  const languages = Array.from(languageCounts.entries())
    .filter(([, count]) => count >= languageThreshold)
    .map(([lang]) => lang);

  // Set minimum vote average (user's average - 1.0 for some flexibility)
  const minVoteAverage = voteCount > 0
    ? Math.max(6.0, (totalVoteAverage / voteCount) - 1.0)
    : 6.0;

  return { topGenres, languages, minVoteAverage };
}

async function fetchDiscoverRecommendations(
  tmdb: any,
  preferences: UserPreferences,
  seenMovieIds: Set<number>
): Promise<any[]> {
  const results: any[] = [];

  // For each preferred language, fetch discover results
  for (const language of preferences.languages.slice(0, 2)) {
    try {
      const params: any = {
        with_original_language: language,
        'vote_average.gte': preferences.minVoteAverage,
        'vote_count.gte': 100,
        sort_by: 'vote_average.desc',
        page: 1
      };

      // Add genre filter if we have preferred genres
      if (preferences.topGenres.length > 0) {
        params.with_genres = preferences.topGenres.join(',');
      }

      const { data } = await tmdb.get('/discover/movie', { params });

      if (data?.results?.length) {
        const discovered = data.results
          .filter((r: any) => !seenMovieIds.has(r.id))
          .slice(0, 10)
          .map((r: any) => ({
            id: r.id,
            title: r.title,
            overview: r.overview || null,
            posterPath: r.poster_path || null,
            releaseDate: r.release_date || null,
            voteAverage: r.vote_average ?? null,
            genreIds: r.genre_ids || [],
            originalLanguage: r.original_language || language
          }));
        results.push(...discovered);
      }
    } catch (err) {
      console.error(`Discover error for language ${language}:`, err);
    }
  }

  return results;
}
