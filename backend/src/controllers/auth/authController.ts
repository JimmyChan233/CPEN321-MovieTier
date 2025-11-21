import { Request, Response } from "express";
import { AuthService } from "../../services/auth/authService";
import { AuthRequest } from "../../types/middleware.types";
import { ISignInRequest, ISignUpRequest } from "../../types/request.types";
import User from "../../models/user/User";
import { Friendship, FriendRequest } from "../../models/friend/Friend";

const authService = new AuthService();

export const signIn = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as ISignInRequest;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "ID token is required",
      });
    }

    const { user, token } = await authService.signIn(idToken);

    res.json({
      success: true,
      message: "Sign in successful",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
      },
      token,
    });
  } catch (error: unknown) {
    res.status(400).json({
      success: false,
      message:
        (error as Error).message || "Unable to sign in. Please try again",
    });
  }
};

export const signUp = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as ISignUpRequest;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "ID token is required",
      });
    }

    const { user, token } = await authService.signUp(idToken);

    res.status(201).json({
      success: true,
      message: "Sign up successful",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
      },
      token,
    });
  } catch (error: unknown) {
    res.status(400).json({
      success: false,
      message:
        (error as Error).message || "Unable to sign up. Please try again",
    });
  }
};

export const signOut = (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: "Signed out successfully",
  });
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Delete user and cascade delete friendships and friend requests
    const userId = req.userId;
    await Promise.all([
      User.findByIdAndDelete(userId),
      Friendship.deleteMany({ $or: [{ userId }, { friendId: userId }] }),
      FriendRequest.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }),
    ]);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message:
        (error as Error).message ||
        "Unable to delete account. Please try again",
    });
  }
};
