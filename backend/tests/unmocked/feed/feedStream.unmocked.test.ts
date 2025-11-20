/**
 * @unmocked Integration tests for feed SSE stream endpoint
 * Tests with real MongoDB database
 */

import request from "supertest";
import express from "express";
import feedRoutes from "../../../src/routes/feedRoutes";
import { initializeTestMongo, cleanupTestMongo, skipIfMongoUnavailable, MongoTestContext } from "../../utils/mongoConnect";

describe("Unmocked: Feed SSE Stream", () => {
  let mongoContext: MongoTestContext;
  let app: express.Application;

  beforeAll(async () => {
    mongoContext = await initializeTestMongo();
    if (mongoContext.skipIfUnavailable) {
      console.log('Skipping test suite - MongoDB unavailable');
      return;
    }

    app = express();
    app.use(express.json());

    // Middleware that doesn't set userId (simulating missing auth)
    app.use((req: any, res, next) => {
      req.userId = undefined;
      next();
    });

    app.use("/api/feed", feedRoutes);
  });

  afterAll(async () => {
    await cleanupTestMongo(mongoContext);
  });

  it("should return 401 when userId is missing from streamFeed", async () => {
    skipIfMongoUnavailable(mongoContext);

    const res = await request(app)
      .get("/api/feed/stream");

    expect(res.status).toBe(401);
  });
});
