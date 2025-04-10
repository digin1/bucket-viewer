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
  const [totalPages, setTotalPages] = useState(1); // Start with 1 instead of null
  const [pageTokens, setPageTokens] = useState({ 1: null }); // Map page numbers to tokens
  const [totalItems, setTotalItems] = useState(0); // Track total number of items if available
  const [itemsPerPage, setItemsPerPage] = useState(100); // Default items per page from API
  const [hasMorePages, setHasMorePages] = useState(false); // Flag to indicate if more pages exist

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
  const fetchBucketContent = async (prefix = '', token = null, isPageNavigation = false, targetPage = null) => {
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

      console.log(`Fetching: ${url}`);
      const response = await axios.get(url);
      console.log('API Response:', response.data);

      // Handle case where response is empty (no bucket configured)
      if (response.data.folders.length === 0 &&
        response.data.files.length === 0 &&
        !bucket) {
        setError('No bucket configured. Please configure a bucket in Settings.');
      } else {
        setBucketContent(response.data);

        // Store items per page
        if (response.data.maxKeys) {
          setItemsPerPage(response.data.maxKeys);
        }

        // Check if we have total count information from the backend
        if (response.data.keyCount !== undefined) {
          setTotalItems(prevTotal => {
            // If this is a page navigation, don't update the total
            if (isPageNavigation) return prevTotal;

            // For initial load or directory change, set the new total
            return response.data.keyCount;
          });
        }

        // Update truncation state
        setHasMorePages(response.data.isTruncated || false);
        console.log('Has more pages:', response.data.isTruncated);

        // If we have more pages but totalPages is 1, update it to at least 2
        if (response.data.isTruncated && totalPages <= 1) {
          console.log("Setting totalPages to at least 2 since more pages are available");
          setTotalPages(prev => Math.max(prev, 2));
        }

        // Only update path and breadcrumbs when not paginating
        if (!isPageNavigation) {
          onPathChange(prefix);
          updateBreadcrumbs(prefix);
          updateBrowserUrl(prefix);

          // Reset pagination when changing directories
          setCurrentPage(1);
          setPageTokens({ 1: null }); // Reset to first page
        } else if (targetPage) {
          // If we're navigating to a specific page, update the current page
          setCurrentPage(targetPage);
        }

        // Store the continuation token for the next page
        if (response.data.continuationToken) {
          const nextPage = targetPage ? targetPage + 1 : currentPage + 1;
          setPageTokens(prev => ({
            ...prev,
            [nextPage]: response.data.continuationToken
          }));
        }

        // Estimate total pages based on total items and items per page
        if (totalItems > 0 && itemsPerPage > 0 && !isPageNavigation) {
          const estimatedPages = Math.ceil(totalItems / itemsPerPage);
          // Ensure totalPages is at least 2 if hasMorePages is true
          if (response.data.isTruncated && estimatedPages <= 1) {
            console.log("Setting totalPages to 2 since more pages are available");
            setTotalPages(2);
          } else {
            setTotalPages(estimatedPages > 0 ? estimatedPages : 1);
            console.log(`Estimated ${estimatedPages} total pages based on ${totalItems} items`);
          }
        } else if (response.data.isTruncated === false && !isPageNavigation) {
          // If there's no truncation on first load, we only have one page
          setTotalPages(1);
          console.log('Setting total pages to 1 (no truncation)');
        } else if (!response.data.isTruncated && isPageNavigation) {
          // If we've reached a page with no truncation during navigation,
          // update the total pages to the current page if needed
          setTotalPages(prev => {
            const newTotal = Math.max(prev, targetPage || currentPage);
            console.log(`Updating total pages to ${newTotal} (reached end during navigation)`);
            return newTotal;
          });
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

  // Function to handle page changes
  const handlePageChange = (pageNumber) => {
    console.log(`Page change requested: ${pageNumber}, current: ${currentPage}`);

    // Don't compare with totalPages when hasMorePages is true
    // This is the key fix - we should always allow navigation to the next page when hasMorePages is true
    if (pageNumber < 1 || (!hasMorePages && totalPages && pageNumber > totalPages)) {
      console.log(`Invalid page number: ${pageNumber}`);
      return;
    }

    // If we already have a token for this page, use it
    if (pageTokens[pageNumber]) {
      console.log(`Using existing token for page ${pageNumber}`);
      setCurrentPage(pageNumber);
      fetchBucketContent(currentPath, pageTokens[pageNumber], true, pageNumber);
      return;
    }

    // If we're moving forward one page and we have the previous page's token
    if (pageNumber === currentPage + 1 && pageTokens[currentPage]) {
      console.log(`Moving to next page (${pageNumber}) using token from current page`);
      setCurrentPage(pageNumber);
      fetchBucketContent(currentPath, pageTokens[currentPage], true, pageNumber);
      return;
    }

    // For other page jumps, we need to navigate sequentially
    console.log(`Sequential navigation needed to reach page ${pageNumber}`);
    navigateToPage(pageNumber);
  };

  // Helper function for sequential page navigation
  const navigateToPage = async (targetPage) => {
    // Find the closest known page that is less than the target page
    const knownPages = Object.keys(pageTokens).map(Number).sort((a, b) => a - b);
    let startPage = 1; // Default to page 1
    let startToken = null;

    for (let i = knownPages.length - 1; i >= 0; i--) {
      if (knownPages[i] < targetPage) {
        startPage = knownPages[i];
        startToken = pageTokens[startPage];
        break;
      }
    }

    console.log(`Starting sequential navigation from page ${startPage} to target page ${targetPage}`);

    // Display loading state
    setIsLoading(true);

    // Navigate page by page until we reach our target
    let currentToken = startToken;
    let currentPageNum = startPage;

    while (currentPageNum < targetPage) {
      try {
        // Construct the URL for the next page
        const urlParams = new URLSearchParams(window.location.search);
        const endpoint = urlParams.get('endpoint');
        const bucket = urlParams.get('bucket');

        let url = `/api/list?prefix=${encodeURIComponent(currentPath)}`;
        if (endpoint && bucket) {
          url += `&endpoint=${encodeURIComponent(endpoint)}&bucket=${encodeURIComponent(bucket)}`;
        }

        // Add continuation token if we have one
        if (currentToken) {
          url += `&continuation_token=${encodeURIComponent(currentToken)}`;
        }

        console.log(`Fetching page ${currentPageNum + 1} data...`);
        const response = await axios.get(url);

        currentPageNum++;
        console.log(`Advanced to page ${currentPageNum}`);

        // Store this page's token for future use
        if (response.data.continuationToken) {
          setPageTokens(prev => {
            const newTokens = {
              ...prev,
              [currentPageNum]: response.data.continuationToken
            };
            console.log(`Stored token for page ${currentPageNum}`);
            return newTokens;
          });
        } else {
          setPageTokens(prev => {
            const newTokens = {
              ...prev,
              [currentPageNum]: null
            };
            console.log(`Stored null token for page ${currentPageNum} (last page)`);
            return newTokens;
          });
        }

        // Get the token for the next page
        currentToken = response.data.continuationToken;

        // If we've reached the target page, set the content
        if (currentPageNum === targetPage) {
          console.log(`Reached target page ${targetPage}, updating content`);
          setBucketContent(response.data);
          setHasMorePages(response.data.isTruncated || false);
        }

        // If there's no more continuation token, we've reached the end
        if (!currentToken) {
          console.log(`No more continuation tokens, reached end at page ${currentPageNum}`);
          // Update total pages if we found the last page
          setTotalPages(currentPageNum);
          break;
        }
      } catch (err) {
        console.error(`Error during sequential navigation:`, err);
        setError('Failed to load page: ' + (err.response?.data?.error || err.message));
        break;
      }
    }

    // Update current page to the target page
    const finalPage = Math.min(targetPage, currentPageNum);
    console.log(`Setting current page to ${finalPage}`);
    setCurrentPage(finalPage);
    setIsLoading(false);
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

  // Update totalPages when totalItems or itemsPerPage changes
  useEffect(() => {
    if (totalItems > 0 && itemsPerPage > 0) {
      const estimatedPages = Math.ceil(totalItems / itemsPerPage);
      console.log(`useEffect: Updating total pages to ${estimatedPages} based on ${totalItems} items`);

      // Don't set totalPages to 1 when we have isTruncated=true (hasMorePages)
      if (hasMorePages && estimatedPages <= 1) {
        console.log("API reports more pages available, setting totalPages to at least 2");
        setTotalPages(Math.max(2, estimatedPages));
      } else {
        setTotalPages(estimatedPages > 0 ? estimatedPages : 1);
      }
    } else if (hasMorePages && totalPages <= 1) {
      // If we don't know total items but we know there are more pages,
      // make sure totalPages is at least 2
      console.log("Setting minimum totalPages to 2 since hasMorePages=true");
      setTotalPages(2);
    }
  }, [totalItems, itemsPerPage, hasMorePages]);

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
    // Don't render if we don't have enough data to calculate pagination
    if (totalPages <= 1 && !hasMorePages) return null;

    // Calculate which page numbers to show
    const showPageNums = [];

    // Always show first page
    showPageNums.push(1);

    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - 1);
    const rangeEnd = Math.min(totalPages - 1 || Infinity, currentPage + 1);

    // Add ellipsis if there's a gap after page 1
    if (rangeStart > 2) {
      showPageNums.push('...');
    }

    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      showPageNums.push(i);
    }

    // Add ellipsis if there's a gap before last page
    if (totalPages && rangeEnd < totalPages - 1) {
      showPageNums.push('...');
    }

    // Always show last page if more than 1 page and we know the total
    if (totalPages && totalPages > 1) {
      showPageNums.push(totalPages);
    }

    return (
      <div className="flex justify-center my-3 bg-white py-2 border-t border-gray-200 relative z-10">
        <div className="flex items-center space-x-1">
          {/* Previous button */}
          <button
            className={`px-2 py-1 rounded ${currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
              }`}
            onClick={(e) => {
              e.stopPropagation();
              if (currentPage > 1) handlePageChange(currentPage - 1);
            }}
            disabled={currentPage === 1}
            type="button"
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
                  className={`px-2 py-1 rounded ${page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(`Clicked page ${page}`);
                    handlePageChange(page);
                  }}
                  type="button"
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}

          {/* Next button - show if we know there are more pages or if current page isn't the last known page */}
          <button
            className={`px-2 py-1 rounded ${(!hasMorePages && currentPage === totalPages)
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
              }`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasMorePages || currentPage < totalPages) {
                handlePageChange(currentPage + 1);
              }
            }}
            disabled={!hasMorePages && currentPage === totalPages}
            type="button"
          >
            Next →
          </button>
        </div>
      </div>
    );
  };

  // Get total count message
  const getTotalCountMessage = () => {
    // Use total item count if available from API
    if (totalItems > 0) {
      return `${totalItems} total items`;
    }

    // Otherwise use the current page count
    return `${bucketContent.folders.length + bucketContent.files.length} items shown`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Debug info - Uncomment temporarily to debug pagination issues */}
      {false && (
        <div className="bg-gray-100 p-1 text-xs text-gray-600 border-b">
          Debug: Pages={totalPages}, Current={currentPage}, HasMore={String(hasMorePages)},
          Items={totalItems}, KnownTokens={Object.keys(pageTokens).join(', ')}
        </div>
      )}

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
          {/* Directory Stats */}
          {(bucketContent.folders.length > 0 || bucketContent.files.length > 0) && (
            <div className="bg-blue-50 p-3 border-b border-blue-100 flex justify-between items-center">
              <div className="text-sm text-blue-700">
                <span className="font-medium">{bucketContent.folders.length}</span> folder{bucketContent.folders.length !== 1 && 's'},
                <span className="font-medium">{bucketContent.files.length}</span> file{bucketContent.files.length !== 1 && 's'}
                {totalItems > 0 && (
                  <span className="ml-2 text-gray-500">
                    ({getTotalCountMessage()})
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

          {/* Add pagination at the top if there's pagination needed */}
          {(totalPages > 1 || hasMorePages) && (
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center px-4 py-2">
                <span className="text-xs text-gray-500">
                  Page {currentPage} {totalPages > 1 ? `of ${totalPages}` : hasMorePages ? '(more available)' : ''}
                </span>
                {renderPagination()}
              </div>
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
                        type="button"
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

          {/* Pagination controls at the bottom */}
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