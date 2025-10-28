import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Mock user data for testing
export const mockUsers = {
  validUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    name: 'Test User',
    googleId: 'google-123',
    profileImageUrl: 'https://example.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  anotherUser: {
    _id: new mongoose.Types.ObjectId(),
    email: 'another@example.com',
    name: 'Another User',
    googleId: 'google-456',
    profileImageUrl: 'https://example.com/image2.jpg',
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Mock movie data
export const mockMovies = {
  theShawshankRedemption: {
    id: 278,
    title: 'The Shawshank Redemption',
    overview: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    poster_path: '/q6y0Go1tsGEsmtFxyaDiStHMVEd.jpg',
    release_date: '1994-10-14',
    vote_average: 8.7,
    tagline: 'Fear can hold you prisoner. Hope can set you free.'
  },
  theGodfather: {
    id: 238,
    title: 'The Godfather',
    overview: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son.',
    poster_path: '/rPdtLWNsZmAtoZl4VZA2PIIjP4t.jpg',
    release_date: '1972-03-24',
    vote_average: 8.9,
    tagline: 'An offer you cannot refuse.'
  },
  inception: {
    id: 27205,
    title: 'Inception',
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.',
    poster_path: '/oYm8f6YSxFab6XwaxmTeGa90RWl.jpg',
    release_date: '2010-07-16',
    vote_average: 8.8,
    tagline: 'Your mind is the scene of the crime'
  }
};

// Mock ranked movie data
export const mockRankedMovies = {
  firstMovie: {
    _id: new mongoose.Types.ObjectId(),
    userId: mockUsers.validUser._id,
    movieId: 278,
    title: 'The Shawshank Redemption',
    posterPath: '/q6y0Go1tsGEsmtFxyaDiStHMVEd.jpg',
    rank: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  secondMovie: {
    _id: new mongoose.Types.ObjectId(),
    userId: mockUsers.validUser._id,
    movieId: 238,
    title: 'The Godfather',
    posterPath: '/rPdtLWNsZmAtoZl4VZA2PIIjP4t.jpg',
    rank: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Mock watchlist items
export const mockWatchlistItems = {
  item1: {
    _id: new mongoose.Types.ObjectId(),
    userId: mockUsers.validUser._id,
    movieId: 27205,
    title: 'Inception',
    posterPath: '/oYm8f6YSxFab6XwaxmTeGa90RWl.jpg',
    overview: 'A thief who steals corporate secrets...',
    createdAt: new Date()
  }
};

// Mock feed activities
export const mockFeedActivities = {
  rankedMovie: {
    _id: new mongoose.Types.ObjectId(),
    userId: mockUsers.anotherUser._id,
    activityType: 'ranked_movie',
    movieId: 278,
    movieTitle: 'The Shawshank Redemption',
    posterPath: '/q6y0Go1tsGEsmtFxyaDiStHMVEd.jpg',
    overview: 'Two imprisoned men bond over a number of years...',
    releaseDate: '1994-10-14',
    voteAverage: 8.7,
    rank: 1,
    createdAt: new Date()
  }
};

// Mock friendships and friend requests
export const mockFriendships = {
  friendship: {
    _id: new mongoose.Types.ObjectId(),
    userId: mockUsers.validUser._id,
    friendId: mockUsers.anotherUser._id,
    createdAt: new Date()
  },
  friendRequest: {
    _id: new mongoose.Types.ObjectId(),
    senderId: mockUsers.validUser._id,
    receiverId: mockUsers.anotherUser._id,
    status: 'pending',
    createdAt: new Date()
  }
};

// Mock likes and comments
export const mockLikes = {
  like1: {
    _id: new mongoose.Types.ObjectId(),
    userId: mockUsers.validUser._id,
    activityId: mockFeedActivities.rankedMovie._id,
    createdAt: new Date()
  }
};

export const mockComments = {
  comment1: {
    _id: new mongoose.Types.ObjectId(),
    userId: mockUsers.validUser._id,
    activityId: mockFeedActivities.rankedMovie._id,
    text: 'Great movie! I loved it.',
    createdAt: new Date()
  }
};

// Utility function to generate JWT token for testing
export function generateTestJWT(userId: string): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'test-jwt-secret-key',
    { expiresIn: '30d' }
  );
}

// Utility function to generate valid Google token mock
export function generateMockGoogleToken(): string {
  return 'mock-google-id-token-valid';
}

// Utility function for invalid token
export function generateInvalidJWT(): string {
  return 'invalid.jwt.token';
}
