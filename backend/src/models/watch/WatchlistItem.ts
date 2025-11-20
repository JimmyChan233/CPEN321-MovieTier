import mongoose, { Schema } from "mongoose";
import { IWatchlistItem } from "../../types/movie.types";

const WatchlistItemSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    movieId: { type: Number, required: true },
    title: { type: String, required: true },
    posterPath: { type: String },
    overview: { type: String },
  },
  { timestamps: true },
);

WatchlistItemSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model<IWatchlistItem>(
  "WatchlistItem",
  WatchlistItemSchema,
);