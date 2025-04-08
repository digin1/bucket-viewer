import React from 'react';

function DocxViewer({ content }) {
  // Split the content by paragraphs
  const paragraphs = content.split('\n');
  
  return (
    <div className="bg-white p-4 rounded shadow">
      {paragraphs.map((paragraph, index) => (
        paragraph.trim() ? (
          <p key={index} className="mb-4">
            {paragraph}
          </p>
        ) : null
      ))}
    </div>
  );
}

export default DocxViewer;