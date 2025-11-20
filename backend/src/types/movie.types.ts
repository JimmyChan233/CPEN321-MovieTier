import { Document } from 'mongoose';

/**
 * Ranked movie interface representing user's movie rankings
 */
export interface IRankedMovie extends Document {
  userId: string;
  movieId: number;
  title: string;
  posterPath?: string;
  overview?: string;
  releaseDate?: string;
  voteAverage?: number;
  rank: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Watchlist item interface
 */
export interface IWatchlistItem extends Document {
  userId: string;
  movieId: number;
  movieTitle: string;
  posterPath?: string;
  overview?: string;
  releaseDate?: string;
  voteAverage?: number;
  addedAt: Date;
}

/**
 * Movie comparison session interface
 */
export interface IComparisonSession {
  sessionId: string;
  userId: string;
  movieIds: number[];
  currentIndex: number;
  rankings: Array<{ movieId: number; rank: number }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Movie data from TMDB API
 */
export interface ITMDBMovie {
  id: number;
  title: string;
  poster_path?: string;
  overview?: string;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
}