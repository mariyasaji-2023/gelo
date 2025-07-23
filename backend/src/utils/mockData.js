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
    name: 'Aarav Reddy',
    email: 'aarav.reddy@example.com',
    password: 'securePass1!',
    contact: '+91-9000000001',
    bio: 'Backend developer who loves working with Node.js',
    location: {
      latitude: baseLatitude + 0.0004,
      longitude: baseLongitude - 0.0002,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Meera Iyer',
    email: 'meera.iyer@example.com',
    password: 'securePass2!',
    contact: '+91-9000000002',
    bio: 'Frontend developer with a flair for animations',
    location: {
      latitude: baseLatitude + 0.0005,
      longitude: baseLongitude + 0.0004,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Dev Patel',
    email: 'dev.patel@example.com',
    password: 'securePass3!',
    contact: '+91-9000000003',
    bio: 'Cloud engineer and DevOps specialist',
    location: {
      latitude: baseLatitude - 0.0003,
      longitude: baseLongitude + 0.0003,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Kavya Shenoy',
    email: 'kavya.shenoy@example.com',
    password: 'securePass4!',
    contact: '+91-9000000004',
    bio: 'Mobile developer with a love for React Native',
    location: {
      latitude: baseLatitude + 0.0006,
      longitude: baseLongitude - 0.0001,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Rohan Das',
    email: 'rohan.das@example.com',
    password: 'securePass5!',
    contact: '+91-9000000005',
    bio: 'JavaScript ninja exploring full-stack development',
    location: {
      latitude: baseLatitude - 0.0004,
      longitude: baseLongitude + 0.0005,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Nisha Verma',
    email: 'nisha.verma@example.com',
    password: 'securePass6!',
    contact: '+91-9000000006',
    bio: 'Tech lead with a focus on scalable systems',
    location: {
      latitude: baseLatitude + 0.0002,
      longitude: baseLongitude + 0.0006,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Ayaan Sheikh',
    email: 'ayaan.sheikh@example.com',
    password: 'securePass7!',
    contact: '+91-9000000007',
    bio: 'Web developer and open-source contributor',
    location: {
      latitude: baseLatitude + 0.0001,
      longitude: baseLongitude - 0.0005,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Diya Kapoor',
    email: 'diya.kapoor@example.com',
    password: 'securePass8!',
    contact: '+91-9000000008',
    bio: 'Cybersecurity enthusiast and ethical hacker',
    location: {
      latitude: baseLatitude + 0.0003,
      longitude: baseLongitude + 0.0001,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Yash Mittal',
    email: 'yash.mittal@example.com',
    password: 'securePass9!',
    contact: '+91-9000000009',
    bio: 'Python developer building smart automation tools',
    location: {
      latitude: baseLatitude - 0.0002,
      longitude: baseLongitude - 0.0003,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Sanya Joseph',
    email: 'sanya.joseph@example.com',
    password: 'securePass10!',
    contact: '+91-9000000010',
    bio: 'Product designer focused on usability and UX',
    location: {
      latitude: baseLatitude - 0.0005,
      longitude: baseLongitude + 0.0002,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Varun Bhat',
    email: 'varun.bhat@example.com',
    password: 'securePass11!',
    contact: '+91-9000000011',
    bio: 'AI/ML researcher solving real-world problems',
    location: {
      latitude: baseLatitude + 0.0007,
      longitude: baseLongitude - 0.0003,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Anaya Roy',
    email: 'anaya.roy@example.com',
    password: 'securePass12!',
    contact: '+91-9000000012',
    bio: 'QA engineer dedicated to bug-free releases',
    location: {
      latitude: baseLatitude + 0.0004,
      longitude: baseLongitude + 0.0006,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Ishaan Joshi',
    email: 'ishaan.joshi@example.com',
    password: 'securePass13!',
    contact: '+91-9000000013',
    bio: 'VR/AR developer building immersive experiences',
    location: {
      latitude: baseLatitude + 0.0001,
      longitude: baseLongitude + 0.0008,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Neha Menon',
    email: 'neha.menon@example.com',
    password: 'securePass14!',
    contact: '+91-9000000014',
    bio: 'Digital marketer with a creative mindset',
    location: {
      latitude: baseLatitude - 0.0006,
      longitude: baseLongitude + 0.0001,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Ritik Sharma',
    email: 'ritik.sharma@example.com',
    password: 'securePass15!',
    contact: '+91-9000000015',
    bio: 'Blockchain developer with interest in DeFi',
    location: {
      latitude: baseLatitude + 0.0008,
      longitude: baseLongitude - 0.0004,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Aisha Khan',
    email: 'aisha.khan@example.com',
    password: 'securePass16!',
    contact: '+91-9000000016',
    bio: 'Creative coder and UI artist',
    location: {
      latitude: baseLatitude - 0.0003,
      longitude: baseLongitude + 0.0007,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Zaid Hussain',
    email: 'zaid.hussain@example.com',
    password: 'securePass17!',
    contact: '+91-9000000017',
    bio: 'Game developer passionate about indie titles',
    location: {
      latitude: baseLatitude + 0.0006,
      longitude: baseLongitude + 0.0005,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Pooja Ramesh',
    email: 'pooja.ramesh@example.com',
    password: 'securePass18!',
    contact: '+91-9000000018',
    bio: 'Technical writer making complex topics simple',
    location: {
      latitude: baseLatitude + 0.0009,
      longitude: baseLongitude - 0.0006,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Harsh Vardhan',
    email: 'harsh.vardhan@example.com',
    password: 'securePass19!',
    contact: '+91-9000000019',
    bio: 'Automation tester and CI/CD expert',
    location: {
      latitude: baseLatitude - 0.0001,
      longitude: baseLongitude - 0.0004,
      lastUpdated: new Date()
    }
  },
  {
    name: 'Tanya George',
    email: 'tanya.george@example.com',
    password: 'securePass20!',
    contact: '+91-9000000020',
    bio: 'Entrepreneur building EdTech products',
    location: {
      latitude: baseLatitude + 0.0005,
      longitude: baseLongitude + 0.0009,
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