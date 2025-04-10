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
  const [totalPages, setTotalPages] = useState(1); // Start with 1, update as we go
  const [pageTokens, setPageTokens] = useState({ 1: null });
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(500);
  const [hasMorePages, setHasMorePages] = useState(false);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i >= 4) return `${(bytes / Math.pow(1024, 4)).toFixed(2)} TB`;
    else if (i === 3) return `${(bytes / Math.pow(1024, 3)).toFixed(2)} GB`;
    else if (i === 2) return `${Math.round(bytes / Math.pow(1024, 2))} MB`;
    else if (i === 1) return `${Math.round(bytes / 1024)} KB`;
    else return `${bytes} B`;
  };

  // Fetch bucket content
  const fetchBucketContent = async (prefix = '', token = null, isPageNavigation = false, targetPage = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const endpoint = urlParams.get('endpoint');
      const bucket = urlParams.get('bucket');

      let url = `/api/list?prefix=${encodeURIComponent(prefix)}`;
      if (endpoint && bucket) {
        url += `&endpoint=${encodeURIComponent(endpoint)}&bucket=${encodeURIComponent(bucket)}`;
      }
      if (token) {
        url += `&continuation_token=${encodeURIComponent(token)}`;
      }

      const response = await axios.get(url);

      if (response.data.folders.length === 0 && response.data.files.length === 0 && !bucket) {
        setError('No bucket configured. Please configure a bucket in Settings.');
      } else {
        setBucketContent(response.data);

        if (response.data.maxKeys) {
          setItemsPerPage(response.data.maxKeys);
        }

        if (response.data.keyCount !== undefined && !isPageNavigation) {
          setTotalItems(response.data.keyCount);
          setTotalPages(Math.max(1, Math.ceil(response.data.keyCount / itemsPerPage)));
        }

        setHasMorePages(response.data.isTruncated || false);

        if (!isPageNavigation) {
          onPathChange(prefix);
          updateBreadcrumbs(prefix);
          updateBrowserUrl(prefix);
          setCurrentPage(1);
          setPageTokens({ 1: null });
          setTotalPages(response.data.isTruncated ? 2 : 1); // Minimum 2 if more pages exist
        } else if (targetPage) {
          setCurrentPage(targetPage);
          if (!response.data.isTruncated && targetPage >= totalPages) {
            setTotalPages(targetPage); // Update totalPages when we reach the end
          }
        }

        if (response.data.continuationToken) {
          const nextPage = targetPage ? targetPage + 1 : currentPage + 1;
          setPageTokens(prev => ({
            ...prev,
            [nextPage]: response.data.continuationToken
          }));
          if (nextPage > totalPages) {
            setTotalPages(nextPage); // Expand totalPages as we discover more
          }
        } else if (isPageNavigation && !response.data.isTruncated) {
          setTotalPages(currentPage); // Set final total when no more pages
        }
      }
    } catch (err) {
      console.error('Error fetching bucket content:', err);
      if (err.response?.status === 403) {
        setError('Access denied. Please check your credentials in Settings.');
      } else if (err.response?.status === 404) {
        setError('Bucket not found. Please check your bucket name in Settings.');
      } else {
        setError('Failed to load bucket content: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle page changes
  const handlePageChange = (pageNumber) => {
    if (pageNumber < 1 || (!hasMorePages && pageNumber > totalPages)) return;

    if (pageTokens[pageNumber]) {
      fetchBucketContent(currentPath, pageTokens[pageNumber], true, pageNumber);
    } else if (pageNumber === currentPage + 1 && pageTokens[currentPage]) {
      fetchBucketContent(currentPath, pageTokens[currentPage], true, pageNumber);
    } else {
      navigateToPage(pageNumber);
    }
  };

  // Sequential page navigation
  const navigateToPage = async (targetPage) => {
    const knownPages = Object.keys(pageTokens).map(Number).sort((a, b) => a - b);
    let startPage = 1;
    let startToken = null;

    for (let i = knownPages.length - 1; i >= 0; i--) {
      if (knownPages[i] < targetPage) {
        startPage = knownPages[i];
        startToken = pageTokens[startPage];
        break;
      }
    }

    setIsLoading(true);
    let currentToken = startToken;
    let currentPageNum = startPage;

    while (currentPageNum < targetPage) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const endpoint = urlParams.get('endpoint');
        const bucket = urlParams.get('bucket');

        let url = `/api/list?prefix=${encodeURIComponent(currentPath)}`;
        if (endpoint && bucket) {
          url += `&endpoint=${encodeURIComponent(endpoint)}&bucket=${encodeURIComponent(bucket)}`;
        }
        if (currentToken) {
          url += `&continuation_token=${encodeURIComponent(currentToken)}`;
        }

        const response = await axios.get(url);
        currentPageNum++;

        if (response.data.continuationToken) {
          setPageTokens(prev => ({
            ...prev,
            [currentPageNum]: response.data.continuationToken
          }));
          if (currentPageNum >= totalPages) {
            setTotalPages(currentPageNum + 1); // Expand totalPages
          }
        } else {
          setPageTokens(prev => ({
            ...prev,
            [currentPageNum]: null
          }));
          setTotalPages(currentPageNum); // Set final total
          setHasMorePages(false);
        }

        currentToken = response.data.continuationToken;

        if (currentPageNum === targetPage) {
          setBucketContent(response.data);
          setHasMorePages(response.data.isTruncated || false);
        }

        if (!currentToken) break;
      } catch (err) {
        console.error('Error during sequential navigation:', err);
        setError('Failed to load page: ' + (err.response?.data?.error || err.message));
        break;
      }
    }

    setCurrentPage(Math.min(targetPage, totalPages));
    setIsLoading(false);
  };

  // Update browser URL
  const updateBrowserUrl = (path) => {
    const urlParams = new URLSearchParams(window.location.search);
    const endpoint = urlParams.get('endpoint');
    const bucket = urlParams.get('bucket');

    if (endpoint && bucket) {
      const newParams = new URLSearchParams();
      newParams.set('endpoint', endpoint);
      newParams.set('bucket', bucket);
      if (path) newParams.set('path', path);
      else newParams.delete('path');

      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.pushState({ path }, '', newUrl);
      window.dispatchEvent(new Event('urlchange'));
    }
  };

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = (event) => {
      const urlParams = new URLSearchParams(window.location.search);
      const pathFromUrl = urlParams.get('path') || '';
      if (pathFromUrl !== currentPath) fetchBucketContent(pathFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPath]);

  // Update breadcrumbs
  const updateBreadcrumbs = (path) => {
    const parts = path.split('/').filter(Boolean);
    const crumbs = [{ name: 'Home', path: '' }];
    let currentPath = '';

    parts.forEach(part => {
      currentPath += part + '/';
      crumbs.push({ name: part, path: currentPath });
    });

    setBreadcrumbs(crumbs);
  };

  // Initial load
  useEffect(() => {
    if (initialLoad) {
      const urlParams = new URLSearchParams(window.location.search);
      const pathFromUrl = urlParams.get('path');
      const bucket = urlParams.get('bucket');

      if (bucket) fetchBucketContent(pathFromUrl || currentPath);
      else setError('No bucket configured. Please configure a bucket in Settings.');

      setInitialLoad(false);
    }
  }, [initialLoad, currentPath]);

  // React to currentPath changes
  useEffect(() => {
    if (!initialLoad && currentPath !== undefined) {
      const urlParams = new URLSearchParams(window.location.search);
      const bucket = urlParams.get('bucket');
      if (bucket) fetchBucketContent(currentPath);
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

  // Get file icon
  const getFileIcon = (extension) => {
    const iconMap = {
      'txt': '📄', 'md': '📝', 'json': '📋', 'xml': '📋', 'html': '🌐', 'css': '🎨', 'js': '📜', 'py': '🐍',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'tif': '🖼️', 'tiff': '🖼️', 'svg': '🖼️',
      'pdf': '📑', 'docx': '📘', 'doc': '📘', 'xlsx': '📊', 'xls': '📊',
      'csv': '📊', 'zip': '🗜️', 'tar': '🗜️', 'gz': '🗜️', 'rar': '🗜️',
      'mp3': '🎵', 'wav': '🎵', 'mp4': '🎬', 'mov': '🎬', 'avi': '🎬',
      'java': '☕', 'cpp': '🔧', 'c': '🔧', 'rb': '💎', 'php': '🐘', 'go': '🔵', 'rs': '🦀'
    };
    return iconMap[extension?.toLowerCase()] || '📄';
  };

  // Render pagination
  const renderPagination = () => {
    if (totalPages === 1 && !hasMorePages) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex justify-center my-3 bg-white py-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            className={`px-3 py-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          {startPage > 1 && <span className="px-2 text-gray-500">...</span>}

          {pageNumbers.map(page => (
            <button
              key={page}
              className={`px-3 py-1 rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}

          {endPage < totalPages && <span className="px-2 text-gray-500">...</span>}

          <button
            className={`px-3 py-1 rounded ${!hasMorePages && currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasMorePages && currentPage === totalPages}
          >
            Next
          </button>
        </div>
        <div className="ml-4 text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    );
  };

  // Get total count message
  const getTotalCountMessage = () => {
    const itemsOnPage = bucketContent.folders.length + bucketContent.files.length;
    return `Only showing ${itemsOnPage} items`;
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
              type="button"
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
          {/* Directory Stats - Updated display */}
          {(bucketContent.folders.length > 0 || bucketContent.files.length > 0) && (
            <div className="bg-blue-50 p-3 border-b border-blue-100 flex justify-between items-center">
              <div className="text-sm text-blue-700">
                <span className="font-medium">{bucketContent.folders.length}</span> folder{bucketContent.folders.length !== 1 && 's'},
                <span className="font-medium">{bucketContent.files.length}</span> file{bucketContent.files.length !== 1 && 's'}
                <span className="ml-2 text-gray-500">{getTotalCountMessage()}</span>
              </div>
              {bucketContent.files.length > 0 && (
                <div className="text-xs text-blue-600">
                  Current directory size: {formatFileSize(bucketContent.files.reduce((total, file) => total + (file.size || 0), 0))}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {(totalPages > 1 || hasMorePages || currentPage > 1) && (
            <div className="border-b border-gray-200 bg-gray-50">{renderPagination()}</div>
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
                      type="button"
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
                  const isLargeFile = file.size > 104857600;
                  const fileExt = file.extension?.toLowerCase();
                  const isArchiveFile = ['zip', 'tar', 'gz', 'rar'].includes(fileExt);
                  const formattedSize = formatFileSize(file.size);

                  return (
                    <li key={index}>
                      <button
                        className="w-full px-4 py-2 hover:bg-blue-50 text-left flex items-center"
                        onClick={() => handleFileClick(file)}
                        type="button"
                      >
                        <span className="mr-2 flex-shrink-0">{getFileIcon(file.extension)}</span>
                        <span className="truncate flex-grow">{file.name}</span>
                        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                          <span className={`text-xs ${isLargeFile ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                            {formattedSize}
                          </span>
                          {isLargeFile && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">Large</span>
                          )}
                          {isArchiveFile && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">Archive</span>
                          )}
                          {!file.supported && !isArchiveFile && !isLargeFile && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded-full">No Preview</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Pagination at bottom */}
          {renderPagination()}

          {/* Empty state */}
          {bucketContent.folders.length === 0 && bucketContent.files.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-500">This folder is empty</div>
          )}
        </div>
      )}
    </div>
  );
}

export default BucketExplorer;