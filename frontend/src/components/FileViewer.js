import React, { useState, useEffect } from 'react';
import TextViewer from './FileTypeHandlers/TextViewer';
import ImageViewer from './FileTypeHandlers/ImageViewer';
import CsvViewer from './FileTypeHandlers/CsvViewer';
import DocxViewer from './FileTypeHandlers/DocxViewer';
import XlsxViewer from './FileTypeHandlers/XlsxViewer';
import s3Service from '../services/S3Service';
import fileProcessor from '../services/FileProcessor';

function FileViewer({ file, currentPath }) {
  const [fileData, setFileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSyncCommand, setShowSyncCommand] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  
  // Get URL parameters for the sync command
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      endpoint: urlParams.get('endpoint'),
      bucket: urlParams.get('bucket') || ''
    };
  };
  
  // Generate the AWS S3 sync command
  const getSyncCommand = () => {
    const { endpoint, bucket } = getUrlParams();
    // Don't proceed if bucket is empty or null
    if (!bucket) {
      return 'Please configure bucket in settings first';
    }
    const destPath = `./${bucket.split('-').join('_')}`;
    return `aws s3 sync s3://${bucket}${currentPath ? '/' + currentPath : ''} ${destPath} --no-sign-request ${endpoint ? '--endpoint-url ' + endpoint : ''}`;
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
  
  useEffect(() => {
    if (!file) return;
    
    const fetchFilePreview = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the file from S3
        const fileResponse = await s3Service.getFile(file.path);
        
        // Process the file for preview
        const preview = await fileProcessor.getFilePreview(
          fileResponse.data, 
          file.extension,
          fileResponse.contentType
        );
        
        setFileData(preview);
      } catch (err) {
        setError('Failed to load file preview: ' + err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFilePreview();
  }, [file]);
  
  const handleDownload = () => {
    if (!file) return;
    
    try {
      // Get a signed URL for download
      const downloadUrl = s3Service.getSignedUrl(file.path);
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        setError('Failed to generate download URL');
      }
    } catch (err) {
      setError('Failed to download file: ' + err.message);
      console.error(err);
    }
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
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    onClick={() => setShowSyncCommand(!showSyncCommand)}
                  >
                    Download All Files
                  </button>
                  
                  {showSyncCommand && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-10 w-96">
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
              {file.size ? `${(file.size / 1024).toFixed(2)} KB` : ''}
              {file.lastModified ? ` • Last modified: ${new Date(file.lastModified).toLocaleString()}` : ''}
            </p>
          </div>
          <div className="flex space-x-2">
            {currentPath && (
              <div className="relative">
                <button
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  onClick={() => setShowSyncCommand(!showSyncCommand)}
                >
                  Download Directory
                </button>
                
                {showSyncCommand && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-10 w-96">
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            
            {(fileData.type === 'binary' || fileData.type === 'unsupported') && (
              <div className="text-center p-8 text-gray-600">
                <p className="mb-4">{fileData.preview}</p>
                <p>Please download the file to view its contents.</p>
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