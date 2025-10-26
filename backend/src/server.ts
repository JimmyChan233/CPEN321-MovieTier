// Load environment variables first
import config from './config';
import express, { Application } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import friendRoutes from './routes/friendRoutes';
import movieRoutes from './routes/movieRoutes';
import feedRoutes from './routes/feedRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import watchlistRoutes from './routes/watchlistRoutes';
import quoteRoutes from './routes/quoteRoutes';
import { errorHandler } from './middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';

logger.info('Environment variables loaded');

const app: Application = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(method, originalUrl, res.statusCode, duration);
  });
  next();
});

// Database connection
const mongoUri = config.mongodbUri;
logger.info('Connecting to MongoDB...', { uri: mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') });

mongoose
  .connect(mongoUri)
  .then(() => {
    logger.success('Connected to MongoDB');
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Routes
logger.info('Registering API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/quotes', quoteRoutes);
logger.success('API routes registered');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.success(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API endpoints available at: http://localhost:${PORT}/api`);
});

export default app;
