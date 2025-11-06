# Backend Test Consolidation Analysis
## MovieTier Project - Unmocked Test Suite

**Analysis Date:** November 5, 2025
**Scope:** All unmocked test files in `/backend/tests/unmocked/`
**Total Files:** 18 test files
**Total Lines of Test Code:** 7,703+ lines

---

## Executive Summary

The unmocked test suite shows significant opportunities for consolidation and optimization. Key findings:

- **~30-40% of tests could be consolidated** through parameterization and merging
- **Duplicate patterns identified:** Friend request/response flows, watchlist operations, authorization checks
- **Redundant test files:** `friendRoutesAdvanced.ts` and `friendOperations.ts` overlap significantly
- **Movie comparison/rerank tests:** Multiple files testing similar binary search logic
- **Heavy setup repetition:** Each test file recreates database setup, users, and tokens

---

## Section 1: Authorization/Authentication Pattern Duplication

### Pattern: Unauthorized Access Tests

**Files Affected:**
- `friendRoutesAdvanced.unmocked.test.ts` (lines 334-379): 6 unauthorized tests
- `feed.unmocked.test.ts` (lines 101-105): 1 unauthorized test
- `auth.unmocked.test.ts` (lines 287-426): 6 unauthorized tests
- `watchlistRoutes.unmocked.test.ts`: Multiple implied unauthorized tests
- `feedRouteHandlers.unmocked.test.ts` (lines 237-248): 5 unauthorized tests

**Tests Count:** 15+ nearly identical unauthorized access tests

**What They Test:**
- Missing authorization header → 401 status
- Invalid JWT token → 401 status
- Expired token → 401 status
- Missing token in request body → 401 status

**Consolidation Opportunity: HIGH**

### Suggested Consolidation

Create a `shared/authorizationTests.ts` utility that parameterizes authorization checks:

```typescript
interface AuthTestCase {
  method: 'get' | 'post' | 'delete' | 'put';
  endpoint: string;
  body?: any;
  expectedStatus: number;
  expectedMessage?: string;
}

export function testUnauthorizedAccess(app: Express.Application, testCases: AuthTestCase[]) {
  describe('Authorization Tests', () => {
    testCases.forEach((test) => {
      it(`should reject ${test.method.toUpperCase()} ${test.endpoint} without auth`, async () => {
        const res = await request(app)[test.method](test.endpoint).send(test.body || {});
        expect(res.status).toBe(test.expectedStatus);
      });
    });
  });
}
```

**Expected Reduction:** 15+ tests → 1 parameterized test suite (90% reduction in lines)

---

## Section 2: Friend Route Pattern Duplication

### Pattern A: Friend Request Validation Tests

**Files Affected:**
- `friendRoutesAdvanced.unmocked.test.ts` (lines 68-267): 21 friend request tests
- `friendOperations.unmocked.test.ts` (lines 16-155): 8 similar friend request tests

**Overlapping Tests:**
| Test | friendRoutesAdvanced | friendOperations | Status |
|------|---------------------|------------------|--------|
| Send friend request by email | ✓ (line 69) | ✓ (line 60) | **DUPLICATE** |
| Reject friend request to self | ✓ (line 145) | ✓ (line 80) | **DUPLICATE** |
| Reject duplicate request | ✓ (line 152) | ✓ (line 94) | **DUPLICATE** |
| Request to existing friend | ✓ (line 394) | ✓ (line 114) | **DUPLICATE** |
| Missing email field | ✓ (line 262) | ✓ (line 134) | **DUPLICATE** |
| Invalid email format | ✓ (line 254) | ✓ (line 147) | **DUPLICATE** |

**Tests Count:** 6 direct duplicates + 15 variations

**Consolidation Opportunity: CRITICAL**

### Suggested Consolidation

Merge `friendOperations.unmocked.test.ts` into `friendRoutesAdvanced.unmocked.test.ts` using parameterized tests:

```typescript
describe('Friend Request Validation - Parameterized', () => {
  const testCases = [
    {
      name: 'should send friend request by email',
      email: () => user2.email,
      expectedStatus: 201,
    },
    {
      name: 'should reject request to self',
      email: () => user1.email,
      expectedStatus: 400,
      expectedMessage: /yourself/i,
    },
    {
      name: 'should reject duplicate request',
      setup: async () => {
        await FriendRequest.create({
          senderId: user1._id,
          receiverId: user2._id,
          status: 'pending'
        });
      },
      email: () => user2.email,
      expectedStatus: 409,
    },
  ];

  testCases.forEach(tc => {
    it(tc.name, async () => {
      if (tc.setup) await tc.setup();
      const res = await request(app)
        .post('/request')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: tc.email() });
      expect(res.status).toBe(tc.expectedStatus);
    });
  });
});
```

**Expected Reduction:** 21 + 8 = 29 tests → 15 parameterized tests (50% reduction)

---

### Pattern B: Friend Response (Accept/Reject) Tests

**Files Affected:**
- `friendRoutesAdvanced.unmocked.test.ts` (lines 77-316): 7 respond tests
- `friendOperations.unmocked.test.ts` (lines 157-319): 6 similar respond tests

**Overlapping Tests:**
| Test | friendRoutesAdvanced | friendOperations | Status |
|------|---------------------|------------------|--------|
| Accept friend request | ✓ (line 77) | ✓ (line 202) | **DUPLICATE** |
| Reject friend request | ✓ (line 124) | ✓ (line 235) | **DUPLICATE** |
| Invalid accept value | Implied | ✓ (line 262) | SIMILAR |
| Non-existent request | ✓ (line 269) | ✓ (line 278) | **DUPLICATE** |
| Missing requestId | ✓ (line 473) | ✓ (line 295) | **DUPLICATE** |
| Missing accept field | ✓ (line 455) | Implied | SIMILAR |

**Tests Count:** 5 direct duplicates + 8 variations

**Consolidation Opportunity: HIGH**

**Expected Reduction:** 7 + 6 = 13 tests → 8 parameterized tests (38% reduction)

---

### Pattern C: Friend Deletion Tests

**Files Affected:**
- `friendRoutesAdvanced.unmocked.test.ts` (lines 101-121, 318-331): 4 delete tests
- `friendOperations.unmocked.test.ts` (lines 322-425): 4 delete tests

**Overlapping Tests:**
| Test | friendRoutesAdvanced | friendOperations | Status |
|------|---------------------|------------------|--------|
| Remove bilateral friendships | ✓ (line 101) | ✓ (line 359) | **DUPLICATE** |
| Non-existent friendship | ✓ (line 319) | ✓ (line 393) | **DUPLICATE** |
| Invalid friend ID | ✓ (line 328) | ✓ (line 406) | **DUPLICATE** |
| Remove self | Implied | ✓ (line 418) | SIMILAR |

**Tests Count:** 3 direct duplicates + 5 variations

**Consolidation Opportunity: MEDIUM**

**Expected Reduction:** 4 + 4 = 8 tests → 5 parameterized tests (37% reduction)

---

## Section 3: Watchlist Operations Pattern Duplication

### Pattern A: Watchlist Item Addition Tests

**Files Affected:**
- `watchlistRoutes.unmocked.test.ts` (lines 173-407): 16 POST tests
- `watchlistOperations.unmocked.test.ts`: Likely similar tests (508 lines)

**Tests with Repetitive Patterns:**
```
Lines 174-199:  "should add movie to watchlist"
Lines 201-215:  "should add movie with minimal fields" (same logic, fewer fields)
Lines 369-386:  "should preserve all provided fields" (redundant with 174-199)
```

**Consolidation Pattern Identified:**

Multiple tests cover "add movie" with different input combinations:
- Full fields (movieId, title, posterPath, overview)
- Minimal fields (movieId, title only)
- Missing one field at a time
- Invalid data types

**Consolidation Opportunity: MEDIUM-HIGH**

### Suggested Consolidation

Parameterize the POST watchlist tests:

```typescript
describe('POST / - Add to Watchlist - Parameterized', () => {
  const testCases = [
    {
      name: 'with all fields',
      input: { movieId: 550, title: 'Fight Club', posterPath: '/poster.jpg', overview: 'desc' },
      expectedStatus: 201,
    },
    {
      name: 'with minimal fields',
      input: { movieId: 550, title: 'Fight Club' },
      expectedStatus: 201,
    },
    {
      name: 'missing movieId',
      input: { title: 'Fight Club' },
      expectedStatus: 400,
    },
    {
      name: 'missing title',
      input: { movieId: 550 },
      expectedStatus: 400,
    },
  ];

  testCases.forEach(tc => {
    it(`should handle ${tc.name}`, async () => {
      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token}`)
        .send(tc.input);
      expect(res.status).toBe(tc.expectedStatus);
    });
  });
});
```

**Expected Reduction:** 16+ tests → 12 parameterized tests (25% reduction)

---

### Pattern B: Watchlist Item Deletion Tests

**Files Affected:**
- `watchlistRoutes.unmocked.test.ts` (lines 411-503): 6 DELETE tests
- `watchlistOperations.unmocked.test.ts`: Likely similar deletion tests

**Tests Pattern:**
```
Lines 432-447:  "should remove movie" - basic deletion
Lines 449-461:  "should only remove from current user" - scope check
Lines 464-471:  "return 404 when movie not in watchlist" - not found
Lines 474-481:  "handle movieId as number" - type handling
Lines 483-491:  "invalid movieId format" - validation
Lines 495-503:  "not affect other items" - side effects
```

**Consolidation Opportunity: MEDIUM**

**Expected Reduction:** 6+ tests → 4 parameterized tests (33% reduction)

---

## Section 4: Feed Route Pattern Duplication

### Pattern A: Feed Activity Get Tests

**Files Affected:**
- `feed.unmocked.test.ts` (lines 19-107): 3 GET feed tests
- `feedRouteHandlers.unmocked.test.ts` (lines ~100+): Multiple GET tests

**Tests Pattern:**
```
Lines 56-73:    "should return feed activities from friends"
Lines 79-95:    "should return empty feed for user with no friends"
Lines 101-106:  "should reject unauthenticated feed request"
```

**Consolidation Opportunity: LOW**
(Already fairly consolidated, but could combine with authorization tests)

---

### Pattern B: Like/Unlike Tests

**Files Affected:**
- `feed.unmocked.test.ts` (lines 109-196): 3 like tests
- `feedRouteHandlers.unmocked.test.ts` (lines ~200+): Multiple like tests

**Overlapping Tests:**
- Like activity → expect 201
- Like non-existent activity → expect 404
- Duplicate like → expect 400
- Unlike activity → expect 200
- Unlike not previously liked → expect error

**Consolidation Opportunity: MEDIUM**

---

### Pattern C: Comment Tests

**Files Affected:**
- `feed.unmocked.test.ts` (lines 271-353): 5 comment tests
- `feedRouteHandlers.unmocked.test.ts` (lines ~300+): Multiple comment tests

**Overlapping Tests:**
- Post valid comment
- Get comments for activity
- Empty comment handling
- Length validation (500 char limit)
- Non-existent activity

**Consolidation Opportunity: MEDIUM**

---

## Section 5: Movie Comparison & Ranking Pattern Duplication

### Pattern A: Movie Comparison Tests - Duplicate Files

**Files Affected:**
- `movieComparisonController.unmocked.test.ts` (711 lines): Complete coverage
- `movieComparisonAdvanced.unmocked.test.ts` (260 lines): Advanced scenarios
- `rerankController.unmocked.test.ts` (549 lines): Rerank operations
- `rerankAdvanced.unmocked.test.ts` (187 lines): Advanced rerank

**Analysis:**
These files test the binary search algorithm for movie comparison from different angles:

1. **movieComparisonController.ts** (main file):
   - Lines 65-127: First movie addition (3 tests)
   - Lines 205-257: Duplicate movie handling (2 tests)
   - Lines 261-349: Begin comparison (5 tests)
   - Lines 352-411: Comparison preference handling (2 tests)
   - Lines 462-622: Finalize ranking (6 tests)
   - Lines 626-657: Continue comparison (1 test)

2. **movieComparisonAdvanced.ts**:
   - Binary search left path completion (1 test)
   - Binary search right path completion (1 test)
   - Multiple edge cases

3. **rerankController.ts**:
   - Invalid rankedId validation (4 tests)
   - Ranked movie not found (2 tests)
   - Remove and close gap (3 tests)
   - Empty list after removal (2 tests)
   - Start comparison session (4 tests)

4. **rerankAdvanced.ts**:
   - Rerank from middle to top (1 test)
   - Rerank from middle to bottom (1 test)

**Consolidation Opportunity: CRITICAL**

### Issue: Test Redundancy

The main controller file (`movieComparisonController.unmocked.test.ts`) already covers:
- ✓ Adding first movie (lines 65-127)
- ✓ Duplicate handling (lines 205-257)
- ✓ Beginning comparison (lines 261-349)
- ✓ Preference handling (lines 352-458)
- ✓ Finalization (lines 462-622)

The "Advanced" file adds:
- Binary search paths (already tested in main via multi-step comparisons)
- Edge cases that could be parameterized

**Suggested Approach:**

Consolidate into 3 files instead of 4:

1. **movieComparisonController.unmocked.test.ts** - Keep as primary, add parameterization
2. **movieRankingAdvanced.unmocked.test.ts** - Merge rerank + advanced comparison tests
3. Delete `movieComparisonAdvanced.unmocked.test.ts` (redundant with main file)
4. Delete `rerankAdvanced.unmocked.test.ts` (can be parameterized in main rerank tests)

**Expected Reduction:** 711 + 260 + 549 + 187 = 1,707 lines → ~1,000 lines (41% reduction)

---

### Pattern B: Error Handling in Movie Tests

**Files Affected:**
- `movieComparisonController.unmocked.test.ts` (lines 661-711): 2 error tests
- `rerankController.unmocked.test.ts` (lines 434-494): 2 error tests

**Test Pattern:**
```
addMovie error:     Close DB connection → expect 500
compareMovies error: Close DB connection → expect 500
rerankStart error:   Close DB connection → expect 500
rankUpdate error:    Close DB connection → expect 500
```

**Consolidation Opportunity: MEDIUM**

Create a shared error handling test utility:

```typescript
export async function testDatabaseError(
  app: Express.Application,
  mongoServer: MongoMemoryServer,
  method: string,
  endpoint: string,
  body: any,
  token: string
) {
  await mongoose.disconnect();
  const res = await request(app)[method](endpoint)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
  expect(res.status).toBe(500);
  await mongoose.connect(mongoServer.getUri());
}
```

**Expected Reduction:** 4+ duplicate error tests → 1 shared utility

---

## Section 6: Rerank Validation Pattern Duplication

### Pattern: Invalid RankedId Validation

**Files Affected:**
- `rerankController.unmocked.test.ts` (lines 46-84): 4 validation tests

**Tests:**
```
Line 46:  "should reject missing rankedId"
Line 56:  "should reject invalid rankedId format"
Line 66:  "should reject empty string rankedId"
Line 76:  "should reject null rankedId"
```

**Root Issue:** Testing the same validation at different input levels

**Consolidation Opportunity: MEDIUM**

```typescript
describe('Invalid rankedId Validation - Parameterized', () => {
  const invalidInputs = [
    { value: undefined, description: 'missing' },
    { value: 'not-a-valid-objectid', description: 'invalid format' },
    { value: '', description: 'empty string' },
    { value: null, description: 'null' },
  ];

  invalidInputs.forEach(input => {
    it(`should reject ${input.description} rankedId`, async () => {
      const res = await request(app)
        .post('/rerank/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ rankedId: input.value });
      expect(res.status).toBe(400);
    });
  });
});
```

**Expected Reduction:** 4 separate tests → 1 parameterized test (75% reduction)

---

## Section 7: Authentication Test Duplication

### Pattern: Sign In/Sign Up Field Validation

**Files Affected:**
- `auth.unmocked.test.ts` (lines 57-236): Multiple validation tests

**Tests:**
- SignIn without idToken (line 113)
- SignUp without idToken (line 199)
- Multiple "missing required field" tests

**Consolidation Pattern:**

```typescript
describe('Auth Field Validation - Parameterized', () => {
  const endpoints = [
    { method: 'post', endpoint: '/signin', missingField: 'idToken' },
    { method: 'post', endpoint: '/signup', missingField: 'idToken' },
  ];

  endpoints.forEach(ep => {
    it(`should reject ${ep.endpoint} without ${ep.missingField}`, async () => {
      const res = await request(app)
        .post(ep.endpoint)
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
    });
  });
});
```

**Expected Reduction:** 6+ validation tests → 2 parameterized test suites

---

## Section 8: Shared Database Setup Pattern

### Pattern: Repetitive beforeAll/beforeEach Setup

**All 18 files** repeat:

```typescript
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  
  app = express();
  app.use(express.json());
  app.use('/', routes);
  
  user1 = await User.create(mockUsers.validUser);
  user2 = await User.create({ ...mockUsers.validUser, email: 'user2@...' });
  token1 = generateTestJWT(user1._id.toString());
  token2 = generateTestJWT(user2._id.toString());
});

beforeEach(async () => {
  await Collection1.deleteMany({});
  await Collection2.deleteMany({});
  // ... repeat for each collection
});
```

**Consolidation Opportunity: HIGH**

Create a shared test setup utility:

```typescript
// tests/utils/testSetup.ts
export async function setupTestDatabase() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  return mongoServer;
}

export function createTestApp(routes: Router) {
  const app = express();
  app.use(express.json());
  app.use('/', routes);
  return app;
}

export async function createTestUsers() {
  const user1 = await User.create(mockUsers.validUser);
  const user2 = await User.create({
    ...mockUsers.validUser,
    email: 'user2@example.com',
    googleId: 'google-user2'
  });
  return {
    user1,
    user2,
    token1: generateTestJWT(user1._id.toString()),
    token2: generateTestJWT(user2._id.toString()),
  };
}

export async function cleanupTestDatabase(mongoServer: MongoMemoryServer) {
  await mongoose.disconnect();
  await mongoServer.stop();
}
```

**Usage:**
```typescript
describe('Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let { user1, user2, token1, token2 } = {};

  beforeAll(async () => {
    mongoServer = await setupTestDatabase();
    app = createTestApp(routes);
    Object.assign(testContext, await createTestUsers());
  });

  afterAll(() => cleanupTestDatabase(mongoServer));
});
```

**Expected Reduction:** ~1,500 lines of duplicate setup code across files

---

## Summary Table: Consolidation Opportunities

| Category | Files | Current Tests | After Consolidation | Reduction | Effort |
|----------|-------|---------------|-------------------|-----------|--------|
| Authorization Tests | 5 | 15+ | 5-6 | 60-70% | Low |
| Friend Routes | 2 | 29 | 15 | 50% | Medium |
| Watchlist Operations | 2 | 22+ | 16 | 25-30% | Low |
| Feed Routes | 2 | 15+ | 10 | 33% | Medium |
| Movie Comparison/Rerank | 4 | 1,707 lines | 1,000 | 41% | High |
| Error Handling | 2 | 4+ | 1 utility | 75% | Low |
| Validation Tests | Multiple | 20+ | 8 parameterized | 60% | Medium |
| Database Setup | 18 | 200+ instances | 1 utility | 90% | Low |
| **TOTAL** | **18** | **7,700+ lines** | **5,500+ lines** | **~30%** | **Medium** |

---

## Priority Recommendations

### Phase 1 (Low Risk, High Impact) - Immediate Implementation
1. ✓ Consolidate authorization tests into 1 parameterized suite
2. ✓ Extract shared database setup utility
3. ✓ Merge error handling tests into shared utility
4. **Expected Savings:** ~800 lines, 2-3 days work

### Phase 2 (Medium Risk, Medium-High Impact) - Near Term
1. ✓ Merge `friendOperations.unmocked.test.ts` into `friendRoutesAdvanced.unmocked.test.ts`
2. ✓ Parameterize watchlist operation tests
3. ✓ Consolidate rerank validation tests
4. **Expected Savings:** ~700 lines, 3-4 days work

### Phase 3 (Higher Risk, Highest Impact) - Strategic
1. ✓ Consolidate 4 movie comparison/rerank files into 2 with parameterized test cases
2. ✓ Review and deduplicate feed route handler tests
3. **Expected Savings:** ~1,000+ lines, 4-5 days work

---

## Testing Best Practices to Implement

1. **Parameterized Tests Pattern:**
   ```typescript
   const cases = [{ input, expectedOutput }, ...];
   cases.forEach(c => it(`test with ${c}`, () => { ... }));
   ```

2. **Shared Fixtures:**
   - Centralize user creation
   - Standardize token generation
   - Share mock data objects

3. **Test Utilities:**
   - Extract common assertions
   - Create helper functions for API calls
   - Centralize database operations

4. **Documentation:**
   - Keep clear comments about why tests exist
   - Document parameterized test case meanings
   - Link related tests

---

## Files Requiring Most Attention

1. **friendRoutesAdvanced.unmocked.test.ts** (574 lines)
   - Merge with friendOperations.unmocked.test.ts
   - Parameterize 10+ similar tests
   - **Target:** 400 lines

2. **userRoutes.unmocked.test.ts** (818 lines)
   - Likely has similar patterns
   - Needs review for parameterization opportunities

3. **movieComparisonController.unmocked.test.ts** (711 lines)
   - Can reduce by 30-40% with parameterization
   - Consolidate with Advanced files
   - **Target:** 450 lines

4. **rerankController.unmocked.test.ts** (549 lines)
   - Merge with rerankAdvanced.unmocked.test.ts
   - Parameterize validation tests
   - **Target:** 350 lines

5. **feedRouteHandlers.unmocked.test.ts** (628 lines)
   - Review for overlaps with feed.unmocked.test.ts
   - Consolidate like/unlike/comment tests

---

## Conclusion

The test suite is comprehensive but shows clear signs of organic growth with duplicate coverage. The primary opportunities are:

1. **Parameterization** - Convert 15-20 near-identical tests into 1-2 parameterized suites
2. **File consolidation** - Merge redundant test files (esp. friends, movies, feed)
3. **Shared utilities** - Extract repeated setup code into reusable helpers
4. **Strategic reduction** - Move from ~7,700 to ~5,500 lines (30% reduction) while maintaining or improving coverage

This should be done incrementally, starting with low-risk consolidations (authorization, setup) before tackling more complex merges (movie comparison tests).

