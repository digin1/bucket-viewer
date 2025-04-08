// src/services/S3Service.js
import AWS from 'aws-sdk';

class S3Service {
  constructor() {
    this.s3Client = null;
    this.config = {
      endpoint: '',
      bucket: ''
    };
  }

  /**
   * Initialize S3 client with endpoint and bucket
   * @param {Object} config - Configuration object
   * @param {string} config.endpoint - S3 endpoint URL
   * @param {string} config.bucket - S3 bucket name
   */
  initialize(config) {
    this.config = {
      endpoint: config.endpoint || '',
      bucket: config.bucket || ''
    };

    // Configure AWS SDK
    const endpoint = new AWS.Endpoint(this.config.endpoint);
    
    // Create S3 client with anonymous credentials (public bucket access)
    this.s3Client = new AWS.S3({
      endpoint: endpoint,
      credentials: new AWS.Credentials('', ''), // Anonymous access
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
      region: 'us-east-1' // Default region, may need to be configurable
    });
    
    return this.config;
  }

  isInitialized() {
    return this.s3Client !== null && this.config.bucket !== '';
  }

  /**
   * List objects in the bucket with given prefix
   * @param {string} prefix - Folder prefix
   * @returns {Promise<Object>} - Promise resolving to bucket contents
   */
  async listObjects(prefix = '') {
    if (!this.s3Client || !this.config.bucket) {
      throw new Error('S3 client not initialized or bucket not set');
    }

    const params = {
      Bucket: this.config.bucket,
      Prefix: prefix,
      Delimiter: '/'
    };

    try {
      const response = await this.s3Client.listObjectsV2(params).promise();
      
      // Format response to match the API response from Flask backend
      const folders = (response.CommonPrefixes || []).map(item => ({
        name: item.Prefix.rstrip('/').split('/').pop() + '/',
        path: item.Prefix,
        type: 'folder'
      }));
      
      const files = (response.Contents || [])
        .filter(item => item.Key !== prefix && !item.Key.endsWith('/'))
        .map(item => {
          const fileName = item.Key.split('/').pop();
          const fileExt = fileName.includes('.') ? 
            fileName.split('.').pop().toLowerCase() : '';
          
          return {
            name: fileName,
            path: item.Key,
            size: item.Size,
            lastModified: item.LastModified.toISOString(),
            type: 'file',
            extension: fileExt,
            supported: this.isSupportedType(fileExt)
          };
        });

      return {
        currentPrefix: prefix,
        folders,
        files
      };
    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  }

  /**
   * Get file content from S3
   * @param {string} path - File path in S3
   * @returns {Promise<Object>} - Promise resolving to file content
   */
  async getFile(path) {
    if (!this.s3Client || !this.config.bucket) {
      throw new Error('S3 client not initialized or bucket not set');
    }

    const params = {
      Bucket: this.config.bucket,
      Key: path
    };

    try {
      const response = await this.s3Client.getObject(params).promise();
      
      // Return the raw data and content type for processing
      return {
        data: response.Body,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        contentLength: response.ContentLength
      };
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   * @param {string} path - File path in S3
   * @returns {Promise<Object>} - Promise resolving to file metadata
   */
  async getFileInfo(path) {
    if (!this.s3Client || !this.config.bucket) {
      throw new Error('S3 client not initialized or bucket not set');
    }

    const params = {
      Bucket: this.config.bucket,
      Key: path
    };

    try {
      const response = await this.s3Client.headObject(params).promise();
      
      // Extract file name and extension
      const fileName = path.split('/').pop();
      const fileExt = fileName.includes('.') ? 
        fileName.split('.').pop().toLowerCase() : '';
      
      return {
        name: fileName,
        path: path,
        size: response.ContentLength,
        lastModified: response.LastModified.toISOString(),
        type: 'file',
        extension: fileExt,
        supported: this.isSupportedType(fileExt),
        metadata: response
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }

  /**
   * Check if file type is supported for preview
   * @param {string} extension - File extension
   * @returns {boolean} - Whether file type is supported
   */
  isSupportedType(extension) {
    const supportedTypes = {
      text: ['txt', 'md', 'json', 'csv', 'xml', 'html', 'css', 'js', 'py', 'r'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
      document: ['pdf']
    };

    for (const category in supportedTypes) {
      if (supportedTypes[category].includes(extension)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the signed URL for a file (for direct download)
   * @param {string} path - File path in S3
   * @returns {string} - URL for file download
   */
  getSignedUrl(path) {
    if (!this.s3Client || !this.config.bucket) {
      throw new Error('S3 client not initialized or bucket not set');
    }

    const params = {
      Bucket: this.config.bucket,
      Key: path,
      Expires: 60 * 5 // 5 minutes
    };

    try {
      return this.s3Client.getSignedUrl('getObject', params);
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  }
}

// Export a singleton instance
const s3Service = new S3Service();
export default s3Service;