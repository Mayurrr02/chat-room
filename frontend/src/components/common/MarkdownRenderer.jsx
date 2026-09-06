import React from 'react';

const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Simple, safe Markdown parser for chat messages
  const renderFormattedText = (text) => {
    // 1. Split code blocks
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'codeblock', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return parts.map((part, idx) => {
      if (part.type === 'codeblock') {
        return (
          <pre
            key={idx}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              padding: '10px 14px',
              borderRadius: '8px',
              overflowX: 'auto',
              fontSize: '13px',
              margin: '6px 0',
              fontFamily: 'monospace',
            }}
          >
            <code>{part.content.trim()}</code>
          </pre>
        );
      }

      // Process lines for headers, lists, and inline formatting
      const lines = part.content.split('\n');
      return (
        <div key={idx} style={{ display: 'inline' }}>
          {lines.map((line, lIdx) => {
            // Headers
            if (line.startsWith('### ')) {
              return (
                <h4 key={lIdx} style={{ fontSize: '15px', fontWeight: 700, margin: '6px 0 3px' }}>
                  {formatInline(line.replace('### ', ''))}
                </h4>
              );
            }
            if (line.startsWith('## ')) {
              return (
                <h3 key={lIdx} style={{ fontSize: '16px', fontWeight: 700, margin: '8px 0 4px' }}>
                  {formatInline(line.replace('## ', ''))}
                </h3>
              );
            }
            if (line.startsWith('# ')) {
              return (
                <h2 key={lIdx} style={{ fontSize: '18px', fontWeight: 700, margin: '10px 0 4px' }}>
                  {formatInline(line.replace('# ', ''))}
                </h2>
              );
            }

            // Bullet lists
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
              return (
                <div key={lIdx} style={{ display: 'flex', gap: '6px', margin: '2px 0 2px 12px' }}>
                  <span>•</span>
                  <span>{formatInline(line.trim().substring(2))}</span>
                </div>
              );
            }

            return (
              <React.Fragment key={lIdx}>
                {formatInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            );
          })}
        </div>
      );
    });
  };

  // Helper for inline markdown: bold, italic, inline code
  const formatInline = (str) => {
    if (!str) return '';

    // Regex tokens
    const tokens = [];
    // Bold: **text**
    // Inline code: `text`
    // Italic: *text*
    const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    let lastIdx = 0;
    let m;

    while ((m = regex.exec(str)) !== null) {
      if (m.index > lastIdx) {
        tokens.push({ type: 'plain', text: str.substring(lastIdx, m.index) });
      }
      const raw = m[0];
      if (raw.startsWith('**') && raw.endsWith('**')) {
        tokens.push({ type: 'bold', text: raw.slice(2, -2) });
      } else if (raw.startsWith('`') && raw.endsWith('`')) {
        tokens.push({ type: 'code', text: raw.slice(1, -1) });
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        tokens.push({ type: 'italic', text: raw.slice(1, -1) });
      }
      lastIdx = m.index + raw.length;
    }

    if (lastIdx < str.length) {
      tokens.push({ type: 'plain', text: str.substring(lastIdx) });
    }

    return tokens.map((token, tIdx) => {
      switch (token.type) {
        case 'bold':
          return <strong key={tIdx} style={{ fontWeight: 600 }}>{token.text}</strong>;
        case 'italic':
          return <em key={tIdx}>{token.text}</em>;
        case 'code':
          return (
            <code
              key={tIdx}
              style={{
                background: 'rgba(0,0,0,0.06)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              {token.text}
            </code>
          );
        default:
          return token.text;
      }
    });
  };

  return <div className="markdown-content">{renderFormattedText(content)}</div>;
};

export default MarkdownRenderer;
