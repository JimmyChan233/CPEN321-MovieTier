/**
 * @mocked Mocked tests for movie routes and controllers
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

/**
 * Movie API Tests - Mocked
 * Tests TMDB API failures, database errors, and edge cases
 */

import request from 'supertest';
import axios from 'axios';
import express from 'express';
import movieRoutes from '../../../src/routes/movieRoutes';
import RankedMovie from '../../../src/models/movie/RankedMovie';
import { generateTestJWT } from '../../utils/test-fixtures';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock getTmdbClient to return a mock axios instance
jest.mock('../../../src/services/tmdb/tmdbClient', () => ({
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
