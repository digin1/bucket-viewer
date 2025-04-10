import React, { useState, useEffect } from 'react';
import axios from 'axios';

function BucketExplorer({ onSelectFile, currentPath, onPathChange }) {
  const [bucketContent, setBucketContent] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  
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
  
  // Fetch data from the API
  const fetchBucketContent = async (prefix = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get URL parameters to pass along
      const urlParams = new URLSearchParams(window.location.search);
      const endpoint = urlParams.get('endpoint');
      const bucket = urlParams.get('bucket');
      
      // Build the URL with parameters if they exist
      let url = `/api/list?prefix=${encodeURIComponent(prefix)}`;
      if (endpoint && bucket) {
        url += `&endpoint=${encodeURIComponent(endpoint)}&bucket=${encodeURIComponent(bucket)}`;
      }
      
      const response = await axios.get(url);
      
      // Handle case where response is empty (no bucket configured)
      if (response.data.folders.length === 0 && 
          response.data.files.length === 0 && 
          !bucket) {
        setError('No bucket configured. Please configure a bucket in Settings.');
      } else {
        setBucketContent(response.data);
        onPathChange(prefix);
        
        // Update breadcrumbs
        updateBreadcrumbs(prefix);
        
        // Update the browser URL to include the path
        updateBrowserUrl(prefix);
      }
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
  
  // Update the browser URL to include the current path
  const updateBrowserUrl = (path) => {
    const urlParams = new URLSearchParams(window.location.search);
    const endpoint = urlParams.get('endpoint');
    const bucket = urlParams.get('bucket');
    
    if (endpoint && bucket) {
      // Create new URL params
      const newParams = new URLSearchParams();
      newParams.set('endpoint', endpoint);
      newParams.set('bucket', bucket);
      
      // Only add path if it's not empty
      if (path) {
        newParams.set('path', path);
      } else {
        newParams.delete('path');
      }
      
      // Update browser URL without reloading the page
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.pushState({ path: path }, '', newUrl);
      
      // Dispatch a custom event for URL change
      window.dispatchEvent(new Event('urlchange'));
    }
  };
  
  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      // Get the path from the URL when back/forward buttons are clicked
      const urlParams = new URLSearchParams(window.location.search);
      const pathFromUrl = urlParams.get('path') || '';
      
      // Only fetch content if the path has changed
      if (pathFromUrl !== currentPath) {
        fetchBucketContent(pathFromUrl);
      }
    };
    
    // Add event listener for popstate (back/forward button clicks)
    window.addEventListener('popstate', handlePopState);
    
    // Clean up
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentPath]);
  
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
  
  // Load initial content on component mount or when currentPath changes
  useEffect(() => {
    if (initialLoad) {
      // First check if there's a path in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const pathFromUrl = urlParams.get('path');
      
      // Check if there's a bucket in the URL
      const bucket = urlParams.get('bucket');
      
      // Only fetch if there's a bucket
      if (bucket) {
        // If there's a path in the URL, use it instead of the currentPath prop
        fetchBucketContent(pathFromUrl || currentPath);
      } else {
        setError('No bucket configured. Please configure a bucket in Settings.');
      }
      
      setInitialLoad(false);
    }
  }, [initialLoad, currentPath]);
  
  // React to changes in currentPath from parent component
  useEffect(() => {
    if (!initialLoad && currentPath !== undefined) {
      const urlParams = new URLSearchParams(window.location.search);
      const bucket = urlParams.get('bucket');
      
      // Only fetch if there's a bucket
      if (bucket) {
        fetchBucketContent(currentPath);
      }
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
          <div className="text-red-500 p-4 text-center">{error}</div>
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
                {bucketContent.files.map((file, index) => {
                  // Check if file is large (for preview purposes) or special type
                  const isLargeFile = file.size > 104857600; // 100MB
                  const fileExt = file.extension?.toLowerCase();
                  const isArchiveFile = ['zip', 'tar', 'gz', 'rar'].includes(fileExt);
                  
                  // Format file size using the helper function
                  const formattedSize = formatFileSize(file.size);
                  
                  return (
                    <li key={index}>
                      <button 
                        className="w-full px-4 py-2 hover:bg-blue-50 text-left flex items-center"
                        onClick={() => handleFileClick(file)}
                        title={isLargeFile ? 'Large file - preview not available' : 
                              isArchiveFile ? 'Archive file - preview not available' : 
                              !file.supported ? 'File type not supported for preview' : ''}
                      >
                        <span className="mr-2">{getFileIcon(file.extension)}</span>
                        <span className="truncate flex-grow">{file.name}</span>
                        
                        {/* File size and type indicators */}
                        <div className="flex items-center space-x-2 ml-2">
                          {/* File size indicator */}
                          <span className={`text-xs ${isLargeFile ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                            {formattedSize}
                          </span>
                          
                          {/* Special file type indicators */}
                          {isLargeFile && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                              Large
                            </span>
                          )}
                          {isArchiveFile && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              Archive
                            </span>
                          )}
                          {!file.supported && !isArchiveFile && !isLargeFile && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded-full">
                              No Preview
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
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