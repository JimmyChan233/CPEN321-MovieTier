# MovieTier Frontend

An Android app built with Kotlin and Jetpack Compose that enables users to rank movies using an innovative pairwise comparison system, share rankings with friends, and discover personalized recommendations.

## Table of Contents
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Configuration](#configuration)
- [Building](#building)
- [Testing](#testing)
- [Development](#development)

## Quick Start

```bash
# 1. Open project in Android Studio (Hedgehog or later)
# 2. Sync Gradle files (Android Studio will prompt)
# 3. Configure local.properties (see Configuration section)
# 4. Run on emulator: Shift+F10 (or click Run button)
```

## Prerequisites

### Required Software
- **Android Studio** Hedgehog (2023.1.1) or later
  - Download: https://developer.android.com/studio
- **Java Development Kit (JDK)** 11+
  - Usually included with Android Studio
- **Android SDK**
  - Installed via Android Studio SDK Manager
  - Target API: 34
  - Min API: 26

### Accounts & Credentials
- **Google Cloud Project** (for Google Sign-In)
  - OAuth 2.0 Web Client ID
  - SHA-1 fingerprint registered
- **The Movie Database (TMDB) API**
  - API Key from https://www.themoviedb.org/
- **Firebase Project** (optional, for push notifications)
  - `google-services.json` file

### System Requirements
- macOS, Windows, or Linux with 8GB+ RAM
- Emulator: 2GB+ available disk space
- Internet connection (for API calls)

## Project Setup

### 1. Clone & Open Project

```bash
# Navigate to project root
cd CPEN321-MovieTier

# Open frontend in Android Studio
# File → Open → Select frontend/ directory
```

### 2. Sync Gradle

Android Studio will prompt you to sync Gradle files. Click "Sync Now" or run:
```bash
./gradlew build
```

This downloads all dependencies and configures the project.

### 3. Verify Android SDK

```bash
# Using Android Studio's SDK Manager
# Tools → SDK Manager → Check these are installed:
# - Android SDK Platform 34
# - Android SDK Build Tools 34.0.x
# - Android Emulator
# - Google Play Services
```

## Configuration

### Setting Up local.properties

This file contains local configuration that's not committed to Git.

**1. Create local.properties from template:**

```bash
cd frontend
cp local.defaults.properties local.properties
```

**2. Edit `local.properties` with your configuration:**

```properties
# Path to Android SDK (required)
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk

# API base URL (required)
API_BASE_URL=http://10.0.2.2:3000/api/

# Google OAuth Web Client ID (required)
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

### Understanding Configuration

| Property | Purpose | Example |
|----------|---------|---------|
| `sdk.dir` | Path to Android SDK installation | `/Users/username/Library/Android/sdk` |
| `API_BASE_URL` | Backend API URL | Emulator: `http://10.0.2.2:3000/api/` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |

### Getting Google Client ID

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API (APIs & Services → Library → search "Google+" → Enable)
4. Create OAuth 2.0 credentials:
   - Click "Create Credentials" → OAuth consent screen
   - Set up consent screen (add required scopes)
   - Create credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Copy the Client ID
5. Register SHA-1 fingerprint:
   - In Android Studio, run: `./gradlew signingReport`
   - Copy the SHA-1 from the output
   - Go to Google Cloud Console → Credentials → Edit OAuth 2.0 Client
   - Add "Authorized JavaScript origins": `http://localhost`
   - Add "Authorized redirect URIs": `http://localhost`

### Setting API_BASE_URL

**For Android Emulator:**
```properties
API_BASE_URL=http://10.0.2.2:3000/api/
```
- `10.0.2.2` is the special alias for the host's `localhost`
- Backend must be running on port 3000

**For Physical Device:**
```properties
API_BASE_URL=http://192.168.1.100:3000/api/
```
- Replace `192.168.1.100` with your computer's local IP
- Find IP: `ifconfig | grep inet` (macOS/Linux)

### Firebase Setup (Optional)

For push notifications support:

1. **Download `google-services.json`:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create project or select existing
   - Add Android app with package name `com.cpen321.movietier`
   - Download `google-services.json`

2. **Place file in project:**
   ```bash
   cp path/to/google-services.json frontend/app/google-services.json
   ```

3. **Verify in build.gradle.kts:**
   ```kotlin
   plugins {
       id("com.google.gms.google-services") version "4.3.15"
   }
   ```

**Note:** App works without Firebase - notifications just won't appear.

## Building

### Build Options

**Debug APK** (for development & testing):
```bash
./gradlew assembleDebug
```
Creates: `app/build/outputs/apk/debug/app-debug.apk`

**Release APK** (for production distribution):
```bash
./gradlew assembleRelease
```
Creates: `app/build/outputs/apk/release/app-release.apk`

**Install on Emulator/Device:**
```bash
# Debug build, install, and run
./gradlew installDebug

# Or directly run from Android Studio
# Ctrl+R (Windows/Linux) or Cmd+R (macOS)
```

### Build Configuration

The build uses Gradle with Kotlin DSL. Key files:
- `build.gradle.kts` - Root build configuration
- `app/build.gradle.kts` - App-level configuration
- `gradle/libs.versions.toml` - Dependency versions
- `local.properties` - Local overrides

### Build Variants

- **Debug:** Includes logging, debuggable
- **Release:** Optimized, not debuggable (requires signing key)

## Testing

### Unit Tests

Test individual components in isolation (no Android framework required).

```bash
# Run unit tests
./gradlew testDebugUnitTest

# Run with coverage
./gradlew testDebugUnitTest --coverage

# Run specific test class
./gradlew testDebugUnitTest --tests com.cpen321.movietier.ui.viewmodels.*
```

**Test Location:** `app/src/test/`

**Frameworks:**
- JUnit 4 - Unit testing framework
- Mockk - Mocking library
- Coroutines Test - Async testing utilities

### Instrumented Tests

Test app behavior with Android framework (requires emulator or device).

```bash
# Start emulator or connect device first
# adb devices

# Run instrumented tests
./gradlew connectedAndroidTest

# Run specific test class
./gradlew connectedAndroidTest --tests com.cpen321.movietier.ui.*
```

**Test Location:** `app/src/androidTest/`

**Frameworks:**
- Espresso - UI testing framework
- AndroidX Test - Android testing utilities

### Writing Tests

**Unit Test Example:**
```kotlin
class UserRepositoryTest {
    private lateinit var repository: UserRepository
    private val mockApiService = mockk<UserApiService>()

    @Before
    fun setup() {
        repository = UserRepositoryImpl(mockApiService)
    }

    @Test
    fun `should fetch user profile`() = runTest {
        coEvery { mockApiService.getProfile() } returns User(id = "123", name = "John")

        val result = repository.getProfile()

        assertEquals("John", result.name)
    }
}
```

**UI Test Example:**
```kotlin
class LoginScreenTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `should display sign in button`() {
        composeTestRule.setContent {
            LoginScreen()
        }

        composeTestRule.onNodeWithText("Sign in with Google").assertExists()
    }
}
```

## Development

### Running the App

**Using Android Studio:**
1. Click the green "Run" button (or press Shift+F10)
2. Select target emulator or device
3. App launches with logcat view

**Using Gradle:**
```bash
./gradlew installDebugRun
```

### Hot Reload

Jetpack Compose supports hot reload:
1. Make code changes
2. Click "Apply Changes" (Ctrl+Alt+F10) to reload without restart
3. App UI updates instantly

### Debugging

**Logcat (View logs):**
```bash
./gradlew connectedCheck
adb logcat
```

**Android Studio Debugger:**
1. Set breakpoints (click line number)
2. Run in debug mode (Shift+F9)
3. Step through code, inspect variables

**Network Inspector:**
- Tools → Network Profiler
- View all HTTP requests/responses
- Useful for debugging API calls

### Project Structure

```
frontend/
├── app/src/main/
│   ├── java/com/cpen321/movietier/
│   │   ├── data/                # Data layer
│   │   │   ├── api/            # Retrofit API interfaces
│   │   │   ├── repository/      # Repository implementations
│   │   │   ├── local/           # DataStore (tokens, preferences)
│   │   │   └── model/           # DTOs
│   │   ├── domain/              # Domain layer
│   │   │   ├── model/           # Domain entities
│   │   │   └── usecase/         # Business logic
│   │   ├── ui/                  # UI layer (Jetpack Compose)
│   │   │   ├── auth/            # Sign in/up screens
│   │   │   ├── profile/         # Profile screens
│   │   │   ├── friends/         # Friend management screens
│   │   │   ├── feed/            # Activity feed screens
│   │   │   ├── ranking/         # Movie ranking screens
│   │   │   ├── recommendation/  # Discovery screens
│   │   │   ├── watchlist/       # Watchlist screens
│   │   │   ├── components/      # Reusable composables
│   │   │   ├── viewmodels/      # MVVM ViewModels
│   │   │   ├── navigation/      # Navigation setup
│   │   │   ├── theme/           # Material Design 3 theming
│   │   │   ├── util/            # UI utilities
│   │   │   └── common/          # Common composables
│   │   ├── di/                  # Hilt dependency injection
│   │   ├── fcm/                 # Firebase Cloud Messaging
│   │   ├── utils/               # General utilities
│   │   ├── MainActivity.kt
│   │   └── MovieTierApplication.kt
│   ├── res/                     # Resources (strings, colors, etc.)
│   └── AndroidManifest.xml
├── app/src/test/                # Unit tests
├── app/src/androidTest/         # Instrumented tests
├── build.gradle.kts             # App build config
├── proguard-rules.pro           # ProGuard configuration
└── README.md
```

### Architecture

The app follows **Clean Architecture** with **MVVM pattern:**

1. **Data Layer** - Database, API, DataStore
2. **Domain Layer** - Business logic, use cases
3. **UI Layer** - Screens, ViewModels, Composables

**Data Flow:**
```
User Input → ViewModel → Repository → API/DataStore → Database
                ↑                                           ↓
                ← Updates UI State ←← Observes StateFlow ←
```

### Key Technologies

- **Jetpack Compose** - Modern declarative UI
- **Material Design 3** - Material design components
- **Hilt** - Dependency injection
- **Coroutines** - Async/await pattern
- **Flow/StateFlow** - Reactive state management
- **Retrofit** - HTTP client
- **OkHttp** - HTTP interceptors
- **Coil** - Image loading
- **DataStore** - Secure preferences
- **Firebase Cloud Messaging** - Push notifications
