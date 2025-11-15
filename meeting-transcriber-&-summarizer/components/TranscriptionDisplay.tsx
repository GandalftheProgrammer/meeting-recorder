
import React, { useEffect, useRef } from 'react';

interface TranscriptionDisplayProps {
  history: string[];
  current: string;
  isRecording: boolean;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ history, current, isRecording }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, current]);

  return (
    <div className="w-full">
        <h2 className="text-xl font-semibold mb-2 text-gray-300">Transcription</h2>
        <div 
            ref={scrollRef} 
            className="w-full h-64 bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-y-auto"
        >
            {history.map((line, index) => (
                <p key={index} className="mb-2 text-gray-300">{line}</p>
            ))}
            {current && <p className="text-blue-400">{current}</p>}
            {isRecording && !current && history.length === 0 && (
                <p className="text-gray-500 animate-pulse">Listening...</p>
            )}
        </div>
    </div>
  );
};
