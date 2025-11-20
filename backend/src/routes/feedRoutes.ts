import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as feedController from "../controllers/feed/feedController";

const router = Router();

// Get friends' feed activities
router.get("/", authenticate, asyncHandler(feedController.getFeed));

// Get user's own feed activities
router.get("/me", authenticate, asyncHandler(feedController.getMyFeed));

// SSE stream for feed events
router.get("/stream", authenticate, asyncHandler(feedController.streamFeed));

// Like an activity
router.post(
  "/:activityId/like",
  authenticate,
  asyncHandler(feedController.likeActivity),
);

// Unlike an activity
router.delete(
  "/:activityId/like",
  authenticate,
  asyncHandler(feedController.unlikeActivity),
);

// Get comments for an activity
router.get(
  "/:activityId/comments",
  authenticate,
  asyncHandler(feedController.getComments),
);

// Add a comment to an activity
router.post(
  "/:activityId/comments",
  authenticate,
  asyncHandler(feedController.addComment),
);

// Delete a comment
router.delete(
  "/:activityId/comments/:commentId",
  authenticate,
  asyncHandler(feedController.deleteComment),
);

export default router;
