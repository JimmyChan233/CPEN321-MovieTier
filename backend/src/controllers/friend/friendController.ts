import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../types/middleware.types";
import { Friendship, FriendRequest } from "../../models/friend/Friend";
import User from "../../models/user/User";
import { sseService } from "../../services/sse/sseService";
import notificationService from "../../services/notification.service";
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from "../../utils/responseHandler";
import { isValidEmail, validateUserId } from "../../utils/validators";

// Simple in-memory rate limiter: max 5 requests/minute per user
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const requestTimestamps = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const arr = requestTimestamps.get(userId) ?? [];
  const recent = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  requestTimestamps.set(userId, recent);
  return true;
}

export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const friendships = await Friendship.find({ userId: req.userId }).populate(
      "friendId",
    );
    const friends = friendships.map(
      (f) => (f as unknown as { friendId: unknown }).friendId,
    );
    return sendSuccess(res, friends);
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_GET_FRIENDS, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const getFriendRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await FriendRequest.find({
      receiverId: req.userId,
      status: "pending",
    });
    return sendSuccess(res, requests);
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_GET_REQUESTS, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const getFriendRequestsDetailed = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const requests = await FriendRequest.find({
      receiverId: req.userId,
      status: "pending",
    }).populate("senderId", "_id email name profileImageUrl");
    const data = requests.map((r: unknown) => {
      const request = r as {
        _id: unknown;
        senderId: unknown;
        receiverId: unknown;
        status: unknown;
        createdAt: unknown;
      };
      return {
        _id: request._id,
        sender: request.senderId,
        receiverId: request.receiverId,
        status: request.status,
        createdAt: request.createdAt,
      };
    });
    return sendSuccess(res, data);
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_GET_REQUESTS, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const getOutgoingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await FriendRequest.find({
      senderId: req.userId,
      status: "pending",
    });
    return sendSuccess(res, requests);
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_GET_OUTGOING, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const getOutgoingRequestsDetailed = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const requests = await FriendRequest.find({
      senderId: req.userId,
      status: "pending",
    }).populate("receiverId", "_id email name profileImageUrl");
    const data = requests.map((r: unknown) => {
      const request = r as {
        _id: unknown;
        receiverId: unknown;
        senderId: unknown;
        status: unknown;
        createdAt: unknown;
      };
      return {
        _id: request._id,
        receiver: request.receiverId,
        senderId: request.senderId,
        status: request.status,
        createdAt: request.createdAt,
      };
    });
    return sendSuccess(res, data);
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_GET_OUTGOING, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (!isValidEmail(email)) {
      return sendError(res, !email ? ErrorMessages.EMAIL_REQUIRED : ErrorMessages.INVALID_EMAIL, HttpStatus.BAD_REQUEST);
    }

    // Rate limit per-sender
    if (!req.userId || !checkRateLimit(req.userId)) {
      return sendError(res, ErrorMessages.TOO_MANY_REQUESTS, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Prevent sending a request to self
    const self = await User.findById(req.userId);
    if (!self) {
      return sendError(res, ErrorMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }
    if (self.email === email) {
      return sendError(res, ErrorMessages.CANNOT_SELF_REQUEST, HttpStatus.BAD_REQUEST);
    }

    const friend = await User.findOne({ email });
    if (!friend) {
      return sendError(res, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    // Check if already friends
    const existingFriendship = await Friendship.findOne({
      userId: req.userId,
      friendId: friend._id,
    });
    if (existingFriendship) {
      return sendError(res, ErrorMessages.ALREADY_FRIENDS, HttpStatus.CONFLICT);
    }

    // Check if a pending request already exists from current user to target
    const existingPending = await FriendRequest.findOne({
      senderId: req.userId,
      receiverId: friend._id,
      status: "pending",
    });
    if (existingPending) {
      return sendError(res, ErrorMessages.REQUEST_ALREADY_SENT, HttpStatus.CONFLICT);
    }

    // Check if reverse pending request exists
    const reversePending = await FriendRequest.findOne({
      senderId: friend._id,
      receiverId: req.userId,
      status: "pending",
    });
    if (reversePending) {
      return sendError(res, ErrorMessages.FRIEND_REQUEST_PENDING, HttpStatus.BAD_REQUEST);
    }

    const request = new FriendRequest({
      senderId: req.userId,
      receiverId: friend._id,
    });
    await request.save();

    // Notify receiver via SSE
    sseService.send(String(friend._id), "friend_request", {
      requestId: request._id,
      senderId: req.userId,
    });

    // Send FCM push notification
    if (friend.fcmToken) {
      try {
        await notificationService.sendFriendRequestNotification(
          friend.fcmToken,
          self.name,
          String(request._id),
        );
      } catch (error) {
        console.error("Failed to send FCM friend request notification:", error);
      }
    }

    return sendSuccess(res, request, HttpStatus.CREATED);
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_SEND_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const respondToFriendRequest = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { requestId, accept } = req.body as {
      requestId?: string;
      accept?: boolean;
    };

    if (!requestId || typeof accept !== "boolean") {
      return sendError(res, "requestId and accept are required", HttpStatus.BAD_REQUEST);
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return sendError(res, "Friend request not found", HttpStatus.NOT_FOUND);
    }

    if (String(request.receiverId) !== String(req.userId)) {
      return sendError(res, "Not authorized to respond to this request", HttpStatus.FORBIDDEN);
    }

    if (request.status !== "pending") {
      return sendError(res, "Request already handled", HttpStatus.BAD_REQUEST);
    }

    if (accept) {
      request.status = "accepted";
      await request.save();

      // Create bilateral friendships if not exist
      const senderId = request.senderId;
      const receiverId = request.receiverId;

      const [f1, f2] = await Promise.all([
        Friendship.findOne({ userId: senderId, friendId: receiverId }),
        Friendship.findOne({ userId: receiverId, friendId: senderId }),
      ]);

      if (!f1)
        await new Friendship({ userId: senderId, friendId: receiverId }).save();
      if (!f2)
        await new Friendship({ userId: receiverId, friendId: senderId }).save();

      // Cleanup any other pending requests between these users
      await FriendRequest.updateMany(
        {
          $or: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
          status: "pending",
          _id: { $ne: request._id },
        },
        { $set: { status: "rejected" } },
      );

      // Notify both users via SSE
      sseService.send(String(senderId), "friend_request_accepted", {
        userId: receiverId,
      });
      sseService.send(String(receiverId), "friend_request_accepted", {
        userId: senderId,
      });

      // Send FCM push notification to sender
      try {
        const [sender, receiver] = await Promise.all([
          User.findById(senderId).select("fcmToken name"),
          User.findById(receiverId).select("name"),
        ]);

        if (sender?.fcmToken && receiver?.name) {
          await notificationService.sendFriendRequestAcceptedNotification(
            sender.fcmToken,
            receiver.name,
          );
        }
      } catch (error) {
        console.error(
          "Failed to send FCM friend request accepted notification:",
          error,
        );
      }
    } else {
      request.status = "rejected";
      await request.save();

      // Notify sender of rejection
      sseService.send(String(request.senderId), "friend_request_rejected", {
        userId: request.receiverId,
      });
    }

    return sendSuccess(res, null, 200, { message: "Friend request handled" });
  } catch (error) {
    return sendError(res, "Failed to respond to request", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;

    // Validate friendId format
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return sendError(res, "Invalid friendId format", HttpStatus.BAD_REQUEST);
    }

    // Check if user is trying to remove themselves
    if (String(req.userId) === String(friendId)) {
      return sendError(res, "Cannot remove yourself", HttpStatus.BAD_REQUEST);
    }

    // Convert to ObjectIds for proper matching
    const userObjectId = new mongoose.Types.ObjectId(req.userId);
    const friendObjectId = new mongoose.Types.ObjectId(friendId);

    const result = await Friendship.deleteMany({
      $or: [
        { userId: userObjectId, friendId: friendObjectId },
        { userId: friendObjectId, friendId: userObjectId },
      ],
    });

    if (result.deletedCount === 0) {
      return sendError(res, "Friendship not found", HttpStatus.NOT_FOUND);
    }

    // Notify both users of removal
    sseService.send(String(req.userId), "friend_removed", { userId: friendId });
    sseService.send(String(friendId), "friend_removed", { userId: req.userId });

    return sendSuccess(res, null, 200, { message: "Friend removed" });
  } catch (error) {
    return sendError(res, ErrorMessages.FAILED_REMOVE_FRIEND, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const streamFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as string;

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

export const cancelFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return sendError(res, "Friend request not found", HttpStatus.NOT_FOUND);
    }
    if (String(request.senderId) !== String(req.userId)) {
      return sendError(res, "Not authorized to cancel this request", HttpStatus.FORBIDDEN);
    }
    if (request.status !== "pending") {
      return sendError(res, "Request is not pending", HttpStatus.BAD_REQUEST);
    }
    request.status = "rejected";
    await request.save();

    // Notify receiver
    sseService.send(String(request.receiverId), "friend_request_canceled", {
      userId: request.senderId,
    });

    return sendSuccess(res, null, 200, { message: "Friend request canceled" });
  } catch (error) {
    return sendError(res, "Failed to cancel friend request", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

// Testing hooks
export const __test__ = {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  requestTimestamps,
  checkRateLimit,
};
