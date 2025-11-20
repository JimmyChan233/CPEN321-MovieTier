import { Request, Response } from "express";
import mongoose from "mongoose";
import RankedMovie from "../../models/movie/RankedMovie";
import { getTmdbClient } from "../../services/tmdb/tmdbClient";
import { logger } from "../../utils/logger";
import { AxiosInstance } from "axios";
import { AuthRequest } from "../../types/middleware.types";
import {
  UserPreferences,
  TmdbMovie,
  TmdbGenre,
  TmdbMovieDetails,
  MovieRecommendation,
  ScoredMovie,
  RankedMovieDoc,
  DiscoverParams,
} from "../../types/recommendation.types";
import crypto from "crypto";
import { sendSuccess, sendError, HttpStatus } from "../../utils/responseHandler";

// Cryptographically secure random number generator
function secureRandom(): number {
  return crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
}

// Helper function to convert TMDB movie to MovieRecommendation
function convertTmdbMovie(
  movie: TmdbMovie,
  fallbackLanguage = "en",
): MovieRecommendation {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview ?? null,
    posterPath: movie.poster_path ?? null,
    releaseDate: movie.release_date ?? null,
    voteAverage: movie.vote_average ?? null,
    genreIds: movie.genre_ids ?? [],
    originalLanguage: movie.original_language ?? fallbackLanguage,
  };
}

export const getTrendingMovies = async (req: Request, res: Response) => {
  try {
    const tmdb = getTmdbClient();

    // Fetch trending movies from TMDB (trending/movie/week for weekly trending)
    const { data } = await tmdb.get("/trending/movie/week", {
      params: {
        language: "en-US",
      },
    });

    if (!data?.results || data.results.length === 0) {
      return sendSuccess(res, []);
    }

    // Map to our movie format
    const movies = (data.results as TmdbMovie[]).slice(0, 20).map((movie) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview ?? null,
      posterPath: movie.poster_path ?? null,
      releaseDate: movie.release_date ?? null,
      voteAverage: movie.vote_average ?? null,
    }));

    return sendSuccess(res, movies);
  } catch (error) {
    logger.error("Trending movies error", {
      error: (error as Error).message,
    });
    return sendError(res, "Unable to load trending movies. Please try again", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.userId) {
      return sendError(res, "User ID not found", HttpStatus.UNAUTHORIZED);
    }
    const userId = authReq.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const tmdb = getTmdbClient();

    // Step 1: Fetch ranked movies
    const rankedMovies = await RankedMovie.find({ userId: userObjectId }).sort({
      rank: 1,
    });
    if (rankedMovies.length === 0) {
      return sendSuccess(res, []);
    }

    // Step 2: Analyze user preferences from top 50% of ranked movies
    const topHalfCount = Math.max(3, Math.ceil(rankedMovies.length * 0.5));
    const topMovies = rankedMovies.slice(0, topHalfCount);

    const preferences = await analyzeUserPreferences(tmdb, topMovies);
    const rankedMovieDocs = rankedMovies as unknown as RankedMovieDoc[];
    const seenMovieIds = new Set(rankedMovieDocs.map((m) => m.movieId));

    // Step 3: Fetch recommendations from multiple sources
    const allRecs: MovieRecommendation[] = [];

    // 3a. Use TMDB discover with user's preferred genres and languages
    const discoverResults = await fetchDiscoverRecommendations(
      tmdb,
      preferences,
      seenMovieIds,
    );
    allRecs.push(...discoverResults);

    // 3b. Get similar movies for top 30% (max 10) of ranked movies
    const similarCount = Math.min(
      10,
      Math.max(3, Math.ceil(rankedMovies.length * 0.3)),
    );
    const topForSimilarDocs = rankedMovies.slice(
      0,
      similarCount,
    ) as unknown as RankedMovieDoc[];
    for (const movie of topForSimilarDocs) {
      try {
        const { data } = await tmdb.get(`/movie/${movie.movieId}/similar`, {
          params: { language: "en-US", page: 1 },
        });
        if (data?.results?.length) {
          const tmdbResults = data.results as TmdbMovie[];
          const similar = tmdbResults
            .filter((r) => !seenMovieIds.has(r.id))
            .slice(0, 8)
            .map((r) => convertTmdbMovie(r));
          allRecs.push(...similar);
        }
      } catch (err) {
        logger.warn("Failed to fetch similar movies", {
          userId,
          movieId: movie.movieId,
          error: (err as Error).message,
        });
      }
    }

    // 3c. Get recommendations for top 20% (max 8) of ranked movies
    const recCount = Math.min(
      8,
      Math.max(3, Math.ceil(rankedMovies.length * 0.2)),
    );
    const topForRecsDocs = rankedMovies.slice(
      0,
      recCount,
    ) as unknown as RankedMovieDoc[];
    for (const movie of topForRecsDocs) {
      try {
        const { data } = await tmdb.get(
          `/movie/${movie.movieId}/recommendations`,
          {
            params: { page: 1 },
          },
        );
        if (data?.results?.length) {
          const tmdbResults = data.results as TmdbMovie[];
          const recs = tmdbResults
            .filter((r) => !seenMovieIds.has(r.id))
            .slice(0, 8)
            .map((r) => convertTmdbMovie(r));
          allRecs.push(...recs);
        }
      } catch (err) {
        logger.warn("Failed to fetch TMDB recommendations", {
          userId,
          movieId: movie.movieId,
          error: (err as Error).message,
        });
      }
    }

    if (allRecs.length === 0) {
      return sendSuccess(res, []);
    }

    // Step 4: Remove duplicates
    const uniqueMovies = Array.from(
      new Map(allRecs.map((m) => [m.id, m])).values(),
    );

    // Step 5: Score each movie based on preference matching
    const scoredMovies = uniqueMovies.map((movie): ScoredMovie => {
      let score = 0;

      // Base score from TMDB rating
      score += (movie.voteAverage ?? 5) * 10;

      // Genre match bonus (high weight)
      let genreMatches = 0;
      if (movie.genreIds) {
        for (const gid of movie.genreIds) {
          if (preferences.topGenres.includes(gid)) {
            genreMatches++;
          }
        }
      }
      score += genreMatches * 15;

      // Language match bonus (very high for matching user's languages)
      if (
        movie.originalLanguage &&
        preferences.languages.includes(movie.originalLanguage)
      ) {
        score += 40;
      }

      // Quality threshold bonus
      if ((movie.voteAverage ?? 0) >= preferences.minVoteAverage) {
        score += 20;
      }

      // Recency bonus (movies from last 5 years)
      const releaseYear = movie.releaseDate
        ? parseInt(movie.releaseDate.substring(0, 4))
        : 0;
      const currentYear = new Date().getFullYear();
      if (releaseYear >= currentYear - 5) {
        score += 10;
      }

      return { ...movie, score };
    });

    // Step 6: Sort by score and add slight randomness to top tier
    scoredMovies.sort((a, b) => {
      // Add small randomness (±5) to prevent same order every time
      const aScore = a.score + (secureRandom() * 10 - 5);
      const bScore = b.score + (secureRandom() * 10 - 5);
      return bScore - aScore;
    });

    // Step 7: Return top 20 recommendations
    const finalList = scoredMovies.slice(0, 20).map((m) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      posterPath: m.posterPath,
      releaseDate: m.releaseDate,
      voteAverage: m.voteAverage,
    }));

    return sendSuccess(res, finalList);
  } catch (error) {
    const authReq = req as AuthRequest;
    logger.error("Recommendation error", {
      userId: authReq.userId,
      error: (error as Error).message,
    });
    return sendError(res, "Unable to load recommendations. Please try again", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

async function analyzeUserPreferences(
  tmdb: AxiosInstance,
  topMovies: unknown[],
): Promise<UserPreferences> {
  const genreCounts = new Map<number, number>();
  const languageCounts = new Map<string, number>();
  let totalVoteAverage = 0;
  let voteCount = 0;

  // Fetch details for top movies to get genres and languages
  const topMovieDocs = topMovies as RankedMovieDoc[];
  for (const movie of topMovieDocs) {
    try {
      const { data } = await tmdb.get(`/movie/${movie.movieId}`, {
        params: { language: "en-US" },
      });

      const movieDetails = data as TmdbMovieDetails;

      // Count genres
      if (movieDetails.genres) {
        movieDetails.genres.forEach((g) => {
          genreCounts.set(g.id, (genreCounts.get(g.id) ?? 0) + 1);
        });
      }

      // Count languages
      if (movieDetails.original_language) {
        languageCounts.set(
          movieDetails.original_language,
          (languageCounts.get(movieDetails.original_language) ?? 0) + 1,
        );
      }

      // Track vote averages
      if (movieDetails.vote_average) {
        totalVoteAverage += movieDetails.vote_average;
        voteCount++;
      }
    } catch (err) {
      logger.warn("Failed to fetch TMDB details for preference analysis", {
        movieId: movie.movieId,
        error: (err as Error).message,
      });
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
  const minVoteAverage =
    voteCount > 0 ? Math.max(6.0, totalVoteAverage / voteCount - 1.0) : 6.0;

  return { topGenres, languages, minVoteAverage };
}

async function fetchDiscoverRecommendations(
  tmdb: AxiosInstance,
  preferences: UserPreferences,
  seenMovieIds: Set<number>,
): Promise<MovieRecommendation[]> {
  const results: MovieRecommendation[] = [];

  // For each preferred language, fetch discover results
  for (const language of preferences.languages.slice(0, 2)) {
    try {
      const params: DiscoverParams = {
        with_original_language: language,
        "vote_average.gte": preferences.minVoteAverage,
        "vote_count.gte": 100,
        sort_by: "vote_average.desc",
        page: 1,
      };

      // Add genre filter if we have preferred genres
      if (preferences.topGenres.length > 0) {
        params.with_genres = preferences.topGenres.join(",");
      }

      const { data } = await tmdb.get("/discover/movie", { params });

      if (data?.results?.length) {
        const tmdbResults = data.results as TmdbMovie[];
        const discovered = tmdbResults
          .filter((r) => !seenMovieIds.has(r.id))
          .slice(0, 10)
          .map((r) => convertTmdbMovie(r, language));
        results.push(...discovered);
      }
    } catch (err) {
      logger.warn("Discover API failed for language", {
        language,
        error: (err as Error).message,
      });
    }
  }

  return results;
}
