import React, { useState, useEffect } from 'react';
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
  
  useEffect(() => {
    if (!file) return;
    
    const fetchFilePreview = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`/api/file?path=${file.path}&preview=true`);
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
    
    // Create download link
    window.open(`/api/file?path=${file.path}`, '_blank');
  };
  
  // Render empty state if no file is selected
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-8">
        <div className="text-center text-gray-500">
          <div className="text-5xl mb-4">📄</div>
          <p>Select a file to preview</p>
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
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={handleDownload}
          >
            Download
          </button>
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
            
            {fileData.type === 'binary' || fileData.type === 'unsupported' && (
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