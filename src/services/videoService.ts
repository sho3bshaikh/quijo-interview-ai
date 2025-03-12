import { Buffer } from 'buffer';
import { StorageService } from '../config/storage';
import { BufferManager } from '../utils/bufferManager';

export class VideoService {
  private static instance: VideoService;
  private storageService: StorageService;
  private bufferManager: BufferManager;

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.bufferManager = BufferManager.getInstance();
  }

  static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  async handleVideoChunk(sessionId: string, chunk: Buffer): Promise<string> {
    try {
      const buffer = this.bufferManager.addChunk(sessionId, chunk);

      if (this.bufferManager.shouldSave(buffer)) {
        await this.saveVideoChunk(sessionId);
        return 'Video chunk processed and stored';
      }

      return 'Video chunk received';
    } catch (error) {
      console.error('Error handling video chunk:', error);
      throw new Error('Failed to process video chunk');
    }
  }

  private async saveVideoChunk(sessionId: string): Promise<void> {
    const buffer = this.bufferManager.getBuffer(sessionId);
    if (!buffer) return;

    const videoNumber = this.bufferManager.getVideoNumber(sessionId);
    this.bufferManager.incrementVideoNumber(sessionId);

    const completeData = this.bufferManager.getCombinedData(buffer);
    const filename = `${sessionId}/${videoNumber}.mp4`;

    const bucket = this.storageService.getBucket();
    const file = bucket.file(filename);

    // Create the folder if it doesn't exist
    await bucket.file(`${sessionId}/`).save('');

    await this.uploadToStorage(file, completeData);
    console.log(`Successfully uploaded video file: ${filename} (${completeData.length} bytes)`);

    // Clear the buffer after successful upload
    buffer.chunks = [];
    buffer.lastWrite = new Date();
  }

  private uploadToStorage(file: any, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const blobStream = file.createWriteStream({
        resumable: false,
        metadata: {
          contentType: 'video/mp4'
        }
      });

      blobStream.on('error', (error: Error) => {
        console.error('Error uploading to GCS:', error);
        reject(error);
      });

      blobStream.on('finish', () => {
        resolve();
      });

      blobStream.end(data);
    });
  }

  async handleEndSession(sessionId: string): Promise<void> {
    const buffer = this.bufferManager.getBuffer(sessionId);
    
    if (buffer && buffer.chunks.length > 0) {
      await this.saveVideoChunk(sessionId);
      this.bufferManager.clearBuffer(sessionId);
    }
  }
} 