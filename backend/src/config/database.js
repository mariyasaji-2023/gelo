// backend/src/config/database.js
const mongoose = require('mongoose');

/**
 * Database configuration and connection
 */
class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      if (this.isConnected) {
        console.log('📊 Database already connected');
        return this.connection;
      }

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gelo-app';
      
      // Mongoose connection options
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
        // Removed bufferCommands and bufferMaxEntries as they're deprecated
      };

      console.log('🔌 Connecting to MongoDB...');
      this.connection = await mongoose.connect(mongoUri, options);
      this.isConnected = true;

      console.log('✅ MongoDB connected successfully');
      console.log(`📍 Database: ${this.connection.connection.name}`);
      console.log(`🌐 Host: ${this.connection.connection.host}:${this.connection.connection.port}`);

      return this.connection;

    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (!this.isConnected) {
        console.log('📊 Database already disconnected');
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;
      this.connection = null;
      
      console.log('👋 MongoDB disconnected successfully');

    } catch (error) {
      console.error('❌ MongoDB disconnection error:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * Setup connection event listeners
   */
  setupEventListeners() {
    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Process termination events
    process.on('SIGINT', async () => {
      try {
        await this.disconnect();
        console.log('🔒 Database connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await this.disconnect();
        console.log('🔒 Database connection closed through app termination');
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
      }
    });
  }

  /**
   * Health check for database
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          message: 'Database not connected'
        };
      }

      // Simple ping to check connection
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        details: this.getStatus()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database health check failed',
        error: error.message
      };
    }
  }

  /**
   * Clear database (for testing purposes)
   */
  async clearDatabase() {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Cannot clear database in production environment');
      }

      const collections = await mongoose.connection.db.collections();
      
      for (let collection of collections) {
        await collection.deleteMany({});
      }

      console.log('🗑️ Database cleared successfully');

    } catch (error) {
      console.error('❌ Error clearing database:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const stats = await mongoose.connection.db.stats();
      
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };

    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const database = new Database();

// Setup event listeners
database.setupEventListeners();

module.exports = database;