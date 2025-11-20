import mongoose, { Schema } from "mongoose";
import { IComment } from "../../types/feed.types";

const CommentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "FeedActivity",
      required: true,
    },
    text: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true },
);

// Index for fetching comments by activity
CommentSchema.index({ activityId: 1, createdAt: -1 });

export default mongoose.model<IComment>("Comment", CommentSchema);