/**
 * Friends API Tests - Unmocked
 * Tests: GET /friends, GET /friends/requests, POST /friends/request, POST /friends/respond, DELETE /friends/:friendId
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import friendRoutes from '../../src/routes/friendRoutes';
import User from '../../src/models/user/User';
import { Friendship, FriendRequest } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Unmocked: GET /friends', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let friend1: any;
  let friend2: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', friendRoutes);

    user = await User.create(mockUsers.validUser);
    friend1 = await User.create({
      email: 'friend1@example.com',
      name: 'Friend 1',
      googleId: 'google-friend-1'
    });
    friend2 = await User.create({
      email: 'friend2@example.com',
      name: 'Friend 2',
      googleId: 'google-friend-2'
    });
    token = generateTestJWT(user._id.toString());

    // Create friendships
    await Friendship.create({ userId: user._id, friendId: friend1._id });
    await Friendship.create({ userId: user._id, friendId: friend2._id });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: User with friends
  // Expected status code: 200
  // Expected behavior: Return all friends for user
  // Expected output: Array of friend objects with friend details
  it('should return user friends list', async () => {
    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  // Input: User with no friends
  // Expected status code: 200
  // Expected behavior: Return empty list
  // Expected output: Empty array
  it('should return empty friends list for isolated user', async () => {
    const newUser = await User.create({
      email: 'isolated@example.com',
      name: 'Isolated',
      googleId: 'google-isolated'
    });
    const newToken = generateTestJWT((newUser as any)._id.toString());

    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${newToken}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated friends request', async () => {
    const res = await request(app)
      .get('/');

    expect(res.status).toStrictEqual(401);
  });
});

describe('Unmocked: GET /friends/requests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let requester: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', friendRoutes);

    user = await User.create(mockUsers.validUser);
    requester = await User.create({
      email: 'requester@example.com',
      name: 'Requester',
      googleId: 'google-requester'
    });
    token = generateTestJWT(user._id.toString());

    // Create pending friend request
    await FriendRequest.create({
      senderId: requester._id,
      receiverId: user._id,
      status: 'pending'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: User with pending friend requests
  // Expected status code: 200
  // Expected behavior: Return pending friend requests
  // Expected output: Array of friend requests with sender info
  it('should return pending friend requests', async () => {
    const res = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('Unmocked: POST /friends/request', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let target: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', friendRoutes);

    user = await User.create(mockUsers.validUser);
    target = await User.create({
      email: 'target@example.com',
      name: 'Target User',
      googleId: 'google-target'
    });
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await FriendRequest.deleteMany({});
    await Friendship.deleteMany({});
  });

  // Input: Valid email of existing user
  // Expected status code: 201
  // Expected behavior: Friend request is created
  // Expected output: Created friend request object
  it('should successfully send friend request', async () => {
    const res = await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: target.email });

    expect(res.status).toStrictEqual(201);

    // Verify request was created
    const friendReq = await FriendRequest.findOne({
      senderId: user._id,
      receiverId: target._id
    });
    expect(friendReq).toBeDefined();
    expect(friendReq?.status).toBe('pending');
  });

  // Input: Non-existent email
  // Expected status code: 404
  // Expected behavior: Database unchanged
  // Expected output: User not found error
  it('should reject request to non-existent user', async () => {
    const res = await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toStrictEqual(404);
  });

  // Input: Own email address
  // Expected status code: 400
  // Expected behavior: Request rejected
  // Expected output: Cannot friend yourself error
  it('should reject self-friend request', async () => {
    const res = await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: user.email });

    expect([400, 409]).toContain(res.status);
  });

  // Input: Email of existing friend
  // Expected status code: 409
  // Expected behavior: Database unchanged
  // Expected output: Already friends error
  it('should reject request to existing friend', async () => {
    await Friendship.create({ userId: user._id, friendId: target._id });

    const res = await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: target.email });

    expect(res.status).toStrictEqual(409);
  });

  // Input: Duplicate pending request
  // Expected status code: 409
  // Expected behavior: Database unchanged
  // Expected output: Request already sent error
  it('should reject duplicate pending request', async () => {
    await FriendRequest.create({
      senderId: user._id,
      receiverId: target._id,
      status: 'pending'
    });

    const res = await request(app)
      .post('/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: target.email });

    expect(res.status).toStrictEqual(409);
  });
});

describe('Unmocked: POST /friends/respond', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let sender: any;
  let token: string;
  let friendRequest: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', friendRoutes);

    user = await User.create(mockUsers.validUser);
    sender = await User.create({
      email: 'sender@example.com',
      name: 'Sender',
      googleId: 'google-sender'
    });
    token = generateTestJWT(user._id.toString());

    friendRequest = await FriendRequest.create({
      senderId: sender._id,
      receiverId: user._id,
      status: 'pending'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid friend request ID, accept action
  // Expected status code: 200
  // Expected behavior: Request status updated to accepted, friendship created
  // Expected output: Success message
  it('should successfully accept friend request', async () => {
    const res = await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestId: friendRequest._id, action: 'accept' });

    expect(res.status).toStrictEqual(200);

    // Verify friendship was created
    const friendship = await Friendship.findOne({
      userId: user._id,
      friendId: sender._id
    });
    expect(friendship).toBeDefined();
  });

  // Input: Valid friend request ID, reject action
  // Expected status code: 200
  // Expected behavior: Request status updated to rejected
  // Expected output: Success message
  it('should successfully reject friend request', async () => {
    const newRequest = await FriendRequest.create({
      senderId: sender._id,
      receiverId: user._id,
      status: 'pending'
    });

    const res = await request(app)
      .post('/respond')
      .set('Authorization', `Bearer ${token}`)
      .send({ requestId: newRequest._id, action: 'reject' });

    expect(res.status).toStrictEqual(200);
  });
});

describe('Unmocked: DELETE /friends/:friendId', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let friend: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', friendRoutes);

    user = await User.create(mockUsers.validUser);
    friend = await User.create({
      email: 'friend@example.com',
      name: 'Friend',
      googleId: 'google-friend'
    });
    token = generateTestJWT(user._id.toString());

    await Friendship.create({ userId: user._id, friendId: friend._id });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid friend ID
  // Expected status code: 200
  // Expected behavior: Friendship is removed
  // Expected output: Success message
  it('should successfully remove friend', async () => {
    const res = await request(app)
      .delete(`/${friend._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);

    // Verify friendship was deleted
    const friendship = await Friendship.findOne({
      userId: user._id,
      friendId: friend._id
    });
    expect(friendship).toBeNull();
  });

  // Input: Non-existent friend ID
  // Expected status code: 404
  // Expected behavior: Database unchanged
  // Expected output: Not found error
  it('should reject removal of non-existent friend', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(404);
  });
});
