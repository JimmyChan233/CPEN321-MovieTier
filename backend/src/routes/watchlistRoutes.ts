import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watch/watchlistController";

const router = Router();

// Get current user's watchlist
router.get("/", authenticate, asyncHandler(getWatchlist));

// Add to watchlist
router.post("/", authenticate, asyncHandler(addToWatchlist));

// Remove from watchlist (by movieId)
router.delete("/:movieId", authenticate, asyncHandler(removeFromWatchlist));

export default router;
