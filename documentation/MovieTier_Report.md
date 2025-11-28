# MovieTier - Final Project Report

## 1. GitHub Repository and Final Release Version

**GitHub Repository**: https://github.com/JimmyChan233/CPEN321-MovieTier

**Final Release Commit SHA**: `7baf67f003d51944474e199122f6eeabb0876fa7`

**Branch**: `main`

---

## 2. Test Locations in Repository

### Backend Tests
- **Location**: `backend/tests/`
- **Structure**:
  - Unit tests: `backend/tests/unit/`
  - Integration tests: `backend/tests/integration/`
  - Test configuration: `backend/jest.config.js`
  - Setup files: `backend/tests/setup.ts`, `backend/tests/globalSetup.ts`, `backend/tests/globalTeardown.ts`

**Running backend tests**:
```bash
cd backend
npm test
```

### Frontend Tests
- **Location**: `frontend/app/src/test/` (unit tests) and `frontend/app/src/androidTest/` (instrumented tests)
- **Test frameworks**: JUnit 4, Espresso, MockK, Coroutines Test

**Running frontend tests**:
```bash
cd frontend
./gradlew testDebugUnitTest          # Unit tests
./gradlew connectedAndroidTest        # Instrumented tests
```

---

## 3. Physical Device Information

**Manufacturer**: OPPO

**Model**: Find N5

---

## 4. Backend Server Information

**Public IP Address**: `108.172.193.215`

**Domain Name**: `http://server.movietier.cc:3000/api/`

**Server Status**: Active and running (will remain up until grading is completed)

---

## 5. Test User Accounts

### Primary Test Account
- **Email**: `MovieTier321@gmail.com`
- **Password**: `Movie321$`

### Alternative Test Method
Users can also test the app using their own personal Google accounts. The app supports any valid Google account for authentication.

### Notes
- The app uses Google OAuth for authentication
- First-time users will be prompted to create an account during sign-in
- Test account has pre-populated data including:
  - Ranked movies
  - Friend connections
  - Feed activities
  - Watchlist items

---

## 6. Project Scope Requirements Implementation (M2)

### Requirement 1: External API Integration

**Use Cases Implementing This Requirement**:

1. **Authentication (Google OAuth)**
   - **Use Case**: Sign In / Sign Up
   - **API**: Google Sign-In API
   - **Implementation**: Users authenticate using Google OAuth. The frontend receives an ID token from Google Credential Manager, sends it to the backend, which verifies it using `google-auth-library`, and issues a JWT token for subsequent requests.
   - **Files**:
     - Frontend: `frontend/app/src/main/java/com/cpen321/movietier/ui/auth/`
     - Backend: `backend/src/controllers/auth/authController.ts`, `backend/src/services/auth/authService.ts`

2. **Movie Data and Recommendations (TMDB API)**
   - **Use Cases**:
     - Search Movies
     - View Movie Details (cast, trailers, watch providers)
     - View Recommended Movies
     - View Trending Movies
     - Add Movie to Watchlist
   - **API**: The Movie Database (TMDB) API v3
   - **Implementation**:
     - Movie search: `GET /search/movie`
     - Movie details with cast: `GET /movie/{id}` and `GET /movie/{id}/credits`
     - Trailers: `GET /movie/{id}/videos`
     - Watch providers: `GET /movie/{id}/watch/providers`
     - Similar movies: `GET /movie/{id}/similar`
     - Recommendations: `GET /movie/{id}/recommendations`
     - Trending: `GET /trending/movie/week`
     - TMDB Discover: `GET /discover/movie`
   - **Files**:
     - Backend: `backend/src/services/tmdb/tmdbClient.ts`
     - Controllers: `backend/src/controllers/movieController.ts`, `backend/src/controllers/recommendations/recommendationController.ts`

3. **Push Notifications (Firebase Cloud Messaging)**
   - **Use Cases**:
     - Receive notification when friend ranks a movie
     - Receive notification for friend requests
     - Receive notification when friend accepts request
   - **API**: Firebase Cloud Messaging (FCM) API
   - **Implementation**: Backend uses `firebase-admin` SDK to send push notifications. Frontend uses `FirebaseMessagingService` to receive and display notifications with custom notification channels.
   - **Files**:
     - Backend: `backend/src/services/notification.service.ts`
     - Frontend: `frontend/app/src/main/java/com/cpen321/movietier/fcm/MovieTierFirebaseMessagingService.kt`

---

### Requirement 2: Changes Happening in the App in Response to External Events

**Use Cases Implementing This Requirement**:

1. **Real-Time Friend Events (Server-Sent Events - SSE)**
   - **Use Cases**:
     - Receive friend request
     - Friend request accepted/rejected
     - Friend request canceled
     - Friend removed
   - **Implementation**: Frontend maintains a persistent SSE connection to `GET /api/friends/stream`. The backend pushes real-time events when friend-related actions occur. The app automatically updates the UI without requiring manual refresh.
   - **Event Types**: `friend_request`, `friend_request_accepted`, `friend_request_rejected`, `friend_request_canceled`, `friend_removed`
   - **Files**:
     - Backend: `backend/src/services/sse/sseService.ts`, `backend/src/routes/friendRoutes.ts`
     - Frontend: `frontend/app/src/main/java/com/cpen321/movietier/data/repository/`

2. **Real-Time Feed Updates (Server-Sent Events - SSE)**
   - **Use Cases**:
     - View live feed updates when friends rank movies
     - See new likes and comments in real-time
   - **Implementation**: Frontend connects to `GET /api/feed/stream` for live feed activity updates. When friends rank new movies, the feed automatically updates without user interaction. Like and comment counts update in real-time.
   - **Event Types**: `new_activity`, `activity_liked`, `activity_commented`
   - **Files**:
     - Backend: `backend/src/services/sse/sseService.ts`, `backend/src/routes/feedRoutes.ts`
     - Frontend: Feed repository and ViewModel

3. **Push Notifications (Firebase Cloud Messaging)**
   - **Use Cases**:
     - Background notifications for friend activities
     - Notification when app is closed
   - **Implementation**: When the app is in the background or closed, FCM push notifications alert users to important events (friend ranks movie, friend request received, request accepted). Tapping the notification opens the relevant screen in the app.
   - **Files**:
     - Frontend: `frontend/app/src/main/java/com/cpen321/movietier/fcm/MovieTierFirebaseMessagingService.kt`

---

### Requirement 3: Own Computational Code

**Use Cases Implementing This Requirement**:

1. **Interactive Movie Ranking Algorithm (Pairwise Comparison)**
   - **Use Case**: Add Movie / Compare Movies
   - **Implementation**: Custom binary comparison algorithm that determines movie rank through pairwise comparisons. The algorithm:
     - Uses binary search to find the optimal position for a new movie
     - Presents comparison choices to the user (Movie A vs Movie B)
     - Adjusts search range based on user's preference
     - Calculates final rank position in O(log n) comparisons
     - Reindexes existing movies after insertion/deletion
   - **Complexity**: O(log n) comparisons for ranking, O(n) for database updates
   - **Files**:
     - `backend/src/controllers/movieComparisionController.ts` (main ranking algorithm)
     - `backend/src/controllers/rerankController.ts` (re-ranking existing movies)

2. **Personalized Recommendation Algorithm**
   - **Use Case**: View Recommended Movies / Refresh Recommendations
   - **Implementation**: Custom scoring algorithm that analyzes user preferences:
     - Extracts genre preferences from top 30% of user's ranked movies
     - Identifies preferred languages and quality thresholds
     - Fetches candidate movies from TMDB (similar/recommended for top movies)
     - Scores each candidate based on:
       - Genre matching weight (primary factor)
       - Language preference weight
       - Vote average (quality threshold)
       - Release recency bonus
     - Adds random noise (±5) for variety across refreshes
     - Deduplicates and filters already-ranked movies
     - Returns top 20 recommendations sorted by score
   - **Fallback**: Returns trending movies for users with no rankings
   - **Files**:
     - `backend/src/controllers/recommendations/recommendationController.ts`

3. **Watchlist-Ranking Synchronization Logic**
   - **Use Case**: Add to Ranking from Watchlist / Add Movie to Rankings
   - **Implementation**: Custom synchronization logic that ensures watchlist only contains unwatched movies:
     - Automatically removes movies from watchlist when added to rankings
     - Triggered during initial movie add, duplicate detection, and comparison session start
     - Prevents data inconsistency between watchlist and ranked movies
   - **Files**:
     - `backend/src/controllers/movieComparisionController.ts` (`removeFromWatchlistAll()` function)

4. **Featured Quote Selection Algorithm**
   - **Use Case**: View Featured Movie Quote on Discover Page
   - **Implementation**: Multi-layer quote selection with deterministic rotation:
     - Attempts to fetch TMDB taglines via API with 6-hour caching
     - Falls back to local catalog of 1,050+ curated movie quotes
     - Uses deterministic day-based rotation (day-of-year + refresh offset)
     - Attempts to match quote to movies in current recommendation list
     - Falls back to TMDB title search for quote metadata
     - Provides smart movie-themed fallback messages
   - **Files**:
     - Backend: `backend/src/routes/movieRoutes.ts` (quote endpoint with TMDB tagline integration)
     - Frontend: Discover screen with offline quote catalog and rotation logic

---

## 7. "Humblebrag" - Technical Achievements Beyond Course Requirements

We are particularly proud of the following technical implementations that go beyond the basic course requirements:

### 1. **Dual Real-Time Architecture (SSE + FCM)**
We implemented a sophisticated dual-layer real-time notification system:
- **Server-Sent Events (SSE)** for in-app real-time updates with infinite read timeout, automatic reconnection, and exponential backoff
- **Firebase Cloud Messaging (FCM)** for background push notifications when the app is closed
- The two systems work seamlessly together, with SSE handling foreground updates and FCM handling background alerts
- Custom notification channels for different event types (feed updates, friend requests)

### 2. **Elegant Binary Search Ranking Algorithm**
Our interactive movie ranking system uses an optimized pairwise comparison algorithm:
- Achieves O(log n) comparison complexity instead of naive O(n) approach
- Intelligently narrows down the position using binary search principles
- Provides a smooth, interactive user experience with minimal comparisons
- Handles edge cases (first movie, duplicates, re-ranking) gracefully
- Automatic rank reindexing maintains data integrity

### 3. **Sophisticated Recommendation Engine**
Our recommendation algorithm goes far beyond a simple "popular movies" list:
- Multi-factor scoring system considering genres, language, quality, and recency
- Analyzes top 30% of user rankings to identify preferences
- Fetches similar/recommended movies from TMDB for each top movie
- Weighted scoring with configurable parameters
- Randomized noise for variety while maintaining relevance
- Intelligent deduplication and filtering

### 4. **Clean Architecture with Comprehensive Separation of Concerns**
Backend follows a pristine layered architecture:
- Routes → Controllers → Services → Models
- TypeScript strict mode for complete type safety
- Centralized error handling middleware
- Custom color-coded logging utility for development
- 100% test coverage target with mongodb-memory-server for isolated testing

Frontend implements textbook Clean Architecture:
- Data Layer (API, Repository, Local DataStore)
- Domain Layer (Use Cases, Entities)
- UI Layer (Jetpack Compose with MVVM)
- Hilt dependency injection for loose coupling
- Coroutines for elegant async operations

### 5. **Robust Error Handling and User Feedback**
- Comprehensive error handling at every layer
- Informative user feedback messages for all operations
- Optimistic UI updates with rollback on failure
- Graceful degradation when external APIs fail
- Security best practices (JWT verification, input validation, SQL injection prevention via Mongoose)

### 6. **Extensive Testing Infrastructure**
- Backend: Jest with mongodb-memory-server, Supertest for API testing, >90% code coverage
- Frontend: JUnit 4, Espresso, MockK for comprehensive testing
- GitHub Actions CI/CD pipeline with automated test runs
- Codacy integration for code quality monitoring

### 7. **Professional DevOps Practices**
- Self-hosted backend on custom domain with public IP
- Environment-based configuration (.env files)
- Automated deployment pipeline
- Proper git workflow with feature branches
- Comprehensive documentation (Requirements_and_Design.md, Testing_and_Code_Review.md, FCM_SETUP.md, QUICK_REFERENCE.md)

### 8. **Advanced UI/UX Features**
- Material Design 3 theming with custom color schemes
- Consistent 5-star rating display across the entire app
- Smooth animations and transitions
- Responsive layout design
- Trailer playback in custom WebView popup
- Bottom sheets for contextual actions
- Infinite scroll with pagination
- Pull-to-refresh functionality
- Skeleton loading states

---

## 8. Project Limitations

### 1. **Platform Limitation**
- **Android Only**: The app is currently available only for Android devices. iOS users cannot access the app.
- **Minimum SDK**: Requires Android 8.0 (API 26) or higher. Older devices cannot run the app.

### 2. **Movie Data Limitations**
- **TMDB Dependency**: All movie data depends on TMDB API availability. If TMDB experiences downtime, movie search, details, and recommendations will be unavailable.
- **TMDB Rate Limiting**: TMDB API has rate limits. Heavy usage by multiple users simultaneously could lead to temporary API blocks.
- **Limited Watch Provider Coverage**: "Where to Watch" feature depends on TMDB's watch provider data, which may be incomplete or outdated for some regions/movies.

### 3. **Authentication Limitations**
- **Google-Only Authentication**: Users must have a Google account to use the app. No support for other authentication providers (Apple, Facebook, email/password).
- **No Guest Mode**: Users cannot explore the app without creating an account.

### 4. **Social Features Limitations**
- **Friend Discovery**: Users can only find friends by exact email match or name search. No support for:
  - Contact sync
  - "People you may know" suggestions
  - QR code friend adding
- **Privacy Controls**: Limited granular privacy settings. Friends can always see each other's full rankings and watchlists.
- **Friend Removal**: When a friend is removed, the connection is completely deleted. No "block" or "mute" functionality.

### 5. **Ranking System Limitations**
- **No Partial Rankings**: Users cannot maintain multiple separate ranking lists (e.g., "Action Movies," "Comedies"). All movies are in a single global ranking.
- **No Tie Ranks**: The system enforces strict ordering. Two movies cannot share the same rank.
- **Comparison Fatigue**: For users with 100+ ranked movies, adding a new movie still requires 6-8 comparisons, which some users may find tedious.
- **No Ranking History**: Users cannot see how their rankings have changed over time.

### 6. **Recommendation Limitations**
- **Cold Start Problem**: New users with no ranked movies only see generic trending movies, not personalized recommendations.
- **Limited Diversity**: Recommendations heavily favor genres the user already likes. Less exposure to movies outside their preference bubble.
- **No Collaborative Filtering**: Recommendations don't consider what similar users enjoyed.

### 7. **Performance Limitations**
- **Large Ranking Lists**: The app may experience slight performance degradation when users have 500+ ranked movies. Scrolling and search become slower.
- **Image Loading**: Movie poster loading depends on network speed. Slow connections result in delayed image display despite Coil caching.

### 8. **Real-Time Updates Limitations**
- **SSE Reconnection Delay**: When the app reconnects after losing network connection, there may be a 2-5 second delay before real-time updates resume.
- **FCM Dependency**: Push notifications require Firebase Cloud Messaging, which may be blocked in some regions (e.g., China).
- **Notification Permissions**: Android 13+ requires explicit notification permission, which users may deny.

### 9. **Offline Functionality Limitations**
- **Minimal Offline Support**: The app requires an active internet connection for most features. Only previously loaded data (cached images, stored rankings) is available offline.
- **No Offline Queue**: Actions performed offline are not queued for later sync. They simply fail.

### 10. **Content Limitations**
- **English-Centric**: The app UI is English-only. No multi-language support.
- **Movie-Only**: The app only supports movies. No TV shows, documentaries, or other video content types.
- **No Custom Content**: Users cannot add movies not found in TMDB (e.g., home videos, unreleased films).

### 11. **Security Limitations**
- **JWT Expiration**: JWT tokens expire after a set period. Users must re-authenticate, which can be disruptive.
- **No Two-Factor Authentication**: Account security relies solely on Google OAuth. No additional 2FA option.

### 12. **Testing Limitations**
- **Limited Automated UI Testing**: Frontend has basic Espresso tests, but comprehensive UI test coverage is incomplete.
- **No Load Testing**: The backend has not been tested under high concurrent user load.
- **Manual Testing Only for Some Features**: Features like FCM push notifications and SSE require manual testing on physical devices.

### 13. **Deployment Limitations**
- **Single Backend Instance**: The backend runs on a single server with no load balancing or redundancy. Server downtime = app downtime.
- **No Auto-Scaling**: Traffic spikes could overwhelm the single backend instance.
- **No CDN for Images**: Movie posters are fetched directly from TMDB without CDN caching, impacting load times.

### 14. **Data Limitations**
- **No Data Export**: Users cannot export their rankings/watchlist to CSV, JSON, or other formats.
- **No Backup/Restore**: If a user deletes their account or data is lost, there's no recovery mechanism.
- **No Analytics Dashboard**: Users cannot see statistics about their movie-watching habits (genres watched most, average ratings, etc.).

---

**Document Last Updated**: November 27, 2025
