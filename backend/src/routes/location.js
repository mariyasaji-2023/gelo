// backend/src/routes/location.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { updateLocation, getCurrentLocation } = require('../controllers/locationController');
const { body } = require('express-validator');

// Validation middleware
const updateLocationValidation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

// Protected routes
router.post('/update', verifyToken, updateLocationValidation, updateLocation);
router.get('/current', verifyToken, getCurrentLocation);

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Location routes working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;