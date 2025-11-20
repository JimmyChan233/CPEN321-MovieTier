import mongoose, { Document, Schema } from "mongoose";

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  activityId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LikeSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "FeedActivity",
      required: true,
    },
  },
  { timestamps: true },
);

// Compound index to ensure one like per user per activity
LikeSchema.index({ userId: 1, activityId: 1 }, { unique: true });
// Index for counting likes per activity
LikeSchema.index({ activityId: 1 });

export default mongoose.model<ILike>("Like", LikeSchema);
