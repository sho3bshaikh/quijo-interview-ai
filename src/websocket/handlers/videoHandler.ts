import { Buffer } from 'buffer';
import { VideoService } from '../../services/videoService';

export class VideoHandler {
  private static instance: VideoHandler;
  private videoService: VideoService;

  private constructor() {
    this.videoService = VideoService.getInstance();
  }

  static getInstance(): VideoHandler {
    if (!VideoHandler.instance) {
      VideoHandler.instance = new VideoHandler();
    }
    return VideoHandler.instance;
  }

  async handleVideoMessage(ws: any, sessionId: string, data: string): Promise<void> {
    try {
      const chunk = Buffer.from(data);
      const response = await this.videoService.handleVideoChunk(sessionId, chunk);
      
      ws.send(JSON.stringify({
        type: 'acknowledge',
        data: response
      }));
    } catch (error) {
      console.error('Error handling video data:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Failed to process video data'
      }));
    }
  }

  async handleEndMessage(ws: any, sessionId: string): Promise<void> {
    try {
      await this.videoService.handleEndSession(sessionId);
      
      ws.send(JSON.stringify({
        type: 'end',
        data: 'Interview ended successfully'
      }));

      ws.close();
    } catch (error) {
      console.error('Error handling end message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: 'Failed to end session'
      }));
    }
  }
} 