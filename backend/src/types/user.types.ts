import { Document } from "mongoose";

/**
 * User interface representing a user document in MongoDB
 */
export interface IUser extends Document {
  email: string;
  name: string;
  googleId: string;
  profileImageUrl?: string;
  googlePictureUrl?: string;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User profile data for API responses
 */
export interface IUserProfile {
  _id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
}

/**
 * User authentication response
 */
export interface IAuthResponse {
  user: IUserProfile;
  token: string;
}
