// backend/src/utils/mockData.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Test script to manually create mock data
async function testMockData() {
  let hasError = false;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- MongoDB URI defined:', !!process.env.MONGODB_URI);
    console.log('- MongoDB URI (masked):', process.env.MONGODB_URI ? 
      process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'undefined');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined. Check your .env file location and content.');
    }
    
    // Connect to MongoDB with better error handling
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Test the connection
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    console.log('🏓 Database ping successful:', result);
    
    // Import User model AFTER connection
    const User = require('../models/User');
    console.log('📋 User model imported successfully');
    
    // Test User model
    console.log('🧪 Testing User model...');
    const userCount = await User.countDocuments();
    console.log(`📊 Current user count: ${userCount}`);
    
    // Try to create one test user
    console.log('👤 Creating test user...');
    
    // Check if test user already exists
    const existingTestUser = await User.findOne({ email: 'test@example.com' });
    if (existingTestUser) {
      console.log('ℹ️ Test user already exists, skipping creation');
    } else {
      const testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        contact: '+91-1234567890',
        bio: 'Test user for debugging',
        location: {
          latitude: 9.9312,
          longitude: 76.2673,
          lastUpdated: new Date()
        }
      });
      
      await testUser.save();
      console.log('✅ Test user created successfully');
    }
    
    // Now try to import and run mock data
    console.log('🎭 Running mock data initialization...');
    await initializeMockData();
    
    // Check final count
    const finalCount = await User.countDocuments();
    console.log(`📊 Final user count: ${finalCount}`);
    
    // List all users
    const allUsers = await User.find({}, 'name email').limit(10);
    console.log('👥 Users in database:');
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    hasError = true;
    console.error('❌ Test failed:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('authentication failed')) {
      console.error(`
🔧 Authentication Error Fix:
1. Check your MongoDB Atlas credentials
2. Verify the username and password in your .env file
3. Make sure special characters in password are URL-encoded
4. Ensure the database user has proper permissions
      `);
    } else if (error.message.includes('MONGODB_URI')) {
      console.error(`
🔧 Environment Variable Fix:
1. Ensure .env file is in the backend directory
2. Check that .env file contains MONGODB_URI
3. Restart your terminal/process after changing .env
      `);
    }
    
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
  } finally {
    // Always close the connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(hasError ? 1 : 0);
  }
}

// Mock data initialization function
async function initializeMockData() {
  const User = require('../models/User');
  
  // Base location (Kochi, Kerala - you can adjust these coordinates)
  const baseLatitude = 9.9312;
  const baseLongitude = 76.2673;
  
  const mockUsers = [
    {
      name: 'Arjun Kumar',
      email: 'arjun.kumar@example.com',
      password: 'password123',
      contact: '+91-9876543210',
      bio: 'Software developer passionate about mobile apps',
      location: {
        latitude: baseLatitude + 0.0001,
        longitude: baseLongitude + 0.0001,
        lastUpdated: new Date()
      }
    },
    {
      name: 'Priya Nair',
      email: 'priya.nair@example.com',
      password: 'password123',
      contact: '+91-9876543211',
      bio: 'UI/UX designer who loves creating beautiful interfaces',
      location: {
        latitude: baseLatitude + 0.0002,
        longitude: baseLongitude - 0.0001,
        lastUpdated: new Date()
      }
    },
    {
      name: 'Rahul Menon',
      email: 'rahul.menon@example.com',
      password: 'password123',
      contact: '+91-9876543212',
      bio: 'Data scientist exploring machine learning',
      location: {
        latitude: baseLatitude - 0.0001,
        longitude: baseLongitude + 0.0002,
        lastUpdated: new Date()
      }
    },
    {
      name: 'Sneha Pillai',
      email: 'sneha.pillai@example.com',
      password: 'password123',
      contact: '+91-9876543213',
      bio: 'Product manager building next-gen solutions',
      location: {
        latitude: baseLatitude + 0.0003,
        longitude: baseLongitude + 0.0003,
        lastUpdated: new Date()
      }
    },
    {
      name: 'Vishnu Raj',
      email: 'vishnu.raj@example.com',
      password: 'password123',
      contact: '+91-9876543214',
      bio: 'Full-stack developer and tech enthusiast',
      location: {
        latitude: baseLatitude - 0.0002,
        longitude: baseLongitude - 0.0002,
        lastUpdated: new Date()
      }
    }
  ];
  
  console.log('🎭 Creating mock users...');
  
  for (const userData of mockUsers) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`ℹ️ User ${userData.name} already exists, skipping...`);
        continue;
      }
      
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${userData.name}`);
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.name}:`, error.message);
    }
  }
  
  console.log('🎭 Mock data initialization complete!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMockData();
}

module.exports = { initializeMockData };