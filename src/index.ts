import { connectToDatabase, closeDatabase, getInterview } from './database';
import { listBuckets } from './storage';
import { addVideoChunk, handleEndSession } from './videoHandler';
import { Buffer } from 'buffer';
import { SERVER_PORT } from './config';
import { createClient } from "@deepgram/sdk";

// WebSocket data interface
interface WebSocketData {
  sessionId: string;
  questions: any[];
}

// Message interface
interface WebSocketMessage {
  type: string;
  data: any;
}

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// Helper function to convert stream to buffer
async function getAudioBuffer(response: ReadableStream) {
    const reader = response.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const dataArray = chunks.reduce(
        (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
        new Uint8Array(0)
    );

    return Buffer.from(dataArray.buffer);
}

// Start server
async function startServer() {
  try {
    // Connect to services
    await connectToDatabase();
    await listBuckets();

    // Start Bun server
    Bun.serve({
      port: SERVER_PORT,
      // Handle WebSocket upgrade
      async fetch(req, server) {
        const url = new URL(req.url);
        const sessionId = url.searchParams.get('sessionId');

        if (!sessionId) {
          return new Response('Please provide a sessionId parameter', { status: 400 });
        }

        try {
          // Validate session
          const interview = await getInterview(sessionId);
          
          if (!interview) {
            return new Response('Invalid sessionId', { status: 400 });
          }

          // Upgrade the connection to WebSocket
          const upgraded = server.upgrade(req, {
            data: { sessionId, questions: interview.questions }
          });

          if (!upgraded) {
            return new Response('WebSocket upgrade failed', { status: 500 });
          }

          return new Response();
        } catch (error) {
          console.error('Error during WebSocket upgrade:', error);
          return new Response('Server error during WebSocket upgrade', { status: 500 });
        }
      },

      // WebSocket handlers
      websocket: {
        async message(ws: { data: WebSocketData; send: (data: string) => void; close: () => void }, message: string) {
          try {
            const { sessionId, questions } = ws.data;
            const { type, data } = JSON.parse(message) as WebSocketMessage;

            switch (type) {
              case 'start':
                ws.send(JSON.stringify({
                  type: 'start',
                  data: questions
                }));
                break;
              case 'read':
                try {
                  const text = data;
                  if (!text) {
                    ws.send(JSON.stringify({ type: 'error', content: 'Text is required' }));
                    return;
                  }

                  // Get audio from Deepgram
                  const response = await deepgram.speak.request(
                    { text },
                    {
                      model: "aura-asteria-en",
                      encoding: "linear16",
                      container: "wav",
                    }
                  );

                  const stream = await response.getStream();
                  
                  if (stream) {
                    // Convert stream to buffer
                    const audioBuffer = await getAudioBuffer(stream);
                    
                    // Convert buffer to base64 for sending over WebSocket
                    const base64Audio = audioBuffer.toString('base64');
                    
                    // Send the audio data to the client
                    ws.send(JSON.stringify({
                      type: 'audio',
                      content: base64Audio
                    }));
                  } else {
                    throw new Error('Failed to generate audio stream');
                  }

                } catch (error) {
                  console.error('Text-to-speech error:', error);
                  ws.send(JSON.stringify({
                    type: 'error',
                    content: 'Failed to convert text to speech'
                  }));
                }
                break;
              case 'video':
                const response = await addVideoChunk(sessionId, Buffer.from(data));
                ws.send(JSON.stringify({
                  type: 'acknowledge',
                  data: response
                }));
                break;

              case 'end':
                await handleEndSession(sessionId);
                ws.send(JSON.stringify({
                  type: 'end',
                  data: 'Interview ended successfully'
                }));
                ws.close();
                break;

              default:
                ws.send(JSON.stringify({
                  type: 'error',
                  data: 'Unknown message type'
                }));
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: 'Failed to process message'
            }));
          }
        },

        open(ws: { data: WebSocketData }) {
          const { sessionId } = ws.data;
          console.log(`Client connected with session ${sessionId}`);
        },

        close(ws: { data: WebSocketData }) {
          const { sessionId } = ws.data;
          console.log(`Client disconnected with session ${sessionId}`);
        }
      }
    });

    console.log(`Server started successfully on port ${SERVER_PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
}); 