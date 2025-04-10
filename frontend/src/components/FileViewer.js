import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import TextViewer from './FileTypeHandlers/TextViewer';
import ImageViewer from './FileTypeHandlers/ImageViewer';
import CsvViewer from './FileTypeHandlers/CsvViewer';
import DocxViewer from './FileTypeHandlers/DocxViewer';
import XlsxViewer from './FileTypeHandlers/XlsxViewer';

function FileViewer({ file, currentPath }) {
  const [fileData, setFileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSyncCommand, setShowSyncCommand] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [localBasePath, setLocalBasePath] = useState('');
  const syncCommandRef = useRef(null);
  
  // Format file size with proper units (B, KB, MB, GB, TB)
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    // Use TB for extremely large files
    if (i >= 4) {
      return `${(bytes / Math.pow(1024, 4)).toFixed(2)} TB`;
    }
    // Use GB for very large files
    else if (i === 3) {
      return `${(bytes / Math.pow(1024, 3)).toFixed(2)} GB`;
    }
    // Use MB for large files
    else if (i === 2) {
      return `${Math.round(bytes / Math.pow(1024, 2))} MB`;
    }
    // Use KB for medium files
    else if (i === 1) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    // Use B for small files
    else {
      return `${bytes} B`;
    }
  };
  
  // Handle clicks outside the sync command dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (syncCommandRef.current && !syncCommandRef.current.contains(event.target)) {
        setShowSyncCommand(false);
      }
    }
    
    // Add event listener when dropdown is open
    if (showSyncCommand) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSyncCommand]);
  
  // Get URL parameters for the sync command
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      endpoint: urlParams.get('endpoint'),
      bucket: urlParams.get('bucket') || ''
    };
  };
  
  // Set default local base path when bucket changes
  useEffect(() => {
    const { bucket } = getUrlParams();
    if (bucket) {
      setLocalBasePath(`./s3_${bucket.split('-').join('_')}`);
    }
  }, []);
  
  // Calculate the full local path that mirrors the S3 path structure
  const getFullLocalPath = () => {
    // Start with the base path
    let path = localBasePath;
    
    // If there's a current path, append it to maintain the same directory structure locally
    if (currentPath) {
      path += `/${currentPath}`;
    }
    
    return path;
  };
  
  // Update local path handler
  const handleLocalPathChange = (e) => {
    setLocalBasePath(e.target.value);
  };
  
  // Generate the AWS S3 sync command
  const getSyncCommand = () => {
    const { endpoint, bucket } = getUrlParams();
    // Don't proceed if bucket is empty or null
    if (!bucket) {
      return 'Please configure bucket in settings first';
    }
    return `aws s3 sync s3://${bucket}${currentPath ? '/' + currentPath : ''} ${getFullLocalPath()} --no-sign-request ${endpoint ? '--endpoint-url ' + endpoint : ''}`;
  };
  
  // Copy sync command to clipboard
  const copyCommandToClipboard = () => {
    navigator.clipboard.writeText(getSyncCommand())
      .then(() => {
        setCopiedToast(true);
        setTimeout(() => {
          setCopiedToast(false);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  // Get file icon based on extension
  const getFileIcon = (extension) => {
    const iconMap = {
      // Text files
      'txt': '📄',
      'md': '📝',
      'json': '📋',
      'xml': '📋',
      'html': '🌐',
      'css': '🎨',
      'js': '📜',
      'py': '🐍',
      
      // Images
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'tif': '🖼️',
      'tiff': '🖼️',
      'svg': '🖼️',
      
      // Documents
      'pdf': '📑',
      'docx': '📘',
      'doc': '📘',
      'xlsx': '📊',
      'xls': '📊',
      
      // Other
      'csv': '📊',
      'zip': '🗜️',
      'tar': '🗜️',
      'gz': '🗜️',
      'rar': '🗜️',
      
      // Media
      'mp3': '🎵',
      'wav': '🎵',
      'mp4': '🎬',
      'mov': '🎬',
      'avi': '🎬',
      
      // Programming
      'java': '☕',
      'cpp': '🔧',
      'c': '🔧',
      'rb': '💎',
      'php': '🐘',
      'go': '🔵',
      'rs': '🦀'
    };
    
    return iconMap[extension?.toLowerCase()] || '📄';
  };
  
  // Large file preview component
  const LargeFilePreview = ({ fileData }) => {
    const icon = getFileIcon(fileData.extension);
    
    return (
      <div className="text-center p-8">
        <div className="mb-6 text-9xl">{icon}</div>
        <h2 className="text-xl font-medium mb-4">{fileData.name || 'Large File'}</h2>
        <p className="mb-4 text-amber-600">{fileData.preview}</p>
        <p className="text-gray-600 mb-8">
          Files over 100MB can be downloaded but not previewed in the browser.
        </p>
        <button 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={handleDownload}
        >
          Download File
        </button>
      </div>
    );
  };
  
  useEffect(() => {
    if (!file) return;
    
    const fetchFilePreview = async () => {
      setIsLoading(true);
      setError(null);
      
      // Check if file is an archive file
      const fileExt = file.extension?.toLowerCase();
      if (['zip', 'tar', 'gz', 'rar'].includes(fileExt)) {
        setFileData({
          type: 'zip',
          preview: 'Archive files cannot be previewed. Please download to view contents.',
          size: file.size || 0,
          name: file.name,
          extension: file.extension
        });
        setIsLoading(false);
        return;
      }
      
      // Check if file size exceeds preview limit (100MB = 104857600 bytes)
      const MAX_PREVIEW_SIZE = 104857600;
      if (file.size > MAX_PREVIEW_SIZE) {
        setFileData({
          type: 'too_large',
          preview: `This file is ${formatFileSize(file.size)}, which exceeds the preview size limit.`,
          size: file.size,
          name: file.name,
          extension: file.extension
        });
        setIsLoading(false);
        return;
      }
      
      try {
        // Pass the file size to the backend to avoid unnecessary head_object calls
        const response = await axios.get(`/api/file?path=${file.path}&preview=true&size=${file.size || 0}`);
        setFileData(response.data);
      } catch (err) {
        setError('Failed to load file preview: ' + (err.response?.data?.error || err.message));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFilePreview();
  }, [file]);
  
  const handleDownload = () => {
    if (!file) return;
    
    // Create download link - allow all sizes
    window.open(`/api/file?path=${file.path}`, '_blank');
  };
  
  // Render empty state if no file is selected
  if (!file) {
    const { bucket } = getUrlParams();
    
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Current directory info header */}
        {currentPath && (
          <div className="bg-gray-100 p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium">
                  Current Directory: {currentPath || 'Root'}
                </h2>
              </div>
              {bucket && (
                <div className="relative">
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    onClick={() => setShowSyncCommand(!showSyncCommand)}
                  >
                    Download All Files
                  </button>
                  
                  {showSyncCommand && (
                    <div ref={syncCommandRef} className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-10 w-96">
                      <div className="p-3">
                        <h3 className="font-medium text-gray-800 mb-1">AWS S3 Sync Command</h3>
                        <p className="text-xs text-gray-600 mb-2">Use this command with AWS CLI to download all files in this directory:</p>
                        
                        <div className="bg-gray-100 p-2 rounded font-mono text-xs mb-2 overflow-x-auto text-gray-800">
                          {getSyncCommand()}
                        </div>
                        <div className="flex justify-end">
                          <button
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 focus:outline-none"
                            onClick={copyCommandToClipboard}
                          >
                            Copy Command
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {copiedToast && (
                    <div className="absolute top-full mt-2 right-0 bg-gray-800 text-white px-4 py-2 rounded shadow-lg text-sm whitespace-nowrap z-50">
                      Command copied to clipboard!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex-1 flex items-center justify-center bg-white p-8">
          <div className="text-center text-gray-500">
            <div className="text-5xl mb-4">📄</div>
            <p>Select a file to preview</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading file preview...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-8">
        <div className="text-center text-red-500 max-w-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  // Render file preview based on type
  return (
    <div className="h-full flex flex-col bg-white">
      {/* File info header */}
      <div className="bg-gray-100 p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium">{file.name}</h2>
            <p className="text-sm text-gray-500">
              {file.size ? formatFileSize(file.size) : ''}
              {file.lastModified ? ` • Last modified: ${new Date(file.lastModified).toLocaleString()}` : ''}
            </p>
          </div>
          <div className="flex space-x-2">
            {currentPath && (
              <div className="relative">
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  onClick={() => setShowSyncCommand(!showSyncCommand)}
                >
                  Download Directory
                </button>
                
                {showSyncCommand && (
                  <div ref={syncCommandRef} className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-10 w-96">
                    <div className="p-3">
                      <h3 className="font-medium text-gray-800 mb-1">AWS S3 Sync Command</h3>
                      <p className="text-xs text-gray-600 mb-2">Use this command with AWS CLI to download all files in this directory:</p>
                      
                      <div className="bg-gray-100 p-2 rounded font-mono text-xs mb-2 overflow-x-auto text-gray-800">
                        {getSyncCommand()}
                      </div>
                      <div className="flex justify-end">
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 focus:outline-none"
                          onClick={copyCommandToClipboard}
                        >
                          Copy Command
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {copiedToast && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-800 text-white px-4 py-2 rounded shadow-lg text-sm whitespace-nowrap z-50">
                    Command copied to clipboard!
                  </div>
                )}
              </div>
            )}
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              onClick={handleDownload}
            >
              Download
            </button>
          </div>
        </div>
      </div>
      
      {/* File content */}
      <div className="flex-1 overflow-auto p-4">
        {fileData && (
          <>
            {fileData.type === 'text' && (
              <TextViewer content={fileData.preview} extension={fileData.extension} />
            )}
            
            {fileData.type === 'image' && (
              <ImageViewer base64Data={fileData.preview} mime={fileData.mime} />
            )}
            
            {fileData.type === 'csv' && (
              <CsvViewer data={fileData.preview} />
            )}
            
            {fileData.type === 'xlsx' && (
              <XlsxViewer data={fileData.preview} />
            )}
            
            {fileData.type === 'docx' && (
              <DocxViewer content={fileData.preview} />
            )}
            
            {/* Large file display with appropriate icon */}
            {fileData.type === 'too_large' && (
              <LargeFilePreview fileData={fileData} />
            )}
            
            {/* Zip file display with appropriate icon */}
            {fileData.type === 'zip' && (
              <div className="text-center p-8">
                <div className="mb-6 text-9xl">🗜️</div>
                <h2 className="text-xl font-medium mb-4">{file.name}</h2>
                <p className="mb-4 text-amber-600">{fileData.preview}</p>
                <p className="text-gray-600 mb-8">
                  Archive files cannot be previewed directly in the browser.
                </p>
                <button 
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={handleDownload}
                >
                  Download Archive
                </button>
              </div>
            )}
            
            {(fileData.type === 'binary' || fileData.type === 'unsupported') && (
              <div className="text-center p-8">
                <div className="mb-6 text-9xl">{getFileIcon(file.extension) || '📄'}</div>
                <h2 className="text-xl font-medium mb-4">{file.name}</h2>
                <p className="mb-4 text-gray-600">{fileData.preview}</p>
                <p className="text-gray-600 mb-8">
                  This file type cannot be previewed in the browser.
                </p>
                <button 
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={handleDownload}
                >
                  Download File
                </button>
              </div>
            )}
            
            {fileData.type === 'error' && (
              <div className="text-center p-8 text-red-500">
                <p>{fileData.preview}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FileViewer;