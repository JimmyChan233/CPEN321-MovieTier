import { Response } from "express";
import { AuthRequest } from "../../types/middleware.types";
import FeedActivity from "../../models/feed/FeedActivity";
import RankedMovie from "../../models/movie/RankedMovie";
import { getTmdbClient } from "../../services/tmdb/tmdbClient";
import { Friendship } from "../../models/friend/Friend";
import { sseService } from "../../services/sse/sseService";
import Like from "../../models/feed/Like";
import Comment from "../../models/feed/Comment";
import User from "../../models/user/User";
import notificationService from "../../services/notification.service";
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from "../../utils/responseHandler";

/**
 * Check if an activity needs TMDB enrichment for missing metadata
 */
function needsEnrichment(activity: unknown): boolean {
  const a = activity as { overview?: string; posterPath?: string };
  return !a.overview || !a.posterPath;
}

/**
 * Enrich activities with TMDB data
 */
async function enrichActivities(activities: unknown[]) {
  const tmdb = getTmdbClient();
  const toEnrich = activities.filter(needsEnrichment).slice(0, 8);

  await Promise.all(
    toEnrich.map(async (a: unknown) => {
      try {
        const activity = a as {
          movieId: number;
          overview?: string;
          posterPath?: string;
          releaseDate?: string;
          voteAverage?: number;
          save: () => Promise<void>;
        };
        const { data } = await tmdb.get(`/movie/${activity.movieId}`, {
          params: { language: "en-US" },
        });
        if (!activity.overview && data?.overview)
          activity.overview = data.overview;
        if (!activity.posterPath && data?.poster_path)
          activity.posterPath = data.poster_path;
        if (!activity.releaseDate && data?.release_date)
          activity.releaseDate = data.release_date;
        if (!activity.voteAverage && data?.vote_average)
          activity.voteAverage = data.vote_average;
        await activity.save();
      } catch {}
    }),
  );
}

/**
 * Fetch current ranks from RankedMovie
 */
async function fetchMovieRanks(
  activities: unknown[],
): Promise<Map<string, number>> {
  const movieRankMap = new Map<string, number>();

  await Promise.all(
    activities.map(async (a: unknown) => {
      try {
        const activity = a as { userId?: { _id: unknown }; movieId?: unknown };
        const rankedMovie = await RankedMovie.findOne({
          userId: activity.userId?._id,
          movieId: activity.movieId,
        });
        if (rankedMovie) {
          const key = `${String(activity.userId?._id)}_${String(activity.movieId)}`;
          movieRankMap.set(key, rankedMovie.rank);
        }
      } catch {}
    }),
  );

  return movieRankMap;
}

/**
 * Fetch like data for activities
 */
async function fetchLikeData(activityIds: unknown[], userId?: string) {
  const likeCounts = await Like.aggregate([
    { $match: { activityId: { $in: activityIds } } },
    { $group: { _id: "$activityId", count: { $sum: 1 } } },
  ]);
  const likeCountMap = new Map(
    likeCounts.map((lc: unknown) => {
      const likeCount = lc as { _id: unknown; count: number };
      return [String(likeCount._id), likeCount.count];
    }),
  );

  const userLikes = await Like.find({
    userId,
    activityId: { $in: activityIds },
  });
  const userLikeSet = new Set(userLikes.map((l) => String(l.activityId)));

  return { likeCountMap, userLikeSet };
}

/**
 * Fetch comment counts for activities
 */
async function fetchCommentCounts(
  activityIds: unknown[],
): Promise<Map<string, number>> {
  const commentCounts = await Comment.aggregate([
    { $match: { activityId: { $in: activityIds } } },
    { $group: { _id: "$activityId", count: { $sum: 1 } } },
  ]);

  return new Map(
    commentCounts.map((cc: unknown) => {
      const commentCount = cc as { _id: unknown; count: number };
      return [String(commentCount._id), commentCount.count];
    }),
  );
}

/**
 * Shape activity data for response
 */
function shapeActivities(
  activities: unknown[],
  movieRankMap: Map<string, number>,
  likeCountMap: Map<string, number>,
  userLikeSet: Set<string>,
  commentCountMap: Map<string, number>,
) {
  return activities.map((a: unknown) => {
    const activity = a as {
      _id: unknown;
      userId?: { _id: unknown; name?: string; profileImageUrl?: string };
      movieId?: unknown;
      movieTitle?: string;
      activityType?: string;
      posterPath?: string;
      overview?: string;
      releaseDate?: string;
      voteAverage?: number;
      createdAt?: Date;
    };
    const key = `${String(activity.userId?._id)}_${String(activity.movieId)}`;
    const currentRank = movieRankMap.get(key);
    const activityIdStr = String(activity._id);

    return {
      _id: activity._id,
      userId: activity.userId?._id,
      userName: activity.userId?.name,
      userProfileImage: activity.userId?.profileImageUrl,
      activityType: activity.activityType,
      movie: {
        id: activity.movieId,
        title: activity.movieTitle,
        posterPath: activity.posterPath ?? null,
        overview: activity.overview ?? null,
        releaseDate: activity.releaseDate ?? null,
        voteAverage: activity.voteAverage ?? null,
      },
      rank: currentRank ?? null,
      likeCount: likeCountMap.get(activityIdStr) ?? 0,
      commentCount: commentCountMap.get(activityIdStr) ?? 0,
      isLikedByUser: userLikeSet.has(activityIdStr),
      createdAt: activity.createdAt,
    };
  });
}

export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const friendships = await Friendship.find({ userId: req.userId });
    const friendIds = friendships.map((f) => f.friendId);

    const activities = await FeedActivity.find({
      userId: { $in: friendIds },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "name email profileImageUrl");

    await enrichActivities(activities);
    const movieRankMap = await fetchMovieRanks(activities);

    const activityIds = activities.map((a) => a._id);
    const { likeCountMap, userLikeSet } = await fetchLikeData(
      activityIds,
      req.userId,
    );
    const commentCountMap = await fetchCommentCounts(activityIds);

    const shaped = shapeActivities(
      activities,
      movieRankMap,
      likeCountMap,
      userLikeSet,
      commentCountMap,
    );

    return sendSuccess(res, shaped);
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_GET_FEED, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const getMyFeed = async (req: AuthRequest, res: Response) => {
  try {
    const activities = await FeedActivity.find({
      userId: req.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "name email profileImageUrl");

    await enrichActivities(activities);
    const movieRankMap = await fetchMovieRanks(activities);

    const activityIds = activities.map((a) => a._id);
    const { likeCountMap, userLikeSet } = await fetchLikeData(
      activityIds,
      req.userId,
    );
    const commentCountMap = await fetchCommentCounts(activityIds);

    const shaped = shapeActivities(
      activities,
      movieRankMap,
      likeCountMap,
      userLikeSet,
      commentCountMap,
    );

    return sendSuccess(res, shaped);
  } catch (error) {
    return sendError(res, "Unable to load your activities", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const streamFeed = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`event: connected\n` + `data: {"ok":true}\n\n`);

    const userIdStr = String(userId);
    sseService.addClient(userIdStr, res);
    req.on("close", () => {
      sseService.removeClient(userIdStr, res);
    });
  } catch {
    res.end();
  }
};

export const likeActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { activityId } = req.params;

    const activity = await FeedActivity.findById(activityId).populate("userId");
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Activity not found" });
    }

    const like = new Like({
      userId: req.userId,
      activityId,
    });
    await like.save();

    // Send notification to activity owner (but not if liking own activity)
    if (String(activity.userId._id) !== String(req.userId)) {
      try {
        const liker = await User.findById(req.userId);
        const activityOwner = activity.userId as unknown as {
          fcmToken?: string;
        };

        if (activityOwner.fcmToken && liker) {
          await notificationService.sendLikeNotification(
            activityOwner.fcmToken,
            liker.name,
            activity.movieTitle,
            String(activity._id),
          );
        }
      } catch (notifError) {
        console.error("Failed to send like notification:", notifError);
      }
    }

    return sendSuccess(res, { message: "Activity liked" }, HttpStatus.CREATED);
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 11000) {
      return sendError(res, "Already liked", HttpStatus.BAD_REQUEST);
    }
    return sendError(res, ErrorMessages.FAILED_LIKE, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const unlikeActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { activityId } = req.params;

    const result = await Like.findOneAndDelete({
      userId: req.userId,
      activityId,
    });

    if (!result) {
      return sendError(res, "Like not found", HttpStatus.NOT_FOUND);
    }

    return sendSuccess(res, { message: "Like removed" });
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_UNLIKE, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { activityId } = req.params;

    const comments = await Comment.find({ activityId })
      .sort({ createdAt: 1 })
      .populate("userId", "name profileImageUrl")
      .limit(100);

    const shaped = comments.map((c: unknown) => {
      const comment = c as {
        _id: unknown;
        userId?: { _id: unknown; name?: string; profileImageUrl?: string };
        text?: string;
        createdAt?: Date;
      };
      return {
        _id: comment._id,
        userId: comment.userId?._id,
        userName: comment.userId?.name,
        userProfileImage: comment.userId?.profileImageUrl,
        text: comment.text,
        createdAt: comment.createdAt,
      };
    });

    return sendSuccess(res, shaped);
  } catch (error) {
    return sendError(res, "Failed to load comments", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { activityId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return sendError(res, "Comment text is required", HttpStatus.BAD_REQUEST);
    }

    if (text.length > 500) {
      return sendError(res, "Comment must be 500 characters or less", HttpStatus.BAD_REQUEST);
    }

    const activity = await FeedActivity.findById(activityId).populate("userId");
    if (!activity) {
      return sendError(res, "Activity not found", HttpStatus.NOT_FOUND);
    }

    const comment = new Comment({
      userId: req.userId,
      activityId,
      text: text.trim(),
    });
    await comment.save();
    await comment.populate("userId", "name profileImageUrl");

    const populatedUser = comment.userId as unknown as {
      _id: unknown;
      name?: string;
      profileImageUrl?: string;
    };
    const shaped = {
      _id: comment._id,
      userId: populatedUser._id,
      userName: populatedUser.name,
      userProfileImage: populatedUser.profileImageUrl,
      text: comment.text,
      createdAt: comment.createdAt,
    };

    // Send notification to activity owner (but not if commenting on own activity)
    if (String(activity.userId._id) !== String(req.userId)) {
      try {
        const commenter = await User.findById(req.userId);
        const activityOwner = activity.userId as unknown as {
          fcmToken?: string;
        };

        if (activityOwner.fcmToken && commenter) {
          await notificationService.sendCommentNotification(
            activityOwner.fcmToken,
            commenter.name,
            comment.text,
            activity.movieTitle,
            String(activity._id),
          );
        }
      } catch (notifError) {
        console.error("Failed to send comment notification:", notifError);
      }
    }

    return sendSuccess(res, shaped, HttpStatus.CREATED);
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_COMMENT, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { activityId, commentId } = req.params;

    const comment = await Comment.findOne({
      _id: commentId,
      activityId,
    });

    if (!comment) {
      return sendError(res, "Comment not found", HttpStatus.NOT_FOUND);
    }

    if (String(comment.userId) !== String(req.userId)) {
      return sendError(res, "You can only delete your own comments", HttpStatus.FORBIDDEN);
    }

    await Comment.findByIdAndDelete(commentId);

    return sendSuccess(res, { message: "Comment deleted" });
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_DELETE_COMMENT, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
