import { MongoClient } from 'mongodb';
import { environment } from './environment';

export class Database {
  private static client: MongoClient;
  private static instance: Database;

  private constructor() {}

  static async getInstance(): Promise<Database> {
    if (!Database.instance) {
      Database.instance = new Database();
      await Database.connect();
    }
    return Database.instance;
  }

  private static async connect() {
    try {
      Database.client = new MongoClient(environment.mongodb.uri);
      await Database.client.connect();
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
  }

  getDb() {
    return Database.client.db(environment.mongodb.dbName);
  }

  async close() {
    await Database.client.close();
  }
} 