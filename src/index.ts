import { connectToDatabase, closeDatabase, getInterview, updateInterviewQuestionStartTime, updateInterviewQuestionEndTime } from './database';
import { listBuckets } from './storage';
import { addVideoChunk, handleEndSession } from './videoHandler';
import { Buffer } from 'buffer';
import { SERVER_PORT } from './config';
import { textToSpeech } from './deepgram';

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
                const base64Audio = await textToSpeech(questions[0]);
                ws.send(JSON.stringify({
                  type: 'audio',
                  content: base64Audio,
                  data: questions[0]
                }));
                break;
              case 'answer':
                if (data >= questions.length) {
                  const endMessage = "Somya, we appreciate you taking the time to interview with us. Your responses were insightful. You will get to know about the results of the interview process soon.";
                  const endAudio = await textToSpeech(endMessage);
                  ws.send(JSON.stringify({
                    type: 'audio',
                    content: endAudio,
                    data: endMessage,
                    isLastMessage: true
                  }));
                } else {
                  const nextQuestionAudio = await textToSpeech(questions[data]);
                  ws.send(JSON.stringify({
                    type: 'audio',
                    content: nextQuestionAudio,
                    data: questions[data]
                  }));
                }
                break;
              case 'audio_start':
                await updateInterviewQuestionStartTime(sessionId, data.questionNumber, data.time);
                break;
              case 'audio_end':
                await updateInterviewQuestionEndTime(sessionId, data.questionNumber, data.time);
                break;
              case 'read':
                try {
                  const text = data;
                  if (!text) {
                    ws.send(JSON.stringify({ type: 'error', content: 'Text is required' }));
                    return;
                  }

                  const base64Audio = await textToSpeech(text);
                  
                  // Send the audio data to the client
                  ws.send(JSON.stringify({
                    type: 'audio',
                    content: base64Audio
                  }));

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