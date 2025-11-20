/**
 * Type definitions for movie recommendation system
 * Used by movieRecommendationController for TMDB API interactions and recommendation scoring
 */

import mongoose from "mongoose";

/**
 * User's preference profile derived from their ranked movies
 */
export interface UserPreferences {
  topGenres: number[];
  languages: string[];
  minVoteAverage: number;
}

/**
 * TMDB movie response from search/discover/similar/recommendations endpoints
 */
export interface TmdbMovie {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  original_language?: string;
}

/**
 * TMDB genre object from movie details response
 */
export interface TmdbGenre {
  id: number;
  name: string;
}

/**
 * TMDB movie details response with full information including genres
 */
export interface TmdbMovieDetails {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  vote_average?: number;
  genres?: TmdbGenre[];
  original_language?: string;
}

/**
 * Normalized movie recommendation for API response
 * Converts TMDB snake_case to camelCase for frontend consistency
 */
export interface MovieRecommendation {
  id: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  genreIds?: number[];
  originalLanguage?: string;
}

/**
 * Movie recommendation with scoring information for ranking/sorting
 */
export interface ScoredMovie extends MovieRecommendation {
  score: number;
}

/**
 * RankedMovie document from database (as unknown type for type casting)
 */
export interface RankedMovieDoc {
  movieId: number;
  rank: number;
  userId: mongoose.Types.ObjectId;
}

/**
 * Parameters for TMDB discover/movie endpoint
 * Filters by language, genre, vote average, and sorting
 */
export interface DiscoverParams {
  with_original_language: string;
  "vote_average.gte": number;
  "vote_count.gte": number;
  sort_by: string;
  page: number;
  with_genres?: string;
}
