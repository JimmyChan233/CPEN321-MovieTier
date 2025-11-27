import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Mock user data for testing
// Note: _id is NOT included - let MongoDB generate it automatically to avoid duplicate key errors
export const mockUsers = {
  validUser: {
    email: "test@example.com",
    name: "Test User",
    googleId: "google-123",
    profileImageUrl: "https://example.com/image.jpg",
  },
  anotherUser: {
    email: "another@example.com",
    name: "Another User",
    googleId: "google-456",
    profileImageUrl: "https://example.com/image2.jpg",
  },
};

// Mock movie data
export const mockMovies = {
  theShawshankRedemption: {
    id: 278,
    title: "The Shawshank Redemption",
    overview:
      "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    poster_path: "/q6y0Go1tsGEsmtFxyaDiStHMVEd.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFxyaDiStHMVEd.jpg",
    release_date: "1994-10-14",
    year: 1994,
    vote_average: 8.7,
    rating: 8.7,
    tagline: "Fear can hold you prisoner. Hope can set you free.",
    actors: ["Tim Robbins", "Morgan Freeman", "Bob Gunton"],
  },
  theGodfather: {
    id: 238,
    title: "The Godfather",
    overview:
      "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son.",
    poster_path: "/rPdtLWNsZmAtoZl4VZA2PIIjP4t.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/rPdtLWNsZmAtoZl4VZA2PIIjP4t.jpg",
    release_date: "1972-03-24",
    year: 1972,
    vote_average: 8.9,
    rating: 8.9,
    tagline: "An offer you cannot refuse.",
    actors: ["Marlon Brando", "Al Pacino", "James Caan"],
  },
  inception: {
    id: 27205,
    title: "Inception",
    overview:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.",
    poster_path: "/oYm8f6YSxFab6XwaxmTeGa90RWl.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/oYm8f6YSxFab6XwaxmTeGa90RWl.jpg",
    release_date: "2010-07-16",
    year: 2010,
    vote_average: 8.8,
    rating: 8.8,
    tagline: "Your mind is the scene of the crime",
    actors: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
  },
  darkKnight: {
    id: 155,
    title: "The Dark Knight",
    overview:
      "When the menace known as the Joker emerges from his mysterious past, he wreaks havoc and chaos on the people of Gotham.",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    release_date: "2008-07-18",
    year: 2008,
    vote_average: 8.5,
    rating: 8.5,
    tagline: "Why So Serious?",
    actors: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
  },
  interstellar: {
    id: 157336,
    title: "Interstellar",
    overview:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival.",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    release_date: "2014-11-07",
    year: 2014,
    vote_average: 8.4,
    rating: 8.4,
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    actors: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
  },
};

// Mock ranked movie data
// Note: _id and userId are NOT included - tests should provide these dynamically
export const mockRankedMovies = {
  firstMovie: {
    movieId: 278,
    title: "The Shawshank Redemption",
    posterPath: "/q6y0Go1tsGEsmtFxyaDiStHMVEd.jpg",
    rank: 1,
  },
  secondMovie: {
    movieId: 238,
    title: "The Godfather",
    posterPath: "/rPdtLWNsZmAtoZl4VZA2PIIjP4t.jpg",
    rank: 2,
  },
};

// Mock watchlist items
export const mockWatchlistItems = {
  item1: {
    movieId: 27205,
    title: "Inception",
    posterPath: "/oYm8f6YSxFab6XwaxmTeGa90RWl.jpg",
    overview: "A thief who steals corporate secrets...",
  },
};

// Mock feed activities
export const mockFeedActivities = {
  rankedMovie: {
    activityType: "ranked_movie",
    movieId: 278,
    movieTitle: "The Shawshank Redemption",
    posterPath: "/q6y0Go1tsGEsmtFxyaDiStHMVEd.jpg",
    overview: "Two imprisoned men bond over a number of years...",
    releaseDate: "1994-10-14",
    voteAverage: 8.7,
    rank: 1,
  },
};

// Mock friendships and friend requests
// Note: IDs should be provided dynamically by tests
export const mockFriendships = {
  friendship: {
    status: "active",
  },
  friendRequest: {
    status: "pending",
  },
};

// Mock likes and comments
export const mockLikes = {
  like1: {
    // IDs should be provided dynamically by tests
  },
};

export const mockComments = {
  comment1: {
    text: "Great movie! I loved it.",
  },
};

// Utility function to generate JWT token for testing
export function generateTestJWT(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "default_secret", {
    expiresIn: "30d",
  });
}

// Utility function to generate valid Google token mock
export function generateMockGoogleToken(): string {
  return "mock-google-id-token-valid";
}

// Utility function for invalid token
export function generateInvalidJWT(): string {
  return "invalid.jwt.token";
}

/**
 * Mock Setup Helpers - Reduces code duplication across test files
 */

/**
 * Setup Google Auth Library Mock
 * Mocks the google-auth-library OAuth2Client for authentication tests
 * @param options.shouldFail - If true, mock will throw error
 * @param options.returnEmail - Email to return from verified token
 */
export function setupGoogleAuthMock(
  options: { shouldFail?: boolean; returnEmail?: string } = {},
) {
  const mockVerifyIdToken = jest.fn();

  if (options.shouldFail) {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));
  } else {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: options.returnEmail || "test@gmail.com",
        email_verified: true,
        name: "Test User",
        picture: "https://example.com/pic.jpg",
      }),
    });
  }

  jest.mock("google-auth-library", () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
  }));

  return mockVerifyIdToken;
}

/**
 * Setup TMDB Client Mock
 * Mocks the TMDB API client for movie data tests
 * @param options.shouldFail - If true, returns empty results
 */
export function setupTmdbMock(options: { shouldFail?: boolean } = {}) {
  const mockGet = jest.fn();

  if (!options.shouldFail) {
    mockGet.mockResolvedValue({
      data: {
        results: [
          {
            id: 27205,
            title: "Inception",
            overview: "A thief who steals corporate secrets...",
            poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
            release_date: "2010-07-15",
            vote_average: 8.4,
          },
        ],
      },
    });
  } else {
    mockGet.mockRejectedValue(new Error("TMDB API Error"));
  }

  jest.mock("../../../src/services/tmdb/tmdbClient", () => ({
    getTmdbClient: jest.fn(() => ({
      get: mockGet,
    })),
  }));

  return mockGet;
}

/**
 * Setup SSE Service Mock
 * Mocks the Server-Sent Events service for real-time notifications
 */
export function setupSSEServiceMock() {
  const addClientMock = jest.fn();
  const removeClientMock = jest.fn();
  const sendMock = jest.fn();

  jest.mock("../../../src/services/sse/sseService", () => ({
    sseService: {
      addClient: addClientMock,
      removeClient: removeClientMock,
      send: sendMock,
    },
  }));

  return { addClientMock, removeClientMock, sendMock };
}

/**
 * Setup Notification Service Mock
 * Mocks Firebase Cloud Messaging notifications
 */
export function setupNotificationServiceMock() {
  const sendMock = jest.fn().mockResolvedValue({ success: true });

  jest.mock("../../../src/services/notification.service", () => ({
    notificationService: {
      sendFriendRequestNotification: sendMock,
      sendMovieRankedNotification: sendMock,
      sendCommentNotification: sendMock,
    },
  }));

  return sendMock;
}

/**
 * Setup Authentication Middleware Mock
 * Mocks JWT verification middleware for route tests
 */
export function setupAuthMiddlewareMock(
  options: { shouldFail?: boolean; userId?: string } = {},
) {
  const authenticateMock = jest.fn((req: any, _res: any, next: any) => {
    if (options.shouldFail) {
      return next(new Error("Unauthorized"));
    }
    req.userId = options.userId || "test-user-123";
    next();
  });

  jest.mock("../../../src/middleware/auth", () => ({
    authenticate: authenticateMock,
  }));

  return authenticateMock;
}
