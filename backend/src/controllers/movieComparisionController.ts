import { Request, Response } from 'express';
import mongoose from 'mongoose';
const RankedMovie = (mongoose.models.RankedMovie || mongoose.model('RankedMovie')) as any;
import FeedActivity from '../models/feed/FeedActivity';
import { Friendship } from '../models/friend/Friend';
import { sseService } from '../services/sse/sseService';
import {
  startSession,
  getSession,
  updateSession,
  endSession,
} from '../utils/comparisonSession';
import { IRankedMovie } from '../models/movie/RankedMovie';
import WatchlistItem from '../models/watch/WatchlistItem';

async function removeFromWatchlistAll(userIdObj: mongoose.Types.ObjectId, userIdStr: string, movieId: number) {
  try { await WatchlistItem.deleteOne({ userId: userIdObj, movieId }); } catch {}
  try { await WatchlistItem.deleteOne({ userId: userIdStr as any, movieId }); } catch {}
}


export const addMovie = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { movieId, title, posterPath, overview } = req.body;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const rankedMovies = await RankedMovie.find({ userId: userObjectId }).sort({ rank: 1 });

    // Case 1: First movie
    if (rankedMovies.length === 0) {
      const rankedMovie = new RankedMovie({
        userId: userObjectId,
        movieId,
        title,
        posterPath,
        rank: 1,
      });
      await rankedMovie.save();

      // Remove from watchlist if present
      await removeFromWatchlistAll(userObjectId, userId, movieId)

    //   // Optional: add feed activity
    //   const activity = new FeedActivity({
    //     userId,
    //     activityType: 'ranked_movie',
    //     movieId,
    //     movieTitle: title,
    //     posterPath,
    //     overview,
    //     rank: 1,
    //   });
    //   await activity.save();

    // --- FEED + SSE Notification ---
    // Enrich details for activity if missing
    let finalPosterPath = posterPath
    let finalOverview = overview
    try {
      if (!finalPosterPath || !finalOverview) {
        const { getTmdbClient } = await import('../services/tmdb/tmdbClient')
        const tmdb = getTmdbClient()
        const { data } = await tmdb.get(`/movie/${movieId}`, { params: { language: 'en-US' } })
        if (!finalPosterPath) finalPosterPath = data?.poster_path || undefined
        if (!finalOverview) finalOverview = data?.overview || undefined
      }
    } catch {}

    const activity = new FeedActivity({
      userId,
      activityType: 'ranked_movie',
      movieId,
      movieTitle: title,
      posterPath: finalPosterPath,
      overview: finalOverview,
      rank: 1,
    });
    await activity.save();

    // Notify friends via SSE
    const friendships = await Friendship.find({ userId });
    friendships.forEach((f) => {
      sseService.send(String(f.friendId), 'feed_activity', {
        activityId: activity._id,
      });
    });


      return res.json({ success: true, status: 'added', data: rankedMovie });
    }

    // Case 2: Duplicate movie
    if (rankedMovies.some((m: IRankedMovie) => m.movieId === movieId)) {
      await removeFromWatchlistAll(userObjectId, userId, movieId)
      return res.status(400).json({
        success: false,
        message: 'Movie already ranked'
      });
    }

    // Case 3: Begin comparison
    // Use the same middle calculation as compareMovies to avoid repetitive comparisons
    const high = rankedMovies.length - 1;
    const middleIndex = Math.floor((0 + high) / 2);
    const compareWith = rankedMovies[middleIndex];
    startSession(userId, { movieId, title, posterPath }, high);

    // Remove from watchlist immediately when starting comparison
    await removeFromWatchlistAll(userObjectId, userId, movieId)

    return res.json({
      success: true,
      status: 'compare',
      data: {
        compareWith: {
          movieId: compareWith.movieId,
          title: compareWith.title,
          posterPath: compareWith.posterPath,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to add movie' });
  }
};

export const compareMovies = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { comparedMovieId, preferredMovieId } = req.body;
    const session = getSession(userId);

    if (!session) {
      return res.status(400).json({ success: false, message: 'No active comparison session' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const rankedMovies = await RankedMovie.find({ userId: userObjectId }).sort({ rank: 1 });

    let { low, high } = session;
    const middleIndex = Math.floor((low + high) / 2);

    if (preferredMovieId === session.newMovie.movieId) {
      high = middleIndex - 1; // new movie better
    } else {
      low = middleIndex + 1; // existing better
    }

    // Stopping condition
    if (low > high) {
      const newRank = low + 1;

      await RankedMovie.updateMany(
        { userId: userObjectId, rank: { $gte: newRank } },
        { $inc: { rank: 1 } }
      );

      const movie = new RankedMovie({
        userId: userObjectId,
        movieId: session.newMovie.movieId,
        title: session.newMovie.title,
        posterPath: session.newMovie.posterPath,
        rank: newRank,
      });

      await movie.save();

      // Remove from watchlist if present
      await removeFromWatchlistAll(userObjectId, userId, movie.movieId)
      endSession(userId);

    //   // Optional: feed update
    //   const activity = new FeedActivity({
    //     userId,
    //     activityType: 'ranked_movie',
    //     movieId: movie.movieId,
    //     movieTitle: movie.title,
    //     posterPath: movie.posterPath,
    //     overview: null,
    //     rank: movie.rank,
    //   });
    //   await activity.save();

    //   // SSE notifications (same as in your /rank route)
    //   const friendships = await Friendship.find({ userId });
    //   friendships.forEach((f) => {
    //     sseService.send(String(f.friendId), 'feed_activity', {
    //       activityId: activity._id,
    //     });
    //   });

    // --- FEED + SSE Notification ---
      // Enrich details for activity when finalizing insert
      let finalPosterPath: string | undefined = movie.posterPath
      let finalOverview: string | undefined = undefined
      try {
        const { getTmdbClient } = await import('../services/tmdb/tmdbClient')
        const tmdb = getTmdbClient()
        const { data } = await tmdb.get(`/movie/${movie.movieId}`, { params: { language: 'en-US' } })
        if (!finalPosterPath) finalPosterPath = data?.poster_path || undefined
        finalOverview = data?.overview || undefined
      } catch {}

      const activity = new FeedActivity({
        userId,
        activityType: 'ranked_movie',
        movieId: movie.movieId,
        movieTitle: movie.title,
        posterPath: finalPosterPath,
        overview: finalOverview,
        rank: movie.rank,
      });
      await activity.save();

      // Notify friends via SSE
      const friendships = await Friendship.find({ userId });
      friendships.forEach((f) => {
        sseService.send(String(f.friendId), 'feed_activity', {
          activityId: activity._id,
        });
      });


      return res.json({ success: true, status: 'added', data: movie });
    }

    // Continue comparison
    updateSession(userId, low, high);
    const nextIndex = Math.floor((low + high) / 2);
    const nextCompare = rankedMovies[nextIndex];

    return res.json({
      success: true,
      status: 'compare',
      data: {
        compareWith: {
          movieId: nextCompare.movieId,
          title: nextCompare.title,
          posterPath: nextCompare.posterPath,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to compare movies' });
  }
};
