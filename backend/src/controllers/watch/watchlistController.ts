import { Request, Response } from "express";
import WatchlistItem from "../../models/watch/WatchlistItem";
import { getTmdbClient } from "../../services/tmdb/tmdbClient";
import { AuthRequest } from "../../types/middleware.types";
import { sendSuccess, sendError, HttpStatus } from "../../utils/responseHandler";

export const getWatchlist = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const items = await WatchlistItem.find({ userId: authReq.userId }).sort({
      createdAt: -1,
    });
    return sendSuccess(res, items);
  } catch (error) {
    return sendError(res, "Unable to load watchlist. Please try again", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const addToWatchlist = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { movieId, title, posterPath, overview } = req.body as {
      movieId: number;
      title: string;
      posterPath?: string;
      overview?: string;
    };

    if (!movieId || !title) {
      return sendError(res, "movieId and title are required", HttpStatus.BAD_REQUEST);
    }

    // Step 1: Check for duplicate
    const existing = await WatchlistItem.findOne({
      userId: authReq.userId,
      movieId,
    });
    if (existing) {
      return sendError(res, "Movie already in watchlist", HttpStatus.CONFLICT);
    }

    // Step 2: Enrich from TMDB if fields are missing
    let finalPoster = posterPath;
    let finalOverview = overview;
    if (!finalPoster || !finalOverview) {
      try {
        const tmdb = getTmdbClient();
        const { data } = await tmdb.get(`/movie/${movieId}`, {
          params: { language: "en-US" },
        });
        if (!finalPoster) finalPoster = data?.poster_path || undefined;
        if (!finalOverview) finalOverview = data?.overview || undefined;
      } catch {}
    }

    // Step 3: Add new movie
    const item = new WatchlistItem({
      userId: authReq.userId,
      movieId,
      title,
      posterPath: finalPoster,
      overview: finalOverview,
    });
    await item.save();

    return sendSuccess(res, item, HttpStatus.CREATED);
  } catch (error) {
    console.error(error);
    return sendError(res, "Unable to add to watchlist. Please try again", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const removeFromWatchlist = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const movieId = Number(req.params.movieId);
    if (isNaN(movieId) || !Number.isInteger(movieId)) {
      return sendError(res, "Invalid movie id", HttpStatus.BAD_REQUEST);
    }
    const result = await WatchlistItem.deleteOne({
      userId: authReq.userId,
      movieId,
    });
    if (result.deletedCount === 0) {
      return sendError(res, "Movie not found in watchlist", HttpStatus.NOT_FOUND);
    }
    return sendSuccess(res, { message: "Removed from watchlist" });
  } catch (error) {
    return sendError(res, "Unable to remove from watchlist. Please try again", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
