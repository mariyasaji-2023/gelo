
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000/api',
  socketUrl: 'http://localhost:5000',
  
  // App configuration
  app: {
    name: 'Gelo',
    version: '1.0.0',
    description: 'Find People Near You'
  },

  // Location settings
  location: {
    defaultLatitude: 9.9312,  // Kochi, Kerala
    defaultLongitude: 76.2673,
    maxRadius: 1000, // meters
    minRadius: 10,   // meters
    defaultRadius: 50 // meters
  },

  // API settings
  api: {
    timeout: 15000, // 15 seconds for production
    retryAttempts: 3,
    retryDelay: 2000 // 2 seconds
  },

  // Real-time updates
  realTime: {
    enabled: true,
    updateInterval: 10000, // 10 seconds for production
    reconnectAttempts: 3,
    reconnectInterval: 5000 // 5 seconds
  },

  // Security settings
  security: {
    tokenExpirationBuffer: 300000, // 5 minutes before actual expiration
    maxLoginAttempts: 3,
    lockoutDuration: 900000 // 15 minutes for production
  },

  // Feature flags
  features: {
    bluetooth: true,
    networkView: true,
    autoRefresh: true,
    notifications: true,
    geolocation: true
  }
};