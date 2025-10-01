import { Request, Response } from 'express';
import { AuthService } from '../../services/auth/authService';
import { AuthRequest } from '../../middleware/auth';
import User from '../../models/user/User';

const authService = new AuthService();

export const signIn = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required'
      });
    }

    const { user, token } = await authService.signIn(idToken);

    res.json({
      success: true,
      message: 'Sign in successful',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl
      },
      token
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Sign in failed'
    });
  }
};

export const signUp = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required'
      });
    }

    const { user, token } = await authService.signUp(idToken);

    res.status(201).json({
      success: true,
      message: 'Sign up successful',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl
      },
      token
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Sign up failed'
    });
  }
};

export const signOut = async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Signed out successfully'
  });
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await User.findByIdAndDelete(req.userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete account'
    });
  }
};
