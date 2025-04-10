import React, { useState, useEffect } from 'react';
import axios from 'axios';

function BucketExplorer({ onSelectFile, currentPath, onPathChange }) {
  const [bucketContent, setBucketContent] = useState({ folders: [], files: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageTokens, setPageTokens] = useState([null]); // First page has null token
  const [nextPageToken, setNextPageToken] = useState(null);
  
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
  const fetchBucketContent = async (prefix = '', token = null, isPageNavigation = false) => {
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
      
      // Add continuation token if provided
      if (token) {
        url += `&continuation_token=${encodeURIComponent(token)}`;
      }
      
      const response = await axios.get(url);
      
      // Handle case where response is empty (no bucket configured)
      if (response.data.folders.length === 0 && 
          response.data.files.length === 0 && 
          !bucket) {
        setError('No bucket configured. Please configure a bucket in Settings.');
      } else {
        setBucketContent(response.data);
        
        // Only update path and breadcrumbs when not paginating
        if (!isPageNavigation) {
          onPathChange(prefix);
          updateBreadcrumbs(prefix);
          updateBrowserUrl(prefix);
          
          // Reset pagination when changing directories
          setCurrentPage(1);
          setPageTokens([null]); // Reset to first page
        }
        
        // Update pagination info
        if (response.data.continuationToken) {
          setNextPageToken(response.data.continuationToken);
          
          // If this is a new page (not just a refresh), add the token to our list
          if (!isPageNavigation && currentPage === pageTokens.length) {
            setPageTokens(prev => [...prev, response.data.continuationToken]);
            setTotalPages(prev => prev + 1);
          }
        } else {
          setNextPageToken(null);
          // If there's no continuation token and we're on page 1,
          // then there's only 1 page total
          if (currentPage === 1 && !isPageNavigation) {
            setTotalPages(1);
          }
        }
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
  
  // Function to handle page changes
  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    // Get the token for this page
    const token = pageTokens[pageNumber - 1];
    
    // Update state and fetch
    setCurrentPage(pageNumber);
    fetchBucketContent(currentPath, token, true);
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
  
  // Check for next page token and update pagination
  useEffect(() => {
    if (nextPageToken && currentPage === pageTokens.length) {
      // If we have a next page token and we're on the last known page,
      // update the tokens list and total pages
      if (!pageTokens.includes(nextPageToken)) {
        setPageTokens(prev => [...prev, nextPageToken]);
        setTotalPages(prev => prev + 1);
      }
    }
  }, [nextPageToken, currentPage, pageTokens]);
  
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
  
  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    // Calculate which page numbers to show
    const showPageNums = [];
    
    // Always show first page
    showPageNums.push(1);
    
    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - 1);
    const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis if there's a gap after page 1
    if (rangeStart > 2) {
      showPageNums.push('...');
    }
    
    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      showPageNums.push(i);
    }
    
    // Add ellipsis if there's a gap before last page
    if (rangeEnd < totalPages - 1) {
      showPageNums.push('...');
    }
    
    // Always show last page if more than 1 page
    if (totalPages > 1) {
      showPageNums.push(totalPages);
    }
    
    return (
      <div className="flex justify-center my-3 bg-white py-2 border-t border-gray-200">
        <div className="flex items-center space-x-1">
          {/* Previous button */}
          <button
            className={`px-2 py-1 rounded ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Prev
          </button>
          
          {/* Page numbers */}
          {showPageNums.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 text-gray-500">...</span>
              ) : (
                <button
                  className={`px-2 py-1 rounded ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
          
          {/* Next button */}
          <button
            className={`px-2 py-1 rounded ${
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumbs */}
      <div className="bg-gray-100 p-2 flex flex-wrap items-center text-sm overflow-x-auto whitespace-nowrap">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="mx-1 text-gray-500">/</span>}
            <button 
              className="hover:text-blue-600"
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
          {/* Directory Stats */}
          {(bucketContent.folders.length > 0 || bucketContent.files.length > 0) && (
            <div className="bg-blue-50 p-3 border-b border-blue-100 flex justify-between items-center">
              <div className="text-sm text-blue-700">
                <span className="font-medium">{bucketContent.folders.length}</span> folder{bucketContent.folders.length !== 1 && 's'}, 
                <span className="font-medium">{bucketContent.files.length}</span> file{bucketContent.files.length !== 1 && 's'}
                {totalPages > 1 && (
                  <span className="ml-2 text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>
              {/* Calculate total file size */}
              {bucketContent.files.length > 0 && (
                <div className="text-xs text-blue-600">
                  Current directory size: {formatFileSize(bucketContent.files.reduce((total, file) => total + (file.size || 0), 0))}
                </div>
              )}
            </div>
          )}
          
          {/* Folders */}
          {bucketContent.folders.length > 0 && (
            <div>
              <div className="sticky top-0 bg-gray-200 px-4 py-1 font-medium text-gray-700 flex justify-between items-center">
                <span>Folders</span>
                <span className="text-xs text-gray-500">{bucketContent.folders.length} item{bucketContent.folders.length !== 1 && 's'}</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {bucketContent.folders.map((folder, index) => (
                  <li key={index}>
                    <button 
                      className="w-full px-4 py-2 hover:bg-blue-50 text-left flex items-center"
                      onClick={() => handleFolderClick(folder.path)}
                    >
                      <span className="mr-2 flex-shrink-0">📁</span>
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
              <div className="sticky top-0 bg-gray-200 px-4 py-1 font-medium text-gray-700 flex justify-between items-center">
                <span>Files</span>
                <span className="text-xs text-gray-500">
                  {bucketContent.files.length} item{bucketContent.files.length !== 1 && 's'} 
                  {bucketContent.files.length > 0 && ` • ${formatFileSize(bucketContent.files.reduce((total, file) => total + (file.size || 0), 0))}`}
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
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
                      >
                        <span className="mr-2 flex-shrink-0">{getFileIcon(file.extension)}</span>
                        <span className="truncate flex-grow">{file.name}</span>
                        
                        {/* File size and type indicators */}
                        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
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
          
          {/* Pagination controls */}
          {renderPagination()}
          
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