import mongoose, { Document, Schema } from 'mongoose';

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

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    googleId: { type: String, required: true, unique: true },
    profileImageUrl: { type: String },
    googlePictureUrl: { type: String },
    fcmToken: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
