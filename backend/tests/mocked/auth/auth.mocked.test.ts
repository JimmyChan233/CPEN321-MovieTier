/**
 * @mocked Mocked tests for authentication API
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Authentication API Tests - Mocked
 *
 * These tests verify error handling and edge cases using mocks for external dependencies
 * (Google OAuth, JWT library, database errors). Tests include: signIn, signUp, signOut, deleteAccount
 */

import request from 'supertest';
import express from 'express';
import authRoutes from '../../../src/routes/authRoutes';
import User from '../../../src/models/user/User';
import { AuthService } from '../../../src/services/auth/authService';
import { generateTestJWT } from '../../utils/test-fixtures';

// Interface POST /auth/signin
describe('Mocked: POST /auth/signin', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  it('should successfully sign in with valid credentials', async () => {
    const mockUser = {
      _id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      profileImageUrl: 'https://example.com/pic.jpg'
    };

    jest.spyOn(AuthService.prototype, 'signIn').mockResolvedValueOnce({
      user: mockUser as any,
      token: 'mock-jwt-token'
    });

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'valid-google-token'
      });

    expect(res.status).toStrictEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBe('mock-jwt-token');
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should handle errors without a message property during sign-in', async () => {
    jest.spyOn(AuthService.prototype, 'signIn').mockRejectedValueOnce({});

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'valid-google-token'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Unable to sign in. Please try again');
  });
});

// Interface POST /auth/signup
describe('Mocked: POST /auth/signup', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  it('should successfully sign up with valid credentials', async () => {
    const mockUser = {
      _id: 'new-user-123',
      email: 'newuser@example.com',
      name: 'New User',
      profileImageUrl: 'https://example.com/newpic.jpg'
    };

    jest.spyOn(AuthService.prototype, 'signUp').mockResolvedValueOnce({
      user: mockUser as any,
      token: 'mock-jwt-token-signup'
    });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'valid-google-token'
      });

    expect(res.status).toStrictEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBe('mock-jwt-token-signup');
    expect(res.body.user.email).toBe('newuser@example.com');
  });

  it('should handle errors without a message property during sign-up', async () => {
    jest.spyOn(AuthService.prototype, 'signUp').mockRejectedValueOnce({});

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'valid-google-token'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Unable to sign up. Please try again');
  });
});

// Interface POST /auth/signout
describe('Mocked: POST /auth/signout', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  it('should reject signout with expired token', async () => {
    const expiredToken = generateTestJWT('user-id');
    jest.useFakeTimers().setSystemTime(new Date().getTime() + 31 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/auth/signout')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({});

    jest.useRealTimers();
    expect(res.status).toStrictEqual(401);
  });
});

// Interface DELETE /auth/account
describe('Mocked: DELETE /auth/account', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  it('should reject deletion when userId is not set on request', async () => {
  // Import the controller directly
  const { deleteAccount } = require('../../../src/controllers/auth/authController');
  
  const mockReq = {
    userId: undefined // Explicitly undefined
  } as any;

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  } as any;

  await deleteAccount(mockReq, mockRes);

  expect(mockRes.status).toHaveBeenCalledWith(401);
  expect(mockRes.json).toHaveBeenCalledWith({
    success: false,
    message: 'Unauthorized'
  });
});

  it('should handle errors without a message property during account deletion', async () => {
    jest.spyOn(User, 'findByIdAndDelete').mockRejectedValueOnce({});

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${generateTestJWT('test-user-id')}`)
      .send({});

    expect(res.status).toStrictEqual(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Unable to delete account. Please try again');
  });
});
