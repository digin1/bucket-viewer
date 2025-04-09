import React, { useState, useEffect } from 'react';

function ShareableLink() {
  const [showToast, setShowToast] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  
  // Update the URL when it changes
  useEffect(() => {
    setCurrentUrl(window.location.href);
    
    // Listen for changes to the URL (like when navigating folders)
    const handleUrlChange = () => {
      setCurrentUrl(window.location.href);
    };
    
    // Add event listeners for URL changes
    window.addEventListener('popstate', handleUrlChange);
    
    // Custom event to catch programmatic URL changes
    window.addEventListener('urlchange', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('urlchange', handleUrlChange);
    };
  }, []);
  
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(currentUrl)
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
    <div className="relative flex items-center">
      <div className="flex-1 bg-blue-700 rounded px-3 py-1 mr-2 overflow-hidden">
        <p className="text-white text-sm truncate" title={currentUrl}>
          {currentUrl}
        </p>
      </div>
      <button
        className="px-3 py-1 bg-blue-800 text-white rounded hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex items-center"
        onClick={copyLinkToClipboard}
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy
      </button>
      
      {showToast && (
        <div className="absolute top-full mt-2 right-0 bg-gray-800 text-white px-4 py-2 rounded shadow-lg text-sm whitespace-nowrap z-50">
          Link copied to clipboard!
        </div>
      )}
    </div>
  );
}

export default ShareableLink;