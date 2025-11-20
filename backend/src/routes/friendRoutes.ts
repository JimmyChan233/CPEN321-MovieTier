import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as friendController from "../controllers/friend/friendController";

const router = Router();

// Get all friends
router.get("/", authenticate, asyncHandler(friendController.getFriends));

// Get incoming friend requests (basic)
router.get(
  "/requests",
  authenticate,
  asyncHandler(friendController.getFriendRequests),
);

// Get incoming friend requests with sender details
router.get(
  "/requests/detailed",
  authenticate,
  asyncHandler(friendController.getFriendRequestsDetailed),
);

// Get outgoing friend requests (basic)
router.get(
  "/requests/outgoing",
  authenticate,
  asyncHandler(friendController.getOutgoingRequests),
);

// Get outgoing friend requests with receiver details
router.get(
  "/requests/outgoing/detailed",
  authenticate,
  asyncHandler(friendController.getOutgoingRequestsDetailed),
);

// Send a friend request
router.post(
  "/request",
  authenticate,
  asyncHandler(friendController.sendFriendRequest),
);

// Respond to a friend request (accept/reject)
router.post(
  "/respond",
  authenticate,
  asyncHandler(friendController.respondToFriendRequest),
);

// Remove a friend
router.delete(
  "/:friendId",
  authenticate,
  asyncHandler(friendController.removeFriend),
);

// SSE stream for friend events
router.get(
  "/stream",
  authenticate,
  asyncHandler(friendController.streamFriends),
);

// Cancel a pending outgoing friend request
router.delete(
  "/requests/:requestId",
  authenticate,
  asyncHandler(friendController.cancelFriendRequest),
);

export default router;
