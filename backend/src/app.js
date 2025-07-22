// backend/src/app.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const locationRoutes = require('./routes/location');

// Import middleware
const { securityHeaders, corsMiddleware, rateLimiter } = require('./middleware/auth');

// Import utilities
const database = require('./config/database');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Global middleware
app.use(helmet()); // Security headers
app.use(securityHeaders); // Custom security headers
app.use(corsMiddleware); // CORS handling
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter(100, 15 * 60 * 1000)); // Rate limiting: 100 requests per 15 minutes

// Database connection
database.connect().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/location', locationRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const dbStats = await database.getStats();
    
    res.json({ 
      status: 'OK', 
      message: 'Gelo API is running',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      stats: dbStats,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Gelo API',
    version: '1.0.0',
    description: 'Find People Near You - Real-time location-based social app',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/profile': 'Update user profile',
        'POST /api/auth/logout': 'Logout user',
        'PUT /api/auth/change-password': 'Change password'
      },
      users: {
        'GET /api/users/nearby': 'Get nearby users',
        'GET /api/users/all': 'Get all users',
        'GET /api/users/:id': 'Get user by ID'
      },
      location: {
        'POST /api/location/update': 'Update user location',
        'GET /api/location/current': 'Get current user location'
      }
    },
    websocket: {
      events: ['authenticate', 'location_update', 'get_nearby_users', 'ping']
    }
  });
});

// Socket.IO connection handling
socketHandler(io);

// Store io instance for socket handler
socketHandler.io = io;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
    
  res.status(err.status || 500).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = { app, server };