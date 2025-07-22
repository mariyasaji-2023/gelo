// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getNearbyUsers, getAllUsers, getUserById } = require('../controllers/userController');
const { query } = require('express-validator');

// Validation middleware
const nearbyUsersValidation = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isFloat({ min: 1, max: 1000 })
    .withMessage('Radius must be between 1 and 1000 meters')
];

// Protected routes
router.get('/nearby', verifyToken, nearbyUsersValidation, getNearbyUsers);
router.get('/all', verifyToken, getAllUsers);
router.get('/:id', verifyToken, getUserById);

// Test route
router.get('/test/ping', (req, res) => {
  res.json({ 
    message: 'User routes working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;