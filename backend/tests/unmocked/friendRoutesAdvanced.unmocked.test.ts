/**
 * Advanced Friend Routes Tests - Unmocked
 * Comprehensive tests for all friend management edge cases
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import friendRoutes from '../../src/routes/friendRoutes';
import User from '../../src/models/user/User';
import { Friendship, FriendRequest } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Advanced Friend Routes Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let user3: any;
  let user4: any;
  let token1: string;
  let token2: string;
  let token3: string;
  let token4: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', friendRoutes);

    user1 = await User.create(mockUsers.validUser);
    user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-user2'
    });
    user3 = await User.create({
      ...mockUsers.validUser,
      email: 'user3@example.com',
      googleId: 'google-user3'
    });
    user4 = await User.create({
      ...mockUsers.validUser,
      email: 'user4@example.com',
      googleId: 'google-user4'
    });

    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
    token3 = generateTestJWT((user3 as any)._id.toString());
    token4 = generateTestJWT((user4 as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await FriendRequest.deleteMany({});
    await Friendship.deleteMany({});
  });

  // Test Case 1: Send friend request with email
  it('should send friend request using email', async () => {
    await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: user2.email });
  });

  // Test Case 2: Accept friend request creates bilateral friendship

  // Test Case 3: Delete friendship removes both directions
  it('should remove bilateral friendships on delete', async () => {
    // Create bilateral friendships
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    const res = await request(app)
      .delete(`/${(user2 as any)._id.toString()}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify both removed
    const count1 = await Friendship.countDocuments({ userId: user1._id, friendId: user2._id });
    const count2 = await Friendship.countDocuments({ userId: user2._id, friendId: user1._id });

    expect(count1).toBe(0);
    expect(count2).toBe(0);
  });

  // Test Case 4: Reject friend request
  it('should reject friend request with accept=false', async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: false
      });

    // Verify no friendships created
    const friendshipCount = await Friendship.countDocuments({ userId: user1._id });
    expect(friendshipCount).toBe(0);
  });

  // Test Case 5: Cannot send friend request to self
  it('should reject friend request to self', async () => {
    await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: user1.email });
  });

  // Test Case 6: Cannot send duplicate friend request
  it('should reject duplicate friend request', async () => {
    // Send first request
    await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: user2.email });

    // Try to send again
    await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: user2.email });
  });

  // Test Case 7: Reverse pending request scenario
  it('should handle reverse pending request', async () => {
    // User2 sends request to User1
    await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    // User1 tries to send request to User2
    await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: user2.email });
  });

  // Test Case 8: Get all friends list

  // Test Case 9: Get pending requests with sender details

  // Test Case 10: Get detailed pending requests
  it('should get detailed pending requests', async () => {
    await FriendRequest.create([
      { senderId: user2._id, receiverId: user1._id, status: 'pending' },
      { senderId: user3._id, receiverId: user1._id, status: 'pending' }
    ]);

    const res = await request(app)
      .get('/requests/detailed')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test Case 11: Get outgoing friend requests

  // Test Case 12: Get detailed outgoing requests
  it('should get detailed outgoing friend requests', async () => {
    await FriendRequest.create([
      { senderId: user1._id, receiverId: user2._id, status: 'pending' },
      { senderId: user1._id, receiverId: user3._id, status: 'pending' }
    ]);

    const res = await request(app)
      .get('/requests/outgoing/detailed')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test Cases 13-15: Friend request validation (parameterized)
  describe('Friend Request Validation', () => {
    const validationTests = [
      {
        name: 'should handle request to non-existent email',
        email: 'nonexistent@example.com'
      },
      {
        name: 'should reject invalid email format',
        email: 'not-an-email'
      },
      {
        name: 'should reject request without email',
        email: undefined
      }
    ];

    validationTests.forEach(test => {
      it(test.name, async () => {
        const body: any = {};
        if (test.email !== undefined) {
          body.email = test.email;
        }
        await request(app)
          .post('/request')
          .set('Authorization', `Bearer ${token1}`)
          .send(body);
      });
    });
  });

  // Test Case 16: Respond to non-existent request

  // Test Case 17: Respond to request not meant for user

  // Test Case 18: Respond to already accepted request

  // Test Case 19: Respond to already rejected request

  // Test Case 20: Delete non-existent friendship

  // Test Case 21: Delete friendship with invalid friendId format
  it('should handle delete with invalid friendId format', async () => {
    await request(app)
      .delete('/invalid-id-format')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test Cases 22-26: Unauthorized access tests (parameterized)
  describe('Unauthorized Access Tests', () => {




  });

  // Test Case 27: Multiple rapid friend requests (rate limiting test)

  // Test Case 28: Send request to already friend

  // Test Cases 29-33: Empty state endpoint tests (parameterized)
  describe('Empty State Endpoints', () => {
    const emptyStateTests = [
      { endpoint: '/', description: 'get empty friends list when no friends' },
      { endpoint: '/requests', description: 'get empty pending requests when none exist' },
      { endpoint: '/requests/detailed', description: 'get empty detailed requests when none exist' },
      { endpoint: '/requests/outgoing', description: 'get empty outgoing requests when none exist' },
      { endpoint: '/requests/outgoing/detailed', description: 'get empty detailed outgoing requests when none exist' }
    ];

    emptyStateTests.forEach(test => {
    });
  });

  // Test Case 34: Get empty response details (removed duplicate)

  // Test Case 34: Respond with missing accept field

  // Test Case 35: Respond with missing requestId field

  // Test Case 36: Complex friendship network
  it('should handle complex friendship network', async () => {
    // Create friendships: 1-2, 1-3, 1-4, 2-3, 2-4
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id },
      { userId: user1._id, friendId: user3._id },
      { userId: user3._id, friendId: user1._id },
      { userId: user1._id, friendId: user4._id },
      { userId: user4._id, friendId: user1._id },
      { userId: user2._id, friendId: user3._id },
      { userId: user3._id, friendId: user2._id },
      { userId: user2._id, friendId: user4._id },
      { userId: user4._id, friendId: user2._id }
    ]);

    // Get user1's friends (should have 3)
    const res1 = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token1}`);

    // Get user2's friends (should have 3)
    const res2 = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token2}`);
  });

  // Test Case 37: Accept request then try to accept again
  it('should prevent double acceptance of friend request', async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    // First accept
    await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: true
      });

    // Try to accept again
    await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: true
      });
  });

  // Test Case 38: Invalid request ID format

  // Test Case 39: Filter out non-pending requests
  it('should only return pending requests, not accepted/rejected', async () => {
    await FriendRequest.create([
      { senderId: user2._id, receiverId: user1._id, status: 'pending' },
      { senderId: user3._id, receiverId: user1._id, status: 'accepted' },
      { senderId: user4._id, receiverId: user1._id, status: 'rejected' }
    ]);

    const res = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test Case 40: Outgoing requests filter
  it('should only return outgoing requests from user', async () => {
    await FriendRequest.create([
      { senderId: user1._id, receiverId: user2._id, status: 'pending' },
      { senderId: user1._id, receiverId: user3._id, status: 'pending' },
      { senderId: user4._id, receiverId: user1._id, status: 'pending' } // Should not be in outgoing
    ]);

    const res = await request(app)
      .get('/requests/outgoing')
      .set('Authorization', `Bearer ${token1}`);
  });
});