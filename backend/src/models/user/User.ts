import mongoose, { Schema } from "mongoose";
import { IUser } from "../../types/user.types";

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    googleId: { type: String, required: true, unique: true },
    profileImageUrl: { type: String },
    googlePictureUrl: { type: String },
    fcmToken: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
