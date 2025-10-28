/**
 * User Profile API Tests - Unmocked
 * Tests: PUT /users/profile, POST /users/fcm-token, GET /users/profile
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import userRoutes from '../../src/routes/userRoutes';
import User from '../../src/models/user/User';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Unmocked: PUT /users/profile', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', userRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid name update
  // Expected status code: 200
  // Expected behavior: User name updated in database
  // Expected output: Updated user profile
  it('should update user profile name', async () => {
    const newName = 'Updated Name';
    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: newName });

    expect(res.status).toStrictEqual(200);
    expect(res.body.user.name).toStrictEqual(newName);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser!.name).toStrictEqual(newName);
  });

  // Input: Valid profileImageUrl update
  // Expected status code: 200
  // Expected behavior: User profile image updated
  // Expected output: Updated user profile
  it('should update user profile image', async () => {
    const newImageUrl = 'https://example.com/new-image.jpg';
    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ profileImageUrl: newImageUrl });

    expect(res.status).toStrictEqual(200);
    expect(res.body.user.profileImageUrl).toStrictEqual(newImageUrl);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser!.profileImageUrl).toStrictEqual(newImageUrl);
  });

  // Input: Update both name and profileImageUrl
  // Expected status code: 200
  // Expected behavior: Both fields updated
  // Expected output: Updated user profile
  it('should update multiple profile fields', async () => {
    const newName = 'New Name';
    const newImageUrl = 'https://example.com/another-image.jpg';

    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: newName,
        profileImageUrl: newImageUrl
      });

    expect(res.status).toStrictEqual(200);
    expect(res.body.user.name).toStrictEqual(newName);
    expect(res.body.user.profileImageUrl).toStrictEqual(newImageUrl);
  });

  // Input: Empty name string
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject empty name', async () => {
    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toBeDefined();
  });

  // Input: Whitespace-only name
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject whitespace-only name', async () => {
    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });

    expect(res.status).toStrictEqual(400);
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated profile update', async () => {
    const res = await request(app)
      .put('/profile')
      .send({ name: 'New Name' });

    expect(res.status).toStrictEqual(401);
  });

  // Input: Invalid JWT token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject invalid token', async () => {
    const res = await request(app)
      .put('/profile')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ name: 'New Name' });

    expect(res.status).toStrictEqual(401);
  });
});

describe('Unmocked: POST /users/fcm-token', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', userRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid FCM token
  // Expected status code: 200
  // Expected behavior: FCM token stored in database
  // Expected output: Success message
  it('should register FCM token', async () => {
    const fcmToken = 'mock-fcm-token-12345';
    const res = await request(app)
      .post('/fcm-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: fcmToken });

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toStrictEqual(true);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser!.fcmToken).toStrictEqual(fcmToken);
  });

  // Input: Update existing FCM token
  // Expected status code: 200
  // Expected behavior: FCM token replaced
  // Expected output: Success message
  it('should update existing FCM token', async () => {
    const oldToken = 'old-fcm-token';
    await User.findByIdAndUpdate(user._id, { fcmToken: oldToken });

    const newToken = 'new-fcm-token-67890';
    const res = await request(app)
      .post('/fcm-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: newToken });

    expect(res.status).toStrictEqual(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser!.fcmToken).toStrictEqual(newToken);
  });

  // Input: Missing token
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject missing FCM token', async () => {
    const res = await request(app)
      .post('/fcm-token')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(400);
  });

  // Input: Empty token string
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject empty FCM token', async () => {
    const res = await request(app)
      .post('/fcm-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: '' });

    expect(res.status).toStrictEqual(400);
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated FCM token registration', async () => {
    const res = await request(app)
      .post('/fcm-token')
      .send({ token: 'mock-fcm-token' });

    expect(res.status).toStrictEqual(401);
  });
});

describe('Unmocked: GET /users/profile/:userId', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let otherUser: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', userRoutes);

    user = await User.create(mockUsers.validUser);
    otherUser = await User.create({
      ...mockUsers.validUser,
      email: 'other@example.com',
      googleId: 'google-other-123'
    });
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid user ID
  // Expected status code: 200
  // Expected behavior: Return user profile
  // Expected output: User profile object
  it('should get user profile by ID', async () => {
    const res = await request(app)
      .get(`/api/users/profile/${otherUser._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toStrictEqual(otherUser.email);
  });

  // Input: Own user ID
  // Expected status code: 200
  // Expected behavior: Return own profile
  // Expected output: Own user profile
  it('should get own profile', async () => {
    const res = await request(app)
      .get(`/api/users/profile/${user._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(200);
    expect(res.body.user.email).toStrictEqual(user.email);
  });

  // Input: Non-existent user ID
  // Expected status code: 404
  // Expected behavior: User not found
  // Expected output: Error message
  it('should return 404 for non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/users/profile/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(404);
  });

  // Input: Invalid user ID format
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message
  it('should reject invalid user ID format', async () => {
    const res = await request(app)
      .get('/profile/invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(400);
  });

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated profile request', async () => {
    const res = await request(app)
      .get(`/api/users/profile/${otherUser._id}`);

    expect(res.status).toStrictEqual(401);
  });
});
