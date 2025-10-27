import dotenv from 'dotenv';

// Load environment variables before anything else
dotenv.config();

// Validate critical secrets
function validateSecrets() {
  const errors: string[] = [];

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is not set in environment variables');
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID is not set in environment variables');
  }

  if (!process.env.TMDB_API_KEY) {
    errors.push('TMDB_API_KEY is not set in environment variables');
  }

  if (errors.length > 0) {
    console.error('Critical configuration missing:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}

// Only validate in production, but warn in development
if (process.env.NODE_ENV === 'production') {
  validateSecrets();
} else if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET not set. Using development default (NOT SECURE for production)');
}

export default {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/movietier',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
  tmdbApiKey: process.env.TMDB_API_KEY,
  tmdbBaseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
};
