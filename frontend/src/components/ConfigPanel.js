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