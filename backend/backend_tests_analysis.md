# Backend Test Directory Analysis - CPEN321-MovieTier

## Executive Summary

The backend tests directory contains **54 test files** organized across **9 top-level directories** with **inconsistent structure and significant redundancy**. Tests are scattered across multiple organizational schemes (mocked/unmocked, unit/integration, coverage-focused) with numerous "coverage-driven" test files that exist primarily to chase code coverage metrics rather than verify functionality.

---

## 1. CURRENT DIRECTORY STRUCTURE

### Top-Level Organization
```
tests/
├── auth.test.ts                          # Standalone test
├── config.test.ts                        # Standalone test
├── friendRoutes.test.js                  # Old JS file (orphaned)
├── setup.ts                              # Jest setup
├── globalSetup.ts                        # MongoDB Memory Server
├── globalTeardown.ts                     # MongoDB cleanup
│
├── mocked/                               # 13 files - Route & controller tests with mocks
├── unmocked/                             # 13 files - Integration tests with real DB
├── unit/                                 # 15 files - Utility & unit tests
├── integration/                          # 1 file + 8 nested feature dirs (empty)
├── coverage/                             # 6 files - Coverage-driven tests
├── nfr/                                  # 1 file - Performance tests
├── performance/                          # Empty directory
└── utils/                                # 1 file - Test fixtures
```

### File Count by Category
| Category | Count | Purpose |
|----------|-------|---------|
| Mocked tests | 13 | Route/controller tests with external dependencies mocked (TMDB, SSE, Notifications) |
| Unmocked tests | 13 | Integration tests using MongoDB Memory Server |
| Unit tests | 15 | Utilities, middleware, logger, comparison sessions |
| Coverage tests | 6 | Tests written specifically to increase code coverage % |
| Integration tests | 1 | Consolidated integration test file |
| NFR tests | 1 | Performance/non-functional requirement tests |
| Setup/Config | 6 | Jest configuration and global setup/teardown |
| **TOTAL** | **54** | ~2,400 lines of TypeScript test code |

---

## 2. MOCKED VS UNMOCKED TEST CLASSIFICATION

### Mocked Tests (tests/mocked/ - 13 files)
**Purpose:** Test HTTP endpoints and controllers with external dependencies (TMDB, SSE, Notifications) mocked using Jest

**Files:**
- `auth.mocked.test.ts` - Authentication endpoints (signIn, signUp, signOut, deleteAccount)
- `authService.mocked.test.ts` - Google token verification service
- `movieComparisionController.mocked.test.ts` - Interactive ranking with mocked TMDB
- `movieRoutes.mocked.test.ts` - Movie endpoints (BROKEN: missing controller file)
- `feedRoutes.mocked.test.ts` - Feed endpoints with mocked SSE
- `friendRoutes.mocked.test.ts` - Friend management endpoints
- `watchlistRoutes.mocked.test.ts` - Watchlist endpoints
- `movie.mocked.test.ts` - Movie-related operations
- `apis.mocked.test.ts` - API endpoint testing
- `notificationService.mocked.test.ts` - FCM notifications
- `recommendationController.mocked.test.ts` - Recommendations algorithm
- `rerankController.mocked.test.ts` - Re-ranking functionality
- `tmdbServices.mocked.test.ts` - TMDB client
- `sseAuth.edge.test.ts` - Edge cases for SSE auth
- `final-branches-execution.test.ts` - Coverage-driven test

**Key Characteristics:**
- Uses `jest.mock()` to mock TMDB client, SSE service, Notification service
- Database is **real MongoDB Memory Server** (not mocked)
- HTTP tested via **Supertest**
- Tests error handling and external service failures
- **Mixed concerns:** Some test error handling, others test happy paths
- **Inconsistent naming:** Mix of `mocked.test.ts`, `edge.test.ts`, generic `.test.ts`

### Unmocked Tests (tests/unmocked/ - 13 files)
**Purpose:** Integration tests with real MongoDB and minimal mocking (only Google OAuth verification)

**Files:**
- `auth.unmocked.test.ts` - Authentication endpoints with real MongoDB
- `movie.unmocked.test.ts` - Movie operations with real DB
- `feed.unmocked.test.ts` - Feed operations
- `movieComparisonController.unmocked.test.ts` - Complete comparison flow
- `rerankController.unmocked.test.ts` - Re-ranking with real DB
- `feedRouteHandlers.unmocked.test.ts` - Feed handler details
- `friendRoutesAdvanced.unmocked.test.ts` - Advanced friend operations
- `userRoutes.unmocked.test.ts` - User profile endpoints
- `userProfile.unmocked.test.ts` - Profile editing
- `watchlistRoutes.unmocked.test.ts` - Watchlist operations
- `recommendations.unmocked.test.ts` - Recommendations algorithm
- `quote.unmocked.test.ts` - Quote functionality
- `quoteRoutes.unmocked.test.ts` - Quote endpoints
- `sseService.unmocked.test.ts` - SSE service
- Backup files: `.bak2`, `.bak3`, `.orig` (ORPHANED)

**Key Characteristics:**
- Uses **MongoDB Memory Server** for real database tests
- **Minimal mocking:** Only Google token verification is mocked
- Tests **data persistence** and **query results**
- Tests **side effects** (database changes, state consistency)
- Slower execution (~10+ seconds) due to DB operations
- Includes backup/orphaned files (.bak, .orig)

---

## 3. TEST FILE ORGANIZATION & PATTERNS

### Test Naming Patterns (Inconsistent)

**Mocked Tests:**
```
✓ auth.mocked.test.ts                          (consistent: [name].mocked.test.ts)
✓ movieComparisionController.mocked.test.ts    (consistent)
✗ sseAuth.edge.test.ts                         (INCONSISTENT: .edge.test.ts for mocked tests)
✗ final-branches-execution.test.ts             (INCONSISTENT: coverage-driven, no clear purpose)
```

**Unmocked Tests:**
```
✓ auth.unmocked.test.ts                        (consistent: [name].unmocked.test.ts)
✓ movieComparisonController.unmocked.test.ts   (consistent)
✗ allFeedRoutes.unmocked.test.ts.bak2         (ORPHANED: backup file)
✗ friendOperations.unmocked.test.ts.bak3      (ORPHANED: backup file)
✗ friendOperations.unmocked.test.ts.orig      (ORPHANED: backup file)
```

**Unit Tests:**
```
✓ errorHandler.test.ts                         (no prefix)
✓ logger.unit.test.ts                          (mixed: .unit.test.ts)
✓ asyncHandler.test.ts                         (no prefix)
✗ final11branches.test.ts                      (COVERAGE-DRIVEN: unclear purpose)
✗ final5branches.test.ts                       (COVERAGE-DRIVEN: unclear purpose)
✗ remaining14branches.test.ts                  (COVERAGE-DRIVEN: unclear purpose)
✗ 100percent-coverage.test.ts                  (COVERAGE-DRIVEN: metric-focused)
```

### Describe Block Patterns

**Well-Structured (Mocked Example):**
```typescript
describe('Mocked: POST /auth/signin', () => {
  // Clear intent - endpoint + behavior type

  it('should successfully sign in with valid credentials', async () => { ... });
  it('should handle errors without a message property during sign-in', async () => { ... });
});
```

**Well-Structured (Unmocked Example):**
```typescript
describe('Unmocked: POST /auth/signin', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    // Setup...
  });

  it('should reject signin without idToken', async () => { ... });
});
```

**Poorly-Structured (Coverage-Driven Example):**
```typescript
describe('Branch: tmdbClient.ts - Null coalescing in interceptors', () => {
  // Vague describe block - focuses on code coverage, not behavior
});

describe('Integration - Execute Final Branches in Source Code', () => {
  // Explicitly designed to chase code coverage
});
```

---

## 4. TEST ASSERTION PATTERNS

### Mocked Tests - Focus
Tests primarily verify:
- **HTTP status codes** (200, 201, 400, 401, 500)
- **Response body format** (success flag, error messages)
- **Mock call verification** (did service get called?)
- **Error handling** (graceful failures)

```typescript
// From auth.mocked.test.ts
expect(res.status).toStrictEqual(200);
expect(res.body.success).toBe(true);
expect(res.body.user).toBeDefined();
expect(res.body.token).toBe('mock-jwt-token');
expect(AuthService.prototype.signIn).toHaveBeenCalled();
```

### Unmocked Tests - Focus
Tests primarily verify:
- **HTTP status codes** (same as mocked)
- **Database persistence** (data actually saved)
- **Query results** (correct data retrieved)
- **Side effects** (friendships created, watchlist updated)
- **Data consistency** (counts, relationships)

```typescript
// From auth.unmocked.test.ts
expect(res.status).toStrictEqual(400);
expect(res.body.message).toMatch(/idToken|required/i);

// Verify user still exists in database
const stillExistingUser = await User.findById(user._id);
expect(stillExistingUser).toBeDefined();
```

### Unit Tests - Focus
- **Utility function behavior** (logger formatting, error handling)
- **Middleware functionality** (auth middleware, error handler)
- **Helper functions** (comparison session management)

```typescript
// From logger.unit.test.ts
expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
const call = stdoutWriteSpy.mock.calls[0][0];
expect(call).toContain('DEBUG');
expect(call).toContain('State dump');
```

---

## 5. MIXED TEST PATTERNS & ANTI-PATTERNS

### Issue 1: Mocked Tests NOT Actually Mocking the Database
**Problem:** Some "mocked" tests use MongoDB Memory Server instead of mocking the database

```typescript
// tests/mocked/movieComparisionController.mocked.test.ts (line 57-69)
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();  // <-- NOT MOCKED!
  await mongoose.connect(mongoServer.getUri());
  
  // Mocks TMDB but uses REAL database
  mockTmdbGet = jest.fn();
  jest.mock('../../src/services/tmdb/tmdbClient', ...);
});
```

**Impact:** Tests blur boundary between "unit" (mocked) and "integration" (unmocked)

### Issue 2: Inconsistent Annotation & Documentation
**Current State:**
- Mocked tests: `/** Mocked ... */` in docstring
- Unmocked tests: `/** Unmocked ... */` in docstring
- Unit tests: Some have docstrings, others don't
- Coverage tests: No clear purpose documentation

**Problem:** JSDoc comments are insufficient - no decorator or automation

### Issue 3: Coverage-Driven Tests (Anti-Pattern)
**Files:**
```
tests/coverage/
├── advancedCoverage.test.ts
├── branchCoverage.comprehensive.test.ts
├── final27branches.test.ts
├── finalCoverage.test.ts
├── helperFunctionCoverage.test.ts
└── remaining5percent.test.ts

tests/unit/
├── 100percent-coverage.test.ts
├── final-4-branches.test.ts
├── final11branches.test.ts
├── final5branches.test.ts
└── final5branches-direct.test.ts

tests/mocked/
└── final-branches-execution.test.ts
```

**Characteristics:**
- Test names emphasize code coverage % ("100percent", "final27branches")
- Describe blocks explicitly state: "Execute Final Branches in Source Code"
- Tests added purely to increase coverage metrics
- Often contain empty describe blocks or incomplete test implementations

```typescript
// From tests/integration/100-percent-integration.test.ts
describe('Branch: tmdbClient.ts - Null coalescing in interceptors', () => {
  // Empty - added to chase coverage
});

describe('Integration - Execute Final Branches in Source Code', () => {
  // Explicitly coverage-focused
});
```

### Issue 4: Orphaned/Backup Files
**Files in tests/unmocked/:**
- `allFeedRoutes.unmocked.test.ts.bak2` (backup)
- `friendOperations.unmocked.test.ts.bak3` (backup)
- `friendOperations.unmocked.test.ts.orig` (original)

**Files in tests/ root:**
- `friendRoutes.test.js` (old JavaScript file, no TypeScript equivalent)

### Issue 5: Empty Directories
**tests/integration/unmocked/**
- Directory exists but is completely empty
- No files, but structured to mirror mocked subdirectories

**tests/unit/unmocked/**
- Directory exists but is completely empty

**tests/performance/**
- Directory exists but is completely empty

**tests/unit/mocked/***/**
- Multiple subdirectories (auth/, middleware/, sse/, utils/, movies/)
- All appear to be empty (likely planned structure that wasn't filled)

---

## 6. SPECIFIC TEST FILE EXAMPLES

### Example 1: Well-Structured Mocked Test
**File:** `tests/mocked/auth.mocked.test.ts`
- Clear section comments for each endpoint
- Explicit JSDoc describing mocked behavior
- Well-organized describe blocks by HTTP method
- Tests both success and error cases
- Uses `jest.spyOn()` for mocking

```typescript
// Mocked behavior: AuthService.verifyGoogleToken throws error
// Input: Valid Google idToken
// Expected status code: 400
// Expected behavior: Error is caught and handled gracefully
// Expected output: Error message

it('should successfully sign in with valid credentials', async () => {
  const mockUser = { _id: 'user-123', ... };
  jest.spyOn(AuthService.prototype, 'signIn').mockResolvedValueOnce({
    user: mockUser, token: 'mock-jwt-token'
  });
  // test assertions...
});
```

### Example 2: Well-Structured Unmocked Test
**File:** `tests/unmocked/auth.unmocked.test.ts`
- MongoDB Memory Server setup in beforeAll/afterAll
- Mocks only Google OAuth verification (appropriate)
- Uses `mockTokenMap` for different token scenarios
- Tests database changes and side effects
- Clean data isolation with beforeEach cleanup

```typescript
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // setup...
});

beforeEach(async () => {
  await User.deleteMany({});  // Clear between tests
});

it('should reject account deletion with invalid token', async () => {
  const user = await User.create({ ... });
  // make request...
  const stillExistingUser = await User.findById(user._id);
  expect(stillExistingUser).toBeDefined();  // Verify DB state
});
```

### Example 3: Poorly-Structured Coverage Test
**File:** `tests/integration/100-percent-integration.test.ts`
- Empty describe blocks with no tests
- Vague describe block names focused on coverage ("final branches")
- No clear test intent or assertions

```typescript
describe('Branch: tmdbClient.ts - Null coalescing in interceptors', () => {
  // EMPTY - added purely for code coverage
});

describe('Integration - Execute Final Branches in Source Code', () => {
  // EMPTY - metric-focused
});
```

---

## 7. CURRENT PROBLEMS & INCONSISTENCIES

### P1: Structural Confusion
| Problem | Impact | Example |
|---------|--------|---------|
| Tests labeled "mocked" but use real DB | Unclear test type | `tests/mocked/movieComparisionController.mocked.test.ts` |
| No clear separation between unit/integration | Hard to categorize | Tests mix utility tests with route tests |
| Empty directories throughout | Confusing structure | `tests/integration/unmocked/`, `tests/unit/mocked/*/` |
| Multiple contradictory organizations | Maintenance burden | Both `mocked/` + `unit/mocked/`, both `unmocked/` + `unit/unmocked/` |

### P2: Naming & Consistency Issues
| Problem | Example |
|---------|---------|
| Inconsistent mocking style | `sseAuth.edge.test.ts` (why "edge"?) |
| Inconsistent coverage test naming | `final27branches`, `remaining14branches`, `100percent-coverage` |
| Backup files in source | `*.bak2`, `*.bak3`, `*.orig` |
| Old JS file not migrated | `friendRoutes.test.js` (orphaned) |

### P3: Anti-Patterns
| Anti-Pattern | Count | Impact |
|--------------|-------|--------|
| Coverage-driven tests | ~15 files | Tests exist to chase metrics, not verify behavior |
| Empty test blocks | Multiple | Placeholder tests with no actual assertions |
| Tests with no clear purpose | Multiple | Unclear if testing happy path or error handling |
| Redundant test files | Multiple | Same endpoint tested in mocked/ AND unmocked/ |

### P4: Testing Strategy Issues
| Issue | Current State | Problem |
|-------|--------------|---------|
| No clear test levels | Mixed unit/integration/e2e | Hard to understand test pyramid |
| Coverage as goal, not tool | 15+ files specifically for coverage | Tests written to increase %, not verify behavior |
| Mocking strategy | Database sometimes mocked, sometimes real | Inconsistent test isolation |
| Test speed optimization | No distinction | Slow and fast tests run together |

---

## 8. SUMMARY TABLE

| Aspect | Current State | Assessment |
|--------|---------------|------------|
| **Total test files** | 54 | Large, but with significant redundancy |
| **Test organization** | 9 directories + nested | Confusing with multiple conflicting schemes |
| **Mocked vs Unmocked** | Inconsistent classification | Some "mocked" tests use real DB |
| **Naming conventions** | Multiple patterns | No single consistent approach |
| **Test isolation** | Partial | Database cleanup present, but inconsistent |
| **Documentation** | JSDoc comments | Insufficient - no automation or enforcement |
| **Redundancy** | High | Same endpoints tested in multiple files |
| **Orphaned files** | 4 backup/old files | Dead code taking up space |
| **Empty directories** | 3-4 directories | Planned structure, never filled |
| **Coverage-driven tests** | ~15 files | Anti-pattern: tests for metrics, not behavior |

---

## 9. RECOMMENDATIONS FOR RESTRUCTURING

### Recommended Structure
```
tests/
├── unit/                          # True unit tests (utilities, middleware)
│   ├── middleware/
│   ├── utils/
│   └── services/                  # Service unit tests (business logic)
│
├── integration/                   # Real database tests
│   ├── auth/
│   ├── users/
│   ├── friends/
│   ├── movies/
│   ├── feed/
│   ├── watchlist/
│   ├── recommendations/
│   └── quotes/
│
├── api/                           # API endpoint tests with mocked externals
│   ├── auth/
│   ├── users/
│   ├── friends/
│   ├── movies/
│   ├── feed/
│   ├── watchlist/
│   ├── recommendations/
│   └── quotes/
│
├── fixtures/                      # Shared test data
│   ├── test-fixtures.ts
│   └── mock-services.ts
│
├── setup.ts                       # Jest setup
├── globalSetup.ts
└── globalTeardown.ts
```

### Key Changes
1. **Eliminate "coverage" directory** - Replace with proper unit/integration tests
2. **Consolidate mocked/unmocked** - Reorganize by feature, not by mock strategy
3. **Create clear "api" layer** - Tests with mocked externals (TMDB, FCM, SSE)
4. **Remove orphaned files** - Clean up backups and unused files
5. **Standardize naming** - Pattern: `[feature].test.ts` for all test files

---

## References
- Current test config: `/backend/jest.config.js`
- Test setup: `/backend/tests/setup.ts`
- Test fixtures: `/backend/tests/utils/test-fixtures.ts`
