import { config } from 'dotenv';

// Load environment variables
config();

// Export configuration values
export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_NAME = process.env.MONGODB_NAME || '';
export const GCP_PROJECT_ID = 'quijo-ai';
export const GCP_BUCKET_NAME = 'quijo_interview_dump';
export const SERVER_PORT = parseInt(process.env.PORT || '3000', 10); // Default to port 3001 