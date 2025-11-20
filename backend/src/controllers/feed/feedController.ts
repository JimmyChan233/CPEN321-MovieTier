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

    res.json({ success: true, data: shaped });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Unable to load feed. Please try again",
      });
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

    res.json({ success: true, data: shaped });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Unable to load your activities" });
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

    res.status(201).json({ success: true, message: "Activity liked" });
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Already liked" });
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to like activity" });
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
      return res
        .status(404)
        .json({ success: false, message: "Like not found" });
    }

    res.json({ success: true, message: "Like removed" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to unlike activity" });
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

    res.json({ success: true, data: shaped });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to load comments" });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { activityId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Comment text is required" });
    }

    if (text.length > 500) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Comment must be 500 characters or less",
        });
    }

    const activity = await FeedActivity.findById(activityId).populate("userId");
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "Activity not found" });
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

    res.status(201).json({ success: true, data: shaped });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add comment" });
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
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    if (String(comment.userId) !== String(req.userId)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You can only delete your own comments",
        });
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete comment" });
  }
};
