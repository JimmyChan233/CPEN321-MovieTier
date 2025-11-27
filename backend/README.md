# MovieTier Backend API

## Table of Contents
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [API Endpoints](#api-endpoints)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start development server
npm run dev
```

The server will be available at `http://localhost:3000/api`

## Environment Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local instance or MongoDB Atlas)
- Google OAuth credentials
- TMDB API key
- Firebase credentials (optional, for push notifications)

### Configuration

1. **Create `.env` file:**
```bash
cp .env.example .env
```

2. **Configure required variables in `.env`:**

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/movietier` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |
| `JWT_SECRET` | Secret key for JWT tokens | Random string (min 32 chars) |
| `TMDB_API_KEY` | TMDB API key | From themoviedb.org |
| `TMDB_BASE_URL` | TMDB base URL | `https://api.themoviedb.org/3` |

3. **Firebase Cloud Messaging (Optional):**

**Option A: Service Account File** (recommended for development)
```
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json
```

**Option B: Environment Variables** (recommended for production)
```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### Getting Credentials

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Create OAuth 2.0 credentials (Web Client)
4. Copy the Client ID to `GOOGLE_CLIENT_ID`

**TMDB API:**
1. Visit [themoviedb.org](https://www.themoviedb.org/)
2. Create an account and go to Settings → API
3. Request an API key
4. Copy to `TMDB_API_KEY`

**MongoDB:**
- **Local:** Run `mongod` locally (MongoDB Community Edition)
- **Cloud:** Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and copy connection string to `MONGODB_URI`

**Firebase (for push notifications):**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Generate service account key
4. Download JSON file or extract credentials for environment variables

## Development

### Commands

```bash
# Start development server with hot-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run compiled server
npm start
```

### Development Server Features

- **Hot-reload:** Code changes restart automatically via Nodemon
- **TypeScript compilation:** On-the-fly via ts-node
- **Logging:** Color-coded console output with timestamps
- **HTTP logging:** Request method, path, status code, and duration

### Code Organization

```
src/
├── controllers/      # HTTP request handlers
├── routes/          # Express route definitions
├── services/        # Business logic
├── models/          # Mongoose schemas
├── middleware/      # Auth, error handling
├── utils/           # Utilities (logger, validators, etc.)
├── config/          # Configuration
└── server.ts        # Express app setup
```

## Testing

### Test Structure

```
tests/
├── unit/            # Unit tests (100% coverage target)
│   ├── controllers/
│   ├── middleware/
│   ├── services/
│   └── utils/
├── api/             # Integration tests (mocked & unmocked)
│   ├── mocked/      # Tests with external services mocked
│   │   ├── auth/
│   │   ├── friends/
│   │   ├── movies/
│   │   ├── feed/
│   │   ├── watchlist/
│   │   ├── recommendations/
│   │   ├── users/
│   │   └── services/
│   └── unmocked/    # Tests with real MongoDB, TMDB, etc.
│       ├── auth/
│       ├── friends/
│       ├── movies/
│       ├── feed/
│       ├── watchlist/
│       ├── recommendations/
│       └── users/
├── integration/     # Database integration tests
├── helpers/         # Test utilities and mocks
├── nfr/            # Non-functional requirement tests
├── setup.ts        # Jest setup
├── globalSetup.ts  # Test environment initialization
└── globalTeardown.ts # Test cleanup
```

### Running Tests

**All tests with coverage:**
```bash
npm test
```

**Watch mode (auto-rerun on file changes):**
```bash
npm test -- --watch
```

**Generate coverage report:**
```bash
npm test -- --coverage
```

**Run specific test file:**
```bash
npm test -- tests/unit/utils/validators.test.ts
```

**Run tests matching a pattern:**
```bash
npm test -- --testNamePattern="should validate email"
```

**Run specific test suite:**
```bash
# Unit tests only
npm test -- tests/unit/

# API/Integration tests only
npm test -- tests/api/

# Mocked tests only
npm test -- tests/api/mocked/

# Unmocked tests only
npm test -- tests/api/unmocked/
```

### Test Types Explained

#### Unit Tests (`tests/unit/`)
- **Purpose:** Test individual functions/classes in isolation
- **Mocking:** External dependencies mocked
- **Database:** No database required (uses in-memory mocks)
- **Speed:** Fast (no I/O operations)
- **Coverage:** Target 100%

**Example:**
```bash
npm test -- tests/unit/utils/validators.test.ts
```

#### Mocked API Tests (`tests/api/mocked/`)
- **Purpose:** Test entire API endpoints with external services mocked
- **Mocking:** TMDB API, Firebase, etc. are mocked
- **Database:** Uses mongodb-memory-server (in-memory)
- **Speed:** Fast (no external API calls)
- **Use case:** Testing endpoint logic without external dependencies

**Example:**
```bash
npm test -- tests/api/mocked/movies/
```

#### Unmocked API Tests (`tests/api/unmocked/`)
- **Purpose:** Test API endpoints with real external services
- **Mocking:** No mocking - uses real TMDB API, Firebase, etc.
- **Database:** Uses real MongoDB (must be running)
- **Speed:** Slow (makes real API calls)
- **Use case:** End-to-end testing, integration validation
- **Prerequisites:**
  - MongoDB running
  - `.env` configured with real credentials
  - API rate limits respected

**Example:**
```bash
npm test -- tests/api/unmocked/movies/
```

#### Integration Tests (`tests/integration/`)
- **Purpose:** Test service-level database interactions
- **Focus:** Database queries, indexes, transactions
- **Speed:** Medium (real MongoDB I/O, but controlled)

### Test Configuration

Jest configuration in `jest.config.js`:
- **Preset:** `ts-jest` (TypeScript support)
- **Environment:** Node.js
- **Root directory:** `tests/`
- **Test timeout:** 10 seconds
- **Coverage:** Collected from `src/**/*.ts`
- **Global setup:** `tests/globalSetup.ts` (starts MongoDB memory server)
- **Global teardown:** `tests/globalTeardown.ts` (stops MongoDB memory server)

### Test Examples

**Unit Test:**
```typescript
// tests/unit/utils/validators.test.ts
describe('Email Validator', () => {
  it('should validate correct email', () => {
    const result = validateEmail('user@example.com');
    expect(result).toBe(true);
  });
});
```

**Mocked API Test:**
```typescript
// tests/api/mocked/auth/signin.test.ts
describe('POST /api/auth/signin', () => {
  it('should sign in user with valid token', async () => {
    const response = await request(app)
      .post('/api/auth/signin')
      .send({ idToken: mockToken });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

**Unmocked API Test:**
```typescript
// tests/api/unmocked/auth/signin.test.ts
describe('POST /api/auth/signin (Unmocked)', () => {
  // Uses real Google OAuth, real database
  it('should sign in with real Google token', async () => {
    // Requires real credentials in .env
  });
});
```

### Coverage Targets

- **Overall:** Aim for high coverage on critical paths
- **Controllers/Routes:** 100% for HTTP handling
- **Services:** 100% for business logic
- **Models:** 80%+ for schema validation
- **Utils:** 100% for helper functions

View coverage report:
```bash
# Generate report
npm test

# View HTML report
open coverage/index.html
```

### Mocking Patterns

**Mocking Services:**
```typescript
import { mock } from 'jest-mock-extended';

const mockTMDBService = mock<TMDBService>();
mockTMDBService.searchMovies.mockResolvedValue([...]);
```

**Mocking MongoDB:**
```typescript
// Uses mongodb-memory-server automatically
// Configured in globalSetup.ts
```

**Mocking Firebase:**
```typescript
jest.mock('firebase-admin', () => ({
  messaging: () => ({
    send: jest.fn().mockResolvedValue('messageId')
  })
}));
```

## Building for Production

### Build Process

```bash
# Compile TypeScript to JavaScript
npm run build

# This creates dist/ directory with compiled code
```

### Running Production Server

```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in with Google
- `POST /api/auth/signup` - Sign up with Google
- `POST /api/auth/signout` - Sign out
- `DELETE /api/auth/account` - Delete account

### Friends
- `GET /api/friends` - Get friends list
- `GET /api/friends/requests` - Get friend requests
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/respond` - Accept/reject friend request
- `DELETE /api/friends/:friendId` - Remove friend

### Movies
- `GET /api/movies/search?query=...` - Search movies
- `GET /api/movies/ranked` - Get user's ranked movies
- `POST /api/movies/add` - Add movie to ranking
- `POST /api/movies/compare` - Compare during ranking
- `DELETE /api/movies/ranked/:id` - Delete ranked movie
- `GET /api/movies/:movieId/details` - Get TMDB details
- `GET /api/movies/:movieId/videos` - Get trailers
- `GET /api/movies/:movieId/providers` - Get watch providers

### Feed
- `GET /api/feed` - Get friend activity feed
- `GET /api/feed/stream` - SSE stream for real-time updates
- `POST /api/feed/:activityId/like` - Like activity
- `DELETE /api/feed/:activityId/like` - Unlike activity
- `GET /api/feed/:activityId/comments` - Get comments
- `POST /api/feed/:activityId/comments` - Add comment

### Watchlist
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add movie to watchlist
- `DELETE /api/watchlist/:movieId` - Remove from watchlist

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations
- `GET /api/recommendations/trending` - Get trending movies

## Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running
```bash
# Local: Start MongoDB
mongod

# Cloud: Verify MONGODB_URI in .env
```

### Google OAuth Errors
```
Error: Invalid client ID
```
**Solution:**
- Verify `GOOGLE_CLIENT_ID` matches Google Cloud Console
- Ensure it's the Web Client ID (not Android Client ID)
- Check client ID hasn't been deleted

### TMDB API 401 Unauthorized
```
Error: Invalid API Key
```
**Solution:**
- Verify `TMDB_API_KEY` in `.env`
- Check key hasn't been revoked in TMDB account
- Ensure quota hasn't been exceeded

