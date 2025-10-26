import mongoose, { Document, Schema } from 'mongoose';

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

const FeedActivitySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activityType: { type: String, enum: ['ranked_movie'], required: true },
    movieId: { type: Number, required: true },
    movieTitle: { type: String, required: true },
    posterPath: { type: String },
    overview: { type: String },
    releaseDate: { type: String },
    voteAverage: { type: Number },
    rank: { type: Number }
  },
  { timestamps: true }
);

FeedActivitySchema.index({ createdAt: -1 });

export default mongoose.model<IFeedActivity>('FeedActivity', FeedActivitySchema);
