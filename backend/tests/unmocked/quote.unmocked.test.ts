/**
 * Quote API Tests - Unmocked
 * Tests: GET /quotes
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import quoteRoutes from '../../src/routes/quoteRoutes';
import User from '../../src/models/user/User';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Unmocked: GET /quotes', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/quotes', quoteRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT(user._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Input: Valid query parameter (movie title)
  // Expected status code: 200
  // Expected behavior: Fetch quote from TMDB or local catalog
  // Expected output: Quote object or fallback quote
  it('should return quote for movie', async () => {
    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .query({ title: 'Inception' });

    expect(res.status).toStrictEqual(200);
    expect(res.body).toHaveProperty('quote');
  });

  // Input: Movie title not found in TMDB
  // Expected status code: 200
  // Expected behavior: Return fallback quote from local catalog
  // Expected output: Fallback quote
  it('should return fallback quote for unknown movie', async () => {
    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .query({ title: 'NonexistentMoviexyz123' });

    expect(res.status).toStrictEqual(200);
    expect(res.body).toHaveProperty('quote');
  });

  // Input: No authentication token
  // Expected status code: 401
  // Expected behavior: Request rejected
  // Expected output: Unauthorized error
  it('should reject unauthenticated quote request', async () => {
    const res = await request(app)
      .get('/')
      .query({ title: 'Inception' });

    expect(res.status).toStrictEqual(401);
  });

  // Input: Missing title query parameter
  // Expected status code: 400
  // Expected behavior: Request rejected
  // Expected output: Validation error
  it('should reject quote request without title', async () => {
    const res = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(400);
  });
});
