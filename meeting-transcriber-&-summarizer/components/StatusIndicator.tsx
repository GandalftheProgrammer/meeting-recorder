
import React, { useState, useEffect } from 'react';

type StatusIndicatorProps = {
  appState: 'idle' | 'recording' | 'processing' | 'finished';
  error: string | null;
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ appState, error }) => {
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: number | undefined;
    if (appState === 'recording') {
      interval = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [appState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (error) {
    return <p className="mt-4 text-sm text-red-400 h-6 text-center">{error}</p>;
  }

  let statusText = '';
  let textColor = 'text-gray-400';

  switch (appState) {
    case 'recording':
      statusText = `Recording... ${formatTime(recordingTime)}`;
      textColor = 'text-red-400 animate-pulse';
      break;
    case 'processing':
      statusText = 'Processing and generating summary...';
      textColor = 'text-blue-400';
      break;
    case 'finished':
      statusText = 'Your summary is ready.';
      textColor = 'text-green-400';
      break;
    case 'idle':
      statusText = 'Ready to record.';
      break;
  }

  return <p className={`mt-4 text-sm h-6 text-center transition-colors duration-300 ${textColor}`}>{statusText}</p>;
};
