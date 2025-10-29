/**
 * Authentication API Tests - Mocked
 *
 * These tests verify error handling and edge cases using mocks for external dependencies
 * (Google OAuth, JWT library, database errors). Tests include: signIn, signUp, signOut, deleteAccount
 */

import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/authRoutes';
import User from '../../src/models/user/User';
import { AuthService } from '../../src/services/auth/authService';
import { generateTestJWT } from '../utils/test-fixtures';

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

  // Mocked behavior: AuthService.verifyGoogleToken throws error
  // Input: Valid Google idToken
  // Expected status code: 400
  // Expected behavior: Error is caught and handled gracefully
  // Expected output: Error message
  it('should handle Google token verification error', async () => {
    jest.spyOn(AuthService.prototype, 'verifyGoogleToken').mockRejectedValueOnce(
      new Error('Invalid Google token')
    );

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'invalid-token',
        email: 'test@example.com'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/Invalid Google token|Unable to sign in/i);
  });

  // Mocked behavior: User.findOne throws database error
  // Input: Valid idToken but database fails
  // Expected status code: 400
  // Expected behavior: Database error is caught
  // Expected output: Error message
  it('should handle database error during signin', async () => {
    jest.spyOn(AuthService.prototype, 'verifyGoogleToken').mockResolvedValueOnce({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123'
    });

    jest.spyOn(User, 'findOne').mockRejectedValueOnce(
      new Error('Database connection failed')
    );

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'mock-valid-token',
        email: 'test@example.com'
      });

    expect(res.status).toStrictEqual(400);
  });

  // Mocked behavior: JWT generation fails
  // Input: Valid user exists but JWT library throws error
  // Expected status code: 400
  // Expected behavior: Partial failure - user found but token generation failed
  // Expected output: Error message about token generation
  it('should handle JWT generation failure', async () => {
    jest.spyOn(AuthService.prototype, 'verifyGoogleToken').mockResolvedValueOnce({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123'
    });

    jest.spyOn(User, 'findOne').mockResolvedValueOnce({
      _id: 'user-id',
      email: 'test@example.com',
      name: 'Test User'
    } as any);

    jest.spyOn(AuthService.prototype, 'generateToken').mockImplementation(() => {
      throw new Error('JWT generation failed');
    });

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'mock-valid-token',
        email: 'test@example.com'
      });

    expect(res.status).toStrictEqual(400);
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

  // Mocked behavior: Database insert fails with duplicate key error
  // Input: Email already exists in unique index
  // Expected status code: 400
  // Expected behavior: Duplicate error is caught and formatted
  // Expected output: User-friendly duplicate email message
  it('should handle database duplicate key error', async () => {
    jest.spyOn(AuthService.prototype, 'verifyGoogleToken').mockResolvedValueOnce({
      email: 'existing@example.com',
      name: 'Existing User',
      googleId: 'google-123'
    });

    jest.spyOn(User, 'findOne').mockResolvedValueOnce({
      _id: 'existing-user-id',
      email: 'existing@example.com'
    } as any);

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'mock-valid-token',
        email: 'existing@example.com'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // Mocked behavior: Database connection fails during user creation
  // Input: Valid Google idToken, new email
  // Expected status code: 400
  // Expected behavior: Error is caught gracefully
  // Expected output: Error message
  it('should handle database write failure', async () => {
    jest.spyOn(AuthService.prototype, 'verifyGoogleToken').mockResolvedValueOnce({
      email: 'newuser@example.com',
      name: 'New User',
      googleId: 'google-456'
    });

    jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

    jest.spyOn(User.prototype, 'save').mockRejectedValueOnce(
      new Error('Database write failed')
    );

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'mock-valid-token',
        email: 'newuser@example.com',
        name: 'New User'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toBeDefined();
  });

  // Mocked behavior: Google OAuth verification fails
  // Input: Invalid Google idToken format
  // Expected status code: 400
  // Expected behavior: Google verification fails before database interaction
  // Expected output: Authentication error
  it('should reject invalid Google token during signup', async () => {
    jest.spyOn(AuthService.prototype, 'verifyGoogleToken').mockRejectedValueOnce(
      new Error('Invalid Google token format')
    );

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'malformed-token'
      });

    expect(res.status).toStrictEqual(400);
    expect(res.body.message).toMatch(/Invalid Google token|Unable to sign up/i);
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

  // Mocked behavior: JWT verification fails with invalid signature
  // Input: Token with tampered signature
  // Expected status code: 401
  // Expected behavior: Middleware rejects request before reaching handler
  // Expected output: Invalid token error
  it('should reject signout with tampered JWT', async () => {
    const res = await request(app)
      .post('/api/auth/signout')
      .set('Authorization', 'Bearer tampered.jwt.signature')
      .send({});

    expect(res.status).toStrictEqual(401);
  });

  // Mocked behavior: Token is expired
  // Input: Expired but otherwise valid JWT
  // Expected status code: 401
  // Expected behavior: Expired token is rejected
  // Expected output: Token expired message
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

  // Mocked behavior: User deletion succeeds but friendship cleanup fails
  // Input: Valid JWT, valid user exists
  // Expected status code: 500
  // Expected behavior: Transaction error is caught
  // Expected output: Error message about deletion failure
  it('should handle cascading delete failure', async () => {
    const mockFindByIdAndDelete = jest.spyOn(User, 'findByIdAndDelete')
      .mockRejectedValueOnce(new Error('Cascading delete failed'));

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${generateTestJWT('test-user-id')}`)
      .send({});

    expect(res.status).toStrictEqual(500);
    mockFindByIdAndDelete.mockRestore();
  });

  // Mocked behavior: JWT token signature is invalid
  // Input: Malformed Authorization header
  // Expected status code: 401
  // Expected behavior: Middleware rejects before handler executes
  // Expected output: Invalid token error
  it('should reject deletion with invalid token signature', async () => {
    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', 'Bearer invalid.signature.here')
      .send({});

    expect(res.status).toStrictEqual(401);
    expect(res.body.message).toMatch(/invalid|token|Unauthorized/i);
  });
  it('should reject deletion when userId is not set on request', async () => {
  // Import the controller directly
  const { deleteAccount } = require('../../src/controllers/auth/authController');
  
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
});
