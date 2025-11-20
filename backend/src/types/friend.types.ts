import mongoose, { Document } from 'mongoose';

/**
 * Friendship interface representing a friendship relationship
 */
export interface IFriendship extends Document {
  userId: mongoose.Types.ObjectId;
  friendId: mongoose.Types.ObjectId;
  createdAt: Date;
}

/**
 * Friend request interface
 */
export interface IFriendRequest extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Friend data for API responses
 */
export interface IFriend {
  _id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
  createdAt: Date;
}

/**
 * Friend request data for API responses
 */
export interface IFriendRequestResponse {
  _id: string;
  sender: IFriend;
  receiver: IFriend;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}