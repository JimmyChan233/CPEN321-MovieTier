import { Request, Response } from "express";
import mongoose from "mongoose";
import RankedMovieModel from "../../models/movie/RankedMovie";
import { IRankedMovie } from "../../types/movie.types";
import {
  IAddMovieRequest,
  ICompareMoviesRequest,
  IBodyWithRankedId,
} from "../../types/request.types";
import {
  IMovieResult,
  IWatchProvider,
  IWatchProvidersResult,
} from "../../types/response.types";
import FeedActivity from "../../models/feed/FeedActivity";
import { Friendship } from "../../models/friend/Friend";
import WatchlistItem from "../../models/watch/WatchlistItem";
import User from "../../models/user/User";
import { sseService } from "../../services/sse/sseService";
import {
  startSession,
  getSession,
  updateSession,
  endSession,
} from "../../utils/comparisonSession";
import notificationService from "../../services/notification.service";
import { AuthRequest } from "../../types/middleware.types";
import { logger } from "../../utils/logger";
import { getTmdbClient } from "../../services/tmdb/tmdbClient";
import { fetchMovieTagline } from "../../services/tmdb/tmdbTaglineService";
import { randomInt } from "crypto";
import {
  normalizeMovieDetails,
  normalizeCastArray,
  findBestTrailer,
  filterYoutubeVideos,
} from "../../utils/tmdbResponseHelpers";
import {
  sendSuccess,
  sendError,
  ErrorMessages,
  HttpStatus,
} from "../../utils/responseHandler";
import { isValidSearchQuery, isValidMongoId } from "../../utils/validators";

const RankedMovie = RankedMovieModel;

// Fallback quotes for when TMDB doesn't have a tagline
const fallbackQuotes = [
  "Every story has a beginning.",
  "The best movies are yet to come.",
  "Cinema is a mirror of reality.",
  "Great films inspire great moments.",
  "Movies bring stories to life.",
  "Where words fail, cinema speaks.",
  "A journey through moving pictures.",
  "Experience the magic of film.",
];

/**
 * Remove a movie from user's watchlist if present
 * Safely ignores errors if item doesn't exist
 */
async function removeFromWatchlist(
  userId: string,
  movieId: number,
): Promise<void> {
  try {
    await WatchlistItem.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
      movieId,
    });
  } catch (err) {
    logger.warn("Failed to remove watchlist item", {
      userId,
      movieId,
      error: (err as Error).message,
    });
  }
}

export const searchMovies = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.query ?? "").trim();
    if (!isValidSearchQuery(query)) {
      return sendError(
        res,
        "Query must be at least 2 characters",
        HttpStatus.BAD_REQUEST,
      );
    }

    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    if (!apiKey) {
      return sendError(
        res,
        "TMDB API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const tmdb = getTmdbClient();
    const { data } = await tmdb.get("/search/movie", {
      params: {
        query,
        include_adult: false,
        language: "en-US",
        page: 1,
      },
    });

    const includeCast =
      String(req.query.includeCast ?? "false").toLowerCase() === "true";

    // Helper to convert TMDB movie to MovieResult
    const convertToMovieResult = (m: unknown): IMovieResult => {
      const movie = m as {
        id: number;
        title: string;
        overview?: string;
        poster_path?: string;
        release_date?: string;
        vote_average?: number;
      };
      return {
        id: movie.id,
        title: movie.title,
        overview: movie.overview ?? null,
        posterPath: movie.poster_path ?? null,
        releaseDate: movie.release_date ?? null,
        voteAverage: movie.vote_average ?? null,
      };
    };

    let baseResults: IMovieResult[] = (data.results ?? []).map(
      convertToMovieResult,
    );

    // If no results and query likely Chinese, search zh-CN and return English titles via detail fetch
    const hasCjk = /[\u3400-\u9FBF\uF900-\uFAFF]/.test(query);
    if (baseResults.length === 0 && hasCjk) {
      try {
        const { data: zh } = await tmdb.get("/search/movie", {
          params: { query, include_adult: false, language: "zh-CN", page: 1 },
        });
        const zhResults: unknown[] = Array.isArray(zh?.results)
          ? zh.results
          : [];
        const limit = Math.min(zhResults.length, 10);
        const detailed = await Promise.all(
          zhResults.slice(0, limit).map(async (m: unknown) => {
            const movie = m as {
              id: number;
              title: string;
              overview?: string;
              poster_path?: string;
              release_date?: string;
              vote_average?: number;
            };
            try {
              const { data: det } = await tmdb.get(`/movie/${movie.id}`, {
                params: { language: "en-US" },
              });
              return convertToMovieResult({
                id: det.id || movie.id,
                title: det.title || movie.title,
                overview: det.overview || movie.overview,
                poster_path: det.poster_path || movie.poster_path,
                release_date: det.release_date || movie.release_date,
                vote_average: det.vote_average || movie.vote_average,
              });
            } catch {
              return convertToMovieResult(movie);
            }
          }),
        );
        baseResults = detailed;
      } catch {
        // ignore fallback failures; proceed with empty results
      }
    }

    if (!includeCast || baseResults.length === 0) {
      return sendSuccess(res, baseResults);
    }

    // Enrich with top cast names (up to 3) for first up to 10 results
    const limit = Math.min(baseResults.length, 10);
    const enriched = await Promise.all(
      baseResults.slice(0, limit).map(async (r) => {
        try {
          const { data: credits } = await tmdb.get(`/movie/${r.id}/credits`, {
            params: { language: "en-US" },
          });
          const cast = Array.isArray(credits?.cast)
            ? credits.cast
                .slice(0, 3)
                .map((c: unknown) => {
                  const castMember = c as { name?: string };
                  return castMember.name;
                })
                .filter(Boolean)
            : [];
          return { ...r, cast };
        } catch {
          return { ...r, cast: [] };
        }
      }),
    );
    const remaining = baseResults.slice(limit).map((r) => ({ ...r, cast: [] }));
    const combined = enriched.concat(remaining);
    return sendSuccess(res, combined);
  } catch (error) {
    return sendError(
      res,
      ErrorMessages.FAILED_SEARCH,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const getRankedMovies = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const movies = await RankedMovie.find({ userId: authReq.userId }).sort({
      rank: 1,
    });
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

export const deleteRankedMovie = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    if (!isValidMongoId(id)) {
      return sendError(res, "Invalid id", HttpStatus.BAD_REQUEST);
    }
    const doc = await RankedMovie.findOne({ _id: id, userId: authReq.userId });
    if (!doc) {
      return sendError(res, "Ranked movie not found", HttpStatus.NOT_FOUND);
    }
    const removedRank = doc.rank;
    const removedMovieId = doc.movieId;
    await doc.deleteOne();
    await RankedMovie.updateMany(
      { userId: authReq.userId, rank: { $gt: removedRank } },
      { $inc: { rank: -1 } },
    );
    // remove related feed activities
    try {
      await FeedActivity.deleteMany({
        userId: authReq.userId,
        movieId: removedMovieId,
      });
    } catch {}

    const friendships = await Friendship.find({ userId: authReq.userId });
    friendships.forEach((f) => {
      sseService.send(String(f.friendId), "ranking_changed", {
        userId: authReq.userId,
      });
    });

    return sendSuccess(res, { message: "Removed from rankings" });
  } catch (error) {
    return sendError(
      res,
      "Unable to remove from rankings. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const getWatchProviders = async (req: Request, res: Response) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!movieId || Number.isNaN(movieId)) {
      return sendError(res, "Invalid movie id", HttpStatus.BAD_REQUEST);
    }

    const country = String(req.query.country ?? "CA").toUpperCase();

    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    if (!apiKey) {
      return sendError(
        res,
        "TMDB API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const tmdb = getTmdbClient();
    let { data } = await tmdb.get(`/movie/${movieId}/watch/providers`);

    const results = data?.results ?? {};
    const result = (
      Object.prototype.hasOwnProperty.call(results, country)
        ? results[country as keyof typeof results]
        : {}
    ) as IWatchProvidersResult;

    let link: string | null = result.link ?? null;
    if (!link) {
      // Fallback to TMDB movie watch page for the exact movie
      link = `https://www.themoviedb.org/movie/${movieId}/watch?locale=${country}`;
    }
    const mapProviders = (arr: unknown[] | undefined): string[] =>
      Array.isArray(arr)
        ? arr
            .map((p: unknown) => {
              const provider = p as IWatchProvider;
              return provider.provider_name;
            })
            .filter((name): name is string => Boolean(name))
        : [];

    const payload = {
      link,
      providers: {
        flatrate: mapProviders(result.flatrate),
        rent: mapProviders(result.rent),
        buy: mapProviders(result.buy),
      },
    };

    return sendSuccess(res, payload);
  } catch (error) {
    return sendError(
      res,
      "Unable to load watch providers. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const getMovieDetails = async (req: Request, res: Response) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!movieId || Number.isNaN(movieId)) {
      return sendError(res, "Invalid movie id", HttpStatus.BAD_REQUEST);
    }
    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    if (!apiKey) {
      return sendError(
        res,
        "TMDB API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const tmdb = getTmdbClient();
    const [detailsResp, creditsResp] = await Promise.all([
      tmdb.get(`/movie/${movieId}`, { params: { language: "en-US" } }),
      tmdb.get(`/movie/${movieId}/credits`, { params: { language: "en-US" } }),
    ]);
    const d = detailsResp.data ?? {};
    const cast = normalizeCastArray(creditsResp.data?.cast);
    const shaped = {
      ...normalizeMovieDetails(d),
      cast,
    };
    return sendSuccess(res, shaped);
  } catch (error) {
    return sendError(
      res,
      "Unable to load movie details. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const getMovieVideos = async (req: Request, res: Response) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!movieId || Number.isNaN(movieId)) {
      return sendError(res, "Invalid movie id", HttpStatus.BAD_REQUEST);
    }
    const apiKey = process.env.TMDB_API_KEY ?? process.env.TMDB_KEY;
    if (!apiKey) {
      return sendError(
        res,
        "TMDB API key not configured",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const tmdb = getTmdbClient();
    const { data } = await tmdb.get(`/movie/${movieId}/videos`, {
      params: { language: "en-US" },
    });

    // Filter for YouTube videos and find the best trailer
    const videos = Array.isArray(data?.results) ? data.results : [];
    const youtubeVideos = filterYoutubeVideos(videos);
    const trailer = findBestTrailer(youtubeVideos);

    const shaped = trailer
      ? {
          key: trailer.key,
          name: trailer.name,
          type: trailer.type,
          site: trailer.site,
        }
      : null;

    return sendSuccess(res, shaped);
  } catch (error) {
    return sendError(
      res,
      "Unable to load movie videos. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const addMovie = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.userId) {
      return sendError(res, "User ID not found", HttpStatus.UNAUTHORIZED);
    }
    const userId = authReq.userId;
    const { movieId, title, posterPath, overview } =
      req.body as IAddMovieRequest;

    // Validate required fields
    if (!movieId || !title) {
      return sendError(
        res,
        "movieId and title are required",
        HttpStatus.BAD_REQUEST,
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const rankedMovies = await RankedMovie.find({ userId: userObjectId }).sort({
      rank: 1,
    });

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
      await removeFromWatchlist(userId, movieId);

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
      // Delete old feed activities for this movie (handles rerank case)
      try {
        await FeedActivity.deleteMany({ userId, movieId });
      } catch {}

      // Enrich details for activity if missing
      let finalPosterPath = posterPath;
      let finalOverview = overview;
      try {
        if (!finalPosterPath || !finalOverview) {
          const tmdb = getTmdbClient();
          const { data } = await tmdb.get(`/movie/${movieId}`, {
            params: { language: "en-US" },
          });
          if (!finalPosterPath)
            finalPosterPath = data?.poster_path ?? undefined;
          if (!finalOverview) finalOverview = data?.overview ?? undefined;
        }
      } catch {}

      const activity = new FeedActivity({
        userId,
        activityType: "ranked_movie",
        movieId,
        movieTitle: title,
        posterPath: finalPosterPath,
        overview: finalOverview,
        rank: 1,
      });
      await activity.save();

      // Get user info for notifications
      const user = await User.findById(userId).select("name");
      let userName = "A friend";
      if (user && user.name) {
        userName = user.name;
      }

      // Notify friends via SSE and FCM
      const friendships = await Friendship.find({ userId });
      for (const friendship of friendships) {
        const friendId = String(friendship.friendId);

        // Send SSE notification
        sseService.send(friendId, "feed_activity", {
          activityId: activity._id,
        });

        // Send FCM push notification
        try {
          const friend = await User.findById(friendId).select("fcmToken");
          if (friend?.fcmToken) {
            await notificationService.sendFeedNotification(
              friend.fcmToken,
              userName,
              title,
              String(activity._id),
            );
          }
        } catch (error) {
          // Continue even if FCM fails for one friend
          console.error(
            `Failed to send FCM notification to friend ${friendId}:`,
            error,
          );
        }
      }

      return sendSuccess(res, rankedMovie, 200, { status: "added" });
    }

    // Case 2: Duplicate movie
    if (rankedMovies.some((m: IRankedMovie) => m.movieId === movieId)) {
      await removeFromWatchlist(userId, movieId);
      return sendError(res, "Movie already ranked", HttpStatus.BAD_REQUEST);
    }

    // Case 3: Begin comparison
    // Use the same middle calculation as compareMovies to avoid repetitive comparisons
    const high = rankedMovies.length - 1;
    const middleIndex = Math.floor((0 + high) / 2);
    const compareWith = rankedMovies.at(middleIndex);
    if (!compareWith) {
      return sendError(
        res,
        "Unable to find comparison movie",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    startSession(userId, { movieId, title, posterPath }, high);

    // Remove from watchlist immediately when starting comparison
    await removeFromWatchlist(userId, movieId);

    return sendSuccess(
      res,
      {
        compareWith: {
          movieId: compareWith.movieId,
          title: compareWith.title,
          posterPath: compareWith.posterPath,
        },
      },
      200,
      { status: "compare" },
    );
  } catch (error) {
    console.error(error);
    return sendError(
      res,
      "Unable to add movie to ranking. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const compareMovies = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    // Validate authentication
    if (!userId) {
      return sendError(res, "Authentication required", HttpStatus.UNAUTHORIZED);
    }

    const { preferredMovieId } = req.body as ICompareMoviesRequest;

    // Validate required field
    if (!preferredMovieId) {
      return sendError(
        res,
        "preferredMovieId is required",
        HttpStatus.BAD_REQUEST,
      );
    }

    const session = getSession(userId);

    if (!session) {
      return sendError(
        res,
        "No active comparison session",
        HttpStatus.BAD_REQUEST,
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const rankedMovies = await RankedMovie.find({ userId: userObjectId }).sort({
      rank: 1,
    });

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
        { $inc: { rank: 1 } },
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
      await removeFromWatchlist(userId, movie.movieId);
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
      // Delete old feed activities for this movie (handles rerank case)
      try {
        await FeedActivity.deleteMany({ userId, movieId: movie.movieId });
      } catch {}

      // Enrich details for activity when finalizing insert
      let finalPosterPath: string | undefined = movie.posterPath;
      let finalOverview: string | undefined;
      try {
        const tmdb = getTmdbClient();
        const { data } = await tmdb.get(`/movie/${movie.movieId}`, {
          params: { language: "en-US" },
        });
        if (!finalPosterPath) finalPosterPath = data?.poster_path ?? undefined;
        finalOverview = data?.overview ?? undefined;
      } catch {}

      const activity = new FeedActivity({
        userId,
        activityType: "ranked_movie",
        movieId: movie.movieId,
        movieTitle: movie.title,
        posterPath: finalPosterPath,
        overview: finalOverview,
        rank: movie.rank,
      });
      await activity.save();

      // Get user info for notifications
      const user = await User.findById(userId).select("name");
      let userName = "A friend";
      if (user && user.name) {
        userName = user.name;
      }

      // Notify friends via SSE and FCM
      const friendships = await Friendship.find({ userId });
      for (const friendship of friendships) {
        const friendId = String(friendship.friendId);

        // Send SSE notification
        sseService.send(friendId, "feed_activity", {
          activityId: activity._id,
        });

        // Send FCM push notification
        try {
          const friend = await User.findById(friendId).select("fcmToken");
          if (friend?.fcmToken) {
            await notificationService.sendFeedNotification(
              friend.fcmToken,
              userName,
              movie.title,
              String(activity._id),
            );
          }
        } catch (error) {
          // Continue even if FCM fails for one friend
          console.error(
            `Failed to send FCM notification to friend ${friendId}:`,
            error,
          );
        }
      }

      return sendSuccess(res, movie, 200, { status: "added" });
    }

    // Continue comparison
    updateSession(userId, low, high);
    const nextIndex = Math.floor((low + high) / 2);
    const nextCompare = rankedMovies.at(nextIndex);
    if (!nextCompare) {
      return sendError(
        res,
        "Unable to find comparison movie",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return sendSuccess(
      res,
      {
        compareWith: {
          movieId: nextCompare.movieId,
          title: nextCompare.title,
          posterPath: nextCompare.posterPath,
        },
      },
      200,
      { status: "compare" },
    );
  } catch (error) {
    console.error(error);
    return sendError(
      res,
      "Unable to save comparison. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const startRerank = async (req: Request, res: Response) => {
  try {
    const userId = (req as { userId?: string }).userId;
    if (!userId) {
      return sendError(
        res,
        ErrorMessages.UNAUTHORIZED,
        HttpStatus.UNAUTHORIZED,
      );
    }
    const { rankedId } = req.body as IBodyWithRankedId;
    if (!rankedId || !isValidMongoId(rankedId)) {
      return sendError(res, "Invalid rankedId", HttpStatus.BAD_REQUEST);
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const doc = await RankedMovieModel.findOne({
      _id: rankedId,
      userId: userObjectId,
    });
    if (!doc)
      return sendError(res, "Ranked movie not found", HttpStatus.NOT_FOUND);

    // Remove the item and close the gap
    const removedRank = doc.rank;
    const newMovie = {
      movieId: doc.movieId,
      title: doc.title,
      posterPath: doc.posterPath,
    };
    await doc.deleteOne();
    await RankedMovieModel.updateMany(
      { userId: userObjectId, rank: { $gt: removedRank } },
      { $inc: { rank: -1 } },
    );

    const { Friendship } = await import("../../models/friend/Friend");
    const { sseService } = await import("../../services/sse/sseService");
    const friendships = await Friendship.find({ userId: userObjectId });
    friendships.forEach((f) => {
      sseService.send(String(f.friendId), "ranking_changed", {
        userId: userObjectId,
      });
    });

    // After removal, if list is empty, insert at rank 1 directly
    const remaining = await RankedMovieModel.find({
      userId: userObjectId,
    }).sort({ rank: 1 });
    if (remaining.length === 0) {
      const re = new RankedMovieModel({
        userId: userObjectId,
        movieId: newMovie.movieId,
        title: newMovie.title,
        posterPath: newMovie.posterPath,
        rank: 1,
      });
      await re.save();
      return sendSuccess(res, re, 200, { status: "added" });
    }

    // Start a compare session and return mid element as first comparator
    startSession(userId, newMovie, remaining.length - 1);
    const mid = Math.floor((0 + (remaining.length - 1)) / 2);
    const cmp = remaining.at(mid);
    if (!cmp) {
      return sendError(
        res,
        "Unable to find comparison movie",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return sendSuccess(
      res,
      {
        compareWith: {
          movieId: cmp.movieId,
          title: cmp.title,
          posterPath: cmp.posterPath,
        },
      },
      200,
      { status: "compare" },
    );
  } catch (e) {
    return sendError(
      res,
      "Unable to start rerank. Please try again",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};

export const getMovieQuote = async (req: Request, res: Response) => {
  try {
    const title = String(req.query.title ?? "").trim();
    const year = String(req.query.year ?? "").trim() || undefined;
    if (!title) {
      return sendError(res, "Missing title", HttpStatus.BAD_REQUEST);
    }

    const tagline = await fetchMovieTagline(title, year);
    if (tagline) {
      return sendSuccess(res, tagline);
    }
    // Return fallback quote if no tagline found (still 200 status for frontend compatibility)
    const randomQuote = fallbackQuotes[randomInt(fallbackQuotes.length)];
    return sendSuccess(res, randomQuote, 200, { fallback: true });
  } catch (e: unknown) {
    // On error, return fallback quote
    const randomQuote = fallbackQuotes[randomInt(fallbackQuotes.length)];
    return sendSuccess(res, randomQuote, 200, { fallback: true });
  }
};
