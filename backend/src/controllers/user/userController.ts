import { Response } from "express";
import { AuthRequest } from "../../types/middleware.types";
import { IUpdateProfileRequest, IUpdateFCMTokenRequest } from "../../types/request.types";
import User from "../../models/user/User";
import mongoose from "mongoose";
import WatchlistItem from "../../models/watch/WatchlistItem";
import { Friendship } from "../../models/friend/Friend";
import RankedMovie from "../../models/movie/RankedMovie";
import { logger } from "../../utils/logger";
import {
  sendSuccess,
  sendError,
  HttpStatus,
} from "../../utils/responseHandler";
import { isValidMongoId, isValidString } from "../../utils/validators";

/**
 * Escape special regex characters for MongoDB $regex operator
 * This prevents ReDoS attacks by sanitizing user input before using it in a regex pattern
 */
function escapeRegexForMongo(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = String(req.query.query ?? "");
    if (!isValidString(query, 2)) {
      return sendError(
        res,
        "Query must be at least 2 characters",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Escape special regex characters to prevent ReDoS attacks
    const escapedQuery = escapeRegexForMongo(query.trim());
    const users = await User.find({
      _id: { $ne: req.userId },
      name: { $regex: escapedQuery, $options: "i" },
    })
      .select("_id email name profileImageUrl")
      .limit(20);

    return sendSuccess(res, users);
  } catch (error) {
    return sendError(
      res,
      "Unable to search users. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, profileImageUrl } = req.body as IUpdateProfileRequest;
    logger.info(`Profile update request for user ${req.userId}`, {
      name: name !== undefined ? "updating" : "unchanged",
      profileImageUrl: profileImageUrl !== undefined ? "updating" : "unchanged",
    });

    if (name === undefined && profileImageUrl === undefined) {
      logger.warn("Profile update failed: no fields provided");
      return sendError(
        res,
        "At least one field (name or profileImageUrl) is required",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (name !== undefined && !isValidString(name)) {
      logger.warn("Profile update failed: empty name");
      return sendError(res, "Name is required", HttpStatus.BAD_REQUEST);
    }

    const updateFields: { name?: string; profileImageUrl?: string } = {};
    if (name !== undefined) {
      updateFields.name = name.trim();
    }
    if (profileImageUrl !== undefined) {
      updateFields.profileImageUrl = profileImageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateFields },
      { new: true, runValidators: true },
    ).select("_id email name profileImageUrl");

    if (!user) {
      logger.error(`Profile update failed: user ${req.userId} not found`);
      return sendError(res, "User not found", HttpStatus.NOT_FOUND);
    }

    logger.success(`Profile updated for user ${req.userId}`);
    return sendSuccess(res, user);
  } catch (error) {
    logger.error("Profile update error:", error);
    return sendError(
      res,
      "Unable to update profile. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const registerFcmToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body as IUpdateFCMTokenRequest;

    if (!isValidString(token)) {
      return sendError(res, "FCM token is required", HttpStatus.BAD_REQUEST);
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { fcmToken: token.trim() } },
      { new: true },
    ).select("_id email name profileImageUrl fcmToken");

    if (!user) {
      return sendError(res, "User not found", HttpStatus.NOT_FOUND);
    }

    logger.success(`FCM token registered for user ${req.userId}`);
    return sendSuccess(res, { message: "FCM token registered successfully" });
  } catch (error) {
    logger.error("FCM token registration error:", error);
    return sendError(
      res,
      "Unable to register FCM token. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };
    if (!isValidMongoId(userId)) {
      return sendError(res, "Invalid user id", HttpStatus.BAD_REQUEST);
    }
    const user = await User.findById(userId).select(
      "_id email name profileImageUrl",
    );
    if (!user) {
      return sendError(res, "User not found", HttpStatus.NOT_FOUND);
    }
    return sendSuccess(res, user);
  } catch (error) {
    return sendError(
      res,
      "Unable to load user. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const getUserWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };
    if (!isValidMongoId(userId)) {
      return sendError(res, "Invalid user id", HttpStatus.BAD_REQUEST);
    }

    // Allow users to see their own watchlist
    if (String(req.userId) !== userId) {
      // For other users, check for friendship
      const areFriends = await Friendship.findOne({
        userId: req.userId,
        friendId: userId,
      });
      if (!areFriends) {
        return sendError(
          res,
          "You must be friends to view this watchlist.",
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const items = await WatchlistItem.find({ userId }).sort({ createdAt: -1 });
    return sendSuccess(res, items);
  } catch (error) {
    return sendError(
      res,
      "Unable to load user watchlist. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const getUserRankings = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };
    if (!isValidMongoId(userId)) {
      return sendError(res, "Invalid user id", HttpStatus.BAD_REQUEST);
    }

    // Friendship check
    const areFriends = await Friendship.findOne({
      userId: req.userId,
      friendId: userId,
    });
    if (!areFriends && String(req.userId) !== userId) {
      return sendError(
        res,
        "You must be friends to view these rankings.",
        HttpStatus.FORBIDDEN,
      );
    }

    const movies = await RankedMovie.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ rank: 1 });
    const shaped = movies.map((m) => {
      const movieDoc = m as unknown as {
        _id: unknown;
        userId: unknown;
        movieId: number;
        title: string;
        posterPath?: string;
        rank: number;
        createdAt?: Date;
      };
      return {
        _id: movieDoc._id,
        userId: movieDoc.userId,
        movie: {
          id: movieDoc.movieId,
          title: movieDoc.title,
          overview: null,
          posterPath: movieDoc.posterPath ?? null,
          releaseDate: null,
          voteAverage: null,
        },
        rank: movieDoc.rank,
        createdAt: movieDoc.createdAt,
      };
    });

    return sendSuccess(res, shaped);
  } catch (error) {
    return sendError(
      res,
      "Unable to load rankings. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};
