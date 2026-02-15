import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function testConnection() {
  console.log('� Testing MongoDB connection...');
  
  // Mask credentials for logging
  const maskedUri = mongoUri!.replace(/\/\/.*@/, '//****:****@');
  console.log(`📡 URI: ${maskedUri}`);

  try {
    await mongoose.connect(mongoUri!);
    console.log('✅ MongoDB connected successfully!');
    
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      console.log(`� Database contains ${collections.length} collections.`);
    }
    
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed!');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
