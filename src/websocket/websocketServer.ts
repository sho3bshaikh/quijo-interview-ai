import { Database } from '../config/database';
import { VideoHandler } from './handlers/videoHandler';
import { SessionHandler } from './handlers/sessionHandler';
import { getInterview } from '../services/sessionService';

interface WebSocketData {
  sessionId: string;
  questions: any[];
}

export class WebSocketServer {
  private videoHandler: VideoHandler;
  private sessionHandler: SessionHandler;
  private db: any;

  constructor() {
    this.videoHandler = VideoHandler.getInstance();
    this.sessionHandler = SessionHandler.getInstance();
  }

  async initialize() {
    const database = await Database.getInstance();
    this.db = database.getDb();
  }

  async handleUpgrade(req: Request): Promise<{ isValid: boolean; data?: WebSocketData }> {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return { isValid: false };
    }

    const interview = await getInterview(sessionId, this.db);
    
    if (!interview) {
      return { isValid: false };
    }

    return {
      isValid: true,
      data: {
        sessionId,
        questions: interview.questions
      }
    };
  }

  async handleMessage(ws: any, message: string): Promise<void> {
    try {
      const parsedMessage = JSON.parse(message);
      const websocketData = ws.data as WebSocketData;
      
      if (!this.isValidMessage(parsedMessage)) {
        this.sessionHandler.handleError(ws, 'Invalid message format');
        return;
      }

      switch (parsedMessage.type) {
        case 'start':
          this.sessionHandler.handleStartMessage(ws, websocketData.questions);
          break;

        case 'video':
          await this.videoHandler.handleVideoMessage(ws, websocketData.sessionId, parsedMessage.data);
          break;

        case 'end':
          await this.videoHandler.handleEndMessage(ws, websocketData.sessionId);
          break;

        default:
          this.sessionHandler.handleError(ws, 'Unknown message type');
      }
    } catch (error) {
      this.sessionHandler.handleError(ws, 'Failed to parse message');
    }
  }

  private isValidMessage(message: any): boolean {
    return message && 'type' in message && 'data' in message;
  }

  handleOpen(ws: any): void {
    console.log('Client connected');
  }

  handleClose(ws: any): void {
    console.log('Client disconnected');
  }
} 