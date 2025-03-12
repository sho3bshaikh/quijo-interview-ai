import { config } from 'dotenv';

// Load environment variables
config();

export const environment = {
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_NAME || ''
  },
  gcp: {
    projectId: 'quijo-ai',
    bucketName: 'quijo_interview_dump'
  }
}; 