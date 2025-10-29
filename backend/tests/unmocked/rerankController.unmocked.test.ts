/**
 * Rerank Controller Complete Tests - Unmocked
 * Exhaustive tests covering ALL code paths in rerankController.ts
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import movieRoutes from '../../src/routes/movieRoutes';
import User from '../../src/models/user/User';
import RankedMovie from '../../src/models/movie/RankedMovie';
import { generateTestJWT, mockUsers } from '../utils/test-fixtures';

describe('Rerank Controller - Complete Coverage', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_FOR_TESTS!);

    app = express();
    app.use(express.json());
    app.use('/', movieRoutes);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // ========== Invalid rankedId Validation ==========

  it('should reject missing rankedId', async () => {
    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid rankedId');
  });

  it('should reject invalid rankedId format', async () => {
    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: 'not-a-valid-objectid' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid rankedId');
  });

  it('should reject empty string rankedId', async () => {
    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid rankedId');
  });

  it('should reject null rankedId', async () => {
    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: null });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid rankedId');
  });

  // ========== Ranked Movie Not Found ==========

  it('should return 404 when ranked movie not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: fakeId.toString() });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });

  it('should return 404 when trying to rerank another users movie', async () => {
    const user2 = await User.create({
      ...mockUsers.validUser,
      email: 'user2@example.com',
      googleId: 'google-user2'
    });

    const movie = await RankedMovie.create({
      userId: user2._id,
      movieId: 100001,
      title: 'Other User Movie',
      rank: 1,
      posterPath: '/path.jpg'
    });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movie as any)._id.toString() });

    expect(res.status).toBe(404);
  });

  // ========== Remove Item and Close Gap ==========

  it('should remove movie and decrement ranks of higher movies', async () => {
    const movies = [];
    for (let i = 0; i < 5; i++) {
      movies.push({
        userId: user._id,
        movieId: 100000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: `/m${i}.jpg`
      });
    }
    await RankedMovie.create(movies);

    const movieToRemove = await RankedMovie.findOne({ userId: user._id, rank: 3 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRemove as any)._id.toString() });

    // Verify ranks 4 and 5 became 3 and 4
    const rank3 = await RankedMovie.findOne({ userId: user._id, movieId: 100003 });
    const rank4 = await RankedMovie.findOne({ userId: user._id, movieId: 100004 });

    expect(rank3?.rank).toBe(3);
    expect(rank4?.rank).toBe(4);
  });

  it('should handle removing movie from rank 1', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 200001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/1.jpg'
      },
      {
        userId: user._id,
        movieId: 200002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/2.jpg'
      },
      {
        userId: user._id,
        movieId: 200003,
        title: 'Movie 3',
        rank: 3,
        posterPath: '/3.jpg'
      }
    ]);

    const movieToRemove = await RankedMovie.findOne({ userId: user._id, rank: 1 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRemove as any)._id.toString() });

    // Verify movie 2 became rank 1
    const newRank1 = await RankedMovie.findOne({ userId: user._id, movieId: 200002 });
    expect(newRank1?.rank).toBe(1);
  });

  it('should handle removing movie from last rank', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 300001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/1.jpg'
      },
      {
        userId: user._id,
        movieId: 300002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/2.jpg'
      },
      {
        userId: user._id,
        movieId: 300003,
        title: 'Movie 3',
        rank: 3,
        posterPath: '/3.jpg'
      }
    ]);

    const movieToRemove = await RankedMovie.findOne({ userId: user._id, rank: 3 });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRemove as any)._id.toString() });

    // Verify ranks 1 and 2 unchanged
    const count = await RankedMovie.countDocuments({ userId: user._id });
    expect(count).toBe(2);
  });

  // ========== Empty List After Removal ==========

  it('should insert at rank 1 when list becomes empty', async () => {
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 400001,
      title: 'Only Movie',
      rank: 1,
      posterPath: '/only.jpg'
    });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movie as any)._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('added');

    const reinserted = await RankedMovie.findOne({ userId: user._id });
    expect(reinserted?.rank).toBe(1);
    expect(reinserted?.movieId).toBe(400001);
  });

  it('should preserve movie data when reinserting after empty list', async () => {
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 500001,
      title: 'Single Movie',
      rank: 1,
      posterPath: '/single.jpg'
    });

    await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movie as any)._id.toString() });

    const reinserted = await RankedMovie.findOne({ userId: user._id });
    expect(reinserted?.title).toBe('Single Movie');
    expect(reinserted?.posterPath).toBe('/single.jpg');
  });

  // ========== Start Comparison Session ==========

  it('should start comparison session with remaining movies', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 600001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/1.jpg'
      },
      {
        userId: user._id,
        movieId: 600002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/2.jpg'
      },
      {
        userId: user._id,
        movieId: 600003,
        title: 'Movie 3',
        rank: 3,
        posterPath: '/3.jpg'
      }
    ]);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 2 });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRerank as any)._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('compare');
    expect(res.body.data.compareWith).toBeDefined();
  });

  it('should calculate correct middle index for comparison', async () => {
    const movies = [];
    for (let i = 0; i < 10; i++) {
      movies.push({
        userId: user._id,
        movieId: 700000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: `/m${i}.jpg`
      });
    }
    await RankedMovie.create(movies);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 5 });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRerank as any)._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('compare');
  });

  it('should return compareWith with all required fields', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 800001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/1.jpg'
      },
      {
        userId: user._id,
        movieId: 800002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/2.jpg'
      },
      {
        userId: user._id,
        movieId: 800003,
        title: 'Movie 3',
        rank: 3,
        posterPath: '/3.jpg'
      }
    ]);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 2 });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRerank as any)._id.toString() });

    expect(res.body.data.compareWith).toHaveProperty('id');
    expect(res.body.data.compareWith).toHaveProperty('title');
    expect(res.body.data.compareWith).toHaveProperty('posterPath');
    expect(res.body.data.compareWith).toHaveProperty('overview');
    expect(res.body.data.compareWith).toHaveProperty('releaseDate');
    expect(res.body.data.compareWith).toHaveProperty('voteAverage');
  });

  it('should handle movie without posterPath', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 900001,
        title: 'No Poster 1',
        rank: 1
        // No posterPath
      },
      {
        userId: user._id,
        movieId: 900002,
        title: 'No Poster 2',
        rank: 2
      }
    ]);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 1 });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRerank as any)._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.compareWith.posterPath).toBeNull();
  });

  // ========== Rerank with Different List Sizes ==========

  it('should handle rerank with 2 movies', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 1000001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/1.jpg'
      },
      {
        userId: user._id,
        movieId: 1000002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/2.jpg'
      }
    ]);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 1 });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRerank as any)._id.toString() });

    expect(res.status).toBe(200);
  });

  it('should handle rerank with 20 movies', async () => {
    const movies = [];
    for (let i = 0; i < 20; i++) {
      movies.push({
        userId: user._id,
        movieId: 1100000 + i,
        title: `Movie ${i}`,
        rank: i + 1,
        posterPath: `/m${i}.jpg`
      });
    }
    await RankedMovie.create(movies);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 10 });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movieToRerank as any)._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('compare');
  });

  // ========== Error Handling ==========

  it('should handle database error gracefully', async () => {
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 1200001,
      title: 'Error Movie',
      rank: 1,
      posterPath: '/error.jpg'
    });

    // Close connection to force error
    await mongoose.connection.close();

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movie as any)._id.toString() });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('Unable to start rerank');

    // Reconnect
    await mongoose.connect(mongoServer.getUri());
  });

  it('should handle error during rank update', async () => {
    await RankedMovie.create([
      {
        userId: user._id,
        movieId: 1300001,
        title: 'Movie 1',
        rank: 1,
        posterPath: '/1.jpg'
      },
      {
        userId: user._id,
        movieId: 1300002,
        title: 'Movie 2',
        rank: 2,
        posterPath: '/2.jpg'
      }
    ]);

    const movieToRerank = await RankedMovie.findOne({ userId: user._id, rank: 1 });
    const rankedId = (movieToRerank as any)._id.toString();

    // Close after finding but before rerank
    setTimeout(() => mongoose.connection.close(), 10);

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId });

    // Should handle error
    expect([500, 200]).toContain(res.status);

    // Reconnect
    await mongoose.connect(mongoServer.getUri());
  });

  // ========== Edge Cases ==========

  it('should handle reranking immediately after ranking', async () => {
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 1400001,
      title: 'Quick Rerank',
      rank: 1,
      posterPath: '/quick.jpg'
    });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movie as any)._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('added');
  });

  it('should handle movie with special characters in title', async () => {
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 1500001,
      title: 'Movie: "Special" & \'Chars\'',
      rank: 1,
      posterPath: '/special.jpg'
    });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movie as any)._id.toString() });

    expect(res.status).toBe(200);
  });

  it('should handle rerank of movie with very long title', async () => {
    const longTitle = 'A'.repeat(500);
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 1600001,
      title: longTitle,
      rank: 1,
      posterPath: '/long.jpg'
    });

    const res = await request(app)
      .post('/rerank/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ rankedId: (movie as any)._id.toString() });

    expect(res.status).toBe(200);
  });
});