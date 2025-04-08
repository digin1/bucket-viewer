// src/services/FileProcessor.js
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

class FileProcessor {
  /**
   * Generate preview data for a file based on its type
   * @param {ArrayBuffer|Blob} fileData - Raw file data
   * @param {string} extension - File extension
   * @param {string} contentType - MIME type
   * @returns {Promise<Object>} - Preview data
   */
  async getFilePreview(fileData, extension, contentType) {
    try {
      const fileType = this.getFileType(extension);
      
      switch (fileType) {
        case 'text':
          return await this.getTextPreview(fileData, extension);
        case 'image':
          return await this.getImagePreview(fileData, contentType);
        case 'document':
          if (extension === 'pdf') {
            return {
              type: 'pdf',
              preview: 'PDF preview not available in browser'
            };
          }
          break;
      }
      
      // Default for unsupported types
      return {
        type: 'unsupported',
        preview: `Preview not available for ${extension} files`
      };
    } catch (error) {
      console.error('Error generating preview:', error);
      return {
        type: 'error',
        preview: `Error generating preview: ${error.message}`
      };
    }
  }

  /**
   * Get file type category
   * @param {string} extension - File extension
   * @returns {string} - File type category
   */
  getFileType(extension) {
    const supportedTypes = {
      text: ['txt', 'md', 'json', 'csv', 'xml', 'html', 'css', 'js', 'py', 'r'],
      image: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
      document: ['pdf']
    };

    for (const category in supportedTypes) {
      if (supportedTypes[category].includes(extension)) {
        return category;
      }
    }
    return 'other';
  }

  /**
   * Generate preview for text files
   * @param {ArrayBuffer} fileData - Raw file data
   * @param {string} extension - File extension
   * @returns {Promise<Object>} - Text preview data
   */
  async getTextPreview(fileData, extension) {
    try {
      // Convert ArrayBuffer to text
      const content = await this.arrayBufferToText(fileData);
      
      // Special handling for different text formats
      if (extension === 'json') {
        try {
          const parsed = JSON.parse(content);
          return {
            type: 'text',
            preview: JSON.stringify(parsed, null, 2),
            extension: extension
          };
        } catch (e) {
          // If JSON parsing fails, return as normal text
        }
      } else if (extension === 'csv') {
        try {
          const result = Papa.parse(content, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
          });
          
          return {
            type: 'csv',
            preview: {
              columns: result.meta.fields,
              data: result.data.map(row => Object.values(row))
            }
          };
        } catch (e) {
          console.error('CSV parsing error:', e);
        }
      }
      
      // Default text preview
      return {
        type: 'text',
        preview: content,
        extension: extension
      };
    } catch (error) {
      // If text conversion fails, it might be a binary file
      return {
        type: 'binary',
        preview: 'This appears to be a binary file and cannot be previewed as text'
      };
    }
  }

  /**
   * Generate preview for image files
   * @param {ArrayBuffer} fileData - Raw image data
   * @param {string} contentType - MIME type of the image
   * @returns {Promise<Object>} - Image preview data
   */
  async getImagePreview(fileData, contentType) {
    try {
      // Convert ArrayBuffer to base64
      const base64 = await this.arrayBufferToBase64(fileData);
      
      return {
        type: 'image',
        preview: base64,
        mime: contentType || 'image/png'
      };
    } catch (error) {
      return {
        type: 'error',
        preview: `Error processing image: ${error.message}`
      };
    }
  }

  /**
   * Convert ArrayBuffer to text
   * @param {ArrayBuffer} buffer - File buffer
   * @returns {Promise<string>} - Text content
   */
  arrayBufferToText(buffer) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to convert file to text'));
      };
      
      reader.readAsText(blob);
    });
  }

  /**
   * Convert ArrayBuffer to base64
   * @param {ArrayBuffer} buffer - File buffer
   * @returns {Promise<string>} - Base64 string
   */
  arrayBufferToBase64(buffer) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      
      reader.onload = () => {
        // Extract the base64 data from the data URL
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'));
      };
      
      reader.readAsDataURL(blob);
    });
  }
}

// Export a singleton instance
const fileProcessor = new FileProcessor();
export default fileProcessor;