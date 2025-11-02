/**
 * Movie API Tests - Mocked
 * Tests TMDB API failures, database errors, and edge cases
 */

import request from 'supertest';
import axios from 'axios';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT } from '../utils/test-fixtures';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock getTmdbClient to return a mock axios instance
jest.mock('../../src/services/tmdb/tmdbClient', () => ({
  getTmdbClient: jest.fn(() => ({
    get: mockedAxios.get
  }))
}));

describe('Mocked: GET /movies/search - TMDB API Failure', () => {
  let app: express.Application;
  const token = generateTestJWT('test-user-id');

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/movies', movieRoutes);
  });

  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  // Mocked behavior: TMDB API returns 500 error
  // Input: Valid search query
  // Expected status code: 500
  // Expected behavior: Error is caught and reported
  // Expected output: Error message about TMDB service failure
  it('should handle TMDB API server error', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Internal Server Error' } }
    });

    const res = await request(app)
      .get('/api/movies/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ query: 'Inception' });

    expect(res.status).toStrictEqual(500);
  });

  // Mocked behavior: TMDB API timeout
  // Input: Valid search query
  // Expected status code: 500
  // Expected behavior: Timeout error is caught
  // Expected output: Timeout error message
  it('should handle TMDB API timeout', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Request timeout'));

    const res = await request(app)
      .get('/api/movies/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ query: 'Inception' });

    expect(res.status).toStrictEqual(500);
  });

  // Mocked behavior: TMDB API returns empty results
  // Input: Search query with no matching movies
  // Expected status code: 200
  // Expected behavior: Empty results array is returned
  // Expected output: Empty array
  it('should return empty array for no matching results', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } });

    const res = await request(app)
      .get('/api/movies/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ query: 'xyz123nonexistent' });

    expect(res.status).toStrictEqual(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  // Mocked behavior: TMDB returns 401 (invalid API key)
  // Input: Valid query but invalid TMDB API key configured
  // Expected status code: 500
  // Expected behavior: Error is caught gracefully
  // Expected output: Error message
  it('should handle invalid TMDB API key', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 401, data: { status_code: 7 } }
    });

    const res = await request(app)
      .get('/api/movies/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ query: 'Inception' });

    expect(res.status).toStrictEqual(500);
  });
});

describe('Mocked: Movie Comparison and Addition - Database Failures', () => {
  let app: express.Application;
  const token = generateTestJWT('test-user-id');

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/movies', movieRoutes);
  });

  // Mocked behavior: RankedMovie.create() throws database error
  // Input: Valid movie data for first ranking
  // Expected status code: 500
  // Expected behavior: Transaction is rolled back
  // Expected output: Database error message
  it('should handle ranking creation database error', async () => {
    const createSpy = jest.spyOn(RankedMovie, 'create')
      .mockRejectedValueOnce(new Error('Database write failed'));

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 278,
        title: 'The Shawshank Redemption',
        posterPath: '/path.jpg'
      });

    expect(res.status).toStrictEqual(500);
    createSpy.mockRestore();
  });

  // Mocked behavior: Duplicate movie insert (should be caught)
  // Input: Try to rank same movie twice
  // Expected status code: 400
  // Expected behavior: Duplicate is detected
  // Expected output: Error message about duplicate
  it('should reject duplicate movie ranking', async () => {
    const findOneySpy = jest.spyOn(RankedMovie, 'findOne')
      .mockResolvedValueOnce({
        _id: 'existing-movie',
        movieId: 278,
        userId: 'test-user-id',
        title: 'The Shawshank Redemption',
        rank: 1
      } as any);

    const res = await request(app)
      .post('/api/movies/rank')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 278,
        title: 'The Shawshank Redemption'
      });

    expect(res.status).toStrictEqual(400);
    findOneySpy.mockRestore();
  });
});

describe('Mocked: GET /movies/ranked - Database Query Failure', () => {
  let app: express.Application;
  const token = generateTestJWT('test-user-id');

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/movies', movieRoutes);
  });

  // Mocked behavior: Database query fails
  // Input: Authenticated request
  // Expected status code: 500
  // Expected behavior: Error is caught and reported
  // Expected output: Database error message
  it('should handle ranked movies query failure', async () => {
    const mockQuery = {
      sort: jest.fn().mockRejectedValueOnce(new Error('Database connection lost'))
    };
    const findSpy = jest.spyOn(RankedMovie, 'find')
      .mockReturnValueOnce(mockQuery as any);

    const res = await request(app)
      .get('/api/movies/ranked')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(500);
    findSpy.mockRestore();
  });
});

describe('Mocked: DELETE /movies/ranked/:id - Database Errors', () => {
  let app: express.Application;
  const token = generateTestJWT('test-user-id');

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/movies', movieRoutes);
  });

  // Mocked behavior: Rank adjustment fails
  // Input: Valid movie ID to delete
  // Expected status code: 500
  // Expected behavior: Partial deletion is rolled back
  // Expected output: Error message
  it('should handle rank adjustment failure', async () => {
    const findByIdAndDeleteSpy = jest.spyOn(RankedMovie, 'findByIdAndDelete')
      .mockRejectedValueOnce(new Error('Delete failed'));

    const movieId = new (require('mongoose').Types.ObjectId)();
    const res = await request(app)
      .delete(`/api/movies/ranked/${movieId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toStrictEqual(500);
    findByIdAndDeleteSpy.mockRestore();
  });
});
