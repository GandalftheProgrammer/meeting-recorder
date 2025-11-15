// Fix: Added a triple-slash directive to include Vite's client types. This resolves the TypeScript error for `import.meta.env`.
/// <reference types="vite/client" />

// Fix: The `LiveSession` type is no longer exported from `@google/genai`.
import { GoogleGenAI, Modality, Blob } from '@google/genai';

// This is the CRUCIAL change for Netlify deployment.
// It tells the app to look for the API key in the Netlify environment variables.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey });

const model = 'gemini-2.5-flash-native-audio-preview-09-2025';

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

// This new function handles creating a Gemini session with existing audio resources
// Fix: Removed explicit return type to allow for type inference.
export const startNewGeminiSession = async (
    audioContext: AudioContext,
    stream: MediaStream,
    onTranscriptUpdate: (transcript: string, isFinal: boolean) => void
) => {
    
    console.log('%c🚀 Starting new Gemini session...', 'color: #3b82f6; font-size: 14px;');
    let currentInputTranscription = '';

    const sessionPromise = ai.live.connect({
        model: model,
        config: {
            responseModalities: [Modality.AUDIO], // Audio out is required by the API but not used for transcription
            inputAudioTranscription: {},
        },
        callbacks: {
            onopen: () => console.log('🟢 Session connection opened.'),
            onclose: () => console.log('🔴 Session connection closed.'),
            onerror: (e) => console.error('Session error:', e),
            // Fix: The `isFinal` property no longer exists on `inputTranscription`. 
            // The logic is updated to use `turnComplete` to identify the final transcript.
            onmessage: (message) => {
                if (message.serverContent?.inputTranscription) {
                    const text = message.serverContent.inputTranscription.text;
                    
                    if (message.serverContent?.turnComplete) {
                        onTranscriptUpdate(currentInputTranscription + text, true);
                        currentInputTranscription = '';
                    } else {
                        currentInputTranscription += text;
                        onTranscriptUpdate(currentInputTranscription, false);
                    }
                } else if (message.serverContent?.turnComplete && currentInputTranscription) {
                    onTranscriptUpdate(currentInputTranscription, true);
                    currentInputTranscription = '';
                }
            },
        },
    });

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData);
        sessionPromise.then((session) => {
            session.sendRealtimeInput({ media: pcmBlob });
        });
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    
    const session = await sessionPromise;
    return { session, processor };
}

// Fix: Infer the LiveSession type from the return type of `startNewGeminiSession` and export it.
export type LiveSession = Awaited<ReturnType<typeof startNewGeminiSession>>['session'];

// Fix: Removed explicit return type to rely on inference.
export const startLiveSession = async (
    onTranscriptUpdate: (transcript: string, isFinal: boolean) => void
) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Fix: Cast window to `any` to allow access to vendor-prefixed `webkitAudioContext` for broader browser compatibility.
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    const { session, processor } = await startNewGeminiSession(audioContext, stream, onTranscriptUpdate);
    
    return { session, stream, audioContext, processor };
};

// Fix: Update the `session` parameter to use the locally inferred `LiveSession` type.
export const stopLiveSession = (
    stream: MediaStream | null,
    processor: ScriptProcessorNode | null,
    session: LiveSession | null,
    audioContext: AudioContext | null,
) => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (processor) {
        processor.disconnect();
    }
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
    if (session) {
        session.close();
    }
};

export const generateSummary = async (transcript: string): Promise<string> => {
    if (!transcript || transcript.trim().length === 0) {
        return "No content provided for summary.";
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyseer het volgende meeting transcript om de primaire taal te identificeren. Geef vervolgens een samenvatting van het gesprek in die specifieke taal, waarbij je uiteraard geen belangrijke dingen weg laat. Wees dus volledig. Gebruik bullet points om onderaan de samenvatting de genomen besluiten op te lijsten onder het kopje: "Genomen besluiten". En daaronder idem voor "Actiepunten" op te lijsten. \n\nTranscript:\n"""\n${transcript}\n"""`,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating summary:", error);
        throw new Error("Failed to connect with the summarization service.");
    }
};