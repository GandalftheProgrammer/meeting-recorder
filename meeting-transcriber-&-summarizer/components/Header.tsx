
import React from 'react';
import { MicrophoneIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="w-full text-center mb-8">
      <div className="flex items-center justify-center gap-3">
        <MicrophoneIcon className="w-8 h-8 text-blue-400" />
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Meeting Transcriber
        </h1>
      </div>
      <p className="mt-2 text-md text-gray-400 max-w-2xl mx-auto">
        Record your meetings, get real-time transcriptions, and generate a summary instantly.
      </p>
    </header>
  );
};
