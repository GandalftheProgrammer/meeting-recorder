
import React, { useState, useEffect } from 'react';
import { downloadTextFile } from '../utils/fileUtils';
import { CopyIcon, DownloadIcon, CheckIcon, LoadingSpinner, ShareIcon } from './icons';

interface SummaryDisplayProps {
  summary: string;
  transcript: string;
  folderName: string; // This is now used as a filename prefix
  isLoading: boolean;
}

const ActionButton: React.FC<{
  onClick: () => void;
  text: string;
  icon: React.ReactNode;
  isSuccess?: boolean;
  successText?: string;
}> = ({ onClick, text, icon, isSuccess = false, successText = 'Copied!' }) => (
  <button
    onClick={onClick}
    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all duration-200"
  >
    {isSuccess ? <CheckIcon className="w-4 h-4 text-green-400" /> : icon}
    <span>{isSuccess ? successText : text}</span>
  </button>
);


export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary, transcript, folderName, isLoading }) => {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (navigator.share) {
      setCanShare(true);
    }
  }, []);

  const handleCopy = (text: string, setTextCopied: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 2000);
  };

  const getFileName = (type: 'summary' | 'transcript') => {
    const date = new Date().toISOString().split('T')[0];
    return `${folderName.replace(/\s+/g, '_')}_${type}_${date}.txt`;
  }

  const handleDownload = (content: string, type: 'summary' | 'transcript') => {
    downloadTextFile(content, getFileName(type));
  };
  
  const handleShare = async (content: string, type: 'summary' | 'transcript') => {
      if (!navigator.share) {
          alert("Share functionality is not supported on your browser.");
          return;
      }
      try {
          await navigator.share({
              title: `${folderName} - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
              text: content,
          });
      } catch (err) {
          // This can happen if the user cancels the share dialog, so we'll just log it.
          console.log("Could not share content:", err);
      }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-300 mb-2">Summary</h2>
      <div className="w-full min-h-[16rem] bg-gray-800 rounded-lg p-4 border border-gray-700 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner className="w-8 h-8 text-blue-500" />
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
              {summary.split('\n').map((line, index) => <p key={index} className="my-1">{line}</p>)}
          </div>
        )}
      </div>
      {!isLoading && (
        <div className="mt-4 flex flex-col gap-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <p className="text-sm text-gray-400 text-center sm:text-left">
                Your files are ready. Use the actions below to save or share. The filename prefix is: <strong className="text-blue-400">{folderName}</strong>
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-around gap-4">
                {/* Summary Actions */}
                <div className="flex flex-col items-center gap-2">
                    <h3 className="font-semibold text-gray-200">Summary</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                        <ActionButton onClick={() => handleCopy(summary, setCopiedSummary)} text="Copy" icon={<CopyIcon className="w-4 h-4" />} isSuccess={copiedSummary} />
                        <ActionButton onClick={() => handleDownload(summary, 'summary')} text="Download" icon={<DownloadIcon className="w-4 h-4" />} />
                        {canShare && <ActionButton onClick={() => handleShare(summary, 'summary')} text="Share" icon={<ShareIcon className="w-4 h-4" />} />}
                    </div>
                </div>
                 {/* Transcript Actions */}
                <div className="flex flex-col items-center gap-2">
                    <h3 className="font-semibold text-gray-200">Transcript</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                        <ActionButton onClick={() => handleCopy(transcript, setCopiedTranscript)} text="Copy" icon={<CopyIcon className="w-4 h-4" />} isSuccess={copiedTranscript} />
                        <ActionButton onClick={() => handleDownload(transcript, 'transcript')} text="Download" icon={<DownloadIcon className="w-4 h-4" />} />
                        {canShare && <ActionButton onClick={() => handleShare(transcript, 'transcript')} text="Share" icon={<ShareIcon className="w-4 h-4" />} />}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
