/**
 * @unmocked Integration tests for movie operations
 * Tests with real MongoDB database
 */

/**
 * Rerank Controller Complete Tests - Unmocked
 * Exhaustive tests covering ALL code paths in rerankController.ts
 */

import request from "supertest";
import mongoose from "mongoose";
import express from "express";
import movieRoutes from "../../../src/routes/movieRoutes";
import User from "../../../src/models/user/User";
import RankedMovie from "../../../src/models/movie/RankedMovie";
import { generateTestJWT, mockUsers } from "../../utils/test-fixtures";
import { errorHandler } from "../../../src/middleware/errorHandler";
import { initializeTestMongo, cleanupTestMongo, skipIfMongoUnavailable, MongoTestContext } from "../../utils/mongoConnect";

describe("Rerank Controller - Complete Coverage", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;
  let user: any;
  let token: string;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());
    app.use("/", movieRoutes);
    app.use(errorHandler);

    user = await User.create(mockUsers.validUser);
    token = generateTestJWT((user as any)._id.toString());
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  beforeEach(async () => {
    await RankedMovie.deleteMany({});
  });

  // ========== Invalid rankedId Validation ==========

  it("should reject invalid rankedId format", async () => {
    const res = await request(app)
      .post("/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: "invalid-id-format",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  // ========== Ranked Movie Not Found ==========

  it("should reject rerank with non-existent movie ID", async () => {
    // Use a valid ObjectId that doesn't exist
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post("/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: fakeId.toString(),
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  // ========== Remove Item and Close Gap ==========

  it("should remove movie and close rank gaps", async () => {
    // Create 3 ranked movies
    const movie1 = await RankedMovie.create({
      userId: user._id,
      movieId: 1001,
      title: "Movie 1",
      rank: 1,
      posterPath: "/1.jpg",
    });
    const movie2 = await RankedMovie.create({
      userId: user._id,
      movieId: 1002,
      title: "Movie 2",
      rank: 2,
      posterPath: "/2.jpg",
    });
    const movie3 = await RankedMovie.create({
      userId: user._id,
      movieId: 1003,
      title: "Movie 3",
      rank: 3,
      posterPath: "/3.jpg",
    });

    // Rerank movie 2 (remove it temporarily)
    const res = await request(app)
      .post("/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: (movie2 as any)._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify movie 2 was removed
    const removed = await RankedMovie.findById((movie2 as any)._id);
    expect(removed).toBeNull();

    // Verify ranks were adjusted: movie 3 should now be rank 2
    const updated3 = await RankedMovie.findById((movie3 as any)._id);
    expect(updated3!.rank).toBe(2);

    // Verify movie 1 rank unchanged
    const updated1 = await RankedMovie.findById((movie1 as any)._id);
    expect(updated1!.rank).toBe(1);
  });

  // ========== Empty List After Removal ==========

  it("should add movie at rank 1 when no ranked movies remain", async () => {
    // Create single ranked movie
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 2001,
      title: "Only Movie",
      rank: 1,
      posterPath: "/only.jpg",
    });

    // Rerank it (remove and re-add)
    const res = await request(app)
      .post("/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: (movie as any)._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("added"); // Should be added directly at rank 1
    expect(res.body.data.rank).toBe(1);

    // Verify movie is back in DB at rank 1
    const readded = await RankedMovie.findOne({
      userId: user._id,
      movieId: 2001,
    });
    expect(readded).toBeDefined();
    expect(readded!.rank).toBe(1);
  });

  // ========== Start Comparison Session ==========

  it("should start comparison session when removing from list with other movies", async () => {
    // Create 3 ranked movies
    await RankedMovie.create({
      userId: user._id,
      movieId: 3001,
      title: "Movie A",
      rank: 1,
      posterPath: "/a.jpg",
    });
    const movie2 = await RankedMovie.create({
      userId: user._id,
      movieId: 3002,
      title: "Movie B",
      rank: 2,
      posterPath: "/b.jpg",
    });
    await RankedMovie.create({
      userId: user._id,
      movieId: 3003,
      title: "Movie C",
      rank: 3,
      posterPath: "/c.jpg",
    });

    // Rerank movie 2
    const res = await request(app)
      .post("/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: (movie2 as any)._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("compare"); // Should start comparison
    expect(res.body.data.compareWith).toBeDefined();
    expect(res.body.data.compareWith.movieId).toBeDefined();

    // Verify movie B was deleted
    const deleted = await RankedMovie.findById((movie2 as any)._id);
    expect(deleted).toBeNull();

    // Verify remaining movies are rank 1 and 2
    const remaining = await RankedMovie.find({ userId: user._id }).sort({
      rank: 1,
    });
    expect(remaining.length).toBe(2);
    expect(remaining[0].rank).toBe(1);
    expect(remaining[1].rank).toBe(2);
  });

  // ========== Rerank with Different List Sizes ==========

  it("should handle rerank with large list (5+ movies)", async () => {
    // Create 5 ranked movies
    const movies = [];
    for (let i = 1; i <= 5; i++) {
      const m = await RankedMovie.create({
        userId: user._id,
        movieId: 4000 + i,
        title: `Movie ${i}`,
        rank: i,
        posterPath: `/movie${i}.jpg`,
      });
      movies.push(m);
    }

    // Rerank middle movie (rank 3)
    const res = await request(app)
      .post("/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rankedId: (movies[2] as any)._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("compare");

    // Verify 4 movies remain with correct ranks
    const remaining = await RankedMovie.find({ userId: user._id }).sort({
      rank: 1,
    });
    expect(remaining.length).toBe(4);
    remaining.forEach((m, idx) => {
      expect(m.rank).toBe(idx + 1);
    });
  });

  // ========== Error Handling ==========

  it("should reject rerank without rankedId parameter", async () => {
    const res = await request(app)
      .post("/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  // ========== Edge Cases ==========

  it("should handle rerank of movie with very long title", async () => {
    const longTitle = "A".repeat(500);
    const movie = await RankedMovie.create({
      userId: user._id,
      movieId: 1600001,
      title: longTitle,
      rank: 1,
      posterPath: "/long.jpg",
    });

    const res = await request(app)
      .post("/rerank/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ rankedId: (movie as any)._id.toString() });

    expect(res.status).toBe(200);
  });
});
