/**
 * User Profile API Tests - Unmocked
 * Tests: PUT /users/profile, POST /users/fcm-token, GET /users/profile
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import userRoutes from '../../../src/routes/userRoutes';
import User from '../../../src/models/user/User';
import { generateTestJWT, mockUsers } from '../../utils/test-fixtures';

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

  // Input: Valid profileImageUrl update
  // Expected status code: 200
  // Expected behavior: User profile image updated
  // Expected output: Updated user profile

  // Input: Update both name and profileImageUrl
  // Expected status code: 200
  // Expected behavior: Both fields updated
  // Expected output: Updated user profile

  // Input: Empty name string
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message

  // Input: Whitespace-only name
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error

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

  // Input: Update existing FCM token
  // Expected status code: 200
  // Expected behavior: FCM token replaced
  // Expected output: Success message

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

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
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

  // Input: Own user ID
  // Expected status code: 200
  // Expected behavior: Return own profile
  // Expected output: Own user profile

  // Input: Non-existent user ID
  // Expected status code: 404
  // Expected behavior: User not found
  // Expected output: Error message

  // Input: Invalid user ID format
  // Expected status code: 400
  // Expected behavior: Validation error
  // Expected output: Error message

  // Input: No authentication
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated profile request', async () => {
    const res = await request(app)
      .get(`/${otherUser._id}`);

    expect(res.status).toStrictEqual(401);
  });
});
