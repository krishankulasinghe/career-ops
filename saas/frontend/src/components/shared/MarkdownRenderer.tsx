import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div style={{
      lineHeight: 1.6,
      color: 'var(--text-primary)',
    }}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 20, marginBottom: 10, color: 'var(--primary)' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>{children}</h3>,
          p: ({ children }) => <p style={{ margin: '0 0 12px' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: '0 0 12px', paddingLeft: 20 }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
          code: ({ children }) => <code style={{ background: '#f5f7fa', padding: '2px 6px', borderRadius: 3, fontSize: 13, fontFamily: 'monospace' }}>{children}</code>,
          blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--primary)', paddingLeft: 16, margin: '12px 0', color: 'var(--text-secondary)' }}>{children}</blockquote>,
          table: ({ children }) => <table className="table" style={{ marginBottom: 16 }}>{children}</table>,
          hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '20px 0' }} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
