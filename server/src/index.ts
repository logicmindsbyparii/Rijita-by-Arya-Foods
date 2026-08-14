import 'dotenv/config'; // Must be first to ensure env vars load before other imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';

import connectDB from './config/db';
import routes from './routes';
import { notFound, errorHandler } from './middleware/errorHandler';
import logger, { stream } from './utils/logger';
import { initCronJobs } from './utils/cron';

const app = express();

// ==================== MIDDLEWARE ====================

// Compression (response gzip)
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req: any, res: any) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // higher limit in development
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS — no hardcoded ports: development allows any origin, production requires CORS_ORIGINS
const isDev = process.env.NODE_ENV !== 'production';
const corsOriginsEnv = process.env.CORS_ORIGINS || process.env.CLIENT_URL || '';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    // In development, any origin is allowed (ports are dynamic)
    if (isDev) return callback(null, true);
    // In production, only allow explicitly configured origins
    if (corsOriginsEnv && corsOriginsEnv.split(',').map(s => s.trim()).includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging with custom logger
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev', { stream }));
} else {
  app.use(morgan('combined', { stream }));
}

// Static files (uploads) with fallback placeholder for missing images
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir, { fallthrough: true }));
app.use('/uploads', (_req, res) => {
  res.status(200).sendFile(path.join(uploadsDir, '.placeholder.png'), (err) => {
    if (err) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23fef3c7"/></svg>';
      res.set('Content-Type', 'image/svg+xml').send(Buffer.from(svg));
    }
  });
});

// ==================== ROUTES ====================
app.use('/api', routes);

// ==================== ERROR HANDLING ====================
app.use(notFound);
app.use(errorHandler);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5001;

// Graceful shutdown utilities — hoisted so process handlers can reference them
let serverInstance: ReturnType<typeof app.listen> | null = null;

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('unhandledRejection', (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  console.error('UNHANDLED REJECTION! Shutting down...', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
  gracefulShutdown('uncaughtException');
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize scheduled tasks
    initCronJobs();

    serverInstance = app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║         RIJITA by Arya Foods API            ║
║──────────────────────────────────────────────║
║  Server:    http://localhost:${PORT}          ║
║  API:       http://localhost:${PORT}/api      ║
║  Uploads:   http://localhost:${PORT}/uploads  ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(22)}║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
