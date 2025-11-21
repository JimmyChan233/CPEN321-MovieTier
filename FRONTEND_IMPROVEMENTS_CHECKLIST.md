# Frontend Codebase Improvements Checklist

## Overview
This checklist organizes all identified improvements into actionable items with estimated effort and priorities.

**Total Estimated Effort**: 40-60 hours  
**Target Timeline**: 2-3 sprints (4-6 weeks)  
**Current Score**: 7.5/10  
**Target Score**: 8.5+/10  

---

## PHASE 1 - CRITICAL (Week 1, ~10 hours)
### Must complete these to fix architectural violations

### Priority 1.1: Populate Domain Layer
**Issue**: `domain/model/` directory is empty - violates Clean Architecture  
**Files to create**:
- [ ] `domain/model/Movie.kt` - Domain entity (not API DTO)
- [ ] `domain/model/User.kt` - Domain entity
- [ ] `domain/model/RankedMovie.kt` - Domain entity
- [ ] `domain/model/FeedActivity.kt` - Domain entity
- [ ] `domain/model/Friend.kt` - Domain entity
- [ ] `domain/model/Watchlist.kt` - Domain entity
- [ ] `domain/repository/MovieRepository.kt` - Abstract interface
- [ ] `domain/repository/UserRepository.kt` - Abstract interface
- [ ] (etc. for other domains)

**Effort**: 5-6 hours  
**Impact**: CRITICAL - enables proper architecture  
**Notes**: 
- Extract from data/model/ classes
- Create mapping layer from API DTOs to domain entities
- Update repositories to use domain entities

### Priority 1.2: Fix WatchlistViewModel Event Type
**Issue**: `WatchlistViewModel` uses `FeedEvent` instead of `WatchlistEvent`  
**File**: `ui/viewmodels/WatchlistViewModel.kt` (line 49)  
**Action**:
- [ ] Create sealed class `WatchlistEvent` in WatchlistViewModel.kt
- [ ] Change `_events: MutableSharedFlow<FeedEvent>()` to `_events: MutableSharedFlow<WatchlistEvent>()`
- [ ] Update event emissions to use correct type

**Effort**: 0.5 hours  
**Impact**: HIGH - type safety  
**Before**:
```kotlin
private val _events = MutableSharedFlow<FeedEvent>()
```
**After**:
```kotlin
sealed class WatchlistEvent {
    data class Message(val text: String) : WatchlistEvent()
    data class Error(val text: String) : WatchlistEvent()
}

private val _events = MutableSharedFlow<WatchlistEvent>()
```

### Priority 1.3: Standardize ViewModel State Naming
**Issue**: `WatchlistViewModel` uses `_ui` instead of `_uiState`  
**File**: `ui/viewmodels/WatchlistViewModel.kt` (line 46)  
**Action**:
- [ ] Rename `_ui` to `_uiState` in WatchlistViewModel
- [ ] Rename `ui` to `uiState` (public property)
- [ ] Update all usages in WatchlistScreen
- [ ] Audit all other ViewModels for consistency

**Effort**: 1 hour  
**Impact**: MEDIUM - consistency  
**Before**:
```kotlin
private val _ui = MutableStateFlow(WatchlistUiState())
val ui: StateFlow<WatchlistUiState> = _ui.asStateFlow()
```
**After**:
```kotlin
private val _uiState = MutableStateFlow(WatchlistUiState())
val uiState: StateFlow<WatchlistUiState> = _uiState.asStateFlow()
```

### Priority 1.4: Create Base ViewModel Class
**Issue**: No shared ViewModel patterns - each ViewModel implements differently  
**File**: Create `ui/base/BaseViewModel.kt`  
**Action**:
- [ ] Create abstract `BaseViewModel<T>` class
- [ ] Move common state management logic
- [ ] Define standard event handling
- [ ] Update all ViewModels to extend BaseViewModel
- [ ] Create `UiEvent` sealed class for common events

**Effort**: 3-4 hours  
**Impact**: MEDIUM - standards and maintainability  
**Template**:
```kotlin
abstract class BaseViewModel<T> : ViewModel() {
    protected val _uiState = MutableStateFlow<T>(...)
    val uiState: StateFlow<T> = _uiState.asStateFlow()
    
    protected val _events = MutableSharedFlow<UiEvent>()
    val events = _events
    
    protected suspend fun <R> executeAsync(
        block: suspend () -> Result<R>
    ): Result<R> = try {
        block()
    } catch (e: Exception) {
        Result.Error(e, e.message)
    }
}
```

### Completion Criteria for Phase 1:
- [ ] All 4 tasks above completed
- [ ] No compilation errors
- [ ] Tests updated if applicable
- [ ] Code review approved

---

## PHASE 2 - HIGH PRIORITY (Weeks 2-3, ~20 hours)
### Improve consistency and break down large components

### Priority 2.1: Extract State Classes
**Issue**: UiState classes defined inline in ViewModels (scattered organization)  
**Files to create**:
- [ ] `ui/auth/AuthUiState.kt` - Extract from AuthViewModel
- [ ] `ui/feed/FeedUiState.kt` - Extract from FeedViewModel  
- [ ] `ui/ranking/RankingUiState.kt` - Extract from RankingViewModel
- [ ] `ui/watchlist/WatchlistUiState.kt` - Already mostly in file, just move
- [ ] `ui/recommendation/RecommendationUiState.kt` - Extract from RecommendationViewModel
- [ ] `ui/friends/FriendUiState.kt` - If exists
- [ ] `ui/profile/ProfileUiState.kt` - If exists

**Files to update**: Each corresponding ViewModel  
**Effort**: 4-5 hours  
**Impact**: MEDIUM - code organization and clarity  

### Priority 2.2: Break Down Large ViewModels
**Issue**: AuthViewModel (260 lines), RankingViewModel (262 lines), FeedViewModel (337+ lines)  
**ViewModels to refactor**:

#### 2.2a: AuthViewModel (260 lines)
- [ ] Current responsibilities: Auth + GoogleSignIn + AccountDeletion
- [ ] Keep in AuthViewModel: Sign-in, Sign-out, Account deletion
- [ ] Consider: No split needed if logic is cohesive (one domain)
- [ ] Action: Just clean up and reduce to <200 lines

**Effort**: 2-3 hours

#### 2.2b: RankingViewModel (262 lines)
- [ ] Current responsibilities: 
  - Load ranked movies
  - Search movies
  - Add movies
  - Delete movies
  - Compare movies (ranking)
  - Re-rank movies
  - Get movie details
- [ ] Split into:
  - `RankingListViewModel` - Load, delete, display ranked movies
  - `RankingComparisonViewModel` - Compare and re-rank logic
- [ ] Or keep together but reduce to <200 lines

**Effort**: 4-5 hours

#### 2.2c: FeedViewModel (337+ lines)
- [ ] Current responsibilities:
  - Load feed (friends/mine)
  - Filter feed
  - Like activity
  - Comment
  - Stream updates
- [ ] Keep together (one domain) but reduce to <250 lines

**Effort**: 3-4 hours

**Total for 2.2**: 9-12 hours  
**Impact**: HIGH - testability and maintainability  

### Priority 2.3: Consolidate Duplicate Parameter Groups
**Issue**: Parameter group classes duplicated in multiple screens  
**File to create**: `ui/common/ScreenParameterGroups.kt`  
**Duplicates found in**:
- [ ] `FeedScreen.kt` - `CommonContext`, `MovieDialogState`, etc.
- [ ] `RecommendationScreen.kt` - `CommonContext`, `MovieDialogState`, etc.

**Action**:
- [ ] Create shared file with common classes
- [ ] Change visibility from `internal` to allow reuse
- [ ] Update imports in FeedScreen and RecommendationScreen
- [ ] Delete duplicate definitions

**Effort**: 1 hour  
**Impact**: MEDIUM - DRY principle  

### Priority 2.4: Delete/Populate Empty Directories
**Issue**: Empty directories suggest incomplete planning  
**Directories**:
- [ ] `ui/ranking/state/` - DELETE or MOVE RankingUiState here
- [ ] `ui/ranking/viewmodel/` - DELETE or MOVE RankingViewModel here
- [ ] `domain/usecase/user/` - DELETE (no user-specific use cases needed yet)

**Decision Process**:
1. If keeping feature-scoped organization:
   - Move RankingViewModel to `ui/ranking/viewmodel/`
   - Move RankingUiState to `ui/ranking/state/`
   - Create user use cases in `domain/usecase/user/` if needed

2. If keeping current organization:
   - Delete empty directories
   - Document decision in README

**Effort**: 0.5-1 hour  
**Impact**: MEDIUM - clarity  

### Priority 2.5: Fix Event Handling Inconsistency
**Issue**: Some ViewModels have events, others don't  
**ViewModels missing events**:
- [ ] `AuthViewModel` - Add `AuthEvent` sealed class
- [ ] `UserViewModel` - Add `UserEvent` sealed class  
- [ ] `FriendViewModel` - Add `FriendEvent` sealed class
- [ ] Others: Check and add as needed

**Action**:
- [ ] For each ViewModel, decide: Add events or remove from others?
- [ ] Recommended: Add to all for consistency
- [ ] Create feature-specific `Event` sealed classes
- [ ] Update UI to listen for events

**Effort**: 3-4 hours  
**Impact**: MEDIUM - consistency  

### Completion Criteria for Phase 2:
- [ ] All 5 tasks above completed
- [ ] All ViewModels <300 lines (preferably <250)
- [ ] No duplicate code
- [ ] All tests pass
- [ ] Code review approved

---

## PHASE 3 - MEDIUM PRIORITY (Weeks 3-4, ~10 hours)
### Improve organization and user experience

### Priority 3.1: Reorganize Screen Files
**Issue**: Utilities and components scattered at root instead of in `components/`  
**Files to move**:
- [ ] `ui/feed/FeedComponents.kt` → `ui/feed/components/FeedComponents.kt`
- [ ] `ui/feed/FeedProviderUtils.kt` → `ui/feed/utils/FeedProviderUtils.kt` or `ui/feed/components/`
- [ ] `ui/ranking/MovieActionSheet.kt` → `ui/ranking/components/MovieActionSheet.kt`
- [ ] `ui/profile/FriendProfileCards.kt` → `ui/profile/components/FriendProfileCards.kt`

**Effort**: 1-2 hours  
**Impact**: LOW - consistency  

### Priority 3.2: Break Down Large Screen Files
**Issue**: Screen files are too large (150-178 lines)  
**Files to refactor**:

#### 3.2a: FeedScreen.kt (178 lines)
- [ ] Extract parameter groups to `ui/feed/models/FeedParameterGroups.kt`
- [ ] Extract callback definitions to `ui/feed/components/FeedCallbacks.kt`
- [ ] Reduce main file to ~100 lines (just layout structure)

**Effort**: 2 hours

#### 3.2b: RankingScreen.kt (170+ lines)
- [ ] Similar extraction strategy
- [ ] Extract to sub-components

**Effort**: 2 hours

#### 3.2c: RecommendationScreen.kt (150+ lines)
- [ ] Extract components
- [ ] Reduce complexity

**Effort**: 1-2 hours

**Total for 3.2**: 5-6 hours  
**Impact**: MEDIUM - maintainability  

### Priority 3.3: Consolidate Profile Components
**Issue**: `ui/profile/components/` has 19 files (excessive)  
**Current structure analysis**:
- [ ] `ProfileHeader.kt` + `ProfileEditButton.kt` - Can be 1 file?
- [ ] `WatchlistPreview*.kt` (4 files) - Consolidate to 1-2 files
- [ ] `FriendProfile*.kt` (5 files) - Consolidate to 2-3 files
- [ ] `Ranked*.kt` (4 files) - Consolidate to 1-2 files
- [ ] Others: Review and consolidate

**Target**: 19 files → 7-8 files  
**Effort**: 3-4 hours  
**Impact**: MEDIUM - navigation and clarity  

### Priority 3.4: Organize Routes by Feature
**Issue**: All routes in single `NavRoutes` object (not scalable)  
**File**: `ui/navigation/NavGraph.kt` (lines 21-31)  
**Action**:
- [ ] Create `ui/navigation/AuthRoutes.kt`
- [ ] Create `ui/navigation/ProfileRoutes.kt`
- [ ] Create `ui/navigation/FriendRoutes.kt`
- [ ] Create `ui/navigation/RankingRoutes.kt`
- [ ] Create `ui/navigation/FeedRoutes.kt`
- [ ] Create `ui/navigation/CommonRoutes.kt` (shared routes)
- [ ] Update NavGraph to use route objects
- [ ] Add helper functions for route parameters

**Effort**: 2-3 hours  
**Impact**: LOW - scalability  
**Template**:
```kotlin
// ui/navigation/ProfileRoutes.kt
object ProfileRoutes {
    const val PROFILE = "profile"
    const val EDIT_PROFILE = "edit_profile"
    const val PROFILE_USER = "profile/{userId}"
    
    fun profileUser(userId: String) = "profile/$userId"
}
```

### Priority 3.5: Add @Preview Functions
**Issue**: Jetpack Compose files lack @Preview annotations  
**Action**:
- [ ] Add `@Preview` to all main screens
- [ ] Add `@Preview` to all reusable components
- [ ] Create dark mode previews
- [ ] Create landscape previews for large screens

**Effort**: 2-3 hours  
**Impact**: LOW - dev experience  

### Priority 3.6: Clean Up Component Naming
**Issue**: Inconsistent or vague component names  
**Changes**:
- [ ] Rename `States.kt` → `UiStateComponents.kt` or `CommonStateComposables.kt`
- [ ] Review `FeedActivityCard.kt` vs `FeedActivityItem.kt` - consolidate if same
- [ ] Ensure all component names are descriptive

**Effort**: 0.5 hours  
**Impact**: LOW - clarity  

### Completion Criteria for Phase 3:
- [ ] All 6 tasks above completed
- [ ] All files well-organized
- [ ] All code reviewed
- [ ] No functionality changes, only organization

---

## PARALLEL IMPROVEMENTS (Can do anytime)

### Extra 1: Create Centralized Result Definition
**Issue**: `Result<T>` used but not centrally defined  
**File to create**: `data/repository/Result.kt`  
**Action**:
- [ ] Define sealed class `Result<T>`
- [ ] Remove duplicate definitions from other files
- [ ] Update all repositories to use

**Effort**: 1 hour  
**Impact**: MEDIUM - code organization  

### Extra 2: Reorganize Local Storage
**Issue**: Local storage scattered with mixed concerns  
**File to create**: `data/cache/`  
**Action**:
- [ ] Create `data/cache/ProvidersCache.kt`
- [ ] Move `ProvidersCache` from `data/local/`
- [ ] Create cache management interface
- [ ] Update MovieRepository to use cache layer

**Effort**: 1-2 hours  
**Impact**: MEDIUM - organization  

### Extra 3: Document Architecture Decisions
**File to create**: `ARCHITECTURE.md`  
**Content**:
- [ ] Clean Architecture layers explanation
- [ ] Feature-based vs layer-based organization
- [ ] ViewModel state management pattern
- [ ] Use case pattern examples
- [ ] Repository pattern examples

**Effort**: 2 hours  
**Impact**: MEDIUM - team knowledge  

---

## FINAL VERIFICATION CHECKLIST

After all phases complete:

### Code Quality
- [ ] All files follow Kotlin conventions
- [ ] No duplicated code
- [ ] All ViewModels <300 lines
- [ ] All screens <150 lines
- [ ] Consistent naming across codebase

### Architecture
- [ ] Domain layer populated with entities
- [ ] All layers properly separated
- [ ] No direct use of API DTOs in UI
- [ ] Repository pattern consistently applied
- [ ] Use cases have single responsibility

### Testing
- [ ] All tests pass
- [ ] Code coverage maintained or improved
- [ ] No compilation warnings

### Documentation
- [ ] Architecture decisions documented
- [ ] Complex patterns explained
- [ ] New team members can understand structure

### Review
- [ ] All changes code-reviewed
- [ ] Team agrees with improvements
- [ ] No breaking changes to API

---

## Tracking Progress

### Week 1 (Phase 1)
- [ ] Started domain layer population
- [ ] Fixed WatchlistViewModel event type
- [ ] Standardized ViewModel naming
- [ ] Created BaseViewModel class
**Target Completion**: Friday EOD

### Week 2 (Phase 2a)
- [ ] Extracted state classes
- [ ] Refactored large ViewModels (part 1)
**Target Completion**: Thursday

### Week 3 (Phase 2b & 3a)
- [ ] Completed ViewModel refactoring (part 2)
- [ ] Consolidated duplicate classes
- [ ] Deleted/populated empty directories
- [ ] Reorganized screen files
**Target Completion**: Friday

### Week 4 (Phase 3b-3f)
- [ ] Consolidated profile components
- [ ] Organized routes by feature
- [ ] Added @Preview functions
- [ ] Cleaned up naming
**Target Completion**: Wednesday

### Week 5 (Parallel + Verification)
- [ ] Extra improvements (Result, cache, docs)
- [ ] Final verification checklist
- [ ] Code reviews
**Target Completion**: Friday

---

## Success Metrics

| Metric | Current | Target | Weight |
|--------|---------|--------|--------|
| Architecture Score | 7.5/10 | 8.5+/10 | 30% |
| Large ViewModels | 3 | 0 | 20% |
| Code Duplication | High | Low | 15% |
| Organization Issues | 16 | <3 | 20% |
| Test Coverage | N/A | >80% | 15% |

**Success = All targets met**

---

## Notes

- Prioritize Phase 1 items (critical for architecture)
- Phase 2 can be done in parallel where possible
- Phase 3 is optional but recommended for maintainability
- Document decisions for team knowledge
- Get code review on each phase before moving to next
