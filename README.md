# MovieTier
Rank movies, compare tastes with friends, and discover what to watch next.

MovieTier is a social movie companion. It combines a Kotlin Android app and a TypeScript/Express backend backed by MongoDB, TMDB, Firebase Cloud Messaging, and Google OAuth.

## Highlights
- **Google Sign‑In & JWT auth** with secure token storage.
- **Friend graph** with incoming/outgoing requests, rate limiting, and real-time Server-Sent Events (SSE).
- **Interactive ranking** that walks users through binary comparisons and posts feed activities when complete.
- **Watchlist** with TMDB enrichment and automatic cleanup when a title is ranked.
- **Activity feed** showing friends’ rankings, complete with like/comment interactions and push notifications.
- **Recommendations** blending TMDB Discover/Similar/Recommendation APIs based on the user’s ranked list.
- **Offline quote catalog** on Android, with a legacy `/api/quotes` fallback for future clients.

## Tech Stack

### Android (frontend)
- Kotlin + Jetpack Compose (Material 3)
- MVVM architecture with Hilt DI
- Retrofit/OkHttp for networking, DataStore for persistence
- Firebase Cloud Messaging for push notifications

### Backend
- Node.js + Express written in TypeScript
- MongoDB with Mongoose models and aggregation
- Google OAuth verification (`google-auth-library`) + JWT sessions
- Axios-based TMDB client with request/response logging
- Firebase Admin SDK for push notifications

## Repository Layout
```
CPEN321-MovieTier/
├── backend/                    # Node.js + TypeScript Express API
│   ├── src/
│   │   ├── config/             # MongoDB connection, environment setup
│   │   ├── controllers/        # Request handlers
│   │   │   ├── authController.ts
│   │   │   ├── userController.ts
│   │   │   ├── friendController.ts
│   │   │   ├── movieComparisionController.ts (interactive ranking)
│   │   │   ├── rerankController.ts
│   │   │   ├── feedController.ts
│   │   │   ├── watchlistController.ts
│   │   │   ├── recommendationController.ts
│   │   │   └── movieController.ts (TMDB proxy)
│   │   ├── middleware/         # Auth (JWT), error handler
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── user/User.ts
│   │   │   ├── movie/RankedMovie.ts
│   │   │   ├── friend/Friend.ts
│   │   │   ├── feed/FeedActivity.ts
│   │   │   └── watch/WatchlistItem.ts
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # Business logic
│   │   │   ├── auth/
│   │   │   ├── tmdb/
│   │   │   ├── sse/            # Server-Sent Events
│   │   │   ├── notifications/  # Firebase Admin
│   │   │   └── recommendations/
│   │   ├── utils/              # Logger, helpers
│   │   └── server.ts           # Express app setup
│   ├── tests/                  # Jest test suites
│   ├── dist/                   # Compiled JavaScript (from `npm run build`)
│   ├── nodemon.json            # Dev server config
│   ├── jest.config.js          # Test configuration
│   ├── tsconfig.json           # TypeScript config
│   └── package.json
│
├── frontend/                   # Android app (Kotlin + Jetpack Compose)
│   ├── app/src/main/java/com/cpen321/movietier/
│   │   ├── data/               # Data layer
│   │   │   ├── api/            # Retrofit API interfaces
│   │   │   ├── repository/     # Repository implementations
│   │   │   ├── local/          # DataStore, TokenManager
│   │   │   └── model/          # DTOs
│   │   ├── di/                 # Hilt DI modules
│   │   ├── domain/             # Domain models, use cases
│   │   ├── ui/                 # UI layer (Jetpack Compose)
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   ├── friends/
│   │   │   ├── feed/
│   │   │   ├── ranking/
│   │   │   ├── recommendation/
│   │   │   ├── watchlist/
│   │   │   ├── components/     # Reusable composables
│   │   │   ├── viewmodels/     # MVVM state management
│   │   │   ├── navigation/     # Nav graph
│   │   │   └── theme/          # Material Design 3 theme
│   │   ├── fcm/                # Firebase Cloud Messaging integration
│   │   ├── utils/              # Utilities
│   │   └── MainActivity.kt
│   ├── app/src/test/           # Unit tests
│   ├── app/src/androidTest/    # Instrumented tests
│   ├── build.gradle.kts        # Kotlin DSL build config
│   └── local.defaults.properties
│
├── documentation/              # Project docs
│   ├── Requirements_and_Design.md
│   ├── Use_Case_*.md
│   └── M*_*.md                 # Milestone reports
│
├── CLAUDE.md                   # Developer guidelines for Claude Code
├── README.md                   # This file
└── .env.example                # Backend env template
```

## Prerequisites
- Android Studio Hedgehog (or newer) + Android SDK 31+
- Node.js 18+ and npm
- MongoDB instance (local or Atlas)
- Google Cloud project with OAuth client IDs
- Firebase project with Messaging enabled (for push notifications)

## Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Fill out `.env`:
- `PORT` – optional, defaults to `3000`
- `MONGODB_URI` – connection string
- `GOOGLE_CLIENT_ID` – OAuth Web Client ID (used to verify ID tokens)
- `JWT_SECRET` – signing secret for backend-issued JWTs
- `TMDB_API_KEY` – API key from themoviedb.org
- **Push notifications** (choose one):
  - `FIREBASE_SERVICE_ACCOUNT_PATH` – absolute path to a service account JSON file, **or**
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (escaped with `\n`)

Start the dev server with hot reload:
```bash
npm run dev
```

Useful scripts:
- `npm run build` – compile TypeScript to `dist/`
- `npm start` – run compiled server
- `npm test` – Jest test suite (if present)

## Android Setup
1. Open the `frontend` directory in Android Studio.
2. Duplicate `local.defaults.properties` → `local.properties` and update:
   ```properties
   sdk.dir=/path/to/android-sdk
   API_BASE_URL=http://10.0.2.2:3000/api/
   GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
   ```
3. If you plan to receive push notifications:
   - Add your Firebase Cloud Messaging keys via the Secrets Gradle Plugin (`local.properties` supports `FIREBASE_*` entries).
   - Place `google-services.json` under `frontend/app/` (optional; the build skips the Google Services plugin if missing).
4. Generate SHA-1 for your debug keystore:
   ```bash
   ./gradlew signingReport
   ```
   Register it with your Google OAuth Android client.
5. `Sync Project with Gradle Files`, then `Run` on an emulator or device. The default base URL uses `10.0.2.2` for the Android emulator loopback; replace with your machine’s LAN IP when testing on hardware.

## Feature Overview

### Core Features
- **Authentication** – Google Sign-In via Credential Manager API (Android). Backend verifies ID tokens, issues JWT, which frontend stores in DataStore and auto-injects via OkHttp interceptor.
- **User Profiles** – View own and friends' profiles. Update name and profile image. Search other users by name/email.

### Social & Friends
- **Friend Management** – Send/cancel/accept/reject requests. View pending requests (incoming/outgoing) with detailed sender/receiver info. Real-time friend updates via SSE stream. Rate-limited (5 requests/min) to prevent spam.
- **Activity Feed** – Aggregates friends' movie rankings with like/comment interactions. Separate view for own activities. Real-time updates via SSE + push notifications for likes and comments.

### Movie Ranking & Discovery
- **Interactive Ranking** – Pairwise comparison-based ranking system. Users compare new movie against existing ranked movies in binary choices. `/movies/add` → `/movies/compare` flow. Users can re-rank existing movies via `/movies/rerank/start`. Finalizes to database, posts feed activity, removes from watchlist automatically.
- **Watchlist** – Personal movie list separate from rankings. Enforced uniqueness per user. Auto-removes when movie is ranked. Enriched with TMDB metadata (poster, year, synopsis).
- **Recommendations** – Personalized results blending TMDB Discover/Similar/Recommendation APIs scored against user's ranked movies. Trending movies fallback for new users with no rankings.
- **Movie Details** – TMDB integration: search, details (cast, runtime, overview), videos (trailers), watch providers (where to watch).

### Push Notifications & Real-Time
- **Firebase Cloud Messaging** – Users can opt-in to notifications. Backend triggers on:
  - Friend request received
  - Friend request accepted
  - Activity liked
  - Comment added to activity
- **Server-Sent Events (SSE)** – Two streams:
  - `/friends/stream` – Friend request events
  - `/feed/stream` – Feed activity updates
- **Offline Quote Catalog** – Android includes hardcoded movie quotes via `MovieQuoteProvider`. Backend `/api/quotes` endpoint as fallback for legacy clients (queries TMDB taglines).

## Running & Testing
- Backend: `npm run dev` for development, `npm test` for Jest suites.
- Android: Use Android Studio’s “Run” or `./gradlew testDebugUnitTest` / `./gradlew connectedAndroidTest`.

## API Snapshot

All endpoints require JWT authentication (except `/health`). Full endpoint documentation:

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/signin` | POST | Sign in with Google ID token; returns JWT |
| `/auth/signup` | POST | Create account with Google ID token; returns JWT |
| `/auth/signout` | POST | Sign out (invalidates session) |
| `/auth/account` | DELETE | Delete account and all associated data |

### Users
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/search` | GET | Search users by name/email (query: `q`) |
| `/users/profile` | PUT | Update profile name and/or profile image URL |
| `/users/fcm-token` | POST | Register/update Firebase Cloud Messaging token |
| `/users/:userId` | GET | Get public user profile by ID |
| `/users/:userId/watchlist` | GET | Get user's public watchlist (friends can view) |

### Friends
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/friends` | GET | Get all friends |
| `/friends/requests` | GET | Get incoming friend requests |
| `/friends/requests/detailed` | GET | Get incoming requests with sender details |
| `/friends/requests/outgoing` | GET | Get outgoing/pending friend requests |
| `/friends/requests/outgoing/detailed` | GET | Get outgoing requests with receiver profile |
| `/friends/request` | POST | Send friend request (rate-limited: 5/min) |
| `/friends/respond` | POST | Accept or reject friend request |
| `/friends/:friendId` | DELETE | Remove friend |
| `/friends/requests/:requestId` | DELETE | Cancel pending outgoing friend request |
| `/friends/stream` | GET | Server-Sent Events stream (friend request/accept/reject events) |

### Movies
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/movies/search` | GET | Search TMDB by title (query: `query`) |
| `/movies/ranked` | GET | Get current user's ranked movies (ordered by rank) |
| `/movies/add` | POST | Initiate interactive ranking session (add new movie) |
| `/movies/compare` | POST | Compare movies during interactive ranking session |
| `/movies/rerank/start` | POST | Start re-ranking session for existing ranked movie |
| `/movies/ranked/:id` | DELETE | Delete ranked movie and re-sequence ranks |
| `/movies/:movieId/details` | GET | Get TMDB movie details + top 10 cast (TMDB ID required) |
| `/movies/:movieId/providers` | GET | Get watch providers for a movie (where to watch) |
| `/movies/:movieId/videos` | GET | Get movie videos/trailers from TMDB |

### Feed & Social
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/feed` | GET | Get friends' activity feed (paginated) |
| `/feed/me` | GET | Get current user's own activities |
| `/feed/stream` | GET | Server-Sent Events stream (real-time feed updates) |
| `/feed/:activityId/like` | POST | Like an activity |
| `/feed/:activityId/like` | DELETE | Unlike an activity |
| `/feed/:activityId/comments` | GET | Get all comments on an activity |
| `/feed/:activityId/comments` | POST | Add comment to activity |
| `/feed/:activityId/comments/:commentId` | DELETE | Delete comment (author only) |

### Watchlist
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/watchlist` | GET | Get current user's watchlist |
| `/watchlist` | POST | Add movie to watchlist (auto-removed if ranked) |
| `/watchlist/:movieId` | DELETE | Remove movie from watchlist |

### Recommendations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recommendations` | GET | Get personalized recommendations (blends TMDB Discover/Similar/Recommendation) |
| `/recommendations/trending` | GET | Get trending movies (for new users with no rankings) |

### Quotes & Utilities
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/quotes` | GET | Get TMDB tagline for movie (query: `title`, optional `year`) |
| `/health` | GET | Health check endpoint (no auth required) |

**Notes:**
- All endpoints use Bearer token auth: `Authorization: Bearer <jwt_token>`
- Watchlist items automatically removed when user ranks a movie
- SSE streams are long-lived connections; re-subscribe on backend restart
- TMDB integration used for movie search, details, trailers, cast, watch providers, and recommendations

## Development Tips & Troubleshooting

### Backend
- **MongoDB** must be running before `npm run dev`; the server exits on connection failure.
- **TMDB API Key** – Backend logs TMDB requests to console for debugging. Provide `TMDB_API_KEY` to avoid 401 errors on movie searches.
- **Logging** – Custom logger with color-coded output (INFO, SUCCESS, WARN, ERROR, DEBUG, HTTP). Check console for route loading and connection confirmations.
- **Hot Reload** – `npm run dev` uses Nodemon; file changes auto-restart the server.
- **Environment** – Copy `.env.example` to `.env` and update all required vars (especially `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `TMDB_API_KEY`).
- **Firebase** – Optional; provide either a service account file path or individual credential vars for push notifications.

### Frontend (Android)
- **Emulator Network** – Use `10.0.2.2` in `API_BASE_URL` to reach backend on host's `localhost:3000`. Physical devices use the machine's local IP.
- **Google Sign-In** – Requires SHA-1 fingerprint registered in Google Cloud Console. Get it via `./gradlew signingReport`.
- **Push Notifications** – Optional `google-services.json` enables FCM. App gracefully degrades if missing. Requires `POST_NOTIFICATIONS` permission (Android 13+).
- **DataStore** – Used for persistent JWT token and user info. Auto-injected into all API requests via `AuthInterceptor`.
- **SSE Connections** – Long-lived streams for real-time updates. After backend restarts, manually refresh or restart the Android app to re-subscribe.

### Testing
- **Backend Tests** – `npm test` runs Jest suites with mongodb-memory-server for isolation.
- **Android Tests** – `./gradlew connectedAndroidTest` for instrumented tests on connected emulator/device.
- **API Testing** – Backend logs HTTP requests (method, path, duration) for debugging.

### Common Issues
- **401 Unauthorized** – Check JWT token validity in DataStore (frontend) or middleware (backend). Sign out and back in if needed.
- **TMDB 401** – Verify `TMDB_API_KEY` in backend `.env`; some endpoints require it.
- **Network Errors** – Ensure backend is running and reachable from Android emulator (use `10.0.2.2`).
- **SSE Disconnects** – Restart app after backend restart. SSE streams are long-lived and don't auto-reconnect.
- **MongoDB Connection** – Verify connection string in `MONGODB_URI`; local MongoDB should be running (`mongod`).
- **Build Fails** – Run `./gradlew clean` before rebuilding. Gradle cache issues can cause phantom failures.

## Contributors
- Jimmy Chen
- Kayli Cheung
- Muskan Bhatia
- Vansh Khandelia

## License
Academic project for UBC CPEN 321. Not licensed for commercial distribution.
