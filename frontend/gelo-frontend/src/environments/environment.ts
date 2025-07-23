// src/environments/environment.ts
export const environment = {
  production: false,
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
    timeout: 10000, // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  },

  // Real-time updates
  realTime: {
    enabled: true,
    updateInterval: 5000, // 5 seconds
    reconnectAttempts: 5,
    reconnectInterval: 3000 // 3 seconds
  },

  // Security settings
  security: {
    tokenExpirationBuffer: 300000, // 5 minutes before actual expiration
    maxLoginAttempts: 5,
    lockoutDuration: 300000 // 5 minutes
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
