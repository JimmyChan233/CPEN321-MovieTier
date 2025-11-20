import mongoose, { Document, Schema } from "mongoose";

export interface IFriendRequest extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

const FriendRequestSchema: Schema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// Optional indexes to reduce duplicates and speed lookups
FriendRequestSchema.index({ senderId: 1, receiverId: 1, status: 1 });

export interface IFriendship extends Document {
  userId: mongoose.Types.ObjectId;
  friendId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FriendshipSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    friendId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// Prevent duplicate friendships per direction
FriendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });

export const FriendRequest = mongoose.model<IFriendRequest>(
  "FriendRequest",
  FriendRequestSchema,
);
export const Friendship = mongoose.model<IFriendship>(
  "Friendship",
  FriendshipSchema,
);
