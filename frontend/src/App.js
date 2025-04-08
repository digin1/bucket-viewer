import React, { useState, useEffect } from 'react';
import BucketExplorer from './components/BucketExplorer';
import FileViewer from './components/FileViewer';
import ConfigPanel from './components/ConfigPanel';
import axios from 'axios';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [config, setConfig] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false); // Don't show config panel by default if URL params exist
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
        let url = '/api/config';
        if (endpoint && bucket) {
          url += `?endpoint=${encodeURIComponent(endpoint)}&bucket=${encodeURIComponent(bucket)}`;
          // Set isConfigOpen to false as we have valid parameters
          setIsConfigOpen(false);
        } else {
          // If no URL params, show config panel by default
          setIsConfigOpen(true);
        }
        
        const response = await axios.get(url);
        setConfig(response.data);
        
        // Set initial path from URL if provided
        if (path) {
          setCurrentPath(path);
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load configuration: ' + err.message);
        console.error(err);
        // Show config panel if there's an error
        setIsConfigOpen(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfig();
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
      setError(null);
    } catch (err) {
      setError('Failed to save configuration: ' + err.message);
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
            {config && (
              <p className="text-sm opacity-80">
                {config.bucket_name} • {config.endpoint_url}
              </p>
            )}
          </div>
          <button 
            className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setIsConfigOpen(true)}
          >
            Settings
          </button>
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
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
              onPathChange={setCurrentPath}
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
        Flask + React + Tailwind S3 Bucket Viewer
      </footer>
    </div>
  );
}

export default App;