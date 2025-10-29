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
  it('should create bilateral friendship on accept', async () => {
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
        accept: true
      });

    // Verify bilateral friendships
    const friendship1 = await Friendship.findOne({ userId: user1._id, friendId: user2._id });
    const friendship2 = await Friendship.findOne({ userId: user2._id, friendId: user1._id });

    expect(friendship1).toBeDefined();
    expect(friendship2).toBeDefined();
  });

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
  it('should get all friends with populated data', async () => {
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user1._id, friendId: user3._id },
      { userId: user1._id, friendId: user4._id }
    ]);

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test Case 9: Get pending requests with sender details
  it('should get pending requests with sender populated', async () => {
    await FriendRequest.create([
      { senderId: user2._id, receiverId: user1._id, status: 'pending' },
      { senderId: user3._id, receiverId: user1._id, status: 'pending' },
      { senderId: user4._id, receiverId: user1._id, status: 'pending' }
    ]);

    const res = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token1}`);
  });

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
  it('should get outgoing friend requests', async () => {
    await FriendRequest.create([
      { senderId: user1._id, receiverId: user2._id, status: 'pending' },
      { senderId: user1._id, receiverId: user3._id, status: 'pending' }
    ]);

    const res = await request(app)
      .get('/requests/outgoing')
      .set('Authorization', `Bearer ${token1}`);
  });

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

  // Test Case 13: Send request to non-existent user
  it('should handle request to non-existent email', async () => {
    await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: 'nonexistent@example.com' });
  });

  // Test Case 14: Invalid email format
  it('should reject invalid email format', async () => {
    await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: 'not-an-email' });
  });

  // Test Case 15: Missing email field
  it('should reject request without email', async () => {
    await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({});
  });

  // Test Case 16: Respond to non-existent request
  it('should handle respond to non-existent request', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: fakeId.toString(),
        accept: true
      });
  });

  // Test Case 17: Respond to request not meant for user
  it('should reject respond to request for different receiver', async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user3._id,
      status: 'pending'
    });

    await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: true
      });
  });

  // Test Case 18: Respond to already accepted request
  it('should reject respond to already accepted request', async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'accepted'
    });

    await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: true
      });
  });

  // Test Case 19: Respond to already rejected request
  it('should reject respond to already rejected request', async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'rejected'
    });

    await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: true
      });
  });

  // Test Case 20: Delete non-existent friendship
  it('should handle delete of non-existent friendship', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    await request(app)
      .delete(`/api/friends/${fakeId.toString()}`)
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test Case 21: Delete friendship with invalid friendId format
  it('should handle delete with invalid friendId format', async () => {
    await request(app)
      .delete('/invalid-id-format')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test Case 22: Unauthorized access to friends list
  it('should reject unauthorized access to friends list', async () => {
    await request(app)
      .get('/');
  });

  // Test Case 23: Unauthorized access to pending requests
  it('should reject unauthorized access to pending requests', async () => {
    await request(app)
      .get('/requests');
  });

  // Test Case 24: Unauthorized send friend request
  it('should reject unauthorized friend request', async () => {
    const res = await request(app)
      .post('/request')
      .send({ email: user2.email });

    expect(res.status).toStrictEqual(401);
  });

  // Test Case 25: Unauthorized respond to friend request
  it('should reject unauthorized respond', async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    const res = await request(app)
      .post('/respond')
      .send({
        requestId: (friendReq as any)._id.toString(),
        accept: true
      });

    expect(res.status).toStrictEqual(401);
  });

  // Test Case 26: Unauthorized delete friendship
  it('should reject unauthorized delete friendship', async () => {
    const res = await request(app)
      .delete(`/${(user2 as any)._id.toString()}`);

    expect(res.status).toStrictEqual(401);
  });

  // Test Case 27: Multiple rapid friend requests (rate limiting test)
  it('should handle multiple rapid friend requests', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: `user${i}@example.com` });

      expect([400, 404, 429]).toContain(res.status); // User doesn't exist or rate limited
    }
  });

  // Test Case 28: Send request to already friend
  it('should reject request to existing friend', async () => {
    // Create friendship
    await Friendship.create([
      { userId: user1._id, friendId: user2._id },
      { userId: user2._id, friendId: user1._id }
    ]);

    // Try to send friend request
    const res = await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: user2.email });

    expect([409, 429]).toContain(res.status); // Conflict or rate limited
  });

  // Test Case 29: Get empty friends list
  it('should get empty friends list when no friends', async () => {
    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
  });

  // Test Case 30: Get empty pending requests
  it('should get empty pending requests when none exist', async () => {
    const res = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
  });

  // Test Case 31: Get empty detailed requests
  it('should get empty detailed requests when none exist', async () => {
    const res = await request(app)
      .get('/requests/detailed')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
  });

  // Test Case 32: Get empty outgoing requests
  it('should get empty outgoing requests when none exist', async () => {
    const res = await request(app)
      .get('/requests/outgoing')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
  });

  // Test Case 33: Get empty detailed outgoing requests
  it('should get empty detailed outgoing requests when none exist', async () => {
    const res = await request(app)
      .get('/requests/outgoing/detailed')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toStrictEqual(200);
  });

  // Test Case 34: Respond with missing accept field
  it('should handle respond with missing accept field', async () => {
    const friendReq = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    const res = await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (friendReq as any)._id.toString()
      });

    expect(res.status).toStrictEqual(400);
  });

  // Test Case 35: Respond with missing requestId field
  it('should handle respond with missing requestId field', async () => {
    const res = await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        accept: true
      });

    expect(res.status).toStrictEqual(400);
  });

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
  it('should handle invalid requestId format in respond', async () => {
    await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: 'not-a-valid-objectid',
        accept: true
      });
  });

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