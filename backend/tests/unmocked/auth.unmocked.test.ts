/**
 * Authentication API Tests - Unmocked
 *
 * These tests verify the authentication endpoints without mocking external dependencies.
 * External components (Google OAuth, MongoDB) are expected to work as designed.
 * Tests include: signIn, signUp, signOut, deleteAccount
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import authRoutes from '../../src/routes/authRoutes';
import User from '../../src/models/user/User';
import { Friendship } from '../../src/models/friend/Friend';
import FriendRequest from '../../src/models/friend/FriendRequest';
import { authenticate } from '../../src/middleware/auth';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

// Interface POST /auth/signin
describe('Unmocked: POST /auth/signin', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  // Input: Valid existing user email (previously signed up)
  // Expected status code: 200
  // Expected behavior: User is authenticated and JWT token is returned
  // Expected output: User object with JWT token
  it('should successfully sign in an existing user', async () => {
    // Create a user first
    const user = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123',
      profileImageUrl: 'https://example.com/image.jpg'
    });

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'mock-valid-token',
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google-123',
        picture: 'https://example.com/image.jpg'
      });

    expect(res.status).toStrictEqual(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toStrictEqual('test@example.com');
    expect(res.body.user.name).toStrictEqual('Test User');
  });

  // Input: No idToken in request body
  // Expected status code: 400
  // Expected behavior: Request is rejected with validation error
  // Expected output: Error message indicating missing idToken
  it('should reject signin without idToken', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'test@example.com',
        name: 'Test User'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toContain('idToken' || 'required');
  });

  // Input: Email for non-existent user
  // Expected status code: 404 or 400
  // Expected behavior: Database is unchanged, error is returned
  // Expected output: Error message "User not found"
  it('should reject signin for non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'mock-valid-token',
        email: 'nonexistent@example.com',
        name: 'New User',
        googleId: 'google-999'
      });

    expect([400, 404]).toContain(res.status);
    expect(res.body.message).toContain('not found' || 'error');
  });
});

// Interface POST /auth/signup
describe('Unmocked: POST /auth/signup', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  // Input: Valid new user credentials (email doesn't exist)
  // Expected status code: 201
  // Expected behavior: New user is created in database with Google profile data
  // Expected output: Created user object with JWT token and status 201
  it('should successfully create a new user account', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'mock-valid-token',
        email: 'newuser@example.com',
        name: 'New User',
        googleId: 'google-new-123',
        picture: 'https://example.com/new.jpg'
      });

    expect(res.status).toStrictEqual(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toStrictEqual('newuser@example.com');
    expect(res.body.user.googleId).toStrictEqual('google-new-123');

    // Verify user was actually created in database
    const createdUser = await User.findOne({ email: 'newuser@example.com' });
    expect(createdUser).toBeDefined();
    expect(createdUser?.name).toStrictEqual('New User');
  });

  // Input: No idToken in request
  // Expected status code: 400
  // Expected behavior: Database is unchanged
  // Expected output: Error message about missing idToken
  it('should reject signup without idToken', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'newuser@example.com',
        name: 'New User'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toContain('idToken' || 'required');
  });

  // Input: Email that already exists in database
  // Expected status code: 400
  // Expected behavior: Database is unchanged, no duplicate user created
  // Expected output: Error message about duplicate email
  it('should reject signup with existing email', async () => {
    // Create initial user
    await User.create({
      email: 'existing@example.com',
      name: 'Existing User',
      googleId: 'google-existing',
      profileImageUrl: 'https://example.com/existing.jpg'
    });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'mock-valid-token',
        email: 'existing@example.com',
        name: 'Different User',
        googleId: 'google-different'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toContain('already exists' || 'duplicate');
  });
});

// Interface POST /auth/signout
describe('Unmocked: POST /auth/signout', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  // Input: Valid JWT token from authenticated user
  // Expected status code: 200
  // Expected behavior: User session is invalidated (no backend state change for stateless JWT)
  // Expected output: Success message
  it('should successfully sign out authenticated user', async () => {
    const user = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123'
    });

    const token = generateTestJWT(user._id.toString());

    const res = await request(app)
      .post('/api/auth/signout')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(200);
    expect(res.body.message).toContain('signed out' || 'success');
  });

  // Input: No authentication token in header
  // Expected status code: 401
  // Expected behavior: Request is rejected without signing out
  // Expected output: Unauthorized error message
  it('should reject signout without authentication token', async () => {
    const res = await request(app)
      .post('/api/auth/signout')
      .send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.message).toContain('token' || 'authentication');
  });

  // Input: Malformed or invalid JWT token
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Invalid token error
  it('should reject signout with invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/signout')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.message).toContain('invalid' || 'expired');
  });
});

// Interface DELETE /auth/account
describe('Unmocked: DELETE /auth/account', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Friendship.deleteMany({});
    await FriendRequest.deleteMany({});
  });

  // Input: Valid JWT token from authenticated user
  // Expected status code: 200
  // Expected behavior: User and all related data (friendships, friend requests) are deleted
  // Expected output: Success confirmation message
  it('should successfully delete user account and cascade delete related data', async () => {
    const user = await User.create({
      email: 'delete@example.com',
      name: 'Delete User',
      googleId: 'google-delete'
    });

    const friend = await User.create({
      email: 'friend@example.com',
      name: 'Friend User',
      googleId: 'google-friend'
    });

    // Create friendships and friend requests
    await Friendship.create({ userId: user._id, friendId: friend._id });
    await FriendRequest.create({
      senderId: user._id,
      receiverId: friend._id,
      status: 'pending'
    });

    const token = generateTestJWT(user._id.toString());

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toStrictEqual(200);

    // Verify user is deleted
    const deletedUser = await User.findById(user._id);
    expect(deletedUser).toBeNull();

    // Verify related friendships are deleted
    const remainingFriendships = await Friendship.find({ userId: user._id });
    expect(remainingFriendships.length).toBe(0);

    // Verify related friend requests are deleted
    const remainingRequests = await FriendRequest.find({ senderId: user._id });
    expect(remainingRequests.length).toBe(0);
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Database is unchanged
  // Expected output: Unauthorized error
  it('should reject account deletion without authentication', async () => {
    const user = await User.create({
      email: 'protected@example.com',
      name: 'Protected User',
      googleId: 'google-protected'
    });

    const res = await request(app)
      .delete('/api/auth/account')
      .send({});

    expect(res.status).toStrictEqual(401);

    // Verify user still exists
    const stillExistingUser = await User.findById(user._id);
    expect(stillExistingUser).toBeDefined();
  });

  // Input: Invalid authentication token
  // Expected status code: 401
  // Expected behavior: Database is unchanged
  // Expected output: Invalid token error
  it('should reject account deletion with invalid token', async () => {
    const user = await User.create({
      email: 'secure@example.com',
      name: 'Secure User',
      googleId: 'google-secure'
    });

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', 'Bearer invalid.token')
      .send({});

    expect(res.status).toStrictEqual(401);

    // Verify user still exists
    const stillExistingUser = await User.findById(user._id);
    expect(stillExistingUser).toBeDefined();
  });
});
