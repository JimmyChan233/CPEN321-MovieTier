import { Request, Response } from "express";
import { randomInt } from "crypto";
import { getMovieQuote } from "../../../src/controllers/movie/movieController";
import { fetchMovieTagline } from "../../../src/services/tmdb/tmdbTaglineService";
import { HttpStatus } from "../../../src/utils/responseHandler";

jest.mock("../../../src/services/tmdb/tmdbTaglineService", () => ({
  fetchMovieTagline: jest.fn(),
}));

jest.mock("crypto", () => {
  const actual = jest.requireActual("crypto");
  return { ...actual, randomInt: jest.fn() };
});

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

const createMockResponse = (): MockResponse => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn();
  return res as MockResponse;
};

describe("getMovieQuote controller", () => {
  const mockedFetch = fetchMovieTagline as jest.MockedFunction<
    typeof fetchMovieTagline
  >;
  const mockedRandomInt = randomInt as unknown as jest.MockedFunction<
    (max: number) => number
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when title is missing", async () => {
    const res = createMockResponse();

    await getMovieQuote(
      { query: {} } as unknown as Request,
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Missing title" }),
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns tagline when TMDB provides one", async () => {
    mockedFetch.mockResolvedValueOnce("Awesome tagline");
    const res = createMockResponse();

    await getMovieQuote(
      { query: { title: "Inception", year: "2010" } } as unknown as Request,
      res as unknown as Response,
    );

    expect(mockedFetch).toHaveBeenCalledWith("Inception", "2010");
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: "Awesome tagline" }),
    );
  });

  it("returns fallback quote when tagline is missing", async () => {
    mockedFetch.mockResolvedValueOnce(null);
    mockedRandomInt.mockReturnValue(1); // Deterministic fallback
    const res = createMockResponse();

    await getMovieQuote(
      { query: { title: "Unknown Movie" } } as unknown as Request,
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        fallback: true,
        data: "The best movies are yet to come.",
      }),
    );
  });

  it("falls back to quote when TMDB call throws", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("TMDB down"));
    mockedRandomInt.mockReturnValue(0);
    const res = createMockResponse();

    await getMovieQuote(
      { query: { title: "Crashed Movie" } } as unknown as Request,
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        fallback: true,
        data: "Every story has a beginning.",
      }),
    );
  });
});
