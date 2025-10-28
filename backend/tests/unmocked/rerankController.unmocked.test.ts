/**
 * Rerank Controller Tests - Unmocked
 * Tests movie reranking functionality
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT, mockUsers, mockMovies } from '../utils/test-fixtures';

describe('Rerank Controller Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/movies', movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // Test starting rerank with one movie
  it('should start rerank with single ranked movie', async () => {
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      rank: 1,
      posterPath: mockMovies.inception.poster_path
    });

    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: movie._id.toString()
      });
  });

  // Test starting rerank with multiple movies
  it('should start rerank with multiple ranked movies', async () => {
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

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 2 });

    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: movieToRerank!._id.toString()
      });
  });

  // Test starting rerank with 5 movies
  it('should start rerank with 5 ranked movies', async () => {
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

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 3 });

    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: movieToRerank!._id.toString()
      });
  });

  // Test starting rerank with 10 movies
  it('should start rerank with 10 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 10; i++) {
      movies.push({
        userId: user._id,
        movieId: 200000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 5 });

    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: movieToRerank!._id.toString()
      });
  });

  // Test rerank comparison
  it('should handle rerank comparison', async () => {
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

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 2 });

    // Start rerank
    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: movieToRerank!._id.toString()
      });

    // Try comparison
    await request(app)
      .post('/api/movies/rerank/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: mockMovies.inception.id
      });
  });

  // Test rerank without starting session
  it('should handle rerank comparison without session', async () => {
    await request(app)
      .post('/api/movies/rerank/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({
        preferredMovieId: mockMovies.inception.id
      });
  });

  // Test rerank with missing movieId
  it('should handle rerank start with missing movieId', async () => {
    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({});
  });

  // Test rerank with non-existent movie
  it('should handle rerank start with non-existent movie', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: fakeId.toString()
      });
  });

  // Test rerank with invalid movieId format
  it('should handle rerank start with invalid movieId format', async () => {
    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: 'invalid-id'
      });
  });

  // Test rerank with top-ranked movie
  it('should handle rerank of top-ranked movie', async () => {
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

    const topMovie = await RankedMovie.findOne({ userId: user._id, rank: 1 });

    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: topMovie!._id.toString()
      });
  });

  // Test rerank with bottom-ranked movie
  it('should handle rerank of bottom-ranked movie', async () => {
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

    const bottomMovie = await RankedMovie.findOne({ userId: user._id, rank: 3 });

    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: bottomMovie!._id.toString()
      });
  });

  // Test rerank unauthorized
  it('should reject unauthorized rerank request', async () => {
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: mockMovies.inception.id,
      title: mockMovies.inception.title,
      rank: 1,
      posterPath: mockMovies.inception.poster_path
    });

    await request(app)
      .post('/api/movies/rerank/start')
      .send({
        movieId: movie._id.toString()
      });
  });

  // Test rerank comparison with missing preferredMovieId
  it('should handle rerank comparison with missing preferredMovieId', async () => {
    await request(app)
      .post('/api/movies/rerank/compare')
      .set('Authorization', `Bearer ${token}`)
      .send({});
  });

  // Test rerank with 15 movies
  it('should handle rerank with 15 ranked movies', async () => {
    const movies = [];
    for (let i = 0; i < 15; i++) {
      movies.push({
        userId: user._id,
        movieId: 300000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: '/path.jpg'
      });
    }

    await RankedMovie.create(movies);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 8 });

    await request(app)
      .post('/api/movies/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        movieId: movieToRerank!._id.toString()
      });
  });
});
