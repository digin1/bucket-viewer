import React, { useState, useEffect, useRef } from 'react';

function ShareableLink() {
  const [showToast, setShowToast] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [toastMessage, setToastMessage] = useState('Link copied to clipboard!');
  const textAreaRef = useRef(null);
  
  // Update the URL when it changes
  useEffect(() => {
    // Function to get the current full URL with parameters
    const updateUrl = () => {
      setCurrentUrl(window.location.href);
    };
    
    // Initial URL capture
    updateUrl();
    
    // Listen for URL changes
    const handleUrlChange = () => {
      updateUrl();
    };
    
    // Add event listeners for URL changes
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('urlchange', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('urlchange', handleUrlChange);
    };
  }, []);
  
  const copyLinkToClipboard = () => {
    // Ensure we're copying the most up-to-date URL
    const urlToCopy = window.location.href;
    
    // First try the modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(urlToCopy)
        .then(() => {
          showSuccessToast();
        })
        .catch(err => {
          console.error('Failed to copy with Clipboard API: ', err);
          fallbackCopyMethod(urlToCopy);
        });
    } else {
      // Fallback for browsers without Clipboard API support
      fallbackCopyMethod(urlToCopy);
    }
  };
  
  const fallbackCopyMethod = (text) => {
    try {
      // Create temporary textarea element
      const textArea = document.createElement('textarea');
      
      // Set its value and styling
      textArea.value = text;
      textArea.style.position = 'fixed';  // Avoid scrolling to bottom
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        showSuccessToast();
      } else {
        showManualCopyInstructions();
      }
    } catch (err) {
      console.error('Fallback copy method failed: ', err);
      showManualCopyInstructions();
    }
  };
  
  const showSuccessToast = () => {
    setToastMessage('Link copied to clipboard!');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };
  
  const showManualCopyInstructions = () => {
    setToastMessage('Press Ctrl+C to copy');
    setShowToast(true);
    
    // Create visible textarea with URL for manual copy
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.value = window.location.href;
      textArea.style.display = 'block';
      textArea.focus();
      textArea.select();
      
      // Hide after 10 seconds or when user clicks away
      setTimeout(() => {
        if (textArea) {
          textArea.style.display = 'none';
          setShowToast(false);
        }
      }, 10000);
    }
  };
  
  // Function to get domain and path for display
  const getDisplayUrl = () => {
    try {
      const url = new URL(currentUrl);
      return `${url.origin}${url.pathname}`;
    } catch (e) {
      return window.location.origin + window.location.pathname;
    }
  };
  
  // Function to get a simplified version of the query parameters
  const getDisplayParams = () => {
    try {
      // Always use the live URL parameters
      const params = new URLSearchParams(window.location.search);
      
      const endpoint = params.get('endpoint');
      const bucket = params.get('bucket');
      const path = params.get('path');
      
      let displayParams = '';
      
      if (bucket) {
        displayParams += `bucket=${bucket}`;
      }
      
      if (path) {
        displayParams += displayParams ? `&path=${path}` : `path=${path}`;
      }
      
      if (endpoint) {
        // Simplify the endpoint URL to just show the domain
        try {
          const endpointUrl = new URL(endpoint);
          const simplifiedEndpoint = endpointUrl.hostname;
          displayParams += displayParams ? `&endpoint=${simplifiedEndpoint}` : `endpoint=${simplifiedEndpoint}`;
        } catch (e) {
          displayParams += displayParams ? `&endpoint=${endpoint}` : `endpoint=${endpoint}`;
        }
      }
      
      return displayParams ? `?${displayParams}` : '';
    } catch (e) {
      return window.location.search || '';
    }
  };
  
  return (
    <div className="relative flex items-center">
      <div className="flex-1 bg-blue-700 rounded-l px-3 py-1 overflow-hidden flex items-center">
        <div className="flex-1 text-white text-sm truncate font-mono" title={currentUrl || window.location.href}>
          {getDisplayUrl()}<span className="text-blue-300">{getDisplayParams()}</span>
        </div>
      </div>
      <button
        className="px-3 py-1 bg-blue-800 text-white rounded-r hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex items-center border-l border-blue-600"
        onClick={copyLinkToClipboard}
        title="Copy full URL to clipboard"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy
      </button>
      
      {/* Hidden textarea for manual copy in case automatic methods fail */}
      <textarea 
        ref={textAreaRef}
        className="sr-only"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '0',
          display: 'none'
        }}
        readOnly
        aria-hidden="true"
      />
      
      {showToast && (
        <div className="absolute top-full mt-2 right-0 bg-gray-800 text-white px-4 py-2 rounded shadow-lg text-sm whitespace-nowrap z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default ShareableLink;