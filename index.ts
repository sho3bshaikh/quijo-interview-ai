import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { Storage, Bucket } from '@google-cloud/storage';
import { Buffer } from 'buffer';
import {getInterview,getCV,getJD } from "./session_db_helper.ts";

// Load environment variables
config();

const mongoClient = new MongoClient(process.env.MONGODB_URI || '');
const storage = new Storage({
  projectId: 'quijo-ai'
});



let db: any;

// Add after other global declarations
const videoBuffers: Map<string, {
  chunks: Buffer[];
  lastWrite: Date;
}> = new Map();

// Add this after other global declarations
const sessionVideoCounters: Map<string, number> = new Map();

// Connect to MongoDB before starting the server
try {
  await mongoClient.connect();
  db = mongoClient.db(process.env.MONGODB_NAME); // This will use the database specified in your connection string
  console.log('Connected to MongoDB');
  
  // List Google Cloud Storage buckets
  const [buckets] = await storage.getBuckets();
  console.log('Google Cloud Storage buckets:');
  buckets.forEach((bucket: Bucket) => {
    console.log(`- ${bucket.name}`);
  });

} catch (error) {
  console.error('MongoDB connection error:', error);
  process.exit(1);
}



// Your existing server code with MongoDB connection available
Bun.serve({
  async fetch(req, server) {
        const url = new URL(req.url);
        console.log(url.searchParams.get('sessionId'));
        if (url.searchParams.has('sessionId')) {
          console.log("Checking session");
    
          const interview = await getInterview(url.searchParams.get('sessionId') ?? "",db);
          
          

          console.log("Session valid: ", interview !== null);

          
          if (interview !== null) {
            const data = {
              sessionId: url.searchParams.get('sessionId'),
              questions: interview.questions,
            };
      
        
            if (server.upgrade(req,{ data })) {
              return;
            }
            return new Response("Upgrade failed", { status: 500 });
          } else {
            return new Response("Invalid sessionId", { status: 400 });
          }
        }
        return new Response("Please provide a sessionId parameter", { status: 400 });
    },
    websocket: {
   async   message(ws, message) {
        try {
          const websocketData:any = ws.data;
          const parsedMessage = JSON.parse(message as string);
          
          if (!('type' in parsedMessage) || !('data' in parsedMessage)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              data: 'Invalid message format' 
            }));
            return;
          }

          switch (parsedMessage.type) {
            case 'start':
              // Handle start message
              ws.send(JSON.stringify({
                type: 'start',
                data: websocketData.questions
              }));
              break;
            case "end":
              // Check if there are any remaining video chunks to upload
              const sessionId = websocketData.sessionId;
              const buffer = videoBuffers.get(sessionId);
              
              if (buffer && buffer.chunks.length > 0) {
                // Get current video number
                const videoNumber = sessionVideoCounters.get(sessionId)!;
                // Increment counter
                sessionVideoCounters.set(sessionId, videoNumber + 1);

                // Combine remaining chunks
                const completeData = Buffer.concat(buffer.chunks);
                
                // Upload final video chunk
                const filename = `${sessionId}/${videoNumber}.mp4`;
                const bucket = storage.bucket('quijo_interview_dump');
                const file = bucket.file(filename);
                
                try {
                  await file.save(completeData);
                  // Clear the buffer after successful upload
                  videoBuffers.delete(sessionId);
                } catch (err) {
                  console.error('Error uploading final video chunk:', err);
                }
              }

              // Send end acknowledgement
              ws.send(JSON.stringify({
                type: 'end',
                data: 'Interview ended successfully'
              }));

              // Close the websocket connection
              ws.close();
              break;
           

            case 'video':
              try {
                const sessionId = websocketData.sessionId;
                const chunk = Buffer.from(parsedMessage.data);
                
                // Get or create buffer for this session
                let buffer = videoBuffers.get(sessionId);
                if (!buffer) {
                  buffer = {
                    chunks: [],
                    lastWrite: new Date()
                  };
                  videoBuffers.set(sessionId, buffer);
                  // Initialize counter for new sessions
                  if (!sessionVideoCounters.has(sessionId)) {
                    sessionVideoCounters.set(sessionId, 0);
                  }
                }

                // Add new chunk
                buffer.chunks.push(chunk);
                buffer.lastWrite = new Date();

                // Calculate total size
                const totalSize = buffer.chunks.reduce((sum, chunk) => sum + chunk.length, 0);

                // Check if we should save (5MB or 5 seconds)
                if (totalSize > 5 * 1024 * 1024 || Date.now() - buffer.lastWrite.getTime() > 5000) {
                  // Get current video number before incrementing
                  const videoNumber = sessionVideoCounters.get(sessionId)!;
                  // Increment the counter immediately
                  sessionVideoCounters.set(sessionId, videoNumber + 1);

                  // Combine all chunks
                  const completeData = Buffer.concat(buffer.chunks);
                  
                  // Generate filename with sequential numbering
                  const filename = `${sessionId}/${videoNumber}.mp4`;

                  // Upload to GCS
                  const bucket = storage.bucket('quijo_interview_dump');
                  const file = bucket.file(filename);
                  
                  // Create the folder if it doesn't exist
                  await bucket.file(`${sessionId}/`).save('');
                  
                  const blobStream = file.createWriteStream({
                    resumable: false,
                    metadata: {
                      contentType: 'video/mp4'
                    }
                  });

                  await new Promise((resolve, reject) => {
                    blobStream.on('error', (error) => {
                      console.error('Error uploading to GCS:', error);
                      reject(error);
                    });

                    blobStream.on('finish', () => {
                      console.log(`Successfully uploaded video file: ${filename} (${totalSize} bytes)`);
                      resolve(true);
                    });

                    blobStream.end(completeData);
                  });

                  // Clear the buffer AFTER successful upload
                  buffer.chunks = [];
                  buffer.lastWrite = new Date();
                  
                  ws.send(JSON.stringify({
                    type: 'acknowledge',
                    data: 'Video chunk processed and stored'
                  }));
                } else {
                  // Just acknowledge the chunk
                  ws.send(JSON.stringify({
                    type: 'acknowledge',
                    data: 'Video chunk received'
                  }));
                }
              } catch (error) {
                console.error('Error handling video data:', error);
                ws.send(JSON.stringify({
                  type: 'error',
                  data: 'Failed to process video data'
                }));
              }
              break;
            
            default:
              ws.send(JSON.stringify({
                type: 'error',
                data: 'Unknown message type'
              }));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            data: 'Failed to parse message'
          }));
        }
      },
      open(ws) {
        console.log("Client connected");
      },
      close(ws) {
        console.log("Client disconnected");
      }
    },
});

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  await mongoClient.close();
  process.exit(0);
});

