import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../../models/user/User';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  async verifyGoogleToken(idToken: string): Promise<{ email: string; name: string; googleId: string; picture?: string }> {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.sub) {
        throw new Error('Invalid token payload');
      }

      return {
        email: payload.email,
        name: payload.name || payload.email,
        googleId: payload.sub,
        picture: payload.picture
      };
    } catch (error) {
      throw new Error('Invalid Google token');
    }
  }

  async signIn(idToken: string): Promise<{ user: IUser; token: string }> {
    const googleData = await this.verifyGoogleToken(idToken);

    const user = await User.findOne({ email: googleData.email });

    if (!user) {
      throw new Error('User not found. Please sign up first.');
    }

    const token = this.generateToken(String(user._id));

    return { user, token };
  }

  async signUp(idToken: string): Promise<{ user: IUser; token: string }> {
    const googleData = await this.verifyGoogleToken(idToken);

    const existingUser = await User.findOne({ email: googleData.email });

    if (existingUser) {
      throw new Error('User already exists. Please sign in.');
    }

    const user = new User({
      email: googleData.email,
      name: googleData.name,
      googleId: googleData.googleId,
      profileImageUrl: googleData.picture
    });

    await user.save();

    const token = this.generateToken(String(user._id));

    return { user, token };
  }

  generateToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'default_secret', {
      expiresIn: '30d'
    });
  }
}
