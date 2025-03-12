import { Buffer } from 'buffer';

interface VideoBuffer {
  chunks: Buffer[];
  lastWrite: Date;
}

export class BufferManager {
  private static instance: BufferManager;
  private videoBuffers: Map<string, VideoBuffer>;
  private sessionVideoCounters: Map<string, number>;

  private constructor() {
    this.videoBuffers = new Map();
    this.sessionVideoCounters = new Map();
  }

  static getInstance(): BufferManager {
    if (!BufferManager.instance) {
      BufferManager.instance = new BufferManager();
    }
    return BufferManager.instance;
  }

  getBuffer(sessionId: string): VideoBuffer | undefined {
    return this.videoBuffers.get(sessionId);
  }

  createBuffer(sessionId: string): VideoBuffer {
    const buffer = {
      chunks: [],
      lastWrite: new Date()
    };
    this.videoBuffers.set(sessionId, buffer);
    
    if (!this.sessionVideoCounters.has(sessionId)) {
      this.sessionVideoCounters.set(sessionId, 0);
    }
    
    return buffer;
  }

  getVideoNumber(sessionId: string): number {
    return this.sessionVideoCounters.get(sessionId) || 0;
  }

  incrementVideoNumber(sessionId: string): void {
    const current = this.getVideoNumber(sessionId);
    this.sessionVideoCounters.set(sessionId, current + 1);
  }

  clearBuffer(sessionId: string): void {
    this.videoBuffers.delete(sessionId);
  }

  getTotalSize(buffer: VideoBuffer): number {
    return buffer.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  }

  shouldSave(buffer: VideoBuffer): boolean {
    const totalSize = this.getTotalSize(buffer);
    return totalSize > 5 * 1024 * 1024 || Date.now() - buffer.lastWrite.getTime() > 5000;
  }

  addChunk(sessionId: string, chunk: Buffer): VideoBuffer {
    let buffer = this.getBuffer(sessionId);
    if (!buffer) {
      buffer = this.createBuffer(sessionId);
    }
    
    buffer.chunks.push(chunk);
    buffer.lastWrite = new Date();
    return buffer;
  }

  getCombinedData(buffer: VideoBuffer): Buffer {
    return Buffer.concat(buffer.chunks);
  }
} 