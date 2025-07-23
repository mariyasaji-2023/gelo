// backend/src/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    const { name, email, password, contact, bio } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      contact: contact?.trim(),
      bio: bio?.trim()
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userData = user.getPublicProfile();

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      message: 'Internal server error during registration'
    });
  }
};

/**
 * Login user
 */
/**
 * Login user - FIXED VERSION
 */
/**
 * Login user - FIXED VERSION
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔍 Login attempt:', { email, password: '***' });

    // Validation
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Find user by email (password should be included by default)
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('🔍 User found:', user ? 'YES' : 'NO');
    console.log('🔍 User has password field:', user && user.password ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ User not found for email:', email.toLowerCase());
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check if password field exists
    if (!user.password) {
      console.log('❌ Password field is missing from user document');
      return res.status(500).json({
        message: 'Server error: User password not found'
      });
    }

    // Check password using comparePassword method
    console.log('🔍 Checking password...');
    let isPasswordValid;
    
    if (user.comparePassword) {
      // If comparePassword method exists, use it
      isPasswordValid = await user.comparePassword(password);
    } else {
      // Fallback to direct bcrypt compare
      const bcrypt = require('bcryptjs');
      isPasswordValid = await bcrypt.compare(password, user.password);
    }
    
    console.log('🔍 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);
    console.log('✅ Login successful for:', email);

    // Return user data (without password)
    const userData = user.getPublicProfile();

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      message: 'Internal server error during login'
    });
  }
};


/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const userData = user.getPublicProfile();
    res.json({
      user: userData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, contact, bio } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name.trim();
    if (contact !== undefined) user.contact = contact.trim();
    if (bio !== undefined) user.bio = bio.trim();

    await user.save();

    const userData = user.getPublicProfile();
    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      message: 'Internal server error during profile update'
    });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Internal server error during logout'
    });
  }
};

/**
 * Verify token (middleware can use this)
 */
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // Check if user still exists
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({
        message: 'Invalid token. User not found.'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired'
      });
    }
    
    console.error('Token verification error:', error);
    res.status(500).json({
      message: 'Internal server error during token verification'
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Internal server error during password change'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  logout,
  verifyToken,
  changePassword
};