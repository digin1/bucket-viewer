import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function TextViewer({ content, extension }) {
  // Define language for syntax highlighting
  const getLanguage = () => {
    const languageMap = {
      'js': 'javascript',
      'py': 'python',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'md': 'markdown',
      'txt': null
    };
    
    return languageMap[extension] || null;
  };
  
  // For Markdown content
  if (extension === 'md') {
    return (
      <div className="markdown-preview bg-white p-4 rounded shadow">
        <ReactMarkdown
          children={content}
          components={{
            code({node, inline, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  children={String(children).replace(/\n$/, '')}
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                />
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        />
      </div>
    );
  }
  
  // For code/syntax highlighted content
  const language = getLanguage();
  if (language) {
    return (
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        wrapLines={true}
        showLineNumbers={true}
        className="rounded shadow"
      >
        {content}
      </SyntaxHighlighter>
    );
  }
  
  // For plain text content
  return (
    <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded shadow">
      {content}
    </pre>
  );
}

export default TextViewer;