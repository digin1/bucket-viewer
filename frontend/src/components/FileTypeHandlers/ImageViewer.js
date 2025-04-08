import React from 'react';

function ImageViewer({ base64Data, mime }) {
  return (
    <div className="flex justify-center">
      <img 
        src={`data:${mime};base64,${base64Data}`} 
        alt="Preview" 
        className="max-w-full shadow-lg rounded"
      />
    </div>
  );
}

export default ImageViewer;