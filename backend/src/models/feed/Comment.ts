import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  userId: mongoose.Types.ObjectId;
  activityId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'FeedActivity', required: true },
    text: { type: String, required: true, maxlength: 500 }
  },
  { timestamps: true }
);

// Index for fetching comments by activity
CommentSchema.index({ activityId: 1, createdAt: -1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
