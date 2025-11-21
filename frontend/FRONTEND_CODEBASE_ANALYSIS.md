# MovieTier Frontend Codebase Analysis Report

## Executive Summary

The MovieTier frontend follows **Clean Architecture** principles with an MVVM pattern using Jetpack Compose. Overall structure is well-organized with clear layer separation (Data, Domain, UI), but there are several inconsistencies and organizational anti-patterns that would benefit from standardization.

**Key Statistics:**
- Total Kotlin files: 104
- ViewModels: 9
- Repositories: 7
- Use Cases: 15
- UI Components: ~80+
- Total lines analyzed: 5000+

---

## 1. AREAS THAT ARE WELL-ORGANIZED

### 1.1 Layer Separation (Clean Architecture)
✅ **Excellent**: Data, Domain, and UI layers are clearly separated
- **Data Layer** (`data/`): API services, repositories, local storage, models
- **Domain Layer** (`domain/`): Use cases organized by feature (auth, feed, friend, movie, ranking, user, watchlist)
- **UI Layer** (`ui/`): Screens, components, viewmodels, theme, navigation

### 1.2 Use Case Organization
✅ **Well-Done**: Use cases are well-organized by feature with single responsibility
```
domain/usecase/
├── auth/       (3 files: SignIn, SignOut, DeleteAccount)
├── feed/       (3 files: LoadFeed, LikeActivity, Comment)
├── friend/     (2 files: SendRequest, RespondRequest)
├── movie/      (3 files: Search, AddToRanking, GetDetails)
├── ranking/    (3 files: Get, Delete, StartRerank)
├── user/       (empty)
└── watchlist/  (1 file: AddToWatchlist)
```
- Each use case is focused and follows the `operator fun invoke()` pattern
- Use cases are lightweight (17-130 lines) with clear responsibilities
- Proper dependency injection via Hilt

### 1.3 Repository Pattern Implementation
✅ **Good**: Repositories abstract data sources appropriately
```
data/repository/
├── AuthRepository        - Auth state + sign-in/up
├── FeedRepository        - Feed activities, likes, comments
├── FriendRepository      - Friend requests and operations
├── MovieRepository       - Search, rankings, details, comparisons
├── RecommendationRepository - Recommendations API
├── UserRepository        - User profile operations
└── WatchlistRepository   - Watchlist CRUD
```
- Each repository is focused on one domain
- Proper error handling with `Result<T>` wrapper
- Caching implemented (movie details, watch providers, quotes)

### 1.4 Dependency Injection (Hilt)
✅ **Excellent**: NetworkModule properly configured
- Token injection via OkHttp Interceptor
- Auth token auto-added to all requests
- Logging interceptor configured
- Timeout configuration (30s)
- Singleton pattern correctly applied

### 1.5 Navigation Structure
✅ **Clean**: NavGraph.kt provides centralized navigation management
- All routes defined in `NavRoutes` object
- Proper handling of authentication-based navigation
- Route parameters typed safely
- LaunchedEffect used correctly for auth-based redirects

### 1.6 Naming Conventions (Mostly Consistent)
✅ **Good**: Generally follows Kotlin conventions
- ViewModel classes: `*ViewModel` suffix (AuthViewModel, FeedViewModel, etc.)
- Screen functions: `*Screen` suffix (AuthScreen, FeedScreen, etc.)
- Composable components: PascalCase
- Data models: PascalCase

### 1.7 UI Component Organization
✅ **Good**: Components are feature-scoped with shared global components
```
ui/components/                    - Global reusable components
ui/{feature}/components/          - Feature-specific components
ui/{feature}/                     - Screen implementations
ui/viewmodels/                    - All ViewModels centralized
```

---

## 2. AREAS THAT NEED IMPROVEMENT

### 2.1 INCONSISTENT VIEWMODEL STATE MANAGEMENT

**Issue**: ViewModels use inconsistent naming and state management patterns

**Examples of Inconsistency:**

| ViewModel | State Variable | Type |
|-----------|-----------------|------|
| AuthViewModel | `_uiState` | `MutableStateFlow<AuthUiState>` |
| FeedViewModel | `_uiState` | `MutableStateFlow<FeedUiState>` |
| WatchlistViewModel | `_ui` | `MutableStateFlow<WatchlistUiState>` ⚠️ |
| RankingViewModel | `_uiState` | `MutableStateFlow<RankingUiState>` |

**Problem**: `WatchlistViewModel` uses `_ui` instead of `_uiState`, breaking convention

**Code Evidence:**
```kotlin
// WatchlistViewModel.kt (line 46) - INCONSISTENT
private val _ui = MutableStateFlow(WatchlistUiState())
val ui: StateFlow<WatchlistUiState> = _ui.asStateFlow()

// All others follow this pattern
private val _uiState = MutableStateFlow(AuthUiState())
val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()
```

**Recommendation**: Standardize to `_uiState`/`uiState` across all ViewModels

---

### 2.2 EMPTY DIRECTORIES WITH UNCLEAR PURPOSE

**Issue**: Directories exist but are empty or underutilized:

```
ui/ranking/state/              - EMPTY (64 bytes)
ui/ranking/viewmodel/          - EMPTY (64 bytes)
domain/usecase/user/           - EMPTY (64 bytes)
ui/components/interfaces/      - UNCLEAR PURPOSE
```

**Problem**: 
- These directories suggest planned organization that was never completed
- Creates confusion about intended architecture
- `ui/ranking/viewmodel/` suggests ViewModels should be feature-scoped, but they're all in `ui/viewmodels/`
- `ui/ranking/state/` suggests state should be feature-scoped, but it's defined in ViewModel files

**Recommendation**: Either:
1. **Move** RankingViewModel to `ui/ranking/viewmodel/` and RankingUiState to `ui/ranking/state/`
2. **Delete** these empty directories and document the decision

---

### 2.3 STATE CLASSES DEFINED IN MULTIPLE LOCATIONS

**Issue**: UiState data classes inconsistently placed

**Current Pattern:**
```
AuthViewModel.kt (line 27)           - AuthUiState defined in file
RankingViewModel.kt (line 28)        - RankingUiState defined in file
FeedViewModel.kt (line 28)           - FeedUiState defined in file
WatchlistViewModel.kt (line 26)      - WatchlistUiState defined in file
```

**Problem**: 
- No dedicated state file per feature
- Makes it harder to understand state structure at a glance
- Compare: RankingViewModel is 262 lines with state, logic, and sealed classes all mixed

**Recommendation**: Extract state classes to dedicated files:
```
ui/ranking/RankingUiState.kt   (contains RankingUiState, CompareUiState, RankingEvent)
ui/feed/FeedUiState.kt         (contains FeedUiState, FeedCompareState, FeedFilter, FeedEvent)
ui/auth/AuthUiState.kt         (contains AuthUiState)
```

---

### 2.4 INCONSISTENT VIEWMODEL EVENT HANDLING

**Issue**: Event patterns vary between ViewModels

**Problem Examples:**

| ViewModel | Event Pattern |
|-----------|-----------------|
| RankingViewModel | `MutableSharedFlow<RankingEvent>` with sealed class |
| FeedViewModel | `MutableSharedFlow<FeedEvent>` with sealed class |
| WatchlistViewModel | Uses `FeedEvent` (wrong type!) + `MutableSharedFlow` |
| AuthViewModel | No events, just `uiState` ⚠️ |
| UserViewModel | No events ⚠️ |
| FriendViewModel | No events ⚠️ |

**Code Issue (WatchlistViewModel.kt line 49):**
```kotlin
// Uses FeedEvent instead of WatchlistEvent!
private val _events = MutableSharedFlow<FeedEvent>()
val events = _events
```

**Recommendation**: 
1. Standardize: All ViewModels should use `MutableSharedFlow` for one-time events
2. Create feature-specific event sealed classes:
   - `WatchlistEvent` (not `FeedEvent`)
   - `UserEvent`
   - `FriendEvent`

---

### 2.5 INCONSISTENT REPOSITORY ERROR HANDLING

**Issue**: Result wrapper inconsistency

**Problem**: Some repositories don't implement `Result` pattern consistently

```kotlin
// MovieRepository.kt - uses Result wrapper properly
suspend fun searchMovies(query: String): Result<List<Movie>>

// Some other repositories may use different patterns
// No consistent error handling interface defined
```

**Pattern Observation**: All repositories use the `Result<T>` sealed class, which is GOOD, but:
- No shared Result definition file location
- `Result.Success`, `Result.Error`, `Result.Loading` defined across multiple files
- Should be centralized

**Recommendation**: Create `data/repository/Result.kt` with:
```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error<T>(val exception: Exception?, val message: String? = null) : Result<T>()
    object Loading : Result<Nothing>()
}
```

---

### 2.6 SCREEN FILE ORGANIZATION INCONSISTENCY

**Issue**: Feature screens organized differently across the app

**Inconsistent Patterns:**

```
feed/
├── FeedScreen.kt              - ✅ Screen file at top level
├── FeedComponents.kt          - ⚠️ Components in separate file
├── FeedProviderUtils.kt       - ⚠️ Utilities in separate file
├── components/                - ✅ Components folder
│   ├── FeedActivityItem.kt
│   ├── FeedComparisonDialog.kt
│   └── ... (10 more files)

ranking/
├── RankingScreen.kt           - ✅ Screen file at top level
├── MovieActionSheet.kt        - ⚠️ Mixed with components
├── components/                - ✅ Components folder
│   └── ... (12 files)

profile/
├── ProfileScreen.kt           - ✅
├── EditProfileScreen.kt       - ✅
├── FriendProfileScreen.kt     - ✅
├── FriendProfileCards.kt      - ⚠️ Where should this go?
├── components/                - ✅
│   └── ... (19 files!)
```

**Problems:**
- Some utilities are in root (FeedProviderUtils.kt, MovieActionSheet.kt)
- Component organization is inconsistent
- Profile has 19 component files (too many - should be 5-8)
- **FeedScreen.kt is 178 lines** - too large for a single file

**Recommendation**: 
1. Move all components into `components/` directory
2. Break large screens into smaller composable files within `components/`
3. Consolidate profile components (19 files is excessive)

---

### 2.7 DUPLICATE INTERNAL DATA CLASSES

**Issue**: Parameter group classes duplicated across screens

**Found in 2+ files:**
```kotlin
// FeedScreen.kt (lines 35-64)
internal data class CommonContext(...)
internal data class MovieDialogState(...)
internal data class MovieDialogCallbacks(...)
internal data class DismissCallbacks(...)
internal data class MovieActionCallbacks(...)

// RecommendationScreen.kt - SAME CLASSES DUPLICATED
internal data class CommonContext(...)
internal data class MovieDialogState(...)
internal data class MovieDialogCallbacks(...)
internal data class RecommendationViewModels(...)
```

**Problem**: 
- DRY violation - same classes in multiple files
- If changes needed, must update in multiple places
- Makes refactoring harder
- Internal visibility means can't easily reuse

**Recommendation**: 
1. Create shared parameter group file:
   ```
   ui/feed/models/FeedParameterGroups.kt
   ```
2. If used across multiple screens, create:
   ```
   ui/common/ScreenParameterGroups.kt
   ```
3. Change from `internal` to package-private or public

---

### 2.8 VIEWMODEL SIZE INCONSISTENCY

**Issue**: ViewModels vary significantly in size/complexity

| ViewModel | Lines | Responsibility |
|-----------|-------|-----------------|
| AuthViewModel | 260 | Auth + Google Sign-In + Account deletion |
| RankingViewModel | 262 | Ranking + Rerank + Movie comparison |
| FeedViewModel | 337+ | Feed + Comments + Likes + Streaming |
| WatchlistViewModel | ~280 | Watchlist + Sorting + Caching |
| RecommendationViewModel | ~150 | Recommendations |
| UserViewModel | ~60 | User profile |
| ThemeViewModel | ~35 | Theme management |

**Problem**: 
- RankingViewModel and AuthViewModel are too large
- They handle multiple concerns
- Hard to test individual responsibilities

**Example - RankingViewModel**:
- Loading ranked movies
- Searching movies
- Adding movies
- Deleting movies
- Ranking (comparison)
- Re-ranking
- Movie details fetching

**Recommendation**: Split into smaller ViewModels or use Composition pattern

---

### 2.9 NO SHARED VIEWMODEL PATTERNS

**Issue**: ViewModels don't have a common base or interface

**Problem**: Each ViewModel implements state management differently:
```kotlin
// No interface to ensure consistency
class AuthViewModel : ViewModel() { ... }
class FeedViewModel : ViewModel() { ... }
// No shared patterns for:
// - Error handling
// - Loading states
// - Message management
```

**Recommendation**: Create base ViewModel:
```kotlin
abstract class BaseViewModel<T> : ViewModel() {
    protected val _uiState = MutableStateFlow<T>(...)
    val uiState: StateFlow<T> = _uiState.asStateFlow()
    
    protected val _events = MutableSharedFlow<UiEvent>()
    val events = _events
    
    // Shared error handling
    protected suspend fun <R> executeAsync(block: suspend () -> Result<R>): Result<R>
}
```

---

### 2.10 COMPONENT NAMING INCONSISTENCY

**Issue**: Components use different naming patterns

```kotlin
// Inconsistent naming:
FeedActivityCard.kt          - ✅ Clear
FeedActivityItem.kt          - ⚠️ Why Item vs Card?
MovieCard.kt                 - ✅ Clear
RecommendationCard.kt        - ✅ Clear
FeaturedMovieCard.kt         - ✅ Clear

// Unclear names:
States.kt                    - ⚠️ Vague - what states?
CommentBottomSheet.kt        - ✅ Clear
MovieDetailSheet.kt          - ✅ Clear
YouTubePlayer.kt             - ✅ Clear
```

**Recommendation**: 
1. Rename `States.kt` to `UiStateComponents.kt` or `CommonStateComposables.kt`
2. Consolidate similar components (FeedActivityCard vs FeedActivityItem)

---

## 3. DATA LAYER INCONSISTENCIES

### 3.1 Model Organization

**Issue**: No clear distinction between:
- API DTOs (from backend)
- Domain models (business logic)
- UI models (presentation)

**Current Structure:**
```
data/model/              - All models mixed
├── Movie.kt           - Can be API DTO or Domain model?
├── RankedMovie.kt     - Same ambiguity
├── User.kt            - Mix of purposes
├── Feed.kt            - Multiple model types
├── Watchlist.kt       - API response?
└── WatchProviders.kt  - TMDB API specific

domain/model/           - EMPTY! Should have domain entities
```

**Problem**: No clear transformation between layers
- API responses used directly in ViewModels
- No data transformation layer
- Violates Clean Architecture principle

**Recommendation**: Populate `domain/model/` with domain entities:
```
domain/model/
├── Movie.kt           - Domain entity (core business model)
├── User.kt            - Domain entity
├── RankedMovie.kt     - Domain entity
├── FeedActivity.kt    - Domain entity
└── ...
```

---

### 3.2 LOCAL STORAGE ORGANIZATION

**Issue**: Local storage scattered and unclear

```
data/local/
├── TokenManager.kt     - ✅ Clear - token storage
├── SettingsManager.kt  - ✅ Clear - user settings
├── MovieQuoteProvider.kt  - ⚠️ Should be in services?
├── MovieQuotesData.kt  - ⚠️ Static data should be utils?
├── ProvidersCache.kt   - ⚠️ Should be in services?
```

**Problem**: 
- Quote functionality mixes data access with utility
- No clear cache management strategy
- ProvidersCache is tightly coupled to MovieRepository

**Recommendation**: 
1. Move cache logic to services layer
2. Create `data/cache/` for caching implementations
3. Move quotes to `data/local/cache/` or `utils/quotes/`

---

## 4. UI LAYER INCONSISTENCIES

### 4.1 Large Screen Files

**Issue**: Some screen files are too large and handle too many concerns

**File Sizes:**
```
FeedScreen.kt          - ~178 lines (too large)
RecommendationScreen.kt - ~150+ lines
RankingScreen.kt       - ~170+ lines
ProfileScreen.kt       - ~150+ lines
```

**Problem in FeedScreen.kt**:
- Inline parameter group data classes (lines 35-64)
- Main layout logic
- Multiple callback definitions
- Direct state management
- Should be ~100 lines max

**Recommendation**: Extract components:
```
ui/feed/
├── FeedScreen.kt                    - 60 lines (structure only)
├── components/
│   ├── FeedContentArea.kt           - Extracted logic
│   ├── FeedStateHandlers.kt         - State transitions
│   └── FeedCallbacks.kt             - Callback definitions
```

---

### 4.2 INCONSISTENT VIEWMODEL INJECTION

**Issue**: ViewModels accessed inconsistently across screens

```kotlin
// Pattern 1: Local hilt injection
@Composable
fun AuthScreen(
    authViewModel: AuthViewModel = hiltViewModel()
) { ... }

// Pattern 2: Passed from parent
@Composable
fun FeedScreen(
    navController: NavController,
    feedViewModel: FeedViewModel = hiltViewModel()  // Still local!
) { ... }

// Pattern 3: Sometimes ViewModels are shared
fun FeedScreen(...) {
    val vm1 = hiltViewModel<FeedViewModel>()
    val vm2: FeedViewModel = hiltViewModel()  // Different syntax
}
```

**Inconsistency**: While all use `hiltViewModel()`, the patterns vary slightly
- No consistent approach to multi-ViewModel screens
- Some screens have multiple ViewModels but unclear communication

**Recommendation**: Establish pattern document and audit all screens

---

### 4.3 NO PREVIEW FUNCTIONS

**Issue**: Jetpack Compose files should have `@Preview` functions for development, but inconsistently applied

```kotlin
// FeedScreen.kt - NO PREVIEW
@Composable
fun FeedScreen(...) { }  // Can't preview in IDE

// Some components may have previews, others don't
// Makes development slower - can't see changes without running app
```

**Recommendation**: Add previews to all screens and reusable components:
```kotlin
@Preview
@Composable
fun FeedScreenPreview() {
    MovieTierTheme {
        FeedScreen(navController = rememberNavController())
    }
}
```

---

## 5. NAVIGATION & ROUTING

### 5.1 Missing Route Organization

**Issue**: All routes defined in single object, growing unmaintainable

**Current (NavGraph.kt, lines 21-31):**
```kotlin
object NavRoutes {
    const val AUTH = "auth"
    const val FEED = "feed"
    const val FRIENDS = "friends"
    const val RANKING = "ranking"
    const val RECOMMENDATION = "recommendation"
    const val PROFILE = "profile"
    const val EDIT_PROFILE = "edit_profile"
    const val PROFILE_USER = "profile/{userId}"
    const val WATCHLIST = "watchlist"
}
```

**Problem**: Single object will grow with app
- No organization by feature
- Hard to maintain argument passing
- No type safety for route parameters

**Recommendation**: Create feature-based route objects:
```kotlin
object AuthRoutes {
    const val AUTH = "auth"
}

object ProfileRoutes {
    const val PROFILE = "profile"
    const val EDIT_PROFILE = "edit_profile"
    const val PROFILE_USER = "profile/{userId}"
    
    fun profileUser(userId: String) = "profile/$userId"
}
```

---

## 6. TESTING & CODE QUALITY

### 6.1 No Observable Test Structure

**Issue**: No clear test files visible in analysis scope

**Problem**: 
- Test organization unclear
- No test file locations referenced
- Difficult to verify test coverage

**Recommendation**: 
- Follow standard Android testing structure
- Have test files parallel source structure
- Use consistent naming: `*Test.kt` for unit tests, `*IntegrationTest.kt` for integration

---

## 7. THEME & STYLING

### 7.1 Theme Organization

**Status**: ✅ **Good**
```
ui/theme/
├── Theme.kt     - Main Material Design 3 theme
├── Dimens.kt    - Spacing constants
├── Type.kt      - Typography
├── Shapes.kt    - Shape definitions
```

No improvements needed here.

---

## SUMMARY TABLE: Critical Issues

| # | Issue | Severity | Impact | Effort |
|---|-------|----------|--------|--------|
| 2.1 | Inconsistent ViewModel state naming | HIGH | Developer confusion | Low |
| 2.2 | Empty directories | MEDIUM | Confusing structure | Low |
| 2.3 | State classes scattered | MEDIUM | Hard to understand | Medium |
| 2.4 | Event handling inconsistency | HIGH | Hard to test | Medium |
| 2.5 | Repository error handling | MEDIUM | Maintainability | Medium |
| 2.6 | Screen organization | MEDIUM | Navigation complexity | High |
| 2.7 | Duplicate internal classes | MEDIUM | DRY violation | Low |
| 2.8 | Large ViewModels | HIGH | Hard to test/maintain | High |
| 2.9 | No ViewModel base class | MEDIUM | No standards | Medium |
| 2.10 | Component naming | LOW | Clarity | Low |
| 3.1 | Domain layer empty | CRITICAL | Architecture violation | High |
| 3.2 | Local storage scattered | MEDIUM | Maintainability | Medium |
| 4.1 | Large screen files | HIGH | Maintainability | High |
| 4.2 | ViewModel injection inconsistency | MEDIUM | Code clarity | Low |
| 4.3 | No preview functions | LOW | Dev experience | Low |
| 5.1 | Single route object | MEDIUM | Scalability | Medium |

---

## OPTIMIZATION PRIORITIES

### Phase 1 (Critical - Do First)
1. Standardize ViewModel state naming (`_ui` → `_uiState`)
2. Populate `domain/model/` with proper domain entities
3. Create base ViewModel class for consistency
4. Fix WatchlistViewModel event type issue

### Phase 2 (High - Do Soon)
1. Break down large ViewModels
2. Extract state classes to dedicated files
3. Consolidate duplicate parameter group classes
4. Organize routes by feature

### Phase 3 (Medium - Do Later)
1. Delete empty directories or populate them
2. Standardize component naming
3. Consolidate profile components
4. Add preview functions to screens

---

## CONCRETE EXAMPLES

### Example 1: Fix WatchlistViewModel Event Issue
**File**: `ui/viewmodels/WatchlistViewModel.kt` (line 49)

**Current:**
```kotlin
private val _events = MutableSharedFlow<FeedEvent>()  // WRONG TYPE!
```

**Should Be:**
```kotlin
sealed class WatchlistEvent {
    data class Message(val text: String) : WatchlistEvent()
    data class Error(val text: String) : WatchlistEvent()
}

private val _events = MutableSharedFlow<WatchlistEvent>()
```

### Example 2: Standardize ViewModel State Naming
**File**: `ui/viewmodels/WatchlistViewModel.kt` (line 46)

**Current:**
```kotlin
private val _ui = MutableStateFlow(WatchlistUiState())
val ui: StateFlow<WatchlistUiState> = _ui.asStateFlow()
```

**Should Be:**
```kotlin
private val _uiState = MutableStateFlow(WatchlistUiState())
val uiState: StateFlow<WatchlistUiState> = _uiState.asStateFlow()
```

### Example 3: Extract State Classes
**Current**: RankingViewModel.kt lines 27-44

**Should Create**: `ui/ranking/RankingState.kt`
```kotlin
package com.cpen321.movietier.ui.ranking

data class RankingUiState(
    val isLoading: Boolean = false,
    val rankedMovies: List<RankedMovie> = emptyList(),
    val compareState: CompareUiState? = null,
    val searchResults: List<Movie> = emptyList(),
    val errorMessage: String? = null
)

data class CompareUiState(
    val newMovie: Movie,
    val compareWith: Movie
)

sealed class RankingEvent {
    data class Message(val text: String) : RankingEvent()
    data class Error(val text: String) : RankingEvent()
}
```

Then in RankingViewModel:
```kotlin
import com.cpen321.movietier.ui.ranking.RankingUiState
import com.cpen321.movietier.ui.ranking.RankingEvent

class RankingViewModel(...) : ViewModel() {
    private val _uiState = MutableStateFlow(RankingUiState())
    val uiState: StateFlow<RankingUiState> = _uiState.asStateFlow()
    // ... rest of code
}
```

