import { createClient } from "@deepgram/sdk";

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

export async function textToSpeech(text: string): Promise<string> {
    if (!text) {
        throw new Error('Text is required');
    }

    // Get audio from Deepgram
    const response = await deepgram.speak.request(
        { text },
        {
            model: "aura-stella-en",
            encoding: "linear16",
            container: "wav",
        }
    );

    const stream = await response.getStream();
    
    if (!stream) {
        throw new Error('Failed to generate audio stream');
    }

    // Convert stream to buffer
    const audioBuffer = await getAudioBuffer(stream);
    
    // Convert buffer to base64 for sending over WebSocket
    return audioBuffer.toString('base64');
} 