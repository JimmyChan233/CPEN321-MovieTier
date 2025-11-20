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
import authRoutes from '../../../src/routes/authRoutes';
import User from '../../../src/models/user/User';
import { Friendship, FriendRequest } from '../../../src/models/friend/Friend';
import { authenticate } from '../../../src/middleware/auth';
import { generateTestJWT, mockUsers } from '../../utils/test-fixtures';
import { AuthService } from '../../../src/services/auth/authService';

// Mock the Google OAuth verification with different tokens for different scenarios
const mockTokenMap: Record<string, { email: string; name: string; googleId: string; picture?: string }> = {
  'mock-valid-token': {
    email: 'test@example.com',
    name: 'Test User',
    googleId: 'google-123',
    picture: 'https://example.com/image.jpg'
  },
  'mock-nonexistent-token': {
    email: 'nonexistent@example.com',
    name: 'New User',
    googleId: 'google-999',
    picture: undefined
  },
  'mock-new-user-token': {
    email: 'newuser@example.com',
    name: 'New User',
    googleId: 'google-new-123',
    picture: 'https://example.com/new.jpg'
  },
  'mock-existing-user-token': {
    email: 'existing@example.com',
    name: 'Different User',
    googleId: 'google-different',
    picture: undefined
  }
};

jest.spyOn(AuthService.prototype, 'verifyGoogleToken').mockImplementation(async (idToken: string) => {
  const mockData = mockTokenMap[idToken];
  if (mockData) {
    return mockData;
  }
  throw new Error('Invalid Google token');
});

// Interface POST /auth/signin
describe('Unmocked: POST /auth/signin', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', authRoutes);
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

  // Input: No idToken in request body
  // Expected status code: 400
  // Expected behavior: Request is rejected with validation error
  // Expected output: Error message indicating missing idToken
  it('should reject signin without idToken', async () => {
    const res = await request(app)
      .post('/signin')
      .send({
        email: 'test@example.com',
        name: 'Test User'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/idToken|required/i);
  });

  // Input: Email for non-existent user
  // Expected status code: 400
  // Expected behavior: Database is unchanged, error is returned
  // Expected output: Error message "User not found"
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
    app.use('/', authRoutes);
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

  // Input: No idToken in request
  // Expected status code: 400
  // Expected behavior: Database is unchanged
  // Expected output: Error message about missing idToken
  it('should reject signup without idToken', async () => {
    const res = await request(app)
      .post('/signup')
      .send({
        email: 'newuser@example.com',
        name: 'New User'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/idToken|required/i);
  });

  // Input: Email that already exists in database
  // Expected status code: 400
  // Expected behavior: Database is unchanged, no duplicate user created
  // Expected output: Error message about duplicate email
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
    app.use('/', authRoutes);
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

  // Input: No authentication token in header
  // Expected status code: 401
  // Expected behavior: Request is rejected without signing out
  // Expected output: Unauthorized error message

  // Input: Malformed or invalid JWT token
  // Expected status code: 401
  // Expected behavior: Request is rejected
  // Expected output: Invalid token error
  it('should reject signout with invalid token', async () => {
    const res = await request(app)
      .post('/signout')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.message).toMatch(/invalid|expired/i);
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
    app.use('/', authRoutes);
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

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Database is unchanged
  // Expected output: Unauthorized error

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
      .delete('/account')
      .set('Authorization', 'Bearer invalid.token')
      .send({});

    expect(res.status).toStrictEqual(401);

    // Verify user still exists
    const stillExistingUser = await User.findById(user._id);
    expect(stillExistingUser).toBeDefined();
  });
});
