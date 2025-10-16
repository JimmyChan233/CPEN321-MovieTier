import mongoose, { Document, Schema } from 'mongoose';

export interface IWatchlistItem extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: number;
  title: string;
  posterPath?: string;
  overview?: string;
  createdAt: Date;
}

const WatchlistItemSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movieId: { type: Number, required: true },
    title: { type: String, required: true },
    posterPath: { type: String },
    overview: { type: String }
  },
  { timestamps: true }
);

WatchlistItemSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model<IWatchlistItem>('WatchlistItem', WatchlistItemSchema);

