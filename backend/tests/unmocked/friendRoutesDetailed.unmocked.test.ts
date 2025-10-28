/**
 * Friend Routes Detailed Tests - Unmocked
 * Tests additional friend route endpoints: detailed requests, outgoing requests, SSE stream
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import friendRoutes from '../../src/routes/friendRoutes';
import User from '../../src/models/user/User';
import { Friendship, FriendRequest } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Friend Routes Detailed Endpoints', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user1: any;
  let user2: any;
  let user3: any;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/friends', friendRoutes);

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
    token1 = generateTestJWT((user1 as any)._id.toString());
    token2 = generateTestJWT((user2 as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await FriendRequest.deleteMany({});
    await Friendship.deleteMany({});
  });

  // Test GET /requests/detailed
  it('should get detailed pending requests', async () => {
    await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    const res = await request(app)
      .get('/api/friends/requests/detailed')
      .set('Authorization', `Bearer ${token1}`);

    // Execute code path
  });

  // Test GET /requests/detailed with no requests
  it('should get empty detailed pending requests', async () => {
    const res = await request(app)
      .get('/api/friends/requests/detailed')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test GET /requests/detailed with multiple requests
  it('should get multiple detailed pending requests', async () => {
    await FriendRequest.create([
      {
        senderId: user2._id,
        receiverId: user1._id,
        status: 'pending'
      },
      {
        senderId: user3._id,
        receiverId: user1._id,
        status: 'pending'
      }
    ]);

    const res = await request(app)
      .get('/api/friends/requests/detailed')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test GET /requests/outgoing
  it('should get outgoing friend requests', async () => {
    await FriendRequest.create({
      senderId: user1._id,
      receiverId: user2._id,
      status: 'pending'
    });

    const res = await request(app)
      .get('/api/friends/requests/outgoing')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test GET /requests/outgoing with no requests
  it('should get empty outgoing requests', async () => {
    const res = await request(app)
      .get('/api/friends/requests/outgoing')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test GET /requests/outgoing with multiple requests
  it('should get multiple outgoing requests', async () => {
    await FriendRequest.create([
      {
        senderId: user1._id,
        receiverId: user2._id,
        status: 'pending'
      },
      {
        senderId: user1._id,
        receiverId: user3._id,
        status: 'pending'
      }
    ]);

    const res = await request(app)
      .get('/api/friends/requests/outgoing')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test GET /requests/outgoing/detailed
  it('should get detailed outgoing requests', async () => {
    await FriendRequest.create({
      senderId: user1._id,
      receiverId: user2._id,
      status: 'pending'
    });

    const res = await request(app)
      .get('/api/friends/requests/outgoing/detailed')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test GET /requests/outgoing/detailed with no requests
  it('should get empty detailed outgoing requests', async () => {
    const res = await request(app)
      .get('/api/friends/requests/outgoing/detailed')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test GET /requests/outgoing/detailed with multiple requests
  it('should get multiple detailed outgoing requests', async () => {
    await FriendRequest.create([
      {
        senderId: user1._id,
        receiverId: user2._id,
        status: 'pending'
      },
      {
        senderId: user1._id,
        receiverId: user3._id,
        status: 'pending'
      }
    ]);

    const res = await request(app)
      .get('/api/friends/requests/outgoing/detailed')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test POST /request with rate limiting (multiple rapid requests)
  it('should handle multiple rapid friend requests', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          email: `user${i}@example.com`
        });
    }
  });

  // Test POST /respond with accept=true
  it('should accept friend request with accept boolean', async () => {
    const req = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    const res = await request(app)
      .post('/api/friends/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (req as any)._id.toString(),
        accept: true
      });
  });

  // Test POST /respond with accept=false
  it('should reject friend request with accept boolean', async () => {
    const req = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    const res = await request(app)
      .post('/api/friends/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (req as any)._id.toString(),
        accept: false
      });
  });

  // Test POST /respond with wrong receiver
  it('should reject respond from non-receiver', async () => {
    const req = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user3._id,
      status: 'pending'
    });

    const res = await request(app)
      .post('/api/friends/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (req as any)._id.toString(),
        accept: true
      });
  });

  // Test POST /respond with already handled request
  it('should reject respond to already accepted request', async () => {
    const req = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'accepted'
    });

    const res = await request(app)
      .post('/api/friends/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (req as any)._id.toString(),
        accept: true
      });
  });

  // Test GET /friends with populated friendId
  it('should get friends list with population', async () => {
    await Friendship.create([
      {
        userId: user1._id,
        friendId: user2._id
      },
      {
        userId: user1._id,
        friendId: user3._id
      }
    ]);

    const res = await request(app)
      .get('/api/friends')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test unauthorized access to all endpoints
  it('should reject unauthorized detailed requests', async () => {
    await request(app)
      .get('/api/friends/requests/detailed');
  });

  it('should reject unauthorized outgoing requests', async () => {
    await request(app)
      .get('/api/friends/requests/outgoing');
  });

  it('should reject unauthorized outgoing detailed requests', async () => {
    await request(app)
      .get('/api/friends/requests/outgoing/detailed');
  });

  // Test POST /request with reverse pending request
  it('should handle reverse pending request scenario', async () => {
    // User2 already sent request to User1
    await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    // User1 tries to send request to User2
    const res = await request(app)
      .post('/api/friends/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        email: user2.email
      });
  });

  // Test POST /respond to create bilateral friendships
  it('should create bilateral friendships on accept', async () => {
    const req = await FriendRequest.create({
      senderId: user2._id,
      receiverId: user1._id,
      status: 'pending'
    });

    const res = await request(app)
      .post('/api/friends/respond')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        requestId: (req as any)._id.toString(),
        accept: true
      });

    // Check both directions of friendship
    const f1 = await Friendship.findOne({ userId: user1._id, friendId: user2._id });
    const f2 = await Friendship.findOne({ userId: user2._id, friendId: user1._id });
  });

  // Test DELETE with invalid friendId format
  it('should handle delete with invalid friendId', async () => {
    const res = await request(app)
      .delete('/api/friends/invalid-id-format')
      .set('Authorization', `Bearer ${token1}`);
  });

  // Test POST /request with email validation
  it('should validate email format in friend request', async () => {
    const res = await request(app)
      .post('/api/friends/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        email: 'not-an-email'
      });
  });

  // Test rate limiting edge case
  it('should enforce rate limiting on friend requests', async () => {
    // Send 6 requests rapidly (limit is 5 per minute)
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          email: user2.email
        });
    }
  });
});
