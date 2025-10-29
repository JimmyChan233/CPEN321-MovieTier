// Load environment variables first
import config from './config';
import express, { Application, Request, Response, NextFunction } from 'express';
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
import { logger } from './utils/logger';
import { sseService } from './services/sse/sseService';

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

// Connect to MongoDB with retry logic
async function connectToDatabase(maxRetries = 5, retryDelay = 2000) {
  const mongoUri = config.mongodbUri;
  logger.info('Connecting to MongoDB...', { uri: mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(mongoUri);
      logger.success('Connected to MongoDB');
      return true;
    } catch (err: unknown) {
      if (attempt === maxRetries) {
        logger.error(`MongoDB connection failed after ${maxRetries} attempts:`, (err as Error).message);
        return false;
      }
      logger.warn(`MongoDB connection attempt ${attempt}/${maxRetries} failed. Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return false;
}

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
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: dbConnected ? 'ok' : 'database_disconnected',
    timestamp: new Date().toISOString(),
    mongodb: dbConnected ? 'connected' : 'disconnected'
  });
});

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  const connected = await connectToDatabase();
  if (!connected) {
    logger.error('Failed to connect to MongoDB. Exiting.');
    throw new Error('MongoDB connection failed');
  }

  const server = app.listen(PORT, () => {
    logger.success(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
    logger.info(`API endpoints available at: http://localhost:${PORT}/api`);
  });

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Close all SSE connections
    await sseService.clear();

    // Close the server
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await mongoose.disconnect();
        logger.success('MongoDB connection closed');
      } catch (err) {
        logger.error('Error disconnecting from MongoDB:', (err as Error).message);
      }

      logger.success('Graceful shutdown completed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });
}

startServer().catch((err: unknown) => {
  logger.error('Failed to start server:', (err as Error).message);
  process.exit(1);
});

export default app;
