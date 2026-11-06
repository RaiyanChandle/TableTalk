import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import datasetsRouter from './routes/datasets.js';
import conversationsRouter from './routes/conversations.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);

// Parsers
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/datasets', datasetsRouter);
app.use('/api/conversations', conversationsRouter);

// Global Error Handler
app.use(errorHandler);

async function startServer() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`🚀 Backend server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log(`🌐 CORS enabled for origin: ${env.CLIENT_ORIGIN}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;

