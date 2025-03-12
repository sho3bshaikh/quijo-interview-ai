import { Buffer } from 'buffer';
import { uploadVideoChunk } from './storage';

// Store the next file number for each session
const nextFileNumber: Map<string, number> = new Map();

// Directly handle and store each 5-second video chunk
export async function addVideoChunk(sessionId: string, chunk: Buffer) {
  // Initialize file number if not exists
  if (!nextFileNumber.has(sessionId)) {
    nextFileNumber.set(sessionId, 0);
  }

  // Get and increment file number
  const fileNumber = nextFileNumber.get(sessionId)!;
  nextFileNumber.set(sessionId, fileNumber + 1);

  // Upload the chunk directly
  await uploadVideoChunk(sessionId, fileNumber, chunk);

  return `Video chunk stored as ${fileNumber}.mp4`;
}

// Handle end of session
export async function handleEndSession(sessionId: string) {
  nextFileNumber.delete(sessionId);
} 