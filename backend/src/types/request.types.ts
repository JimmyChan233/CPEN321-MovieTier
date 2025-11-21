/**
 * Request DTOs for API endpoints
 * Centralized type definitions for request bodies and parameters
 */

// Authentication Request Types
export interface ISignInRequest {
  idToken: string;
}

export interface ISignUpRequest {
  idToken: string;
}

// User Request Types
export interface IUpdateProfileRequest {
  name?: string;
  profileImageUrl?: string;
}

export interface IUpdateFCMTokenRequest {
  fcmToken: string;
}

// Friend Request Types
export interface ISendFriendRequestRequest {
  email?: string;
  userId?: string;
}

export interface IRespondToFriendRequestRequest {
  requestId: string;
  accept: boolean;
}

// Movie Request Types
export interface IAddMovieRequest {
  movieId: number;
  title: string;
  posterPath?: string;
  overview?: string;
}

export interface ICompareMoviesRequest {
  preferredMovieId: number;
}

export interface IStartRerankRequest {
  movieId: number;
}

// Feed Request Types
export interface ICreateLikeRequest {
  // Empty body, like is created based on URL parameter and auth
}

export interface ICreateCommentRequest {
  content: string;
}

// FCM Token Request Type
export interface IUpdateFCMTokenRequest {
  token: string;
}

// Watchlist Request Types
export interface IAddWatchlistItemRequest {
  movieId: number;
  title: string;
  posterPath?: string;
  overview?: string;
}

// Generic parameter types
export interface IParamsWithUserId {
  userId: string;
}

export interface IParamsWithMovieId {
  movieId: string;
}

export interface IParamsWithId {
  id: string;
}

export interface IParamsWithActivityId {
  activityId: string;
}

export interface IParamsWithCommentId {
  commentId: string;
}

export interface IParamsWithRequestId {
  requestId: string;
}

// Body parameter types
export interface IBodyWithRankedId {
  rankedId: string;
}
