import React, { useState } from 'react';

function ConfigPanel({ config, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    endpoint_url: config?.endpoint_url || 'https://s3.amazonaws.com',
    bucket_name: config?.bucket_name || ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Public S3 Bucket Configuration</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Endpoint URL
              </label>
              <input
                type="text"
                name="endpoint_url"
                value={formData.endpoint_url}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://s3.amazonaws.com"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Examples: https://s3.amazonaws.com, https://s3.eidf.ac.uk
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bucket Name
              </label>
              <input
                type="text"
                name="bucket_name"
                value={formData.bucket_name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="my-bucket-name"
                required
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
              <p>
                <span className="font-medium">Note:</span> This application is configured for public buckets only 
                (using <code className="bg-blue-100 px-1 rounded">--no-sign-request</code> equivalent).
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <a
                href="https://github.com/digin1/s3-bucket-viewer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                {/* GitHub SVG Logo */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  className="mr-1"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38
                      0-.19-.01-.82-.01-1.5-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 
                      1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 
                      0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 
                      2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 
                      2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 
                      1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 
                      1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8 
                      8 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                View on GitHub
              </a>
              
              <span className="text-xs text-gray-500">
                S3 Bucket Viewer v0.1.0
              </span>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-lg">
            {config && config.bucket_name && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Connect to Bucket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ConfigPanel;