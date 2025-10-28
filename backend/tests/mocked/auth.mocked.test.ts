/**
 * Authentication API Tests - Mocked
 *
 * These tests verify error handling and edge cases using mocks for external dependencies
 * (Google OAuth, JWT library, database errors). Tests include: signIn, signUp, signOut, deleteAccount
 */

import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import authRoutes from '../../src/routes/authRoutes';
import User from '../../src/models/user/User';
import * as authService from '../../src/services/auth/authService';
import { generateTestJWT } from '../utils/test-fixtures';

// Interface POST /auth/signin
describe('Mocked: POST /auth/signin', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  // Mocked behavior: authService.signIn throws database error
  // Input: Valid Google idToken
  // Expected status code: 500
  // Expected behavior: Error is caught and handled gracefully
  // Expected output: Internal server error message
  it('should handle database error gracefully', async () => {
    jest.spyOn(authService, 'signIn').mockRejectedValueOnce(
      new Error('Database connection failed')
    );

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'mock-valid-token',
        email: 'test@example.com'
      });

    expect(res.status).toStrictEqual(500);
    expect(res.body.message).toContain('error' || 'failed');
  });

  // Mocked behavior: Google OAuth verification fails
  // Input: Invalid or expired Google idToken
  // Expected status code: 401 or 400
  // Expected behavior: Request is rejected without querying database
  // Expected output: Authentication error message
  it('should reject invalid Google token', async () => {
    jest.spyOn(authService, 'signIn').mockRejectedValueOnce(
      new Error('Invalid Google token')
    );

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'invalid-google-token'
      });

    expect([400, 401]).toContain(res.status);
  });

  // Mocked behavior: JWT creation fails
  // Input: Valid user exists but JWT library throws error
  // Expected status code: 500
  // Expected behavior: Partial failure - user found but token generation failed
  // Expected output: Error message about token generation
  it('should handle JWT generation failure', async () => {
    jest.spyOn(authService, 'signIn').mockRejectedValueOnce(
      new Error('JWT generation failed')
    );

    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        idToken: 'mock-valid-token',
        email: 'test@example.com'
      });

    expect(res.status).toStrictEqual(500);
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

  // Mocked behavior: Database insert fails with duplicate key error
  // Input: Email already exists in unique index
  // Expected status code: 400
  // Expected behavior: Duplicate error is caught and formatted
  // Expected output: User-friendly duplicate email message
  it('should handle database duplicate key error', async () => {
    const mongooseError = new Error('Duplicate key error');
    (mongooseError as any).code = 11000;
    jest.spyOn(authService, 'signUp').mockRejectedValueOnce(mongooseError);

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'mock-valid-token',
        email: 'existing@example.com'
      });

    expect(res.status).toStrictEqual(400);
  });

  // Mocked behavior: Database connection fails during user creation
  // Input: Valid Google idToken, new email
  // Expected status code: 500
  // Expected behavior: Error is caught gracefully
  // Expected output: Internal server error message
  it('should handle database write failure', async () => {
    jest.spyOn(authService, 'signUp').mockRejectedValueOnce(
      new Error('Database write failed')
    );

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'mock-valid-token',
        email: 'newuser@example.com',
        name: 'New User'
      });

    expect(res.status).toStrictEqual(500);
    expect(res.body.message).toBeDefined();
  });

  // Mocked behavior: Google OAuth verification fails
  // Input: Invalid Google idToken format
  // Expected status code: 401 or 400
  // Expected behavior: Google verification fails before database interaction
  // Expected output: Authentication error
  it('should reject invalid Google token during signup', async () => {
    jest.spyOn(authService, 'signUp').mockRejectedValueOnce(
      new Error('Invalid Google token format')
    );

    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        idToken: 'malformed-token'
      });

    expect([400, 401]).toContain(res.status);
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

  // Mocked behavior: User deletion succeeds but friendship cleanup fails
  // Input: Valid JWT, valid user exists
  // Expected status code: 500
  // Expected behavior: Transaction is rolled back or partial delete is handled
  // Expected output: Error message about cascading delete failure
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

  // Mocked behavior: Database becomes unavailable mid-deletion
  // Input: Valid JWT
  // Expected status code: 500
  // Expected behavior: Error is caught and reported
  // Expected output: Database error message
  it('should handle database connection loss during deletion', async () => {
    jest.spyOn(User, 'deleteMany').mockRejectedValueOnce(
      new Error('Database connection lost')
    );

    const res = await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${generateTestJWT('test-user-id')}`)
      .send({});

    expect(res.status).toStrictEqual(500);
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
    expect(res.body.message).toContain('invalid' || 'token');
  });
});
