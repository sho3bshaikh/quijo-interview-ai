import { MongoClient, ObjectId } from 'mongodb';
import { MONGODB_URI, MONGODB_NAME } from './config';

// Create MongoDB client
const client = new MongoClient(MONGODB_URI);
let db: any;

// Connect to MongoDB
export async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db(MONGODB_NAME);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Close database connection
export async function closeDatabase() {
  await client.close();
}

// Database helper functions
export async function getInterview(sessionId: string) {
  try {
    return await db.collection('interview').findOne({ _id: new ObjectId(sessionId) });
  } catch (err) {
    console.error('Error getting interview:', err);
    return null;
  }
}

export async function getJD(id: string) {
  try {
    return await db.collection('jd').findOne({ _id: new ObjectId(id) });
  } catch (err) {
    console.error('Error getting JD:', err);
    return null;
  }
}

export async function getCV(id: string) {
  try {
    return await db.collection('cvs').findOne({ _id: new ObjectId(id) });
  } catch (err) {
    console.error('Error getting CV:', err);
    return null;
  }
} 