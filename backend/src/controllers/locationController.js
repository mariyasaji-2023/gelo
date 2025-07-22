// backend/src/controllers/locationController.js
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Update user's current location
 */
const updateLocation = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { latitude, longitude } = req.body;
    const userId = req.userId;

    // Parse coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Find user and update location
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update location
    await user.updateLocation(lat, lng);

    // Also update last seen and online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({
      message: 'Location updated successfully',
      location: {
        latitude: lat,
        longitude: lng,
        lastUpdated: new Date()
      },
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      message: 'Internal server error while updating location'
    });
  }
};

/**
 * Get user's current location
 */
const getCurrentLocation = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (!user.location.latitude || !user.location.longitude) {
      return res.status(404).json({
        message: 'Location not available. Please update your location first.'
      });
    }

    res.json({
      message: 'Current location retrieved successfully',
      location: {
        latitude: user.location.latitude,
        longitude: user.location.longitude,
        lastUpdated: user.location.lastUpdated
      },
      user: {
        id: user._id,
        name: user.name,
        isOnline: user.isOnline
      }
    });

  } catch (error) {
    console.error('Get current location error:', error);
    res.status(500).json({
      message: 'Internal server error while fetching location'
    });
  }
};

/**
 * Get location history (if needed for analytics)
 */
const getLocationHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.query;

    // For now, we're only storing current location
    // This could be extended to store location history in a separate collection
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Return current location as single history entry
    const locationHistory = user.location.latitude ? [{
      latitude: user.location.latitude,
      longitude: user.location.longitude,
      timestamp: user.location.lastUpdated
    }] : [];

    res.json({
      message: 'Location history retrieved successfully',
      history: locationHistory,
      totalCount: locationHistory.length
    });

  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({
      message: 'Internal server error while fetching location history'
    });
  }
};

/**
 * Calculate distance between two users
 */
const calculateUserDistance = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.userId;

    // Validate target user ID format
    if (!targetUserId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: 'Invalid target user ID format'
      });
    }

    // Get both users
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId)
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({
        message: 'One or both users not found'
      });
    }

    // Check if both users have location data
    if (!currentUser.location.latitude || !targetUser.location.latitude) {
      return res.status(400).json({
        message: 'Location data not available for one or both users'
      });
    }

    // Calculate distance
    const distance = calculateDistance(
      currentUser.location.latitude,
      currentUser.location.longitude,
      targetUser.location.latitude,
      targetUser.location.longitude
    );

    res.json({
      message: 'Distance calculated successfully',
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      unit: 'meters',
      users: {
        current: {
          id: currentUser._id,
          name: currentUser.name,
          location: currentUser.location
        },
        target: {
          id: targetUser._id,
          name: targetUser.name,
          location: targetUser.location
        }
      }
    });

  } catch (error) {
    console.error('Calculate distance error:', error);
    res.status(500).json({
      message: 'Internal server error while calculating distance'
    });
  }
};

/**
 * Helper function to calculate distance between two coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = {
  updateLocation,
  getCurrentLocation,
  getLocationHistory,
  calculateUserDistance
};