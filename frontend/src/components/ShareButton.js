import React, { useState } from 'react';

function ShareButton() {
  const [showToast, setShowToast] = useState(false);
  
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
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
        className="px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex items-center"
        onClick={copyLinkToClipboard}
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share Link
      </button>
      
      {showToast && (
        <div className="absolute top-full mt-2 right-0 bg-gray-800 text-white px-4 py-2 rounded shadow-lg text-sm whitespace-nowrap z-50">
          Link copied to clipboard!
        </div>
      )}
    </div>
  );
}

export default ShareButton;