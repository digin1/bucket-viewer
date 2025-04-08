import React, { useState, useEffect } from 'react';
import axios from 'axios';

function BucketExplorer({ onSelectFile, currentPath, onPathChange }) {
  const [bucketContent, setBucketContent] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Fetch data from the API
  const fetchBucketContent = async (prefix = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/list?prefix=${prefix}`);
      setBucketContent(response.data);
      onPathChange(prefix);
      
      // Update breadcrumbs
      updateBreadcrumbs(prefix);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied. Please check your credentials in Settings.');
      } else if (err.response?.status === 404) {
        setError('Bucket not found. Please check your bucket name in Settings.');
      } else {
        setError('Failed to load bucket content: ' + (err.response?.data?.error || err.message));
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update breadcrumbs based on current path
  const updateBreadcrumbs = (path) => {
    const parts = path.split('/').filter(Boolean);
    
    const crumbs = [{ name: 'Home', path: '' }];
    let currentPath = '';
    
    parts.forEach(part => {
      currentPath += part + '/';
      crumbs.push({
        name: part,
        path: currentPath
      });
    });
    
    setBreadcrumbs(crumbs);
  };
  
  // Load initial content on component mount
  useEffect(() => {
    // Only fetch once on initial load
    if (initialLoad) {
      fetchBucketContent(currentPath);
      setInitialLoad(false);
    }
  }, [currentPath, initialLoad]);
  
  // Handle folder click
  const handleFolderClick = (folderPath) => {
    fetchBucketContent(folderPath);
  };
  
  // Handle file click
  const handleFileClick = (file) => {
    onSelectFile(file);
  };
  
  // Handle breadcrumb click
  const handleBreadcrumbClick = (path) => {
    fetchBucketContent(path);
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
      'zip': '🗜️'
    };
    
    return iconMap[extension] || '📄';
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumbs */}
      <div className="bg-gray-100 p-2 flex flex-wrap items-center text-sm">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="mx-1 text-gray-500">/</span>}
            <button 
              className="hover:text-blue-600 truncate max-w-xs"
              onClick={() => handleBreadcrumbClick(crumb.path)}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500 p-4">{error}</div>
        </div>
      )}
      
      {/* Content */}
      {!isLoading && !error && (
        <div className="flex-1 overflow-auto">
          {/* Folders */}
          {bucketContent.folders.length > 0 && (
            <div>
              <div className="sticky top-0 bg-gray-200 px-4 py-1 font-medium text-gray-700">
                Folders
              </div>
              <ul>
                {bucketContent.folders.map((folder, index) => (
                  <li key={index}>
                    <button 
                      className="w-full px-4 py-2 hover:bg-blue-50 text-left flex items-center"
                      onClick={() => handleFolderClick(folder.path)}
                    >
                      <span className="mr-2">📁</span>
                      <span className="truncate">{folder.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Files */}
          {bucketContent.files.length > 0 && (
            <div>
              <div className="sticky top-0 bg-gray-200 px-4 py-1 font-medium text-gray-700">
                Files
              </div>
              <ul>
                {bucketContent.files.map((file, index) => (
                  <li key={index}>
                    <button 
                      className={`w-full px-4 py-2 hover:bg-blue-50 text-left flex items-center ${
                        file.supported ? '' : 'opacity-60'
                      }`}
                      onClick={() => handleFileClick(file)}
                    >
                      <span className="mr-2">{getFileIcon(file.extension)}</span>
                      <span className="truncate">{file.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Empty state */}
          {bucketContent.folders.length === 0 && bucketContent.files.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
              This folder is empty
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BucketExplorer;