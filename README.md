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
├── backend/                    # Express + TypeScript API
│   ├── src/
│   │   ├── config/             # Environment bootstrapping
│   │   ├── controllers/        # Comparison logic & recommendations
│   │   ├── middleware/         # Auth guards, error handling
│   │   ├── models/             # Mongoose schemas (User, FeedActivity, etc.)
│   │   ├── routes/             # REST endpoints
│   │   ├── services/           # TMDB, notifications, wikiquote, SSE
│   │   └── server.ts           # Express app entry point
│   └── package.json
├── frontend/                   # Android app module
│   ├── app/src/main/java/com/cpen321/movietier/
│   │   ├── data/               # Models, Retrofit API, repositories
│   │   ├── di/                 # Hilt modules
│   │   ├── ui/                 # Compose screens, navigation
│   │   ├── fcm/                # Firebase Messaging service + helpers
│   │   └── utils/              # Location + formatting helpers
│   └── build.gradle.kts
└── documentation/              # Requirements, design, refinement notes
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
- **Authentication** – Google Sign-In, JWT issuance, sign-out, and account deletion. Frontend stores tokens with DataStore and injects them into Retrofit.
- **Profiles & Notifications** – Users can rename themselves and register device FCM tokens (`POST /api/users/fcm-token`). Backend uses Firebase Admin to notify on friend requests, acceptance, likes, and comments.
- **Friend Management** – Send, cancel, accept, or reject requests; bilateral friendships are maintained with compound cleanup. SSE (`/api/friends/stream`) keeps UI badges live.
- **Ranking Flow** – `/api/movies/add` kicks off the comparison session, `/compare` iterates, and `/rerank/start` lets users reposition existing titles. Finalization writes to `RankedMovie`, posts to the feed, removes any watchlist entry, and pushes notifications.
- **Watchlist** – CRUD via `/api/watchlist`; the backend enriches missing metadata via TMDB and enforces uniqueness per user.
- **Feed Engagement** – `/api/feed` (friends) and `/api/feed/me` (self) aggregate activities with like/comment counts. Likes land on `/feed/:id/like` (POST/DELETE) and comments on `/feed/:id/comments` (GET/POST/DELETE). SSE plus FCM provide real-time updates.
- **Recommendations** – `/api/recommendations` blends TMDB Discover/Similar/Recommendation results scored against the user’s preferences. `/api/recommendations/trending` covers new users.
- **Movie Utilities** – TMDB search, details, videos, cast, and watch-provider data are proxied through `/api/movies/...`.
- **Quotes** – Android ships with `MovieQuoteProvider`; backend retains `/api/quotes` as a Wikiquote-based fallback.

## Running & Testing
- Backend: `npm run dev` for development, `npm test` for Jest suites.
- Android: Use Android Studio’s “Run” or `./gradlew testDebugUnitTest` / `./gradlew connectedAndroidTest`.

## API Snapshot
| Area        | Endpoint (prefix `/api`)                  | Notes |
|-------------|-------------------------------------------|-------|
| Auth        | `POST auth/signin`, `POST auth/signup`, `POST auth/signout`, `DELETE auth/account` | Google ID token in request body; JWT returned on success. |
| Users       | `GET users/search`, `PUT users/profile`, `POST users/fcm-token`, `GET users/:userId`, `GET users/:userId/watchlist` | Profile lookups and FCM registration. |
| Friends     | `GET friends`, `GET friends/requests`, `GET friends/requests/detailed`, `GET friends/requests/outgoing`, `GET friends/requests/outgoing/detailed`, `POST friends/request`, `POST friends/respond`, `DELETE friends/:friendId`, `DELETE friends/requests/:requestId`, `GET friends/stream` | SSE stream emits `friend_request`, `friend_request_accepted`, etc. |
| Movies      | `GET movies/search`, `GET movies/ranked`, `POST movies/add`, `POST movies/compare`, `POST movies/rerank/start`, `DELETE movies/ranked/:id`, `GET movies/:movieId/details`, `GET movies/:movieId/providers`, `GET movies/:movieId/videos` | All endpoints require JWT bearer token. |
| Feed        | `GET feed`, `GET feed/me`, `GET feed/stream`, `POST feed/:activityId/like`, `DELETE feed/:activityId/like`, `GET feed/:activityId/comments`, `POST feed/:activityId/comments`, `DELETE feed/:activityId/comments/:commentId` | Likes/comments drive SSE and FCM notifications. |
| Watchlist   | `GET watchlist`, `POST watchlist`, `DELETE watchlist/:movieId` | Watchlist items removed automatically when ranked. |
| Recommendations | `GET recommendations`, `GET recommendations/trending` | Blend of TMDB data sources. |
| Quotes (legacy) | `GET quotes?title=Inception&year=2010` | Scrapes Wikiquote; not used by current Android client. |

## Development Tips
- Use `10.0.2.2` from the Android emulator to hit the backend on `localhost`.
- MongoDB must be running before `npm run dev`; the server exits on connection failure.
- The backend logs TMDB requests to the console for debugging. Provide `TMDB_API_KEY` to avoid 401s.
- SSE connections are long-lived; in development, restart the Android client after backend restarts to re-subscribe.
- Keep secrets (`.env`, `local.properties`) out of version control.

## Contributors
- Jimmy Chen
- Kayli Cheung
- Muskan Bhatia
- Vansh Khandelia

## License
Academic project for UBC CPEN 321. Not licensed for commercial distribution.
