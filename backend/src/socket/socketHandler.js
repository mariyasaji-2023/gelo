// backend/src/socket/socketHandler.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Store connected users and their socket connections
const connectedUsers = new Map();
let io = null; // Store io instance

/**
 * Main socket handler function
 */
function socketHandler(ioInstance) {
  io = ioInstance; // Store the io instance
  console.log('🔌 Socket.IO server initialized');

  io.on('connection', (socket) => {
    console.log(`👤 New socket connection: ${socket.id}`);

    // Handle user authentication via socket
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;
        
        if (!token) {
          socket.emit('auth_error', { message: 'Token required' });
          return;
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
          socket.emit('auth_error', { message: 'User not found' });
          return;
        }

        // Store user connection
        socket.userId = user._id.toString();
        connectedUsers.set(socket.userId, {
          socketId: socket.id,
          user: user.getPublicProfile(),
          lastActivity: new Date()
        });

        // Update user online status
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        // Join user to their own room for private messages
        socket.join(`user_${socket.userId}`);

        socket.emit('authenticated', { 
          message: 'Authentication successful',
          user: user.getPublicProfile()
        });

        console.log(`✅ User authenticated: ${user.name} (${socket.userId})`);

        // Broadcast user came online to nearby users
        broadcastToNearbyUsers(socket.userId, 'user_online', {
          userId: socket.userId,
          user: user.getPublicProfile()
        });

      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
      }
    });

    // Handle location updates
    socket.on('location_update', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { latitude, longitude } = data;

        if (!latitude || !longitude) {
          socket.emit('error', { message: 'Latitude and longitude required' });
          return;
        }

        // Update user location in database
        const user = await User.findById(socket.userId);
        if (user) {
          await user.updateLocation(latitude, longitude);
          
          // Update connected user info
          const connectedUser = connectedUsers.get(socket.userId);
          if (connectedUser) {
            connectedUser.user.location = {
              latitude,
              longitude,
              lastUpdated: new Date()
            };
            connectedUser.lastActivity = new Date();
          }

          // Find and send nearby users
          const nearbyUsers = await findNearbyConnectedUsers(socket.userId, latitude, longitude);
          socket.emit('nearby_users_update', { users: nearbyUsers });

          // Broadcast location update to nearby users
          broadcastToNearbyUsers(socket.userId, 'user_location_update', {
            userId: socket.userId,
            location: { latitude, longitude },
            user: user.getPublicProfile()
          });

          console.log(`📍 Location updated for user ${socket.userId}: ${latitude}, ${longitude}`);
        }

      } catch (error) {
        console.error('Location update error:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Handle request for nearby users
    socket.on('get_nearby_users', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const user = await User.findById(socket.userId);
        if (!user || !user.location.latitude || !user.location.longitude) {
          socket.emit('nearby_users_update', { users: [] });
          return;
        }

        const nearbyUsers = await findNearbyConnectedUsers(
          socket.userId, 
          user.location.latitude, 
          user.location.longitude
        );

        socket.emit('nearby_users_update', { users: nearbyUsers });

      } catch (error) {
        console.error('Get nearby users error:', error);
        socket.emit('error', { message: 'Failed to get nearby users' });
      }
    });

    // Handle ping to keep connection alive
    socket.on('ping', () => {
      if (socket.userId) {
        const connectedUser = connectedUsers.get(socket.userId);
        if (connectedUser) {
          connectedUser.lastActivity = new Date();
        }
      }
      socket.emit('pong');
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
      console.log(`👋 Socket disconnected: ${socket.id}`);

      if (socket.userId) {
        try {
          // Update user offline status
          const user = await User.findById(socket.userId);
          if (user) {
            user.isOnline = false;
            user.lastSeen = new Date();
            await user.save();
          }

          // Remove from connected users
          connectedUsers.delete(socket.userId);

          // Broadcast user went offline to nearby users
          broadcastToNearbyUsers(socket.userId, 'user_offline', {
            userId: socket.userId
          });

          console.log(`📴 User ${socket.userId} went offline`);

        } catch (error) {
          console.error('Disconnect handling error:', error);
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Periodic cleanup of inactive connections
  setInterval(() => {
    const now = new Date();
    const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    for (const [userId, userInfo] of connectedUsers.entries()) {
      if (now - userInfo.lastActivity > INACTIVE_THRESHOLD) {
        console.log(`🧹 Cleaning up inactive user: ${userId}`);
        connectedUsers.delete(userId);
        
        // Update user offline status
        User.findByIdAndUpdate(userId, { 
          isOnline: false, 
          lastSeen: new Date() 
        }).catch(err => console.error('Error updating offline status:', err));
      }
    }
  }, 60000); // Check every minute

  console.log('🚀 Socket handlers registered successfully');
}

/**
 * Find nearby connected users
 */
async function findNearbyConnectedUsers(currentUserId, latitude, longitude, radiusInMeters = 50) {
  try {
    const nearbyUsers = [];
    
    for (const [userId, userInfo] of connectedUsers.entries()) {
      // Skip current user
      if (userId === currentUserId) continue;
      
      const user = userInfo.user;
      if (!user.location || !user.location.latitude || !user.location.longitude) {
        continue;
      }

      const distance = calculateDistance(
        latitude, longitude,
        user.location.latitude, user.location.longitude
      );

      if (distance <= radiusInMeters) {
        nearbyUsers.push({
          ...user,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          isOnline: true // They're connected via socket
        });
      }
    }

    // Sort by distance
    nearbyUsers.sort((a, b) => a.distance - b.distance);

    return nearbyUsers;

  } catch (error) {
    console.error('Error finding nearby connected users:', error);
    return [];
  }
}

/**
 * Broadcast message to nearby users
 */
async function broadcastToNearbyUsers(currentUserId, event, data) {
  try {
    const currentUserInfo = connectedUsers.get(currentUserId);
    if (!currentUserInfo || !currentUserInfo.user.location) {
      return;
    }

    const { latitude, longitude } = currentUserInfo.user.location;
    const nearbyUsers = await findNearbyConnectedUsers(currentUserId, latitude, longitude);

    for (const nearbyUser of nearbyUsers) {
      const nearbyUserInfo = connectedUsers.get(nearbyUser.id);
      if (nearbyUserInfo && io) {
        // Emit to the specific user's room
        io.to(`user_${nearbyUser.id}`).emit(event, data);
      }
    }

  } catch (error) {
    console.error('Error broadcasting to nearby users:', error);
  }
}

/**
 * Calculate distance between two coordinates in meters
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

/**
 * Get all connected users (for debugging)
 */
function getConnectedUsers() {
  return Array.from(connectedUsers.values()).map(userInfo => ({
    user: userInfo.user,
    lastActivity: userInfo.lastActivity,
    socketId: userInfo.socketId
  }));
}

// Export the main handler function
module.exports = socketHandler;