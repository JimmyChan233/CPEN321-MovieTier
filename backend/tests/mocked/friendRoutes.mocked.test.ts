/**
 * Friend Routes Tests - Mocked
 * Tests for error handling and edge cases in friend routes
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import friendRoutes from '../../src/routes/friendRoutes';
import User from '../../src/models/user/User';
import { Friendship, FriendRequest } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

// Mock notification service
jest.mock('../../src/services/notification.service', () => ({
  __esModule: true,
  default: {
    sendFriendRequestNotification: jest.fn(),
    sendFriendAcceptNotification: jest.fn()
  }
}));

describe('Friend Routes - Mocked Error Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/friends', friendRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Friendship.deleteMany({});
    await FriendRequest.deleteMany({});

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-456'
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());

    jest.clearAllMocks();
  });

  // ==================== GET / (Friends List) Error Tests ====================

  describe('GET / (friends list) error handling', () => {
    it('should handle database error gracefully', async () => {
      jest.spyOn(Friendship, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to get friends');
    });
  });

  // ==================== GET /requests Error Tests ====================

  describe('GET /requests error handling', () => {
    it('should handle database error gracefully', async () => {
      jest.spyOn(FriendRequest, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/friends/requests')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to get requests');
    });
  });

  // ==================== GET /requests/detailed Error Tests ====================

  describe('GET /requests/detailed error handling', () => {
    it('should handle database error gracefully', async () => {
      jest.spyOn(FriendRequest, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/friends/requests/detailed')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to get requests');
    });
  });

  // ==================== GET /requests/outgoing Error Tests ====================

  describe('GET /requests/outgoing error handling', () => {
    it('should handle database error gracefully', async () => {
      jest.spyOn(FriendRequest, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/friends/requests/outgoing')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to get outgoing requests');
    });
  });

  // ==================== GET /requests/outgoing/detailed Error Tests ====================

  describe('GET /requests/outgoing/detailed error handling', () => {
    it('should handle database error gracefully', async () => {
      jest.spyOn(FriendRequest, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const res = await request(app)
        .get('/api/friends/requests/outgoing/detailed')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to get outgoing requests');
    });
  });

  // ==================== POST /request Error Tests ====================

  describe('POST /request error handling', () => {
    it('should return 401 when authenticated user not found in database', async () => {
      // Delete user1 after authentication to simulate deleted user
      await User.findByIdAndDelete((user1 as any)._id);

      const res = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: 'user2@example.com' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unauthorized');
    });

    it('should handle database error when creating friend request', async () => {
      jest.spyOn(FriendRequest.prototype, 'save').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: 'user2@example.com' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unable to send friend request');
    });

    it('should handle notification service failure gracefully', async () => {
      const notificationService = require('../../src/services/notification.service').default;
      (notificationService.sendFriendRequestNotification as jest.Mock).mockRejectedValueOnce(
        new Error('FCM error')
      );

      const res = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: 'user2@example.com' });

      // Should still succeed even if notification fails (201 = Created)
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== POST /respond Error Tests ====================

  describe('POST /respond error handling', () => {
    it('should handle database error when finding friend request', async () => {
      jest.spyOn(FriendRequest, 'findById').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/friends/respond')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          requestId: new mongoose.Types.ObjectId().toString(),
          accept: true
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to respond to request');
    });

    it('should handle database error when creating friendships', async () => {
      // Create a friend request
      const friendRequest = await FriendRequest.create({
        senderId: (user1 as any)._id,
        receiverId: (user2 as any)._id,
        status: 'pending'
      });

      // Mock database error during friendship creation
      jest.spyOn(Friendship.prototype, 'save').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/friends/respond')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          requestId: (friendRequest as any)._id.toString(),
          accept: true
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to respond to request');
    });

    it('should handle notification failure when accepting request', async () => {
      const friendRequest = await FriendRequest.create({
        senderId: (user1 as any)._id,
        receiverId: (user2 as any)._id,
        status: 'pending'
      });

      const notificationService = require('../../src/services/notification.service').default;
      (notificationService.sendFriendAcceptNotification as jest.Mock).mockRejectedValueOnce(
        new Error('FCM error')
      );

      const res = await request(app)
        .post('/api/friends/respond')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          requestId: (friendRequest as any)._id.toString(),
          accept: true
        });

      // Should still succeed even if notification fails
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== DELETE /:friendId Error Tests ====================

  describe('DELETE /:friendId error handling', () => {
    it('should handle database error gracefully', async () => {
      // Create friendship first
      await Friendship.create([
        { userId: (user1 as any)._id, friendId: (user2 as any)._id },
        { userId: (user2 as any)._id, friendId: (user1 as any)._id }
      ]);

      // Mock database error
      jest.spyOn(Friendship, 'deleteMany').mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete(`/api/friends/${(user2 as any)._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Failed to remove friend');
    });

    it('should return 404 when friendship not found', async () => {
      const res = await request(app)
        .delete(`/api/friends/${(user2 as any)._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Friendship not found');
    });
  });

  // ==================== Additional Edge Cases ====================

  describe('Additional edge cases', () => {
    it('should handle missing accept field in respond request', async () => {
      const friendRequest = await FriendRequest.create({
        senderId: (user1 as any)._id,
        receiverId: (user2 as any)._id,
        status: 'pending'
      });

      const res = await request(app)
        .post('/api/friends/respond')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          requestId: (friendRequest as any)._id.toString()
          // missing accept field
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle missing requestId field in respond request', async () => {
      const res = await request(app)
        .post('/api/friends/respond')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          accept: true
          // missing requestId
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject friend request when user not found', async () => {
      const res = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('User not found');
    });

    it('should reject responding to non-existent friend request', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/friends/respond')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          requestId: fakeId.toString(),
          accept: true
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Friend request not found');
    });

    it('should reject responding to request not directed to user', async () => {
      const user3 = await User.create({
        ...mockUsers.validUser,
        email: 'user3@example.com',
        googleId: 'google-789'
      });

      const friendRequest = await FriendRequest.create({
        senderId: (user1 as any)._id,
        receiverId: (user3 as any)._id,
        status: 'pending'
      });

      const res = await request(app)
        .post('/api/friends/respond')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          requestId: (friendRequest as any)._id.toString(),
          accept: true
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Not authorized');
    });
  });
});
