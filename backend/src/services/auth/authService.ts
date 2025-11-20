import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User, { IUser } from "../../models/user/User";
import { logger } from "../../utils/logger";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  async verifyGoogleToken(
    idToken: string,
  ): Promise<{
    email: string;
    name: string;
    googleId: string;
    picture?: string;
  }> {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub) {
        throw new Error("Invalid token payload");
      }

      return {
        email: payload.email,
        name: payload.name || payload.email,
        googleId: payload.sub,
        picture: payload.picture,
      };
    } catch (error) {
      throw new Error("Invalid Google token");
    }
  }

  async signIn(idToken: string): Promise<{ user: IUser; token: string }> {
    const googleData = await this.verifyGoogleToken(idToken);
    logger.info(`Sign in attempt for email: ${googleData.email}`);

    const user = await User.findOne({ email: googleData.email });

    if (!user) {
      logger.warn(`Sign in failed: user not found for ${googleData.email}`);
      throw new Error("User not found. Please sign up first.");
    }

    const token = this.generateToken(String(user._id));
    logger.success(`User signed in: ${user.email} (${String(user._id)})`);

    return { user, token };
  }

  async signUp(idToken: string): Promise<{ user: IUser; token: string }> {
    const googleData = await this.verifyGoogleToken(idToken);
    logger.info(`Sign up attempt for email: ${googleData.email}`);

    const existingUser = await User.findOne({ email: googleData.email });

    if (existingUser) {
      logger.warn(
        `Sign up failed: user already exists for ${googleData.email}`,
      );
      throw new Error("User already exists. Please sign in.");
    }

    const user = new User({
      email: googleData.email,
      name: googleData.name,
      googleId: googleData.googleId,
      profileImageUrl: googleData.picture,
      googlePictureUrl: googleData.picture,
    });

    await user.save();
    logger.success(`New user created: ${user.email} (${String(user._id)})`);

    const token = this.generateToken(String(user._id));

    return { user, token };
  }

  generateToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET ?? "default_secret", {
      expiresIn: "30d",
    }) as string;
  }
}
