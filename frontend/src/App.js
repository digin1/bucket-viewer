import React, { useState, useEffect } from 'react';
import BucketExplorer from './components/BucketExplorer';
import FileViewer from './components/FileViewer';
import ConfigPanel from './components/ConfigPanel';
import SyncCommandBox from './components/SyncCommandBox';
import axios from 'axios';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [config, setConfig] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get URL parameters
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      endpoint: urlParams.get('endpoint'),
      bucket: urlParams.get('bucket'),
      path: urlParams.get('path') || ''
    };
  };

  // Load configuration on component mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);

        // Get URL parameters
        const { endpoint, bucket, path } = getUrlParams();

        // If we have endpoint and bucket in URL, use these
        if (endpoint && bucket) {
          const response = await axios.get(`/api/config?endpoint=${encodeURIComponent(endpoint)}&bucket=${encodeURIComponent(bucket)}`);
          setConfig(response.data);
          
          // Set initial path from URL if provided
          if (path) {
            setCurrentPath(path);
          }
          
          // Don't show config panel as we have valid parameters
          setIsConfigOpen(false);
        } else {
          // If no URL params, check if there's a stored config
          const response = await axios.get('/api/config');
          
          // If there's a valid config with bucket name, use it
          if (response.data && response.data.bucket_name) {
            setConfig(response.data);
            setIsConfigOpen(false);
          } else {
            // Otherwise set default config and show config panel
            setConfig({
              endpoint_url: 'https://s3.amazonaws.com',
              bucket_name: ''
            });
            setIsConfigOpen(true);
          }
        }

        setError(null);
      } catch (err) {
        setError('Failed to load configuration: ' + err.message);
        console.error(err);
        
        // Set default config
        setConfig({
          endpoint_url: 'https://s3.amazonaws.com',
          bucket_name: ''
        });
        
        // Show config panel if there's an error
        setIsConfigOpen(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
    
    // Add event listener for URL changes (popstate)
    const handlePopState = () => {
      const { path } = getUrlParams();
      if (path !== currentPath) {
        setCurrentPath(path);
        // Reset selected file when path changes
        setSelectedFile(null);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Clean up
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Save configuration
  const saveConfig = async (newConfig) => {
    try {
      setIsLoading(true);
      await axios.post('/api/config', newConfig);
      setConfig(newConfig);
      setIsConfigOpen(false);
      // Reset selected file and path for new bucket
      setSelectedFile(null);
      setCurrentPath('');
      
      // Update URL to reflect new config
      const newParams = new URLSearchParams();
      if (newConfig.endpoint_url) newParams.set('endpoint', newConfig.endpoint_url);
      if (newConfig.bucket_name) newParams.set('bucket', newConfig.bucket_name);
      
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.pushState({ path: '' }, '', newUrl);
      
      setError(null);
    } catch (err) {
      setError('Failed to save configuration: ' + err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle path changes
  const handlePathChange = (newPath) => {
    setCurrentPath(newPath);
    // Reset selected file whenever the path changes
    setSelectedFile(null);
  };

  // Disconnect from bucket
  const disconnectBucket = async () => {
    try {
      setIsLoading(true);
      
      // Call the backend to clear the config
      await axios.delete('/api/config');
      
      // Clear selected file and path
      setSelectedFile(null);
      setCurrentPath('');
      
      // Update state with empty bucket
      setConfig({
        endpoint_url: 'https://s3.amazonaws.com',
        bucket_name: ''
      });
      
      // Clear URL parameters
      const newUrl = window.location.pathname;
      window.history.pushState({ path: '' }, '', newUrl);
      
      // Open config panel
      setIsConfigOpen(true);
      
      setError(null);
    } catch (err) {
      setError('Failed to disconnect: ' + err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">S3 Bucket Viewer</h1>
            {config && config.bucket_name && (
              <p className="text-sm opacity-80">
                {config.bucket_name} • {config.endpoint_url}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            {config && config.bucket_name && (
              <SyncCommandBox 
                bucket={config.bucket_name}
                endpoint={config.endpoint_url}
                currentPath={currentPath}
              />
            )}
            {config && config.bucket_name && (
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                onClick={disconnectBucket}
              >
                Disconnect
              </button>
            )}
            <button
              className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              onClick={() => setIsConfigOpen(true)}
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Show loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        </div>
      )}

      {/* Show error state */}
      {error && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500 p-8 max-w-lg text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p>{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              onClick={() => setIsConfigOpen(true)}
            >
              Configure Connection
            </button>
          </div>
        </div>
      )}

      {/* Main content when config is loaded */}
      {!isLoading && !error && config && !isConfigOpen && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - Bucket Explorer */}
          <div className="w-1/3 border-r border-gray-200 bg-white overflow-auto">
            <BucketExplorer
              onSelectFile={setSelectedFile}
              currentPath={currentPath}
              onPathChange={handlePathChange}
            />
          </div>

          {/* Right panel - File Viewer */}
          <div className="flex-1 overflow-auto">
            <FileViewer
              file={selectedFile}
              currentPath={currentPath}
            />
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {isConfigOpen && (
        <ConfigPanel
          config={config}
          onSave={saveConfig}
          onCancel={() => {
            // Only allow closing the config panel if we already have a valid config
            if (config && config.bucket_name) {
              setIsConfigOpen(false);
            }
          }}
        />
      )}

      <footer className="bg-gray-200 px-4 py-2 text-sm text-gray-600">
        <div className="flex items-center">
          <a
            href="https://github.com/digin1/s3-bucket-viewer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center ml-2 hover:underline"
          >
            {/* GitHub SVG Logo */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 16 16"
              className="mr-1"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38
                     0-.19-.01-.82-.01-1.5-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 
                     1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 
                     0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 
                     2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 
                     2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 
                     1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 
                     1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8 
                     8 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Github
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;