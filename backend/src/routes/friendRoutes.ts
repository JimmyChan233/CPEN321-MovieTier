import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Friendship, FriendRequest } from '../models/friend/Friend';
import User from '../models/user/User';
import { sseService } from '../services/sse/sseService';
import notificationService from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';

// Simple in-memory rate limiter: max 5 requests/minute per user
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const requestTimestamps = new Map<string, number[]>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const arr = requestTimestamps.get(userId) ?? [];
  const recent = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  requestTimestamps.set(userId, recent);
  return true;
}

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const friendships = await Friendship.find({ userId: req.userId }).populate('friendId');
    const friends = friendships.map(f => (f as unknown as { friendId: unknown }).friendId);
    res.json({ success: true, data: friends });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get friends' });
  }
}));

router.get('/requests', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    // Return pending requests directed to the current user (no populate to match frontend model)
    const requests = await FriendRequest.find({
      receiverId: req.userId,
      status: 'pending'
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get requests' });
  }
}));

// Incoming requests with sender details
router.get('/requests/detailed', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const requests = await FriendRequest.find({ receiverId: req.userId, status: 'pending' })
      .populate('senderId', '_id email name profileImageUrl');
    const data = requests.map((r: unknown) => {
      const request = r as { _id: unknown; senderId: unknown; receiverId: unknown; status: unknown; createdAt: unknown };
      return {
        _id: request._id,
        sender: request.senderId,
        receiverId: request.receiverId,
        status: request.status,
        createdAt: request.createdAt
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get requests' });
  }
}));

// Outgoing requests (pending) basic
router.get('/requests/outgoing', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const requests = await FriendRequest.find({ senderId: req.userId, status: 'pending' });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get outgoing requests' });
  }
}));

// Outgoing requests detailed with receiver profile
router.get('/requests/outgoing/detailed', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const requests = await FriendRequest.find({ senderId: req.userId, status: 'pending' })
      .populate('receiverId', '_id email name profileImageUrl');
    const data = requests.map((r: unknown) => {
      const request = r as { _id: unknown; receiverId: unknown; senderId: unknown; status: unknown; createdAt: unknown };
      return {
        _id: request._id,
        receiver: request.receiverId,
        senderId: request.senderId,
        status: request.status,
        createdAt: request.createdAt
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get outgoing requests' });
  }
}));

router.post('/request', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Rate limit per-sender
    if (!req.userId || !checkRateLimit(req.userId)) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }

    // Prevent sending a request to self
    const self = await User.findById(req.userId);
    if (!self) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (self.email === email) {
      return res.status(400).json({ success: false, message: 'Cannot send a friend request to yourself' });
    }

    const friend = await User.findOne({ email });

    if (!friend) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already friends
    const existingFriendship = await Friendship.findOne({ userId: req.userId, friendId: friend._id });
    if (existingFriendship) {
      return res.status(409).json({ success: false, message: 'Already friends with this user' });
    }

    // Check if a pending request already exists from current user to target
    const existingPending = await FriendRequest.findOne({
      senderId: req.userId,
      receiverId: friend._id,
      status: 'pending'
    });
    if (existingPending) {
      return res.status(409).json({ success: false, message: 'Friend request already sent' });
    }

    // Also check if reverse pending request exists (the other user already sent you a request)
    const reversePending = await FriendRequest.findOne({
      senderId: friend._id,
      receiverId: req.userId,
      status: 'pending'
    });
    if (reversePending) {
      return res.status(400).json({ success: false, message: 'A request from this user is already pending. Please accept it.' });
    }

    const request = new FriendRequest({
      senderId: req.userId,
      receiverId: friend._id
    });
    await request.save();

    // Notify receiver via SSE
    sseService.send(String(friend._id), 'friend_request', {
      requestId: request._id,
      senderId: req.userId
    });

    // Send FCM push notification
    if (friend.fcmToken) {
      try {
        await notificationService.sendFriendRequestNotification(
          friend.fcmToken,
          self.name,
          String(request._id)
        );
      } catch (error) {
        console.error('Failed to send FCM friend request notification:', error);
      }
    }

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to send friend request. Please try again' });
  }
}));

router.post('/respond', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { requestId, accept } = req.body as { requestId?: string; accept?: boolean };

    if (!requestId || typeof accept !== 'boolean') {
      return res.status(400).json({ success: false, message: 'requestId and accept are required' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }

    if (String(request.receiverId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already handled' });
    }

    if (accept) {
      request.status = 'accepted';
      await request.save();

      // Create bilateral friendships if not exist
      const senderId = request.senderId;
      const receiverId = request.receiverId;

      const [f1, f2] = await Promise.all([
        Friendship.findOne({ userId: senderId, friendId: receiverId }),
        Friendship.findOne({ userId: receiverId, friendId: senderId })
      ]);

      if (!f1) await new Friendship({ userId: senderId, friendId: receiverId }).save();
      if (!f2) await new Friendship({ userId: receiverId, friendId: senderId }).save();

      // Optional: cleanup any other pending requests between these users
      await FriendRequest.updateMany(
        {
          $or: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId }
          ],
          status: 'pending',
          _id: { $ne: request._id }
        },
        { $set: { status: 'rejected' } }
      );

      // Notify both users via SSE
      sseService.send(String(senderId), 'friend_request_accepted', { userId: receiverId });
      sseService.send(String(receiverId), 'friend_request_accepted', { userId: senderId });

      // Send FCM push notification to sender
      try {
        const [sender, receiver] = await Promise.all([
          User.findById(senderId).select('fcmToken name'),
          User.findById(receiverId).select('name')
        ]);

        if (sender?.fcmToken && receiver?.name) {
          await notificationService.sendFriendRequestAcceptedNotification(
            sender.fcmToken,
            receiver.name
          );
        }
      } catch (error) {
        console.error('Failed to send FCM friend request accepted notification:', error);
      }
    } else {
      request.status = 'rejected';
      await request.save();

      // Notify sender of rejection
      sseService.send(String(request.senderId), 'friend_request_rejected', { userId: request.receiverId });
    }

    res.json({ success: true, message: 'Friend request handled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to respond to request' });
  }
}));

router.delete('/:friendId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { friendId } = req.params;
    if (!friendId) {
      return res.status(400).json({ success: false, message: 'friendId is required' });
    }

    const result = await Friendship.deleteMany({
      $or: [
        { userId: req.userId, friendId },
        { userId: friendId, friendId: req.userId }
      ]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Friendship not found' });
    }

    // Notify both users of removal
    sseService.send(String(req.userId), 'friend_removed', { userId: friendId });
    sseService.send(String(friendId), 'friend_removed', { userId: req.userId });

    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove friend' });
  }
}));

// SSE stream for friend events
router.get('/stream', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: connected\n` + `data: {"ok":true}\n\n`);

    sseService.addClient(String(req.userId), res);

    req.on('close', () => {
      sseService.removeClient(String(req.userId), res);
    });
  } catch {
    res.end();
  }
}));

// Cancel a pending outgoing friend request
router.delete('/requests/:requestId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  try {
    const { requestId } = req.params;
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    if (String(request.senderId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this request' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is not pending' });
    }
    request.status = 'rejected';
    await request.save();

    // Notify receiver
    sseService.send(String(request.receiverId), 'friend_request_canceled', { userId: request.senderId });

    res.json({ success: true, message: 'Friend request canceled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel friend request' });
  }
}));

export default router;

// Testing hooks
export const __test__ = {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  requestTimestamps,
  checkRateLimit
};
