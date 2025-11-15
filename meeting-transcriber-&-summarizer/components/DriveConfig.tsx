
import React from 'react';

interface DriveConfigProps {
  folderName: string;
  setFolderName: (name: string) => void;
}

export const DriveConfig: React.FC<DriveConfigProps> = ({ folderName, setFolderName }) => {
  return (
    <div className="w-full max-w-lg mx-auto mb-8 text-center">
      <label htmlFor="driveFolder" className="block text-sm font-medium text-gray-400 mb-2">
        Meeting Topic (for filenames)
      </label>
      <input
        id="driveFolder"
        type="text"
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="e.g., Q3_Project_Sync"
      />
      <p className="text-xs text-gray-500 mt-2">
        This will be used as a prefix for your downloaded files.
      </p>
    </div>
  );
};
