# Architecture Patterns - Visual Comparison

## Architecture Pattern Decision Tree

```
START: Choosing architecture for Android app
│
├─ Team size < 5 developers?
│  ├─ YES → Small-scale project
│  │  └─ Features < 10?
│  │     ├─ YES → Use FEATURE-BASED (MovieTier case ✓)
│  │     └─ NO → Use FEATURE-BASED + Gradle modules later
│  └─ NO → Large team
│     └─ Use MVI + Gradle modules
│
├─ Need fine-grained cognitive load per developer?
│  ├─ YES → Use VERTICAL SLICING (40+ developers, 50+ use cases)
│  └─ NO → Use FEATURE-BASED
│
└─ Need maximum testability and consistency?
   ├─ YES → Use MVI (accept 3x boilerplate)
   └─ NO → Use FEATURE-BASED + MVVM
```

---

## Side-by-Side Architecture Structures

### Architecture 1: Layered (Current MovieTier)

```
com.cpen321.movietier/
│
├── data/                          (Data Layer)
│   ├── api/
│   │   └── ApiService.kt
│   ├── repository/
│   │   ├── AuthRepository.kt
│   │   ├── MovieRepository.kt
│   │   ├── FriendRepository.kt
│   │   ├── FeedRepository.kt
│   │   ├── WatchlistRepository.kt
│   │   ├── RecommendationRepository.kt
│   │   └── UserRepository.kt
│   ├── model/
│   │   ├── Movie.kt
│   │   ├── RankedMovie.kt
│   │   └── ... (10 more DTOs)
│   └── local/
│       ├── TokenManager.kt
│       └── SettingsManager.kt
│
├── domain/                        (Domain Layer)
│   ├── model/
│   │   └── ... (domain entities)
│   ├── repository/
│   │   └── ... (repo interfaces)
│   └── usecase/
│       ├── auth/
│       │   ├── SignInUseCase.kt
│       │   ├── SignUpUseCase.kt
│       │   └── SignOutUseCase.kt
│       ├── ranking/
│       │   ├── GetRankedMoviesUseCase.kt
│       │   ├── AddMovieToRankingUseCase.kt
│       │   ├── DeleteRankedMovieUseCase.kt
│       │   ├── StartRerankUseCase.kt
│       │   └── SearchMoviesUseCase.kt
│       ├── feed/ (5 use cases)
│       ├── friend/ (5 use cases)
│       ├── movie/ (3 use cases)
│       ├── user/ (3 use cases)
│       └── watchlist/ (3 use cases)
│
├── ui/                            (UI Layer)
│   ├── auth/
│   │   ├── AuthScreen.kt
│   │   └── components/
│   ├── ranking/
│   │   ├── RankingScreen.kt
│   │   └── components/
│   ├── feed/
│   │   ├── FeedScreen.kt
│   │   └── components/
│   ├── friends/
│   │   ├── FriendsScreen.kt
│   │   └── components/
│   ├── watchlist/
│   │   ├── WatchlistScreen.kt
│   │   └── components/
│   ├── recommendation/
│   │   ├── RecommendationScreen.kt
│   │   └── components/
│   ├── profile/
│   │   ├── ProfileScreen.kt
│   │   └── components/
│   ├── viewmodels/
│   │   ├── AuthViewModel.kt
│   │   ├── RankingViewModel.kt
│   │   ├── FeedViewModel.kt
│   │   ├── FriendViewModel.kt
│   │   ├── RecommendationViewModel.kt
│   │   ├── UserViewModel.kt
│   │   ├── FriendProfileViewModel.kt
│   │   ├── WatchlistViewModel.kt
│   │   └── ThemeViewModel.kt (All 9 ViewModels!)
│   ├── components/
│   │   ├── MovieCard.kt
│   │   ├── Avatar.kt
│   │   ├── MovieDetailSheet.kt
│   │   ├── LoadingState.kt
│   │   ├── EmptyState.kt
│   │   └── ... (12 total)
│   ├── navigation/
│   │   └── NavGraph.kt (monolithic, 93 lines)
│   └── theme/
│       ├── Color.kt
│       ├── Typography.kt
│       └── Theme.kt
│
├── di/
│   └── NetworkModule.kt
│
├── fcm/
│   └── MovieTierFirebaseMessagingService.kt
│
└── utils/
    └── TimeFormat.kt

Data Flow: UI -> ViewModel -> UseCase -> Repository -> API
Navigation: All routes in 1 file (NavGraph.kt)
Components: Shared in ui/components/ (12 files)
Testing: Need to mock 5+ layers for one feature test
```

**Strengths:**
- Clear horizontal separation (data/domain/ui)
- Well-documented pattern
- Easy to explain to new developers

**Pain Points:**
- 9 ViewModels in same folder
- 15 use cases scattered across 6 subdirectories
- To find "all ranking code" → grep search (not folder navigation)
- Navigation monolith (bottleneck for edits)
- Unclear when components are "shared" vs "feature-specific"
- ViewModel aggregation problem

---

### Architecture 2: Feature-Based (Recommended for MovieTier)

```
com.cpen321.movietier/
│
├── core/                          (Shared infrastructure)
│   ├── network/
│   │   ├── ApiService.kt         (All endpoints)
│   │   ├── ResponseModels.kt
│   │   └── ApiException.kt
│   ├── datastore/
│   │   ├── TokenManager.kt
│   │   └── SettingsManager.kt
│   ├── di/
│   │   ├── NetworkModule.kt
│   │   ├── DataStoreModule.kt
│   │   └── RepositoryModule.kt
│   ├── error/
│   │   ├── ErrorHandler.kt
│   │   └── ErrorModel.kt
│   ├── theme/
│   │   ├── Color.kt
│   │   ├── Typography.kt
│   │   └── Theme.kt
│   └── utils/
│       └── TimeFormat.kt
│
├── shared/                        (Used by 2+ features)
│   ├── components/
│   │   ├── MovieCard.kt
│   │   ├── Avatar.kt
│   │   ├── MovieDetailSheet.kt
│   │   ├── CommentBottomSheet.kt
│   │   ├── common/
│   │   │   ├── LoadingState.kt
│   │   │   ├── EmptyState.kt
│   │   │   └── ErrorState.kt
│   │   └── ... (12 total)
│   ├── models/
│   │   ├── Movie.kt
│   │   ├── RankedMovie.kt
│   │   ├── FeedActivity.kt
│   │   ├── User.kt
│   │   ├── Friend.kt
│   │   └── WatchlistItem.kt
│   └── navigation/
│       ├── NavRoutes.kt
│       ├── NavGraph.kt
│       └── Extensions.kt
│
├── features/                      (Feature modules)
│   │
│   ├── auth/
│   │   ├── data/
│   │   │   ├── AuthRepository.kt
│   │   │   ├── AuthDataSource.kt
│   │   │   └── models/
│   │   │       ├── AuthRequest.kt
│   │   │       └── AuthResponse.kt
│   │   ├── domain/
│   │   │   ├── SignInUseCase.kt
│   │   │   ├── SignUpUseCase.kt
│   │   │   ├── SignOutUseCase.kt
│   │   │   └── AuthRepository.kt (interface)
│   │   ├── ui/
│   │   │   ├── AuthScreen.kt
│   │   │   ├── AuthViewModel.kt
│   │   │   └── components/
│   │   │       ├── SignInButton.kt
│   │   │       └── SignUpButton.kt
│   │   ├── di/
│   │   │   └── AuthFeatureModule.kt
│   │   └── AuthFeatureNavigation.kt
│   │
│   ├── ranking/
│   │   ├── data/
│   │   │   ├── RankingRepository.kt
│   │   │   ├── MovieComparisonDataSource.kt
│   │   │   └── models/
│   │   │       ├── AddMovieRequest.kt
│   │   │       ├── CompareMoviesRequest.kt
│   │   │       └── RankingResponse.kt
│   │   ├── domain/
│   │   │   ├── AddMovieToRankingUseCase.kt
│   │   │   ├── CompareMoviesUseCase.kt
│   │   │   ├── GetRankedMoviesUseCase.kt
│   │   │   ├── DeleteRankedMovieUseCase.kt
│   │   │   ├── StartRerankUseCase.kt
│   │   │   ├── SearchMoviesUseCase.kt
│   │   │   └── RankingRepository.kt (interface)
│   │   ├── ui/
│   │   │   ├── RankingScreen.kt
│   │   │   ├── RankingViewModel.kt
│   │   │   ├── RankingUiState.kt
│   │   │   ├── RankingEvent.kt
│   │   │   └── components/
│   │   │       ├── RankedMovieRow.kt
│   │   │       ├── MovieComparisonDialog.kt
│   │   │       ├── AddWatchedMovieDialog.kt
│   │   │       ├── RankingTopBar.kt
│   │   │       └── ... (ranking-specific)
│   │   ├── di/
│   │   │   └── RankingFeatureModule.kt
│   │   └── RankingFeatureNavigation.kt
│   │
│   ├── watchlist/
│   │   ├── data/
│   │   ├── domain/
│   │   ├── ui/
│   │   ├── di/
│   │   └── WatchlistFeatureNavigation.kt
│   │
│   ├── feed/
│   │   ├── data/
│   │   ├── domain/
│   │   ├── ui/
│   │   ├── di/
│   │   └── FeedFeatureNavigation.kt
│   │
│   ├── friends/
│   │   ├── data/
│   │   ├── domain/
│   │   ├── ui/
│   │   ├── di/
│   │   └── FriendsFeatureNavigation.kt
│   │
│   ├── recommendation/
│   │   ├── data/
│   │   ├── domain/
│   │   ├── ui/
│   │   ├── di/
│   │   └── RecommendationFeatureNavigation.kt
│   │
│   └── profile/
│       ├── data/
│       ├── domain/
│       ├── ui/
│       ├── di/
│       └── ProfileFeatureNavigation.kt
│
├── fcm/
│   ├── MovieTierFirebaseMessagingService.kt
│   ├── NotificationManager.kt
│   └── NotificationModel.kt
│
├── MainActivity.kt
└── MovieTierApplication.kt

Data Flow: UI -> ViewModel -> UseCase -> Repository -> API
Navigation: Features own their routes (distributed)
Components: shared/ for 2+, feature/ for single-feature
Testing: Feature imports only its own Repository mock (1-2 mocks)
```

**Strengths:**
- All ranking code in features/ranking/ (vertical navigation)
- Each feature is self-contained
- ViewModels are in feature folders (no aggregation)
- Features can develop in parallel
- Easy to add new feature (copy template)
- Navigation scales (features own routes)

**Tradeoffs:**
- Slightly more boilerplate per feature
- Must decide "shared" vs "feature-specific"
- Larger initial file count

---

### Architecture 3: Vertical Slicing (Per-Use Case)

```
com.cpen321.movietier/
│
├── core/                          (Shared infrastructure)
│   └── ... (same as feature-based)
│
├── shared/                        (Reusable components, models)
│   └── ... (same as feature-based)
│
├── slices/                        (One slice per use case)
│   │
│   ├── signIn/                    (1 use case)
│   │   ├── SignInScreen.kt
│   │   ├── SignInViewModel.kt
│   │   ├── SignInUseCase.kt
│   │   ├── SignInRepository.kt
│   │   ├── models/
│   │   └── di/
│   │
│   ├── signUp/                    (1 use case)
│   │   ├── SignUpScreen.kt
│   │   ├── SignUpViewModel.kt
│   │   ├── SignUpUseCase.kt
│   │   ├── SignUpRepository.kt
│   │   ├── models/
│   │   └── di/
│   │
│   ├── signOut/                   (1 use case)
│   │   ├── SignOutUseCase.kt
│   │   ├── SignOutRepository.kt
│   │   └── di/
│   │
│   ├── viewRanking/               (1 use case)
│   │   ├── RankingScreen.kt
│   │   ├── RankingViewModel.kt
│   │   ├── GetRankedMoviesUseCase.kt
│   │   ├── RankingRepository.kt
│   │   ├── models/
│   │   ├── components/
│   │   └── di/
│   │
│   ├── searchMovieToRank/         (1 use case)
│   │   ├── SearchMovieDialog.kt
│   │   ├── SearchViewModel.kt
│   │   ├── SearchMoviesUseCase.kt
│   │   ├── SearchRepository.kt
│   │   ├── models/
│   │   └── di/
│   │
│   ├── addMovieToRanking/         (1 use case)
│   │   ├── AddMovieScreen.kt
│   │   ├── AddMovieViewModel.kt
│   │   ├── AddMovieToRankingUseCase.kt
│   │   ├── RankingRepository.kt
│   │   ├── models/
│   │   └── di/
│   │
│   ├── compareMovies/             (1 use case)
│   │   ├── ComparisonDialog.kt
│   │   ├── ComparisonViewModel.kt
│   │   ├── CompareMoviesUseCase.kt
│   │   ├── RankingRepository.kt
│   │   ├── models/
│   │   └── di/
│   │
│   ├── deleteFromRanking/         (1 use case)
│   │   ├── DeleteMovieUseCase.kt
│   │   ├── RankingRepository.kt
│   │   └── di/
│   │
│   ├── reshuffleRanking/          (1 use case)
│   │   ├── RerankDialog.kt
│   │   ├── RerankViewModel.kt
│   │   ├── StartRerankUseCase.kt
│   │   ├── RankingRepository.kt
│   │   ├── models/
│   │   └── di/
│   │
│   ├── viewWatchlist/             (1 use case)
│   │   └── ... (4 files)
│   ├── addToWatchlist/            (1 use case)
│   │   └── ... (4 files)
│   ├── removeFromWatchlist/       (1 use case)
│   │   └── ... (4 files)
│   │
│   ├── viewFeed/                  (1 use case)
│   │   └── ... (4 files)
│   ├── likeActivity/              (1 use case)
│   │   └── ... (4 files)
│   ├── commentActivity/           (1 use case)
│   │   └── ... (4 files)
│   │
│   └── ... (15+ slices total)
│
└── ... (same as others)

Total directories: 40+ (1 per use case)
Cognitive load: Minimal per slice (4-5 files)
Navigation: Complex routing between slices
Shared state: Hard to manage across slices
```

**Strengths:**
- Ultra-granular (one slice = one user journey)
- Cognitive load per slice is minimal
- Very easy to test individual slice
- Follows DDD (Domain-Driven Design) principles

**Weaknesses:**
- Too many directories (40+ for MovieTier feels fragmented)
- Navigation coordination is complex
- Hard to manage cross-slice shared state
- Overkill for 2-dev team with 6 high-level features

**Best for:** Large teams (8+), 50+ use cases, complex domain logic

---

### Architecture 4: MVI (Model-View-Intent)

```
com.cpen321.movietier/
│
├── core/                          (Same as feature-based)
│
├── shared/                        (Same as feature-based)
│
├── features/
│   │
│   ├── ranking/
│   │   ├── intent/
│   │   │   └── RankingIntent.kt
│   │   │       sealed class {
│   │   │         data class LoadRankedMovies(...)
│   │   │         data class SearchMovies(query: String)
│   │   │         data class AddMovieToRanking(movie: Movie)
│   │   │         data class CompareMovies(new: Movie, with: Movie, preferred: Movie)
│   │   │         data class DeleteRankedMovie(id: String)
│   │   │         data class StartRerank(id: String)
│   │   │       }
│   │   │
│   │   ├── model/
│   │   │   └── RankingUiModel.kt
│   │   │       data class {
│   │   │         isLoading: Boolean
│   │   │         rankedMovies: List<RankedMovie>
│   │   │         compareState: CompareState?
│   │   │         searchResults: List<Movie>
│   │   │         error: String?
│   │   │       }
│   │   │
│   │   ├── processor/
│   │   │   └── RankingIntentProcessor.kt
│   │   │       fun processIntent(intent: RankingIntent): Single<Result>
│   │   │       - Handles all network calls
│   │   │       - Returns Result (sealed class)
│   │   │       - No state manipulation
│   │   │
│   │   ├── reducer/
│   │   │   └── RankingReducer.kt
│   │   │       fun reduce(currentModel: RankingUiModel, result: Result): RankingUiModel
│   │   │       - Pure function
│   │   │       - Takes old state + result
│   │   │       - Returns new state
│   │   │       - ~100 lines of logic
│   │   │
│   │   ├── view/
│   │   │   └── RankingScreen.kt
│   │   │       - Sends intents on user action
│   │   │       - Observes model
│   │   │       - Renders based on model
│   │   │
│   │   ├── data/
│   │   │   ├── RankingRepository.kt
│   │   │   └── models/
│   │   │
│   │   ├── domain/
│   │   │   └── RankingRepository.kt (interface)
│   │   │
│   │   ├── di/
│   │   │   └── RankingFeatureModule.kt
│   │   │       (provides Intent processor, reducer)
│   │   │
│   │   └── RankingFeatureNavigation.kt
│   │
│   └── ... (similar for other features)
│
└── ... (same as others)

Data Flow: Intent → Processor → Result → Reducer → Model → View
State Management: Immutable, reducer-based (like Redux)
Testing: Pure functions (processor & reducer are testable)
Testability: 95% (all logic is pure functions)
Boilerplate: 3x MVVM (need Intent, Processor, Reducer per feature)
```

**Strengths:**
- Predictable state changes (reducer pattern)
- Easy to test (pure functions)
- Time-travel debugging (replay intents)
- Consistent across all features
- Zero side-effects risk

**Weaknesses:**
- Heavy boilerplate (5 files per feature vs 2 with MVVM)
- Steep learning curve (Intent/Processor/Reducer pattern)
- Memory pressure (immutable data classes with copy())
- Overkill for simple features like Auth
- 60+ line reducer functions for complex state

**Best for:** Large teams (5+), mission-critical apps, complex state management

---

## Pattern Comparison in Tables

### Complexity vs Team Size

```
Complexity↑
   ^       MVI + Gradle Modules
   |            ▲
   |           / \
   |          /   \ Vertical Slicing
   |         /     ▲
   |        /     / \
   |       /     /   \
   |      /     /     \  
   |     /   Feature-Based
   |    /     ▲         \
   |   /     / \         \
   |  /     /   \         \
   | /     /     \         \
   |/   Layered  \         \
   └─────────────▼─────────→ Team Size
     1-2  3-5   5-10  10+

MovieTier is here: 2 devs, 6 features → Feature-Based wins
```

### File Count Comparison

```
Pattern            | Total Files | Avg Files/Feature | Dirs |
Layered (current)  |    131      |   ~18             |  12  |
Feature-Based      |    131      |   ~18             |  18  |
Vertical Slicing   |    131      |   ~8              |  40+ |
MVI                |    200+     |   ~30             |  18  |
```

### Time to Find Code

```
Pattern            | "Show me ranking code" | Time  |
Layered (current)  | grep -r "ranking"      | 2 min |
Feature-Based      | ls features/ranking/   | 30s   |
Vertical Slicing   | find . -type d -name "*rank*" | 1 min |
MVI                | ls features/ranking/intent, processor, reducer | 45s |
```

### Time to Add New Feature

```
Pattern            | Dev Workflow           | Time  |
Layered (current)  | Create 8-12 scattered files | 45 min |
Feature-Based      | Copy feature template, fill blanks | 30 min |
Vertical Slicing   | Create 1-2 new slices | 20 min |
MVI                | Create Intent, Processor, Reducer, Model | 60+ min |
```

### Testing Effort per Feature

```
Pattern            | Setup Mocks    | Lines of Test | Difficulty |
Layered (current)  | 5+ repos       |    200+       | Hard        |
Feature-Based      | 1-2 repos      |    100-150    | Easy        |
Vertical Slicing   | 1 repo         |    50-100     | Very Easy   |
MVI                | Pure functions |    150-200    | Easy        |
```

---

## Scalability Curves

```
Code Complexity vs Number of Features

│                                           MVI
│                                          ╱
│                                        ╱
│                                      ╱  Feature-Based
│                                    ╱  ╱
│                                  ╱ ╱  Vertical Slicing
│                                ╱╱
│    Layered ╱╱
│          ╱╱
│        ╱╱
│      ╱╱
│    ╱╱
│  ╱╱
│╱
└──────────────────────────── Number of Features
  0  5  10 15 20 25 30 35 40

MovieTier Growth Path:
- Start: Layered (6 features, fine)
- 2-3 months: Feature-Based (pain points emerge)
- 6+ months: Feature-Based (scales linearly)
- 12+ months: Gradle modules + Feature-Based
```

---

## Decision Flowchart for MovieTier

```
Current State: 6 features, 131 files, 2 devs

Question 1: Is code discovery becoming harder?
├─ YES: ViewModel aggregation, scattered use cases
│  └─ Use FEATURE-BASED
└─ NO: Keep LAYERED for now

Question 2: Are ViewModels growing (250+ lines)?
├─ YES: Need better organization
│  └─ Use FEATURE-BASED
└─ NO: OK with LAYERED

Question 3: Planning to add 15+ more features?
├─ YES: Will scale to 200+ files
│  └─ Use FEATURE-BASED (or MVI + modules later)
└─ NO: LAYERED still works

Question 4: Team size will exceed 3 developers?
├─ YES: Bottlenecks on shared files
│  └─ Use FEATURE-BASED
└─ NO: LAYERED still works

MovieTier answers: YES, YES, YES, NO → FEATURE-BASED ✓
```

---

## Migration Path Visualization

```
Timeline: Full Migration (5 days)

Day 1: Setup Infrastructure
├─ Create core/, shared/ directories
├─ Move: network, datastore, theme, error
├─ Move: components, models, navigation
└─ Verify compilation

Day 2-3: Core Features (Auth + Ranking)
├─ Day 2: Auth feature module
│  ├─ Create structure
│  ├─ Move repos, use cases, UI
│  ├─ Create AuthFeatureModule
│  └─ Verify auth flow
│
└─ Day 3: Ranking feature module (complex)
   ├─ Create structure
   ├─ Move repos, use cases, UI, components
   ├─ Extract RankingUiState, RankingEvent
   ├─ Create RankingFeatureModule
   ├─ Update NavGraph to use RankingFeatureNavigation
   └─ Verify ranking flow

Days 4-5: Remaining Features (Feed, Friends, Watchlist, Recommendation, Profile)
├─ Feed (1 day, complex)
├─ Friends (0.5 day)
├─ Watchlist (0.5 day)
├─ Recommendation (1 day, complex)
└─ Profile (0.5 day)

Day 6: Cleanup & Documentation
├─ Remove old directories
├─ Update all imports in tests
├─ Verify no circular dependencies
├─ Update CLAUDE.md, README.md
└─ Create PR and code review

Post-Migration:
├─ New features: 30 min instead of 45 min (33% faster)
├─ Onboarding: 8 min instead of 20 min (60% faster)
└─ Testing: Easier with feature isolation
```

---

## Quick Reference: Which Pattern to Use?

| Your Situation | Best Pattern | Why |
|---|---|---|
| MovieTier (2 devs, 6 features) | **Feature-Based** | Scales linearly, better onboarding |
| Startup (3-4 devs, growing) | **Feature-Based** | Foundation for growth |
| Large team (8+), critical app | **MVI + Gradle modules** | Maximum testability + scalability |
| Solo developer, 1-2 features | **MVVM** | Minimal boilerplate |
| 30+ use cases, complex domain | **Vertical Slicing** | Ultra-fine granularity |
| Google sample project | **Layered** (in samples) | Well-documented |
| Legacy app refactor | **Feature-Based** | Incremental migration |

