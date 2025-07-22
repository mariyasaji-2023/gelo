// backend/src/controllers/userController.js
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Get nearby users based on current user's location
 */
const getNearbyUsers = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { latitude, longitude, radius = 50 } = req.query;
    const currentUserId = req.userId;

    // Parse coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const searchRadius = parseFloat(radius);

    // Find nearby users
    const nearbyUsers = await User.findNearbyUsers(lat, lng, searchRadius);

    // Filter out current user
    const filteredUsers = nearbyUsers.filter(user => 
      user.id.toString() !== currentUserId.toString()
    );

    res.json({
      message: 'Nearby users retrieved successfully',
      users: filteredUsers,
      totalCount: filteredUsers.length,
      searchParams: {
        latitude: lat,
        longitude: lng,
        radius: searchRadius
      }
    });

  } catch (error) {
    console.error('Get nearby users error:', error);
    res.status(500).json({
      message: 'Internal server error while fetching nearby users'
    });
  }
};

/**
 * Get all users (for admin/testing purposes)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const currentUserId = req.userId;

    // Build search query
    const searchQuery = {
      _id: { $ne: currentUserId } // Exclude current user
    };

    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const users = await User.find(searchQuery)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(searchQuery);

    const usersWithPublicData = users.map(user => user.getPublicProfile());

    res.json({
      message: 'Users retrieved successfully',
      users: usersWithPublicData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page * limit < totalUsers,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      message: 'Internal server error while fetching users'
    });
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Validate user ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: 'Invalid user ID format'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Check if requesting own profile or another user's profile
    const isOwnProfile = user._id.toString() === currentUserId.toString();
    
    let userData;
    if (isOwnProfile) {
      // Return full profile for own profile
      userData = {
        ...user.getPublicProfile(),
        email: user.email // Include email for own profile
      };
    } else {
      // Return public profile for other users
      userData = user.getPublicProfile();
    }

    res.json({
      message: 'User retrieved successfully',
      user: userData,
      isOwnProfile
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      message: 'Internal server error while fetching user'
    });
  }
};

/**
 * Get users by status (online/offline)
 */
const getUsersByStatus = async (req, res) => {
  try {
    const { status = 'online' } = req.query;
    const currentUserId = req.userId;

    const isOnline = status === 'online';

    const users = await User.find({
      _id: { $ne: currentUserId },
      isOnline: isOnline
    }).select('-password').sort({ lastSeen: -1 });

    const usersWithPublicData = users.map(user => user.getPublicProfile());

    res.json({
      message: `${status.charAt(0).toUpperCase() + status.slice(1)} users retrieved successfully`,
      users: usersWithPublicData,
      totalCount: usersWithPublicData.length,
      status: status
    });

  } catch (error) {
    console.error('Get users by status error:', error);
    res.status(500).json({
      message: 'Internal server error while fetching users by status'
    });
  }
};

/**
 * Search users by name or bio
 */
const searchUsers = async (req, res) => {
  try {
    const { q: searchQuery, page = 1, limit = 10 } = req.query;
    const currentUserId = req.userId;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({
        message: 'Search query must be at least 2 characters long'
      });
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { name: { $regex: searchQuery.trim(), $options: 'i' } },
        { bio: { $regex: searchQuery.trim(), $options: 'i' } }
      ]
    })
    .select('-password')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ name: 1 });

    const totalResults = await User.countDocuments({
      _id: { $ne: currentUserId },
      $or: [
        { name: { $regex: searchQuery.trim(), $options: 'i' } },
        { bio: { $regex: searchQuery.trim(), $options: 'i' } }
      ]
    });

    const usersWithPublicData = users.map(user => user.getPublicProfile());

    res.json({
      message: 'Search completed successfully',
      users: usersWithPublicData,
      searchQuery: searchQuery.trim(),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
        hasNextPage: page * limit < totalResults,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      message: 'Internal server error while searching users'
    });
  }
};

module.exports = {
  getNearbyUsers,
  getAllUsers,
  getUserById,
  getUsersByStatus,
  searchUsers
};