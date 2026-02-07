const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const verifySupabase = require('./middleware/verifySupabase');
const errorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./errors/appError');

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

// 404 handler for unmatched routes
app.use((req, res, next) => {
  next(new NotFoundError());
});

// Global error handler (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };
