import { Storage } from '@google-cloud/storage';
import { GCP_PROJECT_ID, GCP_BUCKET_NAME } from './config';
import { Buffer } from 'buffer';

// Create storage client
const storage = new Storage({ projectId: GCP_PROJECT_ID });
const bucket = storage.bucket(GCP_BUCKET_NAME);

// List buckets for verification
export async function listBuckets() {
  const [buckets] = await storage.getBuckets();
  console.log('Google Cloud Storage buckets:');
  buckets.forEach(bucket => {
    console.log(`- ${bucket.name}`);
  });
}

// Upload video chunk to storage
export async function uploadVideoChunk(sessionId: string, videoNumber: number, data: Buffer) {
  const filename = `${sessionId}/${videoNumber}.mp4`;
  const file = bucket.file(filename);

  // Create the folder if it doesn't exist
  await bucket.file(`${sessionId}/`).save('');

  // Upload the file
  await new Promise((resolve, reject) => {
    const blobStream = file.createWriteStream({
      resumable: false,
      metadata: {
        contentType: 'video/mp4'
      }
    });

    blobStream.on('error', (error) => {
      console.error('Error uploading to GCS:', error);
      reject(error);
    });

    blobStream.on('finish', () => {
      console.log(`Successfully uploaded video file: ${filename} (${data.length} bytes)`);
      resolve(true);
    });

    blobStream.end(data);
  });
} 