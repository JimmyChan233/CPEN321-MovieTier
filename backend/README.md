# MovieTier Backend API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
- Set your MongoDB URI
- Add Google Client ID
- Add JWT secret
- Add TMDB API key
- Add Firebase credentials

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
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
- `POST /api/movies/rank` - Add and rank a movie
- `POST /api/movies/compare` - Compare two movies

### Feed
- `GET /api/feed` - Get friend activity feed

### Recommendations
- `GET /api/recommendations` - Get movie recommendations

## Database Schema

See models in `src/models/` directory.
