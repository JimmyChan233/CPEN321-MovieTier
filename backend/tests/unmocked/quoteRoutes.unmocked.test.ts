/**
 * Quote Routes Tests - Unmocked
 * Tests for movie tagline fetching endpoint
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import quoteRoutes from '../../src/routes/quoteRoutes';
import User from '../../src/models/user/User';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

// Mock TMDB tagline service
jest.mock('../../src/services/tmdb/tmdbTaglineService', () => ({
  fetchMovieTagline: jest.fn()
}));

import { fetchMovieTagline } from '../../src/services/tmdb/tmdbTaglineService';
const mockFetchMovieTagline = fetchMovieTagline as jest.MockedFunction<typeof fetchMovieTagline>;

describe('Quote Routes - Unmocked Tests', () => {
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should fetch tagline with title and year', async () => {
      mockFetchMovieTagline.mockResolvedValueOnce('Why So Serious?');

      const res = await request(app)
        .get('/api/quotes?title=The Dark Knight&year=2008')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBe('Why So Serious?');
      expect(mockFetchMovieTagline).toHaveBeenCalledWith('The Dark Knight', '2008');
    });

    it('should fetch tagline with title only', async () => {
      mockFetchMovieTagline.mockResolvedValueOnce('Your mind is the scene of the crime.');

      const res = await request(app)
        .get('/api/quotes?title=Inception')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBe('Your mind is the scene of the crime.');
      expect(mockFetchMovieTagline).toHaveBeenCalledWith('Inception', undefined);
    });

    it('should reject request with missing title', async () => {
      const res = await request(app)
        .get('/api/quotes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Missing title');
      expect(res.body.data).toBeNull();
      expect(mockFetchMovieTagline).not.toHaveBeenCalled();
    });

    it('should reject request with empty title', async () => {
      const res = await request(app)
        .get('/api/quotes?title=   ')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Missing title');
      expect(mockFetchMovieTagline).not.toHaveBeenCalled();
    });

    it('should return fallback quote when no tagline found', async () => {
      mockFetchMovieTagline.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/quotes?title=Unknown Movie')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data).toBe('string');
      expect(res.body.fallback).toBe(true);
    });

    it('should return fallback quote on service errors', async () => {
      mockFetchMovieTagline.mockRejectedValueOnce(new Error('TMDB API error'));

      const res = await request(app)
        .get('/api/quotes?title=Test Movie')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data).toBe('string');
      expect(res.body.fallback).toBe(true);
    });

    it('should trim title whitespace', async () => {
      mockFetchMovieTagline.mockResolvedValueOnce('Test tagline');

      const res = await request(app)
        .get('/api/quotes?title=  Inception  &year=2010')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockFetchMovieTagline).toHaveBeenCalledWith('Inception', '2010');
    });

    it('should handle title with special characters', async () => {
      mockFetchMovieTagline.mockResolvedValueOnce('Tagline');

      const res = await request(app)
        .get('/api/quotes?title=Star Wars: Episode IV')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockFetchMovieTagline).toHaveBeenCalledWith('Star Wars: Episode IV', undefined);
    });

    it('should handle empty year parameter', async () => {
      mockFetchMovieTagline.mockResolvedValueOnce('Tagline');

      const res = await request(app)
        .get('/api/quotes?title=Movie&year=')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockFetchMovieTagline).toHaveBeenCalledWith('Movie', undefined);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/quotes?title=Test');

      expect(res.status).toBe(401);
    });
  });
});
