import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getRecommendations,
  getTrendingMovies,
} from "../controllers/recommendations/movieRecommendationController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Get personalized movie recommendations
router.get("/", authenticate, asyncHandler(getRecommendations));

// Get trending movies (for users with no rankings)
router.get("/trending", authenticate, asyncHandler(getTrendingMovies));

export default router;
