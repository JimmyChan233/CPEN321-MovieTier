# MovieTier Project Structure

## Overview
MovieTier is a social movie companion Android app built with Clean Architecture and MVVM pattern.

---

## Frontend Structure

### Root Path
`/frontend/app/src/main/java/com/cpen321/movietier/`

### Directory Layout

```
movietier/
├── data/                           # Data Layer
│   ├── api/                       # Retrofit API interfaces for backend communication
│   ├── local/                     # Local storage (SharedPreferences, Room DB)
│   ├── model/                     # Data Transfer Objects (DTOs)
│   └── repository/                # Repository implementations (data source abstraction)
│
├── domain/                         # Domain Layer (Business Logic)
│   ├── model/                     # Domain entities (business objects)
│   └── usecase/                   # Use cases for business logic operations
│
├── ui/                            # Presentation Layer
│   ├── auth/                      # Google authentication screens
│   │                              # - Sign in/Sign up screens
│   │                              # - Account deletion flow
│   │
│   ├── friends/                   # Friend management screens
│   │                              # - Send/accept/reject friend requests
│   │                              # - Friend list management
│   │                              # - Remove friends
│   │
│   ├── feed/                      # Activity feed screens
│   │                              # - Real-time friend activity updates
│   │                              # - Live notifications
│   │                              # - Reverse chronological feed
│   │
│   ├── ranking/                   # Movie ranking/comparison screens
│   │                              # - Search movies
│   │                              # - Add movies
│   │                              # - Compare movies (head-to-head)
│   │                              # - View ranked movie list
│   │
│   ├── recommendation/            # Movie recommendation screens
│   │                              # - Personalized recommendations
│   │                              # - TMDB API integration
│   │
│   ├── profile/                   # User profile screens
│   │                              # - View/edit profile
│   │                              # - Account settings
│   │
│   ├── navigation/                # Navigation logic
│   │                              # - Navigation state management
│   │                              # - Route definitions
│   │
│   ├── components/                # Reusable UI components
│   │                              # - Buttons, cards, dialogs
│   │                              # - Custom composables
│   │
│   ├── viewmodels/                # ViewModels for each feature
│   │                              # - AuthViewModel
│   │                              # - FriendViewModel
│   │                              # - FeedViewModel
│   │                              # - RankingViewModel
│   │                              # - RecommendationViewModel
│   │                              # - ProfileViewModel
│   │
│   └── theme/                     # App theming
│                                  # - Colors, typography, shapes
│
├── di/                            # Dependency Injection (Hilt modules)
│                                  # - NetworkModule
│                                  # - RepositoryModule
│                                  # - DataModule
│
└── utils/                         # Utility classes and extensions
                                   # - Extension functions
                                   # - Helper classes
                                   # - Constants
```

---

## Backend Structure

### Root Path
`/backend/`

### Directory Layout

```
backend/
├── src/
│   ├── controllers/               # Request handlers (HTTP layer)
│   │   ├── auth/                 # Authentication endpoints
│   │   │                         # - POST /api/auth/signin
│   │   │                         # - POST /api/auth/signup
│   │   │                         # - POST /api/auth/signout
│   │   │                         # - DELETE /api/auth/account
│   │   │
│   │   ├── user/                 # User management endpoints
│   │   │                         # - GET /api/users/:id
│   │   │                         # - PUT /api/users/:id
│   │   │
│   │   ├── friend/               # Friend management endpoints
│   │   │                         # - POST /api/friends/request
│   │   │                         # - POST /api/friends/accept
│   │   │                         # - POST /api/friends/reject
│   │   │                         # - DELETE /api/friends/:id
│   │   │                         # - GET /api/friends
│   │   │
│   │   ├── movie/                # Movie operations endpoints
│   │   │                         # - GET /api/movies/search
│   │   │                         # - POST /api/movies/rank
│   │   │                         # - POST /api/movies/compare
│   │   │                         # - GET /api/movies/ranked
│   │   │
│   │   ├── feed/                 # Feed endpoints
│   │   │                         # - GET /api/feed
│   │   │                         # - WebSocket for live updates
│   │   │
│   │   └── recommendation/       # Recommendation endpoints
│   │                             # - GET /api/recommendations
│   │
│   ├── services/                  # Business logic layer
│   │   ├── auth/                 # Google Auth integration (UserManager)
│   │   │                         # - Token verification
│   │   │                         # - User creation/authentication
│   │   │
│   │   ├── user/                 # User service (UserManager)
│   │   │                         # - Profile management
│   │   │                         # - Account operations
│   │   │
│   │   ├── friend/               # Friend service (FriendManager)
│   │   │                         # - Friend request logic
│   │   │                         # - Friendship management
│   │   │
│   │   ├── movie/                # Movie ranking service (MovieListsManager)
│   │   │                         # - Comparative ranking algorithm
│   │   │                         # - Tier list management
│   │   │                         # - TMDB API integration
│   │   │
│   │   ├── feed/                 # Feed service (UserFeed)
│   │   │                         # - Activity aggregation
│   │   │                         # - Real-time updates
│   │   │
│   │   ├── recommendation/       # Recommendation logic
│   │   │                         # - Top movie extraction
│   │   │                         # - TMDB recommendation API
│   │   │                         # - Filtering logic
│   │   │
│   │   └── notification/         # Firebase Cloud Messaging
│   │                             # - Push notification sending
│   │                             # - Device token management
│   │
│   ├── models/                    # Database schemas (MongoDB/Mongoose)
│   │   ├── user/                 # User model
│   │   │                         # - User credentials
│   │   │                         # - Profile information
│   │   │
│   │   ├── friend/               # Friend/request models
│   │   │                         # - Friendship records
│   │   │                         # - Friend requests
│   │   │
│   │   ├── movie/                # Movie/ranking models
│   │   │                         # - User movie rankings
│   │   │                         # - Comparison history
│   │   │
│   │   └── feed/                 # Feed activity models
│   │                             # - Activity events
│   │                             # - Timestamps
│   │
│   ├── routes/                    # API route definitions
│   │                             # - Route aggregation
│   │                             # - API versioning
│   │
│   ├── middleware/                # Express middleware
│   │                             # - Authentication middleware
│   │                             # - Input validation
│   │                             # - Error handling
│   │                             # - Request logging
│   │
│   ├── config/                    # Configuration files
│   │                             # - Database configuration
│   │                             # - Environment variables
│   │                             # - API keys
│   │
│   └── utils/                     # Helper functions
│                                 # - Response formatters
│                                 # - Error utilities
│                                 # - Validation helpers
│
├── tests/                         # Testing
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests
│
└── scripts/                       # Utility scripts
    ├── deploy.sh                 # Deployment script
    └── seed.js                   # Database seeding
```

---

## Architecture Principles

### Clean Architecture Layers
1. **Presentation Layer (UI)**: Activities, Fragments, Composables, ViewModels
2. **Domain Layer**: Use cases, business logic, domain entities
3. **Data Layer**: Repositories, API clients, local storage

### Key Design Patterns
- **MVVM (Model-View-ViewModel)**: UI architecture pattern
- **Repository Pattern**: Abstract data sources
- **Dependency Injection**: Using Hilt for Android
- **Use Case Pattern**: Encapsulate business logic

### Data Flow
```
UI ← ViewModel ← UseCase ← Repository ← (API / Local Storage)
```

---

## Core Components Mapping

### Frontend Components
- **UserManager**: `data/repository/UserRepository.kt`, `domain/usecase/auth/`
- **FriendManager**: `data/repository/FriendRepository.kt`, `domain/usecase/friend/`
- **MovieListsManager**: `data/repository/MovieRepository.kt`, `domain/usecase/ranking/`
- **UserFeed**: `data/repository/FeedRepository.kt`, `domain/usecase/feed/`

### Backend Components
- **UserManager**: `services/auth/`, `services/user/`
- **FriendManager**: `services/friend/`
- **MovieListsManager**: `services/movie/`, `services/recommendation/`
- **UserFeed**: `services/feed/`, `services/notification/`

---

## External Dependencies

### APIs
- **Google Auth API**: Authentication (OAuth 2.0)
- **TMDB API**: Movie data and recommendations
- **Firebase Cloud Messaging**: Real-time push notifications

### Frontend Libraries
- **Jetpack Compose**: UI framework
- **Hilt**: Dependency injection
- **Retrofit**: HTTP client
- **Room**: Local database (optional)
- **Coil**: Image loading

### Backend Libraries
- **Express.js**: Web framework
- **Mongoose**: MongoDB ODM
- **Google Auth Library**: Token verification
- **Axios**: HTTP client for TMDB API
- **Firebase Admin SDK**: Push notifications

---

## Feature-to-Folder Mapping

### Feature 1: Authentication
- **Frontend**: `ui/auth/`, `data/repository/AuthRepository.kt`
- **Backend**: `controllers/auth/`, `services/auth/`, `models/user/`

### Feature 2: Manage Friends
- **Frontend**: `ui/friends/`, `data/repository/FriendRepository.kt`
- **Backend**: `controllers/friend/`, `services/friend/`, `models/friend/`

### Feature 3: Feed
- **Frontend**: `ui/feed/`, `data/repository/FeedRepository.kt`
- **Backend**: `controllers/feed/`, `services/feed/`, `models/feed/`

### Feature 4: Ranked Movie List
- **Frontend**: `ui/ranking/`, `data/repository/MovieRepository.kt`
- **Backend**: `controllers/movie/`, `services/movie/`, `models/movie/`

### Feature 5: Recommendation
- **Frontend**: `ui/recommendation/`, `data/repository/RecommendationRepository.kt`
- **Backend**: `controllers/recommendation/`, `services/recommendation/`

---

## Development Guidelines

### Frontend
1. Use Kotlin with Jetpack Compose for UI
2. Follow Material Design 3 guidelines
3. Implement proper error handling and loading states
4. Use coroutines for asynchronous operations
5. Write unit tests for ViewModels and use cases

### Backend
1. Use TypeScript/JavaScript with Node.js and Express
2. Implement RESTful API design principles
3. Use proper HTTP status codes
4. Implement authentication middleware
5. Write comprehensive API documentation
6. Implement proper error handling and logging

### Database Schema Design
- **Users**: Store Google Auth info, profile data
- **Friends**: Store friendship relationships and requests
- **Movies**: Store user rankings and comparison history
- **Feed**: Store activity events with timestamps

---

## Non-Functional Requirements Implementation

### NFR 1: Ranking Performance (< 1 second)
- **Implementation**: Optimized ranking algorithm in `services/movie/`
- **Caching**: Redis for frequently accessed rankings
- **Database Indexing**: Indexed queries for fast retrieval

### NFR 2: Usability (≤ 3 clicks/taps)
- **Implementation**: Streamlined navigation in `ui/navigation/`
- **Bottom Navigation**: Direct access to core features
- **Quick Actions**: Floating action buttons for common tasks

---

## Notes
- This structure supports modular development and testing
- Each feature can be developed independently
- Clear separation of concerns enables parallel development by team members
- Structure aligns with M3 requirements for complete design and MVP implementation
