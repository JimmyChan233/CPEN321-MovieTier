/**
 * User API Tests - Unmocked
 * Tests: PUT /users/profile, POST /users/fcm-token
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
    app.use('/api/users', userRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid new display name
  // Expected status code: 200
  // Expected behavior: User's name is updated
  // Expected output: Updated user object with new name
  it('should successfully update user profile name', async () => {
    const newName = 'Updated Name';
    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: newName });

    expect(res.status).toStrictEqual(200);
    expect(res.body.name).toStrictEqual(newName);

    // Verify update in database
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.name).toStrictEqual(newName);
  });

  // Input: Empty name string
  // Expected status code: 400
  // Expected behavior: Request rejected
  // Expected output: Validation error
  it('should reject empty name update', async () => {
    const res = await request(app)
      .put('/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toStrictEqual(400);
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject profile update without authentication', async () => {
    const res = await request(app)
      .put('/profile')
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
    app.use('/api/users', userRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid FCM token
  // Expected status code: 200
  // Expected behavior: FCM token is stored on user
  // Expected output: Success message
  it('should successfully register FCM token', async () => {
    const fcmToken = 'eODL6-Yk3jg:APA91bE...';
    const res = await request(app)
      .post('/fcm-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: fcmToken });

    expect(res.status).toStrictEqual(200);

    // Verify token was stored
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.fcmToken).toStrictEqual(fcmToken);
  });

  // Input: Missing FCM token
  // Expected status code: 400
  // Expected behavior: Request rejected
  // Expected output: Validation error
  it('should reject missing FCM token', async () => {
    const res = await request(app)
      .post('/fcm-token')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(400);
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject FCM token registration without authentication', async () => {
    const res = await request(app)
      .post('/fcm-token')
      .send({ token: 'some-token' });

    expect(res.status).toStrictEqual(401);
  });
});
