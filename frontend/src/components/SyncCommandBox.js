import React, { useState } from 'react';

function SyncCommandBox({ bucket, endpoint, currentPath, localPath = './' }) {
  const [showToast, setShowToast] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Don't proceed if bucket is empty or null
  if (!bucket) {
    return null; // Don't render the component if there's no bucket
  }
  
  // Format the destination path
  const destPath = localPath + bucket.split('-').join('_');
  
  // Generate the command
  const syncCommand = `aws s3 sync s3://${bucket}${currentPath ? '/' + currentPath : ''} ${destPath} --no-sign-request ${endpoint ? '--endpoint-url ' + endpoint : ''}`;
  
  const copyCommandToClipboard = () => {
    navigator.clipboard.writeText(syncCommand)
      .then(() => {
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  return (
    <div className="relative">
      <button
        className="px-3 py-2 bg-green-700 text-white rounded hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Batch Download
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded shadow-lg z-50 w-96">
          <div className="p-3">
            <h3 className="font-medium text-gray-800 mb-1">AWS S3 Sync Command</h3>
            <p className="text-xs text-gray-600 mb-2">Use this command with AWS CLI to download all files:</p>
            <div className="bg-gray-100 p-2 rounded font-mono text-xs mb-2 overflow-x-auto text-gray-800">
              {syncCommand}
            </div>
            <div className="flex justify-end">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={copyCommandToClipboard}
              >
                Copy Command
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showToast && (
        <div className="absolute top-full mt-2 right-0 bg-gray-800 text-white px-4 py-2 rounded shadow-lg text-sm whitespace-nowrap z-50">
          Command copied to clipboard!
        </div>
      )}
    </div>
  );
}

export default SyncCommandBox;