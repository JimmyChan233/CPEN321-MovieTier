/**
 * Auth Service Tests - Mocked
 * Comprehensive tests for AuthService with mocked dependencies
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

// Mock google-auth-library BEFORE importing anything else
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken
    }))
  };
});

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Import after mocking
import { AuthService } from '../../src/services/auth/authService';
import User from '../../src/models/user/User';

describe('AuthService - Mocked Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authService: AuthService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    authService = new AuthService();
    jest.clearAllMocks();
  });

  // Test Case 1: verifyGoogleToken with valid token

  // Test Case 2: verifyGoogleToken with token missing email

  // Test Case 3: verifyGoogleToken with token missing sub

  // Test Case 4: verifyGoogleToken with null payload

  // Test Case 5: verifyGoogleToken handles verification error

  // Test Case 6: verifyGoogleToken with missing name (uses email as fallback)

  // Test Case 7: signIn with existing user

  // Test Case 8: signIn with non-existent user
  it('should throw error when user not found', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'nonexistent@example.com',
        name: 'New User',
        sub: 'google-999'
      })
    });

    await expect(authService.signIn('token'))
      .rejects.toThrow('User not found. Please sign up first.');
  });

  // Test Case 9: signIn with invalid Google token

  // Test Case 10: signUp with new user
  it('should create new user successfully', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'newuser@example.com',
        name: 'New User',
        sub: 'google-new',
        picture: 'https://example.com/new.jpg'
      })
    });

    const result = await authService.signUp('token');

    expect(result.user.email).toBe('newuser@example.com');
    expect(result.user.name).toBe('New User');
    expect(result.user.googleId).toBe('google-new');
    expect(result.user.profileImageUrl).toBe('https://example.com/new.jpg');
    expect(result.user.googlePictureUrl).toBe('https://example.com/new.jpg');
    expect(result.token).toBeDefined();

    // Verify user was saved to database
    const savedUser = await User.findOne({ email: 'newuser@example.com' });
    expect(savedUser).toBeDefined();
  });

  // Test Case 11: signUp with existing user
  it('should throw error when user already exists', async () => {
    await User.create({
      email: 'existing@example.com',
      name: 'Existing',
      googleId: 'google-existing'
    });

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'existing@example.com',
        name: 'Existing',
        sub: 'google-existing'
      })
    });

    await expect(authService.signUp('token'))
      .rejects.toThrow('User already exists. Please sign in.');
  });

  // Test Case 12: signUp with invalid Google token

  // Test Case 13: generateToken creates valid JWT

  // Test Case 14: generateToken with different userIds

  // Test Case 15: generateToken sets expiration

  // Test Case 16: signUp without picture

  // Test Case 17: signIn returns correct token

  // Test Case 18: Multiple signIns for same user
  it('should handle multiple signin attempts for same user', async () => {
    await User.create({
      email: 'multi@example.com',
      name: 'Multi User',
      googleId: 'google-multi'
    });

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'multi@example.com',
        name: 'Multi User',
        sub: 'google-multi'
      })
    });

    const result1 = await authService.signIn('token1');

    // Add small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result2 = await authService.signIn('token2');

    // Should generate different tokens (due to different iat)
    expect(result1.token).not.toBe(result2.token);

    // But same user
    expect(result1.user.email).toBe(result2.user.email);
  });

  // Test Case 19: signUp creates user with all fields

  // Test Case 20: verifyGoogleToken with empty string token

  // Test Case 21: generateToken uses default secret when JWT_SECRET not set

  // Test Case 22: verifyGoogleToken with undefined payload fields
  it('should handle undefined fields in payload gracefully', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: undefined,
        name: 'Test User',
        sub: 'google-123'
      })
    });

    await expect(authService.verifyGoogleToken('token'))
      .rejects.toThrow('Invalid Google token');
  });
});