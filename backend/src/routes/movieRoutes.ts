import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  searchMovies,
  getRankedMovies,
  deleteRankedMovie,
  getWatchProviders,
  getMovieDetails,
  getMovieVideos,
  addMovie,
  compareMovies,
  startRerank,
} from '../controllers/movie/movieController';

const router = Router();

// Search for movies
router.get('/search', authenticate, asyncHandler(searchMovies));

// Get user's ranked movies
router.get('/ranked', authenticate, asyncHandler(getRankedMovies));

// Add movie to ranking (interactive logic)
router.post('/add', authenticate, asyncHandler(addMovie));

// Compare movies
router.post('/compare', authenticate, asyncHandler(compareMovies));

// Start re-rank session for an existing ranked item
router.post('/rerank/start', authenticate, asyncHandler(startRerank));

// Delete a ranked movie and re-sequence ranks
router.delete('/ranked/:id', authenticate, asyncHandler(deleteRankedMovie));

// Get watch providers for a TMDB movie id
router.get('/:movieId/providers', authenticate, asyncHandler(getWatchProviders));

// Get movie details + top cast from TMDB
router.get('/:movieId/details', authenticate, asyncHandler(getMovieDetails));

// Get movie videos/trailers from TMDB
router.get('/:movieId/videos', authenticate, asyncHandler(getMovieVideos));

export default router;