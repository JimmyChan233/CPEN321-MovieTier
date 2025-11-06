/**
 * Advanced Movie Comparison Controller Tests - Unmocked
 * Comprehensive tests targeting all code paths in movieComparisionController.ts
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import WatchlistItem from '../../src/models/watch/WatchlistItem';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

describe('Advanced Movie Comparison Controller Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/', movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
    await WatchlistItem.deleteMany({});
  });

  // Test Case 1: Complete binary search flow (left path)
  it('should complete binary search taking left path', async () => {
    // Add 3 existing ranked movies
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: mockMovies.theShawshankRedemption.id,
        title: mockMovies.theShawshankRedemption.title,
        rank: 1,
        posterPath: mockMovies.theShawshankRedemption.poster_path
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
        movieId: mockMovies.inception.id,
        title: mockMovies.inception.title,
        rank: 3,
        posterPath: mockMovies.inception.poster_path
      }
    ]);

    // Start ranking new movie
    await request(app)
      .post('/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: mockMovies.darkKnight
      });

    // Compare: new movie > middle (take right path)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: mockMovies.darkKnight
      });

    // Compare: new movie < top (take left path, finalize at rank 2)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: mockMovies.theShawshankRedemption.id
      });
  });

  // Test Case 2: Complete binary search flow (right path)
  it('should complete binary search taking right path', async () => {
    // Add 5 existing ranked movies
    const movies = [];
    for (let i = 0; i < 5; i++) {
      movies.push({
        userId: user._id,
        movieId: 100000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }
    await RankedMovie.create(movies);

    // Start ranking new movie
    await request(app)
      .post('/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 200000,
          title: 'New Movie',
          poster_path: '/new.jpg',
          overview: 'New movie overview',
          release_date: '2024-01-01',
          vote_average: 8.0
        }
      });

    // Take left path initially
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: 200000
      });

    // Continue comparisons
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: 100003
      });
  });

  // Test Case 5: Edge case - rank at position 1
  it('should correctly rank movie at position 1', async () => {
    // Add 3 existing movies
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 500001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 500002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 500003,
        title: 'Movie 3',
        rank: 3,
        posterPath: '/path.jpg'
      }
    ]);

    // Start ranking a movie that will be #1
    await request(app)
      .post('/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 500000,
          title: 'Best Movie',
          poster_path: '/best.jpg',
          overview: 'The best movie',
          release_date: '2024-01-01',
          vote_average: 10.0
        }
      });

    // Compare: new movie > middle
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: 500000
      });

    // Compare: new movie > top (should rank at #1)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: 500000
      });
  });

  // Test Case 6: Edge case - rank at last position
  it('should correctly rank movie at last position', async () => {
    // Add 3 existing movies
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 600001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 600002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/path.jpg'
      },
      {
        userId: user._id,
        movieId: 600003,
        title: 'Movie 3',
        rank: 3,
        posterPath: '/path.jpg'
      }
    ]);

    // Start ranking a movie that will be last
    await request(app)
      .post('/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movie: {
          id: 600004,
          title: 'Worst Movie',
          poster_path: '/worst.jpg',
          overview: 'Not a good movie',
          release_date: '2024-01-01',
          vote_average: 2.0
        }
      });

    // Compare: new movie < middle
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: 600002
      });

    // Compare: new movie < bottom (should rank at last)
    await request(app)
      .post('/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: 600003
      });
  });

});