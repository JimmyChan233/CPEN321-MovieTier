/**
 * @mocked Mocked tests for movie routes and controllers
 * Tests with mocked external services (TMDB, SSE, FCM) and real MongoDB
 */

import { startRerank } from "../../../src/controllers/movie/movieController";
import RankedMovieModel from "../../../src/models/movie/RankedMovie";
import { startSession } from "../../../src/utils/comparisonSession";
import mongoose from "mongoose";

jest.mock("../../../src/models/movie/RankedMovie");
jest.mock("../../../src/utils/comparisonSession");

// Mock the dynamic imports
jest.mock("../../../src/models/friend/Friend", () => ({
  Friendship: {
    find: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../../src/services/sse/sseService", () => ({
  sseService: {
    send: jest.fn(),
  },
}));

const mockReq = (body: any, userId?: string) => ({ body, userId });
const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("startRerank (mocked)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if user not authorized", async () => {
    const req = mockReq({}, undefined);
    const res = mockRes();
    await startRerank(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 if movie not found", async () => {
    (RankedMovieModel.findOne as any).mockResolvedValue(null);
    const req = mockReq(
      { rankedId: new mongoose.Types.ObjectId().toString() },
      "507f1f77bcf86cd799439011",
    );
    const res = mockRes();
    await startRerank(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("handles thrown error gracefully", async () => {
    (RankedMovieModel.findOne as any).mockRejectedValue(new Error("DB error"));
    const req = mockReq(
      { rankedId: new mongoose.Types.ObjectId().toString() },
      "507f1f77bcf86cd799439011",
    );
    const res = mockRes();
    await startRerank(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 if compareWith movie is undefined", async () => {
    const mockDoc = {
      _id: "x",
      userId: new mongoose.Types.ObjectId(),
      rank: 1,
      movieId: 123,
      title: "Test Movie",
      posterPath: "/x.jpg",
      deleteOne: jest.fn().mockResolvedValue({}),
    };

    (RankedMovieModel.findOne as any).mockResolvedValue(mockDoc);
    (RankedMovieModel.updateMany as any).mockResolvedValue({});

    // Mock find to return a query object with sort method that returns an array
    const mockArray = [null];
    mockArray.at = jest.fn().mockReturnValue(undefined); // This triggers the error on line 52
    Object.defineProperty(mockArray, "length", { value: 1 });

    const mockQuery = {
      sort: jest.fn().mockResolvedValue(mockArray),
    };
    (RankedMovieModel.find as any).mockReturnValue(mockQuery);

    const req = mockReq(
      { rankedId: new mongoose.Types.ObjectId().toString() },
      "507f1f77bcf86cd799439011",
    );
    const res = mockRes();

    await startRerank(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Unable to find comparison movie",
    });
  });

  it("should send SSE notifications to friends when reranking (coverage for line 31)", async () => {
    const userId = new mongoose.Types.ObjectId();
    const friendId = new mongoose.Types.ObjectId();

    // Mock Friendship.find to return a friendship
    const { Friendship } = require("../../../src/models/friend/Friend");
    (Friendship.find as jest.Mock).mockResolvedValueOnce([{ friendId }]);

    const mockDoc = {
      _id: "x",
      userId,
      rank: 2,
      movieId: 123,
      title: "Test Movie",
      posterPath: "/x.jpg",
      deleteOne: jest.fn().mockResolvedValue({}),
    };

    (RankedMovieModel.findOne as any).mockResolvedValue(mockDoc);
    (RankedMovieModel.updateMany as any).mockResolvedValue({});

    // Mock find to return remaining movies for comparison
    const mockArray = [
      { movieId: 456, title: "Compare Movie", posterPath: "/y.jpg" },
    ];
    mockArray.at = jest.fn().mockReturnValue(mockArray[0]);
    Object.defineProperty(mockArray, "length", { value: 1 });

    const mockQuery = {
      sort: jest.fn().mockResolvedValue(mockArray),
    };
    (RankedMovieModel.find as any).mockReturnValue(mockQuery);

    const req = mockReq(
      { rankedId: new mongoose.Types.ObjectId().toString() },
      userId.toString(),
    );
    const res = mockRes();

    const { sseService } = require("../../../src/services/sse/sseService");

    await startRerank(req as any, res as any);

    // Verify SSE notification was sent to friend
    expect(sseService.send).toHaveBeenCalledWith(
      String(friendId),
      "ranking_changed",
      { userId },
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        status: "compare",
      }),
    );
  });
});
