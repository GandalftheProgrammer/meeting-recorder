import React, { useState, useRef, useCallback, useEffect } from 'react';
// Fix: The `LiveSession` type is not exported from `@google/genai`. It is now inferred and exported from `geminiService.ts`.
import type { LiveSession } from './services/geminiService';
import { startLiveSession, stopLiveSession, generateSummary, startNewGeminiSession } from './services/geminiService';
import { DriveConfig } from './components/DriveConfig';
import { RecorderControl } from './components/RecorderControl';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { SummaryDisplay } from './components/SummaryDisplay';
import { Header } from './components/Header';
import { StatusIndicator } from './components/StatusIndicator';

type AppState = 'idle' | 'recording' | 'processing' | 'finished';
const SESSION_REFRESH_INTERVAL_MS = 900000; // 15 minutes

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [driveFolderName, setDriveFolderName] = useState<string>('Zoom call met Henkie');
  const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  
  // Ref to hold the latest version of the transcript update logic
  // This is the key to fixing the stale closure bug.
  const onTranscriptUpdateRef = useRef((transcript: string, isFinal: boolean) => {});

  // Always keep the ref updated with the latest state setters
  onTranscriptUpdateRef.current = (transcript: string, isFinal: boolean) => {
      if (isFinal) {
          setTranscriptionHistory(prev => [...prev, transcript]);
          setCurrentTranscription('');
      } else {
          setCurrentTranscription(transcript);
      }
  };

  const resetState = () => {
    setAppState('idle');
    setTranscriptionHistory([]);
    setCurrentTranscription('');
    setSummary('');
    setError(null);
    sessionRef.current = null;
    streamRef.current = null;
    audioProcessorRef.current = null;
    audioContextRef.current = null;
    if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
    }
  };

  const handleStopRecording = useCallback(async () => {
    setAppState('processing');
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (streamRef.current && audioProcessorRef.current && sessionRef.current && audioContextRef.current) {
      stopLiveSession(
        streamRef.current,
        audioProcessorRef.current,
        sessionRef.current,
        audioContextRef.current
      );
    }
    
    // Use a functional state update to get the very latest transcript
    const finalTranscript = [...transcriptionHistory, currentTranscription].filter(line => line.trim() !== '').join('\n');
    
    if (finalTranscript.trim().length < 10) {
        setSummary("Not enough content to generate a summary.");
        setAppState('finished');
        return;
    }

    try {
      const generatedSummary = await generateSummary(finalTranscript);
      setSummary(generatedSummary);
    } catch (err) {
      console.error('Failed to generate summary:', err);
      setError('Could not generate summary. Please try again.');
      setSummary('Summary generation failed.');
    } finally {
      setAppState('finished');
    }
  }, [transcriptionHistory, currentTranscription]);
  
  // This is a stable callback that will be passed to the Gemini service.
  // It never changes, but it always calls the latest logic via the ref.
  const stableOnTranscriptUpdate = useCallback((transcript: string, isFinal: boolean) => {
    onTranscriptUpdateRef.current(transcript, isFinal);
  }, []);

  const handleSessionRefresh = useCallback(async () => {
    console.log(`Refreshing session after ${SESSION_REFRESH_INTERVAL_MS / 1000} seconds...`);

    // Clean up old session and processor, but keep stream and audio context
    if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }
    if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
        audioProcessorRef.current = null;
    }

    if (!audioContextRef.current || !streamRef.current) {
        console.error("Audio context or stream is missing, cannot refresh session.");
        setError("A critical error occurred. Recording has stopped.");
        handleStopRecording();
        return;
    }

    try {
        const { session, processor } = await startNewGeminiSession(
            audioContextRef.current,
            streamRef.current,
            stableOnTranscriptUpdate // Use the stable callback
        );
        sessionRef.current = session;
        audioProcessorRef.current = processor;
        console.log('%c✅ Session successfully refreshed!', 'color: #22c55e; font-weight: bold; font-size: 14px;');
    } catch (err) {
        console.error("Failed to refresh session:", err);
        setError("Connection to transcription service lost. Recording has stopped.");
        handleStopRecording();
    }
  }, [handleStopRecording, stableOnTranscriptUpdate]);


  const handleStartRecording = useCallback(async () => {
    resetState();
    setAppState('recording');
    setError(null);

    try {
      const { session, stream, audioContext, processor } = await startLiveSession(
        stableOnTranscriptUpdate // Use the stable callback
      );
      sessionRef.current = session;
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      audioProcessorRef.current = processor;

      // Start the session refresh timer
      refreshIntervalRef.current = window.setInterval(handleSessionRefresh, SESSION_REFRESH_INTERVAL_MS);

    } catch (err) {
      console.error('Failed to start recording session:', err);
      setError('Could not start recording. Please check microphone permissions and try again.');
      setAppState('idle');
    }
  }, [handleSessionRefresh, stableOnTranscriptUpdate]);

  const handleToggleRecording = () => {
    if (appState === 'recording') {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };
  
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (streamRef.current) {
         stopLiveSession(
            streamRef.current,
            audioProcessorRef.current,
            sessionRef.current,
            audioContextRef.current
        );
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
        <Header />

        {appState === 'idle' && (
           <DriveConfig folderName={driveFolderName} setFolderName={setDriveFolderName} />
        )}

        <div className="flex-grow flex flex-col justify-center items-center my-8">
            <RecorderControl appState={appState} onClick={handleToggleRecording} />
            <StatusIndicator appState={appState} error={error} />
        </div>
        
        {appState !== 'idle' && (
          <div className="w-full space-y-8">
            <TranscriptionDisplay 
                history={transcriptionHistory} 
                current={currentTranscription} 
                isRecording={appState === 'recording'}
            />

            { (appState === 'processing' || appState === 'finished') && summary && (
                <SummaryDisplay summary={summary} folderName={driveFolderName} transcript={[...transcriptionHistory, currentTranscription].join('\n')} isLoading={appState === 'processing'} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;