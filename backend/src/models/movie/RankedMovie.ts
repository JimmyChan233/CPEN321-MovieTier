import mongoose, { Schema } from "mongoose";
import { IRankedMovie } from "../../types/movie.types";

const RankedMovieSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    movieId: { type: Number, required: true },
    title: { type: String, required: true },
    posterPath: { type: String },
    rank: { type: Number, required: true },
  },
  { timestamps: true },
);

RankedMovieSchema.index({ userId: 1, rank: 1 });

export default mongoose.model<IRankedMovie>("RankedMovie", RankedMovieSchema);