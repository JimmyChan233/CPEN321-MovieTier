import mongoose, { Document } from 'mongoose';

/**
 * Feed activity interface representing user activities in the feed
 */
export interface IFeedActivity extends Document {
  userId: mongoose.Types.ObjectId;
  activityType: 'ranked_movie';
  movieId: number;
  movieTitle: string;
  posterPath?: string;
  overview?: string;
  releaseDate?: string;
  voteAverage?: number;
  rank?: number;
  createdAt: Date;
}

/**
 * Like interface for feed activities
 */
export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  activityId: mongoose.Types.ObjectId;
  createdAt: Date;
}

/**
 * Comment interface for feed activities
 */
export interface IComment extends Document {
  userId: mongoose.Types.ObjectId;
  activityId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

/**
 * Feed activity data for API responses
 */
export interface IFeedActivityResponse {
  _id: string;
  user: {
    _id: string;
    name: string;
    profileImageUrl?: string;
  };
  activityType: 'ranked_movie';
  movieId: number;
  movieTitle: string;
  posterPath?: string;
  overview?: string;
  releaseDate?: string;
  voteAverage?: number;
  rank?: number;
  likes: number;
  comments: number;
  createdAt: Date;
}