/**
 * Auth Service Tests - Mocked
 * Comprehensive tests for AuthService with mocked dependencies
 */

import { AuthService } from '../../src/services/auth/authService';
import { OAuth2Client } from 'google-auth-library';
import User from '../../src/models/user/User';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

// Mock google-auth-library
jest.mock('google-auth-library');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('AuthService - Mocked Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authService: AuthService;
  let mockOAuth2Client: jest.Mocked<OAuth2Client>;

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

    // Get mocked OAuth2Client instance
    mockOAuth2Client = new OAuth2Client() as jest.Mocked<OAuth2Client>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: verifyGoogleToken with valid token
  it('should verify valid Google token successfully', async () => {
    const mockPayload = {
      email: 'test@example.com',
      name: 'Test User',
      sub: 'google-123',
      picture: 'https://example.com/pic.jpg'
    };

    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => mockPayload
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    const result = await authService.verifyGoogleToken('valid-token');

    expect(result).toEqual({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123',
      picture: 'https://example.com/pic.jpg'
    });
  });

  // Test Case 2: verifyGoogleToken with token missing email
  it('should throw error when token payload missing email', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        name: 'Test User',
        sub: 'google-123'
        // missing email
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.verifyGoogleToken('invalid-token'))
      .rejects.toThrow('Invalid Google token');
  });

  // Test Case 3: verifyGoogleToken with token missing sub
  it('should throw error when token payload missing sub', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'test@example.com',
        name: 'Test User'
        // missing sub
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.verifyGoogleToken('invalid-token'))
      .rejects.toThrow('Invalid Google token');
  });

  // Test Case 4: verifyGoogleToken with null payload
  it('should throw error when token payload is null', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => null
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.verifyGoogleToken('invalid-token'))
      .rejects.toThrow('Invalid Google token');
  });

  // Test Case 5: verifyGoogleToken handles verification error
  it('should throw error when token verification fails', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockRejectedValue(
      new Error('Token verification failed')
    );

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.verifyGoogleToken('bad-token'))
      .rejects.toThrow('Invalid Google token');
  });

  // Test Case 6: verifyGoogleToken with missing name (uses email as fallback)
  it('should use email as name when name is missing', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'test@example.com',
        sub: 'google-123'
        // missing name
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    const result = await authService.verifyGoogleToken('token');

    expect(result.name).toBe('test@example.com');
  });

  // Test Case 7: signIn with existing user
  it('should sign in existing user successfully', async () => {
    const user = await User.create({
      email: 'existing@example.com',
      name: 'Existing User',
      googleId: 'google-456'
    });

    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'existing@example.com',
        name: 'Existing User',
        sub: 'google-456'
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    const result = await authService.signIn('valid-token');

    expect(result.user.email).toBe('existing@example.com');
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  // Test Case 8: signIn with non-existent user
  it('should throw error when user not found', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'nonexistent@example.com',
        name: 'New User',
        sub: 'google-999'
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.signIn('token'))
      .rejects.toThrow('User not found. Please sign up first.');
  });

  // Test Case 9: signIn with invalid Google token
  it('should fail signin when Google token is invalid', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockRejectedValue(
      new Error('Invalid token')
    );

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.signIn('bad-token'))
      .rejects.toThrow('Invalid Google token');
  });

  // Test Case 10: signUp with new user
  it('should create new user successfully', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'newuser@example.com',
        name: 'New User',
        sub: 'google-new',
        picture: 'https://example.com/new.jpg'
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

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

    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'existing@example.com',
        name: 'Existing',
        sub: 'google-existing'
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.signUp('token'))
      .rejects.toThrow('User already exists. Please sign in.');
  });

  // Test Case 12: signUp with invalid Google token
  it('should fail signup when Google token is invalid', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockRejectedValue(
      new Error('Invalid token')
    );

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.signUp('bad-token'))
      .rejects.toThrow('Invalid Google token');
  });

  // Test Case 13: generateToken creates valid JWT
  it('should generate valid JWT token', () => {
    const userId = 'user-123';
    const token = authService.generateToken(userId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // Verify token can be decoded
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    expect(decoded.userId).toBe(userId);
  });

  // Test Case 14: generateToken with different userIds
  it('should generate unique tokens for different users', () => {
    const token1 = authService.generateToken('user-1');
    const token2 = authService.generateToken('user-2');

    expect(token1).not.toBe(token2);

    const decoded1 = jwt.verify(token1, process.env.JWT_SECRET!) as any;
    const decoded2 = jwt.verify(token2, process.env.JWT_SECRET!) as any;

    expect(decoded1.userId).toBe('user-1');
    expect(decoded2.userId).toBe('user-2');
  });

  // Test Case 15: generateToken sets expiration
  it('should set token expiration to 30 days', () => {
    const token = authService.generateToken('user-123');

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    expect(decoded.exp).toBeDefined();

    // Verify expiration is approximately 30 days from now
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

    expect(expiresIn).toBeGreaterThan(thirtyDaysInSeconds - 60);
    expect(expiresIn).toBeLessThan(thirtyDaysInSeconds + 60);
  });

  // Test Case 16: signUp without picture
  it('should handle signup without picture', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'nopic@example.com',
        name: 'No Picture User',
        sub: 'google-nopic'
        // no picture field
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    const result = await authService.signUp('token');

    expect(result.user.email).toBe('nopic@example.com');
    expect(result.user.profileImageUrl).toBeUndefined();
  });

  // Test Case 17: signIn returns correct token
  it('should return JWT token on successful signin', async () => {
    const user = await User.create({
      email: 'token@example.com',
      name: 'Token User',
      googleId: 'google-token'
    });

    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'token@example.com',
        name: 'Token User',
        sub: 'google-token'
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    const result = await authService.signIn('token');

    // Verify token contains user ID
    const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
    expect(decoded.userId).toBe(String(user._id));
  });

  // Test Case 18: Multiple signIns for same user
  it('should handle multiple signin attempts for same user', async () => {
    await User.create({
      email: 'multi@example.com',
      name: 'Multi User',
      googleId: 'google-multi'
    });

    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'multi@example.com',
        name: 'Multi User',
        sub: 'google-multi'
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    const result1 = await authService.signIn('token1');
    const result2 = await authService.signIn('token2');

    // Should generate different tokens
    expect(result1.token).not.toBe(result2.token);

    // But same user
    expect(result1.user.email).toBe(result2.user.email);
  });

  // Test Case 19: signUp creates user with all fields
  it('should create user with all Google profile fields', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'complete@example.com',
        name: 'Complete User',
        sub: 'google-complete',
        picture: 'https://example.com/complete.jpg'
      })
    });

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await authService.signUp('token');

    const user = await User.findOne({ email: 'complete@example.com' });

    expect(user).toBeDefined();
    expect(user!.email).toBe('complete@example.com');
    expect(user!.name).toBe('Complete User');
    expect(user!.googleId).toBe('google-complete');
    expect(user!.profileImageUrl).toBe('https://example.com/complete.jpg');
    expect(user!.googlePictureUrl).toBe('https://example.com/complete.jpg');
  });

  // Test Case 20: verifyGoogleToken with empty string token
  it('should handle empty token string', async () => {
    mockOAuth2Client.verifyIdToken = jest.fn().mockRejectedValue(
      new Error('Token is empty')
    );

    (OAuth2Client as any).mockImplementation(() => mockOAuth2Client);

    await expect(authService.verifyGoogleToken(''))
      .rejects.toThrow('Invalid Google token');
  });
});