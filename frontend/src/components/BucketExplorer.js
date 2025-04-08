import React, { useState, useEffect, useCallback } from 'react';
import s3Service from '../services/S3Service';

function BucketExplorer({ onSelectFile, currentPath, onPathChange, s3Initialized }) {
  const [bucketContent, setBucketContent] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Update breadcrumbs based on current path
  const updateBreadcrumbs = useCallback((path) => {
    const parts = path.split('/').filter(Boolean);
    
    const crumbs = [{ name: 'Home', path: '' }];
    let currentPathFragment = '';
    
    parts.forEach(part => {
      currentPathFragment += part + '/';
      crumbs.push({
        name: part,
        path: currentPathFragment
      });
    });
    
    setBreadcrumbs(crumbs);
  }, []);
  
  // Update the browser URL to include the current path
  const updateBrowserUrl = useCallback((path) => {
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
    }
  }, []);
  
  // Fetch data from S3 - wrapped in useCallback
  const fetchBucketContent = useCallback(async (prefix = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if S3 service is initialized
      if (!s3Service.isInitialized()) {
        setError('S3 service not initialized. Please configure bucket settings first.');
        setIsLoading(false);
        return;
      }
      
      const response = await s3Service.listObjects(prefix);
      setBucketContent(response);
      onPathChange(prefix);
      
      // Update breadcrumbs
      updateBreadcrumbs(prefix);
      
      // Update the browser URL to include the path
      updateBrowserUrl(prefix);
    } catch (err) {
      if (err.code === 'AccessDenied') {
        setError('Access denied. Please check your credentials in Settings.');
      } else if (err.code === 'NoSuchBucket') {
        setError('Bucket not found. Please check your bucket name in Settings.');
      } else {
        setError('Failed to load bucket content: ' + err.message);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onPathChange, updateBreadcrumbs, updateBrowserUrl]);
  
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
  }, [currentPath, fetchBucketContent]);
  
  // Load initial content when S3 is initialized
  useEffect(() => {
    if (s3Initialized && initialLoad) {
      // First check if there's a path in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const pathFromUrl = urlParams.get('path');
      
      // If there's a path in the URL, use it instead of the currentPath prop
      fetchBucketContent(pathFromUrl || currentPath);
      setInitialLoad(false);
    }
  }, [s3Initialized, initialLoad, currentPath, fetchBucketContent]);
  
  // React to changes in currentPath from parent component
  useEffect(() => {
    if (!initialLoad && s3Initialized && currentPath !== undefined) {
      fetchBucketContent(currentPath);
    }
  }, [currentPath, initialLoad, s3Initialized, fetchBucketContent]);
  
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
  
  // Show specific message when S3 is not initialized
  if (!s3Initialized) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-amber-600 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-medium">S3 service not initialized</p>
            <p className="mt-2 text-sm">Please configure your bucket settings first.</p>
          </div>
        </div>
      </div>
    );
  }
  
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
          <div className="text-red-500 p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
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