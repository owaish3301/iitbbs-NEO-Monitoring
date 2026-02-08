import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import verifySupabase from './middleware/verifySupabase.js';
import errorHandler from './middleware/errorHandler.js';
import { NotFoundError } from './errors/appError.js';
import neoRoutes from './routes/neoRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'neo-monitoring-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Example protected endpoint (requires Supabase access token)
app.get('/api/me', verifySupabase, (req, res) => {
  res.json({
    user: req.supabaseUser,
  });
});

// NEO data routes
app.use('/api/neos', neoRoutes);

// Watchlist routes (authenticated)
app.use('/api/watchlist', watchlistRoutes);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  next(new NotFoundError());
});

// Global error handler (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app, server };
export default app;
