# CPEN321-MovieTier
#### Rank movies. Share with friends. Discover together.


MovieTier is a social movie companion app that makes watching, ranking, and sharing films fun and interactive.
It helps friends discover new movies, compare tastes, and get personalized recommendations.

With MovieTier, users can:

- Sign in securely using Google authentication.

- Add friends and build their movie network.

- Browse a friend’s feed with recent rankings and activity.

- Create and share personal movie tiers and rankings.

- Get movie recommendations based on recent watches or top favourites.

By combining social interaction with personalized discovery, MovieTier makes movie watching more engaging and helps users find the next great film.

### Target Audience  
- **University students & young professionals** who use social apps (e.g., Beli, Letterboxd, Goodreads) and enjoy sharing opinions.  
- **Casual movie lovers** who want simple, fun recommendations instead of long reviews.  
- **Friend groups** who want to compare tastes, discover what to watch, and bond over shared favourites.  

## Contributors
- Jimmy Chen
- Kayli Cheung
- Muskan Bhatia
- Vansh Khandelia

## Tech Stack

### Frontend (Android)
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose with Material Design 3
- **Architecture**: MVVM + Clean Architecture
- **Dependency Injection**: Hilt
- **Networking**: Retrofit + OkHttp
- **Local Storage**: DataStore
- **Authentication**: Google Credential Manager API

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Google OAuth 2.0
- **External APIs**: TMDB (The Movie Database)

## Project Structure

```
CPEN321-MovieTier/
├── frontend/           # Android app
│   ├── app/
│   │   └── src/main/
│   │       ├── java/com/cpen321/movietier/
│   │       │   ├── data/         # Data layer (models, API, repositories)
│   │       │   ├── di/           # Dependency injection modules
│   │       │   └── ui/           # UI layer (screens, viewmodels)
│   │       └── res/              # Resources (layouts, drawables)
│   └── build.gradle.kts
├── backend/            # Node.js server
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth & validation
│   │   └── server.ts     # Entry point
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- **Android Studio** (latest version)
- **Node.js** (v18+) and npm
- **MongoDB** (local or cloud instance)
- **Google Cloud Console** account (for OAuth)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
   - Fill in your actual values in `.env`:
     - `GOOGLE_CLIENT_ID`: Your Google OAuth Web Client ID
     - `JWT_SECRET`: A secure random string
     - `MONGODB_URI`: Your MongoDB connection string
     - `TMDB_API_KEY`: Your TMDB API key (get from themoviedb.org)

4. **Start the server**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:3000`

### Frontend Setup

1. **Open project in Android Studio**
   - Open the `frontend` folder in Android Studio

2. **Configure local properties**
   - Copy `local.defaults.properties` to `local.properties`
   - Update values in `local.properties`:
     ```properties
     sdk.dir=/path/to/your/Android/sdk
     API_BASE_URL="http://10.0.2.2:3000/api/"
     GOOGLE_CLIENT_ID="YOUR_WEB_CLIENT_ID.apps.googleusercontent.com"
     ```

3. **Set up Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable Google+ API
   - Create OAuth 2.0 credentials:
     - **Web Client**: For backend verification
     - **Android Client**: For your app (add SHA-1 fingerprint)
   - Configure OAuth consent screen
   - Add test users for development

4. **Get SHA-1 fingerprint**
   ```bash
   cd frontend
   ./gradlew signingReport
   ```

5. **Sync and build**
   - Sync Gradle files
   - Build and run on emulator or device

## Features Implemented

### ✅ Authentication
- Google Sign-In with OAuth 2.0
- Automatic account creation for new users
- JWT token-based session management
- Secure token storage with DataStore

### ✅ Profile Management
- View user profile (name, email)
- Sign out functionality
- Delete account with confirmation dialog

### 🚧 In Progress
- Friend management system
- Activity feed
- Movie ranking and comparison
- Personalized recommendations

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in with Google
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signout` - Sign out (authenticated)
- `DELETE /api/auth/account` - Delete account (authenticated)

### Friends (Coming Soon)
- `GET /api/friends` - Get friend list
- `POST /api/friends` - Add friend
- `DELETE /api/friends/:id` - Remove friend

### Feed (Coming Soon)
- `GET /api/feed` - Get friend activity feed

### Movies (Coming Soon)
- `GET /api/movies/search` - Search movies
- `POST /api/movies/rank` - Rank a movie
- `GET /api/movies/recommendations` - Get recommendations

## Development Notes

- **Emulator Network**: Use `10.0.2.2` to access `localhost` from Android emulator
- **Physical Device**: Update `API_BASE_URL` to your computer's local IP
- **MongoDB**: Ensure MongoDB is running before starting backend
- **Environment Variables**: Never commit `.env` or `local.properties` files

## License

This project is part of CPEN 321 coursework at UBC.
