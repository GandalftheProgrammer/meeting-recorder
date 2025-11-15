
import React from 'react';
import { MicrophoneIcon, StopIcon, LoadingSpinner } from './icons';

type RecorderControlProps = {
  appState: 'idle' | 'recording' | 'processing' | 'finished';
  onClick: () => void;
};

export const RecorderControl: React.FC<RecorderControlProps> = ({ appState, onClick }) => {
  const isRecording = appState === 'recording';
  const isProcessing = appState === 'processing';
  const isDisabled = isProcessing;

  const buttonClasses = `
    relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-lg
    transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-4
    ${isRecording ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
    ${isDisabled ? 'cursor-not-allowed bg-gray-600' : 'hover:scale-105'}
  `;
  
  const iconClasses = "w-10 h-10 sm:w-12 sm:h-12 text-white";

  let icon = <MicrophoneIcon className={iconClasses} />;
  if (isRecording) {
    icon = <StopIcon className={iconClasses} />;
  } else if (isProcessing) {
    icon = <LoadingSpinner className={iconClasses} />;
  }
  
  const buttonText = isRecording ? "Stop" : (appState === 'idle' || appState === 'finished' ? "Start" : "Processing");

  return (
    <div className="flex flex-col items-center">
      <button onClick={onClick} disabled={isDisabled} className={buttonClasses} aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}>
        {icon}
      </button>
      <span className="mt-4 text-lg font-medium text-gray-300">{buttonText}</span>
    </div>
  );
};
