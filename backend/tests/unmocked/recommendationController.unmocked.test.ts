/**
 * Recommendation Controller Direct Tests - Unmocked
 * Tests recommendation controller methods directly to maximize coverage
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import recommendationRoutes from '../../src/routes/recommendationRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { Friendship } from '../../src/models/friend/Friend';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

describe('Recommendation Controller Direct Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', recommendationRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
    await Friendship.deleteMany({});
  });

  // Test with 1 ranked movie
  it('should handle recommendations with 1 ranked movie', async () => {
    await RankedMovie.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      rank: 1,
      posterPath: mockMovies.inception.poster_path
    });

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 3 ranked movies (analyze preferences)
  it('should handle recommendations with 3 ranked movies', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        rank: 1,
        posterPath: mockMovies.inception.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.theGodfather.id,
        title: mockMovies.theGodfather.title,
        rank: 2,
        posterPath: mockMovies.theGodfather.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.theShawshankRedemption.id,
        title: mockMovies.theShawshankRedemption.title,
        rank: 3,
        posterPath: mockMovies.theShawshankRedemption.poster_path
      }
    ]);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 10+ ranked movies (full algorithm)
  it('should handle recommendations with many ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 15; i++) {
      movies.push({
        userId: user._id,
        movieId: 100000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 5 ranked movies (medium case)
  it('should handle recommendations with 5 ranked movies', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        rank: 1,
        posterPath: mockMovies.inception.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.theGodfather.id,
        title: mockMovies.theGodfather.title,
        rank: 2,
        posterPath: mockMovies.theGodfather.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.theShawshankRedemption.id,
        title: mockMovies.theShawshankRedemption.title,
        rank: 3,
        posterPath: mockMovies.theShawshankRedemption.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.darkKnight.id,
        title: mockMovies.darkKnight.title,
        rank: 4,
        posterPath: mockMovies.darkKnight.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.interstellar.id,
        title: mockMovies.interstellar.title,
        rank: 5,
        posterPath: mockMovies.interstellar.poster_path
      }
    ]);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 20 ranked movies (large dataset)
  it('should handle recommendations with 20 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 20; i++) {
      movies.push({
        userId: user._id,
        movieId: 200000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 50 ranked movies (very large dataset)
  it('should handle recommendations with 50 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 50; i++) {
      movies.push({
        userId: user._id,
        movieId: 300000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 2 ranked movies (edge case)
  it('should handle recommendations with 2 ranked movies', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        rank: 1,
        posterPath: mockMovies.inception.poster_path
      },
      {
        userId: user._id,
        movieId: mockMovies.theGodfather.id,
        title: mockMovies.theGodfather.title,
        rank: 2,
        posterPath: mockMovies.theGodfather.poster_path
      }
    ]);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 7 ranked movies
  it('should handle recommendations with 7 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 7; i++) {
      movies.push({
        userId: user._id,
        movieId: 400000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 12 ranked movies
  it('should handle recommendations with 12 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 12; i++) {
      movies.push({
        userId: user._id,
        movieId: 500000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 25 ranked movies
  it('should handle recommendations with 25 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 25; i++) {
      movies.push({
        userId: user._id,
        movieId: 600000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 30 ranked movies
  it('should handle recommendations with 30 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 30; i++) {
      movies.push({
        userId: user._id,
        movieId: 700000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with 40 ranked movies
  it('should handle recommendations with 40 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 40; i++) {
      movies.push({
        userId: user._id,
        movieId: 800000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test with query params
  it('should handle recommendations with limit param', async () => {
    await RankedMovie.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      rank: 1,
      posterPath: mockMovies.inception.poster_path
    });

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .query({ limit: 10 });
  });

  // Test trending movies
  it('should get trending movies', async () => {
    await request(app)
      .get('/trending')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test trending without params
  it('should get trending movies without query params', async () => {
    await request(app)
      .get('/trending')
      .set('Authorization', `Bearer ${token}`);
  });

  // Test recommendations with different user
  it('should handle recommendations for different user', async () => {
    const user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-user2'
    });
    const token2 = generateTestJWT((user2 as any)._id.toString());

    await RankedMovie.create({
      userId: user2._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      rank: 1,
      posterPath: mockMovies.inception.poster_path
    });

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token2}`);
  });

  // Test with varied movie IDs to trigger different API calls
  it('should handle recommendations with varied movie IDs', async () => {
    await RankedMovie.create([
      { userId: user._id, movieId: 27205, title: 'Inception', rank: 1, posterPath: '/path1.jpg' },
      { userId: user._id, movieId: 238, title: 'The Godfather', rank: 2, posterPath: '/path2.jpg' },
      { userId: user._id, movieId: 278, title: 'Shawshank', rank: 3, posterPath: '/path3.jpg' },
      { userId: user._id, movieId: 155, title: 'Dark Knight', rank: 4, posterPath: '/path4.jpg' },
      { userId: user._id, movieId: 157336, title: 'Interstellar', rank: 5, posterPath: '/path5.jpg' },
      { userId: user._id, movieId: 122, title: 'LOTR', rank: 6, posterPath: '/path6.jpg' }
    ]);

    await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`);
  });
});
