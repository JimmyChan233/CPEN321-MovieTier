# M3 Reflections

## Table 1 – Task Distribution

| ID | Task (a short description) | Team Member | Duration |
|----|---------------------------|-------------|----------|
| 1 | Implement Google OAuth authentication flow (frontend & backend) | Jimmy & Kayli | 3 hours |
| 2 | Design and implement friend request system with SSE real-time updates | Jimmy & Kayli | 5 hours |
| 3 | Design and implement activity feed with real-time updates | Jimmy & Kayli | 4 hours |
| 4 | Design and implement Firebase Cloud Messaging for push notifications | Jimmy & Kayli | 4 hours |
| 5 | Implement initial simple movie search and TMDB API integration | Jimmy & Kayli | 3 hours |
| 6 | Implement watchlist feature and synchronization with rankings | Jimmy & Kayli | 3 hours |
| 7 | Improve movie ranking comparison algorithm | Jimmy & Kayli | 6 hours |
| 8 | Improve recommendation algorithm with user preference analysis | Jimmy & Kayli | 5 hours |
| 9 | Implement trending movies feature for new users | Jimmy & Kayli | 2 hours |
| 10 | Implement movie detail endpoints and watch providers | Jimmy & Kayli | 3 hours |
| 11 | Implement in-app trailer playback with WebView | Jimmy & Kayli | 3 hours |
| 12 | Design and implement Jetpack Compose UI for all screens | Jimmy & Kayli | 8 hours |
| 13 | Implement DataStore for local data persistence | Jimmy & Kayli | 2 hours |
| 14 | Backend API server setup with Express.js and MongoDB | Jimmy & Kayli | 4 hours |
| 15 | Write comprehensive API documentation (Section 4.1 - Component Interfaces) | Jimmy & Kayli | 4 hours |
| 16 | Document frameworks and libraries (Section 4.4) | Jimmy & Kayli | 2 hours |
| 17 | Create sequence diagrams structure (Section 4.6) | Jimmy & Kayli | 2 hours |
| 18 | Document NFR implementation (Section 4.7) | Jimmy & Kayli | 2 hours |
| 19 | Review and correct Requirements_and_Design.md documentation | Jimmy & Kayli | 3 hours |
| 20 | Testing and bug fixes across all features | Jimmy & Kayli | 6 hours |
| 21 | Debug and fix watchlist-ranking synchronization | Jimmy & Kayli | 2 hours |
| 22 | Fix duplicate feed entries bug on rerank | Jimmy & Kayli | 1.5 hours |
| 23 | Deployment and server configuration | Jimmy | 2 hours |

---

## Table 2 – Time and AI Reliance Distribution

| | Time Spent on the Assignment (hours) | AI Reliance for the assignment (0 – 100%) (Estimate) |
|---|---|---|
| **Kayli** | 32 hours | 65% |
| **Jimmy** | 44 hours | 70% |
| **Group Overall** | 76 hours | 68% |

---

## 3. Reflections on the Use of AI

### 3.1 Major Tasks Analysis

#### Task 1: Write Comprehensive API Documentation (Section 4.1)

**3.1.1 What was your task?**

The task was to document all component interfaces for the M3 milestone requirements. This included creating comprehensive HTTP/REST API endpoint documentation for all major backend components (UserManager, FriendManager, MovieListsManager, UserFeed, WatchlistManager). Each interface needed meaningful names, parameters with types, return values, and 1-2 sentence descriptions. Additionally, internal service interfaces needed to be documented using Java-style method signatures.

**3.1.2 Which AI Interfaces, Tools, and Models have you used?**

- **Claude Code** (claude-sonnet-4-5-20250929) - Primary tool
- **Tools used**: File reading (Read), code search (Grep, Glob), file editing (Edit)
- **Strategy**: Used Claude Code's codebase exploration capabilities

**3.1.3 What was your strategy for utilizing the tool?**

First, I asked Claude Code to examine the backend route files to understand all available endpoints. Claude systematically read through `authRoutes.ts`, `friendRoutes.ts`, `movieRoutes.ts`, `feedRoutes.ts`, `recommendationRoutes.ts`, `watchlistRoutes.ts`, and `userRoutes.ts`. Then, I had it examine controller files to understand the internal service interfaces. Finally, Claude generated the documentation in the proper format with HTTP/REST style for external APIs and Java-style signatures for internal services, ensuring all parameter types and descriptions matched the actual implementation.

**3.1.4 Advantages of using AI tools:**

- **Speed**: Claude Code read through 7+ route files and multiple controllers in seconds, extracting all endpoint information automatically
- **Accuracy**: By reading actual code, it ensured parameter names, types, and return values matched implementation exactly
- **Consistency**: Generated uniform documentation format across all 30+ endpoints
- **Cross-referencing**: Claude could verify that documented endpoints actually existed in the codebase, preventing documentation drift

**3.1.5 Disadvantages of using AI tools:**

- **Context limitations**: Initially tried to document everything in one pass but hit token limits, requiring multiple iterations
- **Verification needed**: Had to manually verify some edge cases where the AI inferred behavior from code patterns that weren't explicitly documented
- **Over-documentation risk**: Claude sometimes wanted to add too much detail, requiring guidance to keep descriptions concise (1-2 sentences as per requirements)

---

#### Task 2: Implement Movie Ranking Comparison Algorithm

**3.1.1 What was your task?**

Implement an interactive binary comparison algorithm for ranking movies. Users compare a new movie against existing ranked movies in pairwise comparisons, and the system determines the final rank position. The algorithm needed to minimize comparisons (logarithmic time) while ensuring accurate placement and handling edge cases like empty lists or duplicate movies.

**3.1.2 Which AI Interfaces, Tools, and Models have you used?**

- **Claude Code** (claude-sonnet-4-5-20250929)
- **ChatGPT** (GPT-4) - For algorithm design brainstorming
- **GitHub Copilot** - For autocompleting repetitive code patterns

**3.1.3 What was your strategy for utilizing the tool?**

First, I used ChatGPT to brainstorm different ranking algorithm approaches (binary search, quicksort-like comparisons, Elo rating). After deciding on binary search, I used Claude Code to implement the backend logic in `movieComparisonController.ts`. Claude helped design the session-based state management (in-memory map) to track comparison progress across multiple HTTP requests. GitHub Copilot assisted with writing repetitive validation code and error handling patterns.

**3.1.4 Advantages of using AI tools:**

- **Algorithm optimization**: Claude suggested using binary search with range tracking instead of linear comparisons, reducing from O(n) to O(log n) comparisons
- **Edge case coverage**: AI identified edge cases I hadn't considered (empty list, duplicate movie, session expiration)
- **Code quality**: Copilot's autocomplete sped up writing TypeScript type definitions and validation logic
- **Testing suggestions**: Claude suggested test scenarios to verify the algorithm worked correctly

**3.1.5 Disadvantages of using AI tools:**

- **Over-engineering tendency**: Initial Claude suggestion was overly complex with persistent database storage for sessions; had to simplify to in-memory Map
- **Context switching**: Using multiple AI tools (ChatGPT for design, Claude for implementation, Copilot for completion) created some inconsistencies in approach
- **Testing gaps**: AI-generated test scenarios didn't catch a race condition bug that only appeared with concurrent requests from the same user

---

#### Task 3: Debug Watchlist-Ranking Synchronization

**3.1.1 What was your task?**

Fix a synchronization bug where movies weren't being removed from watchlist when added to rankings. The feature was supposed to automatically delete watchlist items when users ranked them, but it was inconsistent. The challenge was that the watchlist removal logic existed in multiple code paths (first movie, duplicate movie, comparison completion) and some paths weren't calling it correctly.

**3.1.2 Which AI Interfaces, Tools, and Models have you used?**

- **Claude Code** (claude-sonnet-4-5-20250929)
- Tools: Grep for searching, Read for examining code, Edit for fixing

**3.1.3 What was your strategy for utilizing the tool?**

I asked Claude Code to search for all occurrences of watchlist removal logic using `Grep` with pattern "removeFromWatchlist|WatchlistItem.*delete". Claude found 4 different locations where the removal function was called. Then I had it trace through each code path to identify which scenarios were missing the call. Claude discovered that the `startRerank` endpoint was removing from watchlist immediately, but the regular `addMovie` flow only removed after comparison completion. This caused an inconsistency when users canceled mid-comparison.

**3.1.4 Advantages of using AI tools:**

- **Pattern recognition**: Claude quickly identified inconsistent patterns across multiple code paths
- **Code tracing**: AI could follow the execution flow through async callbacks and understand timing issues
- **Comprehensive search**: Grep tool found all relevant code locations instantly (would have taken 15+ minutes manually)
- **Fix verification**: Claude could verify the fix worked by checking all code paths led to watchlist removal

**3.1.5 Disadvantages of using AI tools:**

- **Root cause assumptions**: Claude initially assumed the bug was in the removal function itself, not in the calling patterns; had to guide it to look at the broader flow
- **Race condition blindness**: AI didn't initially consider that async operations could cause the watchlist item to be deleted before the ranking was confirmed
- **Over-fixing**: Claude wanted to add transaction locks and database constraints; had to explain the simpler fix of just calling removal at the right time

---

#### Task 4: Review and Correct Requirements_and_Design.md Documentation

**3.1.1 What was your task?**

Review the entire Requirements_and_Design.md file to ensure it accurately reflected the actual code implementation and remove any false or misleading claims. This included verifying that all change history entries corresponded to actual documentation changes, correcting claims about features that were described differently than implemented (e.g., profile picture upload vs. Google account sourcing), and ensuring technical accuracy of algorithm descriptions.

**3.1.2 Which AI Interfaces, Tools, and Models have you used?**

- **Claude Code** (claude-sonnet-4-5-20250929)
- Tools: Read (for documentation and code files), Grep (for verification searches), Edit (for corrections)
- Strategy: Systematic verification of each claim against codebase

**3.1.3 What was your strategy for utilizing the tool?**

I instructed Claude to go through the change history line by line and verify each claim by reading the actual code. For example, when the documentation claimed "Fisher-Yates shuffle" in the recommendation algorithm, Claude searched the codebase and found that it actually used random noise added to scores, not a shuffle. For the profile picture claim about MinIO upload, Claude verified that the actual implementation used Google OAuth profile pictures. After finding discrepancies, Claude edited the documentation to match reality.

**3.1.4 Advantages of using AI tools:**

- **Exhaustive verification**: Claude could check every single claim by reading source code, something that would take hours manually
- **Cross-referencing**: AI could instantly jump between documentation and implementation to verify consistency
- **Pattern detection**: Claude noticed patterns of incorrect claims (e.g., multiple duplicate entries about profile pictures) that indicated copy-paste errors
- **Precision**: When correcting algorithm descriptions, Claude read the actual code line-by-line to generate accurate technical descriptions

**3.1.5 Disadvantages of using AI tools:**

- **Context preservation**: Claude sometimes removed too much detail when simplifying, requiring me to ask it to restore important context
- **False positives**: AI initially flagged some correct claims as incorrect because it misunderstood the code flow (e.g., didn't realize a feature was documented in a different section)
- **Commit message quality**: Auto-generated commit messages sometimes lacked the nuance of why a correction was important, not just what changed

---

#### Task 5: Implement Firebase Cloud Messaging for Push Notifications

**3.1.1 What was your task?**

Set up Firebase Cloud Messaging (FCM) for sending real-time push notifications to users when friends rank movies or send friend requests. This involved configuring Firebase project credentials, implementing backend service using `firebase-admin` SDK to send notifications, and handling device token registration on Android using `firebase-messaging` library.

**3.1.2 Which AI Interfaces, Tools, and Models have you used?**

- **Claude Code** (claude-sonnet-4-5-20250929)
- **ChatGPT** (GPT-4) - For Firebase setup steps and troubleshooting
- **GitHub Copilot** - For boilerplate Kotlin/TypeScript code

**3.1.3 What was your strategy for utilizing the tool?**

First, used ChatGPT to understand Firebase setup requirements and get step-by-step configuration instructions. Then used Claude Code to implement the backend notification service by reading Firebase Admin SDK documentation and generating the service code. For Android integration, relied heavily on GitHub Copilot to autocomplete the Kotlin code for handling FCM tokens and notification callbacks. Claude Code helped integrate the notification sending into existing endpoints (friend request, movie ranking completion).

**3.1.4 Advantages of using AI tools:**

- **Configuration guidance**: ChatGPT provided clear steps for Firebase console setup, preventing common misconfiguration issues
- **Boilerplate reduction**: Copilot generated 70%+ of the repetitive Kotlin code for notification handling
- **Integration assistance**: Claude Code identified all the points in the codebase where notifications should be triggered
- **Error handling**: AI suggested proper try-catch blocks and fallback behavior when notifications fail

**3.1.5 Disadvantages of using AI tools:**

- **Outdated documentation**: ChatGPT sometimes referenced older Firebase SDK versions; had to manually verify against current docs
- **Testing limitations**: AI couldn't test actual notification delivery; had to manually test on physical device
- **Security concerns**: Initial Claude-generated code had the Firebase private key hardcoded; had to manually move it to environment variables
- **Google services JSON**: AI wanted me to commit `google-services.json`, but that's a security risk (later had to remove from git history)

---

#### Task 6: Build Feed Engagement UI (Likes, Comments, Sheets)

**3.1.1 What was your task?**

Deliver the end-to-end experience for engaging with feed items on Android: render like/comment counts, add optimistic like toggles, surface the full-screen comment sheet, and coordinate with backend SSE/FCM notifications. This required updating multiple Compose screens (feed list, movie detail sheet, comment bottom sheet) and ensuring the UX stayed responsive across loading states.

**3.1.2 Which AI Interfaces, Tools, and Models have you used?**

- **Claude Code** (claude-sonnet-4-5-20250929) – for mapping backend responses to UI models and reviewing large files
- **GitHub Copilot** – for Compose boilerplate (state hoisting, remember blocks, animations)
- **ChatGPT** (GPT-4) – for quick UX copy suggestions and accessibility considerations

**3.1.3 What was your strategy for utilizing the tool?**

I start by asking Claude to diff the latest backend changes so I knew which fields (like `likeCount`, `commentCount`, `isLikedByUser`) were available. Then, while wiring those fields into `FeedActivityCard` and `CommentBottomSheet`, I leaned on Copilot to scaffold snippets (e.g., `AnimatedVisibility`, `LazyColumn` placeholders). After assembling the flow, I used Claude’s “read” tool to review the composed files to catch state bugs (like stale selections) and generated follow-up tweaks via targeted prompts.

**3.1.4 Advantages of using AI tools:**

- **Rapid scaffolding**: Copilot produced most of the repetitive Compose state code, letting me focus on UX polish.
- **State auditing**: Claude spotted spots where I forgot to reset `selectedMovie` or where coroutines needed `rememberCoroutineScope()`.
- **Design iteration**: ChatGPT helped brainstorm concise copy and empty-state messaging that matched our tone.
- **Regression checks**: Claude compared pre/post diffs to ensure theming (colors, typography) stayed consistent.

**3.1.5 Disadvantages of using AI tools:**

- **Compose churn**: Copilot occasionally suggested deprecated APIs (`rememberCoroutineScope` misuse), so I had to double-check with docs.
- **Over-eager animations**: AI kept inserting fancy transitions that hurt performance; I scaled them back manually.
- **Comment sheet race conditions**: Claude didn’t catch that opening the sheet while loading comments needed guard clauses; manual testing revealed it.
- **Accessibility gaps**: AI rarely suggested content descriptions or talkback hints—I had to add those deliberately.

---

#### Task 7: Offline Quote Catalog & Discover Refresh

**3.1.1 What was your task?**

Replace the flaky Wikiquote dependency with an on-device quote catalog and deterministic rotation while keeping a backend fallback for legacy clients. This included building a Kotlin data source with ~1,000 curated quotes, updating the recommendation screen UI, coordinating feature flags with Kayli, and revising documentation.

**3.1.2 Which AI Interfaces, Tools, and Models have you used?**

- **Claude Code** – parsing the old Wikiquote service to understand required fields and helping generate the new `MovieQuoteProvider`.
- **ChatGPT** – brainstorming rotation strategies and deterministic hashing ideas.
- **GitHub Copilot** – inserting large blocks of quote data and helper functions.

**3.1.3 What was your strategy for utilizing the tool?**

I used Claude to audit the existing Wikiquote flow, extract edge cases (timeouts, empty results), and propose an offline-first architecture. Copilot assisted in building the Kotlin map builders and matching utilities, while I manually reviewed every generated quote entry. Finally, I used Claude to update backend docs so they reflected the hybrid approach.

**3.1.4 Advantages of using AI tools:**

- **Knowledge transfer**: Claude summarized the old scraper logic quickly so I didn’t have to reverse-engineer it from scratch.
- **Boilerplate handling**: Copilot generated repetitive Kotlin builders and normalization helpers.
- **Edge-case coverage**: ChatGPT suggested adding rotation offsets and fallback copy when no quote matches.
- **Doc alignment**: Claude ensured README and Requirements matched the new architecture.

**3.1.5 Disadvantages of using AI tools:**

- **Data accuracy**: Copilot sometimes hallucinated quote lines, so I cross-checked every entry manually.
- **File bloat**: AI-generated data blocks needed linting and formatting cleanup afterward.
- **Back-compat oversight**: Initial Claude refactor removed `/api/quotes`; I reinstated it to avoid breaking older clients.
- **Testing blind spots**: AI couldn’t validate day-of-year rotation, so I wrote manual tests to confirm determinism.

---

#### Task 8: Friend Management with Real-Time Updates

**3.1.1 What was your task?**

Deliver the complete friend experience: searching by email, sending/canceling/responding to requests, surfacing incoming/outgoing lists, and reflecting status changes instantly through SSE and push notifications. On backend that meant building `Friendship`/`FriendRequest` models, REST routes, SSE broadcasting, and FCM hooks. On Android it required new screens, view models, and Compose components that consumed those APIs and stayed in sync with live events.

**3.1.2 Which AI Interfaces, Tools, and Models have you used?**

- **Claude Code** – mapped out Express route skeletons, generated Mongoose schemas, and reviewed SSE wiring.
- **GitHub Copilot** – helped scaffold Compose UI, DataStore usage, and Retrofit interface methods.
- **ChatGPT** – double-checked validation patterns (email regex, rate limiting ideas) and brainstormed UX microcopy.

**3.1.3 What was your strategy for utilizing the tool?**

I first asked Claude to enumerate existing user/auth infrastructure so the new routes slotted in cleanly. After generating base controllers and SSE service updates, I manually hardened them (rate limiting, bidirectional friendship creation). For Android, I used Copilot to spin up ViewModel state holders and `LazyColumn` layouts, then iteratively tested while Kayli exercised the flows. We used Claude as a diff tool whenever we refactored to ensure both client and server stayed aligned.

**3.1.4 Advantages of using AI tools:**

- **Boilerplate acceleration**: Claude/Copilot handled repetitive schema definitions, DTOs, and Retrofit signatures.
- **Edge-case reminders**: AI highlighted scenarios like self-invite prevention, duplicate requests, and bilateral friendship cleanup.
- **Live event wiring**: Claude suggested SSE client management patterns (Map of user IDs to response sets) that we adopted.
- **Notification integration**: ChatGPT provided clear FCM payload structures which we adapted for friend requests/acceptances.

**3.1.5 Disadvantages of using AI tools:**

- **State drift**: Copilot occasionally generated stale field names, which caused runtime crashes until we manually synced models.
- **Security sanity checks**: AI underplayed rate limiting and authorization checks; we added manual guards for abuse cases.
- **SSE disconnect handling**: Claude’s initial `res.on('close')` code leaked listeners; manual profiling revealed and fixed it.
- **UX nuances**: AI didn’t account for empty-state design or inline error surfacing—we layered that in via manual iterations.

---

### 3.2 Anything else you would like to share about this process

**Lessons Learned:**

1. **AI as a Pair Programmer**: Using Claude Code felt like having an expert pair programmer who never got tired. It could read through thousands of lines of code instantly, spot patterns, and suggest improvements. However, it required clear direction and verification - it's a tool, not a replacement for understanding the codebase yourself.

2. **Token Limits Challenge**: The biggest constraint was Claude's context window. When working on large tasks like comprehensive documentation, we hit token limits and had to break work into smaller chunks. This actually improved our workflow by forcing us to be more focused and systematic.

3. **Different AI Tools for Different Tasks**: We learned to use different AI tools for their strengths:
   - **Claude Code**: Best for codebase exploration, systematic documentation, and complex refactoring
   - **ChatGPT**: Better for brainstorming, explaining concepts, and getting configuration steps
   - **GitHub Copilot**: Fastest for autocompleting repetitive code patterns

4. **Trust but Verify**: Every AI-generated change required manual review. We caught several cases where AI made incorrect assumptions (e.g., documenting a feature that didn't actually exist, or suggesting an over-engineered solution). Critical thinking remained essential.

5. **Documentation-Code Consistency**: The task of reviewing Requirements_and_Design.md highlighted how easy it is for documentation to drift from implementation. Using AI to cross-reference every claim against actual code was incredibly valuable and caught numerous discrepancies that would have cost marks.

6. **Security Awareness**: The `google-services.json` leak incident taught us that even when using AI, we need to maintain security awareness. Claude initially didn't flag it as a secret, and we had to spend significant time removing it from git history. This was a valuable lesson in not blindly trusting AI-generated code without security review.

7. **Time Efficiency**: Despite the learning curve and verification overhead, AI tools saved approximately 40-50% of development time. Tasks that would have taken 8 hours manually (like comprehensive API documentation) took only 3-4 hours with AI assistance.

8. **Improved Code Quality**: AI suggestions led to better architecture decisions (binary search vs linear comparisons, session-based state management) and more comprehensive error handling. The final code is more robust than it would have been without AI assistance.

**Recommendation for Future Students**: Use AI tools extensively, but develop a workflow where you verify every significant change. Treat AI as a knowledgeable assistant that can make mistakes, not as an infallible oracle. The combination of AI speed and human judgment is where the real productivity gains come from.

---

### 4. Individual Reflections

#### 4.1 Jimmy Chen

This milestone was the first time I relied on AI for nearly every phase of the backend stack—from scaffolding comparison sessions to tightening documentation—and it shifted me into a “coach” mindset. I would outline how I wanted the session state machine or recommendation scoring to behave, let Claude sketch the first pass, then jump back in to correct edge cases (watchlist cleanup, duplicate feed entries, ranking gaps) and align the docs. Pairing with Kayli accelerated everything: while I stabilized the API contracts and data models, she pulled the latest changes into the Android client, surfaced real UX pain points, and fed me repro steps whenever something felt off. The combination meant we caught regression loops quickly (especially around rerank flows) and shipped features that felt end-to-end rather than siloed. Biggest takeaway for me is that AI works best when I stay hands-on with verification and treat the conversation like rubber-duck debugging; that’s how we kept quality high despite moving fast.

#### 4.2 Kayli Cheung

Working alongside Jimmy this milestone reinforced how much smoother delivery becomes when backend and Android iterate together in real time. As soon as Jimmy had endpoints or docs stabilized, I wired them into Compose screens, stress-tested flows, and fed back anything that felt brittle (like comparison dialogs, feed engagement, or notification timing). AI tooling was invaluable as a drafting partner—Copilot sped up Kotlin boilerplate, Claude helped me reason through SSE and FCM integration—but the real gains came from pairing: we would hop on quick syncs, divide tasks, and keep looping until the UX felt polished. I’m proud of how much refinement we layered on top of the baseline ranking/recommendation work (improved algorithms, richer feed interactions, cohesive theming), and it hammered home that collaboration plus deliberate AI usage lets us ship features that are both sophisticated and reliable.
