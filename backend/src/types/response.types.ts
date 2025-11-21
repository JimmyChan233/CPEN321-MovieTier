/**
 * Response DTOs for API endpoints
 * Centralized type definitions for response data
 */

// Base Response Types
export interface IBaseResponse {
  success: boolean;
  message?: string;
}

export interface IBaseDataResponse<T = unknown> extends IBaseResponse {
  data: T;
}

// Authentication Response Types
export interface IAuthResponse extends IBaseDataResponse {
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      profileImageUrl?: string;
    };
  };
}

// User Response Types
export interface IUserProfileResponse extends IBaseDataResponse {
  data: {
    id: string;
    email: string;
    name: string;
    profileImageUrl?: string;
  };
}

export interface ISearchUsersResponse extends IBaseDataResponse {
  data: {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
  }[];
}

// Friend Response Types
export interface IFriendListResponse extends IBaseDataResponse {
  data: {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
  }[];
}

export interface IFriendRequestResponse extends IBaseDataResponse {
  data: {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    status: string;
    createdAt: string;
  };
}

// Movie Response Types
export interface IAddMovieResponse extends IBaseDataResponse {
  data: {
    status: "added" | "compare";
    rank?: number;
    compareWith?: {
      movieId: number;
      title: string;
      posterPath?: string;
    };
  };
}

export interface ICompareMoviesResponse extends IBaseDataResponse {
  data: {
    status: "compare" | "added";
    rank?: number;
    compareWith?: {
      movieId: number;
      title: string;
      posterPath?: string;
    };
  };
}

export interface IRankedMoviesResponse extends IBaseDataResponse {
  data: Array<{
    id: string;
    movieId: number;
    title: string;
    posterPath?: string;
    rank: number;
    createdAt: string;
  }>;
}

export interface IMovieDetailsResponse extends IBaseDataResponse {
  data: {
    id: number;
    title: string;
    overview?: string;
    posterPath?: string;
    releaseDate?: string;
    voteAverage?: number;
    genres?: string[];
    cast?: string[];
    videos?: Array<{
      key: string;
      name: string;
      site: string;
      type: string;
    }>;
    watchProviders?: {
      link?: string;
      flatrate?: { provider_name: string }[];
      rent?: { provider_name: string }[];
      buy?: { provider_name: string }[];
    };
  };
}

// Feed Response Types
export interface IFeedResponse extends IBaseDataResponse {
  data: Array<{
    id: string;
    userId: string;
    userName: string;
    userProfileImageUrl?: string;
    activityType: string;
    movieId: number;
    movieTitle: string;
    moviePosterPath?: string;
    rank?: number;
    likeCount: number;
    commentCount: number;
    isLikedByUser: boolean;
    createdAt: string;
  }>;
}

export interface ILikeResponse extends IBaseResponse {
  data?: {
    likeCount: number;
  };
}

export interface ICommentResponse extends IBaseDataResponse {
  data: {
    id: string;
    content: string;
    userId: string;
    userName: string;
    createdAt: string;
  };
}

export interface ICommentsResponse extends IBaseDataResponse {
  data: Array<{
    id: string;
    content: string;
    userId: string;
    userName: string;
    userProfileImageUrl?: string;
    createdAt: string;
  }>;
}

// Watchlist Response Types
export interface IWatchlistResponse extends IBaseDataResponse {
  data: Array<{
    id: string;
    movieId: number;
    title: string;
    posterPath?: string;
    overview?: string;
    releaseDate?: string;
    voteAverage?: number;
    addedAt: string;
  }>;
}

export interface IWatchlistItemResponse extends IBaseDataResponse {
  data: {
    id: string;
    movieId: number;
    title: string;
    posterPath?: string;
    overview?: string;
    releaseDate?: string;
    voteAverage?: number;
    addedAt: string;
  };
}

// Recommendation Response Types
export interface IRecommendationsResponse extends IBaseDataResponse {
  data: Array<{
    id: number;
    title: string;
    overview?: string;
    posterPath?: string;
    releaseDate?: string;
    voteAverage?: number;
    genres?: string[];
    recommendationScore?: number;
  }>;
}

// TMDB Response Types (for internal use)
export interface ITmdbVideo {
  key?: string;
  name?: string;
  site?: string;
  type?: string;
}

export interface ITmdbCastMember {
  name?: string;
  character?: string;
}

export interface ITmdbMovieDetails {
  id?: number;
  title?: string;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
  genres?: { id: number; name: string }[];
  videos?: {
    results?: ITmdbVideo[];
  };
  credits?: {
    cast?: { name: string; character?: string }[];
  };
  "watch/providers"?: {
    results?: {
      US?: {
        link?: string;
        flatrate?: { provider_name: string }[];
        rent?: { provider_name: string }[];
        buy?: { provider_name: string }[];
      };
    };
  };
}
// Movie-specific Response Types
export interface IMovieResult {
  id: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  cast?: string[];
}

export interface IWatchProvider {
  provider_name?: string;
}

export interface IWatchProvidersResult {
  link?: string;
  flatrate?: Array<{ provider_name: string }>;
  rent?: Array<{ provider_name: string }>;
  buy?: Array<{ provider_name: string }>;
}
