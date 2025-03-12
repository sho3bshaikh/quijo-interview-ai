import { ObjectId } from 'mongodb';
import { Database } from '../config/database';

export class SessionService {
  private static instance: SessionService;
  private db: any;

  private constructor() {}

  static async getInstance(): Promise<SessionService> {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
      const database = await Database.getInstance();
      SessionService.instance.db = database.getDb();
    }
    return SessionService.instance;
  }

  async checkValidSession(sessionId: string): Promise<boolean> {
    try {
      const result = await this.db.collection('interview').findOne({ _id: new ObjectId(sessionId) });
      return result !== null;
    } catch (err) {
      console.error('Error checking session:', err);
      return false;
    }
  }

  async getInterview(sessionId: string): Promise<any> {
    try {
      return await this.db.collection('interview').findOne({ _id: new ObjectId(sessionId) });
    } catch (err) {
      console.error('Error getting interview:', err);
      return null;
    }
  }

  async getJD(id: string): Promise<any> {
    try {
      return await this.db.collection('jd').findOne({ _id: new ObjectId(id) });
    } catch (err) {
      console.error('Error getting JD:', err);
      return null;
    }
  }

  async getCV(id: string): Promise<any> {
    try {
      return await this.db.collection('cvs').findOne({ _id: new ObjectId(id) });
    } catch (err) {
      console.error('Error getting CV:', err);
      return null;
    }
  }
}

// Helper function for external use
export async function getInterview(sessionId: string, db: any): Promise<any> {
  const sessionService = await SessionService.getInstance();
  return sessionService.getInterview(sessionId);
} 