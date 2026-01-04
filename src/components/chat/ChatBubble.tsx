import { useState, useMemo, useRef, useEffect } from 'react';
import { formatTime } from '@/utils';
import type { EmailMessage } from '@/types';

interface ChatBubbleProps {
  message: EmailMessage;
  isSent: boolean;
}

// Patterns that indicate quoted content in plain text
const QUOTE_PATTERNS = [
  /\nOn .+wrote:\s*\n/i,                       // Gmail: "On Mon, Jan 1, 2024 at 10:00 AM John wrote:"
  /\n.*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}.*wrote:\s*\n/i, // Date variations
  /<.*@.*>.*wrote:/i,                          // "<email@example.com> wrote:"
  /\n-{3,}\s*Original Message\s*-{3,}/i,       // "--- Original Message ---"
  /\n-{5,}\s*Forwarded message\s*-{5,}/i,      // Gmail forwarded
  /\nFrom:\s*.+\n(Sent|Date):\s*.+\n(To|Subject):/i, // Outlook style headers
  /\n_{3,}\s*\n/,                              // ___ divider line
  /\n>{1,}\s*[^\n]/m,                          // > quoted lines (not at start)
  /\n\s*Le\s+.+\s+a\s+écrit\s*:/i,            // French: "Le ... a écrit:"
  /\n\s*Am\s+.+\s+schrieb\s+/i,               // German: "Am ... schrieb"
  /\n\s*El\s+.+\s+escribió\s*:/i,             // Spanish
];

// Patterns for the start of text only
const START_QUOTE_PATTERNS = [
  /^>{1,}\s*/m,                                // > at start of message
];

function splitQuotedContent(text: string): { main: string; quoted: string | null } {
  if (!text) return { main: '', quoted: null };

  let splitIndex = -1;

  // Check patterns that should match anywhere
  for (const pattern of QUOTE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined && match.index > 0) {
      if (splitIndex === -1 || match.index < splitIndex) {
        splitIndex = match.index;
      }
    }
  }

  // Check start patterns only if no other match and text starts with quote
  if (splitIndex === -1) {
    for (const pattern of START_QUOTE_PATTERNS) {
      if (pattern.test(text)) {
        // If entire message looks like a quote, don't split
        return { main: text, quoted: null };
      }
    }
  }

  if (splitIndex > 0) {
    return {
      main: text.slice(0, splitIndex).trim(),
      quoted: text.slice(splitIndex).trim(),
    };
  }

  return { main: text, quoted: null };
}

function splitQuotedHtml(html: string): { main: string; quoted: string | null } {
  if (!html) return { main: '', quoted: null };

  // Common HTML quote markers
  const quoteSelectors = [
    /<div[^>]*class="[^"]*gmail_quote[^"]*"/i,
    /<blockquote[^>]*class="[^"]*gmail_quote[^"]*"/i,
    /<blockquote[^>]*>/i,
    /<div[^>]*class="[^"]*yahoo_quoted[^"]*"/i,
    /<div[^>]*class="[^"]*moz-cite-prefix[^"]*"/i,
    /<div[^>]*id="[^"]*divRplyFwdMsg[^"]*"/i,    // Outlook
    /<hr[^>]*>/i,                                 // Horizontal rule often before quotes
    /<!--\s*Original\s*Message\s*-->/i,
    /<div[^>]*class="[^"]*quote[^"]*"/i,
    /<[^>]*style="[^"]*border-top:\s*solid[^"]*"/i,  // Outlook inline style separator
    /<[^>]*style="[^"]*border:none;border-top:solid[^"]*"/i,  // Outlook separator variant
  ];

  let splitIndex = -1;

  for (const pattern of quoteSelectors) {
    const match = html.match(pattern);
    if (match && match.index !== undefined && match.index > 20) {
      // Must have some content before the quote (at least 20 chars)
      if (splitIndex === -1 || match.index < splitIndex) {
        splitIndex = match.index;
      }
    }
  }

  if (splitIndex > 0) {
    return {
      main: html.slice(0, splitIndex).trim(),
      quoted: html.slice(splitIndex).trim(),
    };
  }

  // Fallback: try plain text patterns on stripped HTML
  const textContent = html.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n');
  const textResult = splitQuotedContent(textContent);

  if (textResult.quoted) {
    // Find approximate position in HTML
    const mainTextLength = textResult.main.length;
    let charCount = 0;
    let htmlIndex = 0;

    for (let i = 0; i < html.length && charCount < mainTextLength; i++) {
      if (html[i] === '<') {
        // Skip HTML tags
        while (i < html.length && html[i] !== '>') i++;
      } else if (!/\s/.test(html[i]) || charCount > 0) {
        charCount++;
      }
      htmlIndex = i;
    }

    if (htmlIndex > 20) {
      return {
        main: html.slice(0, htmlIndex).trim(),
        quoted: html.slice(htmlIndex).trim(),
      };
    }
  }

  return { main: html, quoted: null };
}

// Make all links open in new tab
function processLinks(html: string): string {
  return html.replace(
    /<a\s+([^>]*?)>/gi,
    (match, attrs) => {
      // Check if target already exists
      if (/target\s*=/i.test(attrs)) {
        return match;
      }
      return `<a ${attrs} target="_blank" rel="noopener noreferrer">`;
    }
  );
}

// Sandboxed iframe component for rendering HTML emails
function EmailHtmlFrame({ html, className }: { html: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  const [scale, setScale] = useState(1);

  const wrappedHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #202124;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    body { padding: 0; overflow: hidden; }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
    td, th { word-wrap: break-word; overflow-wrap: anywhere; }
    pre, code { white-space: pre-wrap; max-width: 100%; overflow-x: auto; }
    a { color: #1a73e8; }
    blockquote { margin: 0.5em 0; padding-left: 1em; border-left: 2px solid #e8eaed; }
  </style>
</head>
<body>${html}</body>
</html>`;
  }, [html]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const container = containerRef.current;
    if (!iframe || !container) return;

    const updateDimensions = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          // Get actual content dimensions
          const contentWidth = doc.body.scrollWidth;
          // Use offsetHeight for more accurate height measurement
          const contentHeight = doc.body.offsetHeight || doc.body.scrollHeight;
          const containerWidth = container.clientWidth;

          // Calculate scale if content is wider than container
          const newScale = contentWidth > containerWidth ? containerWidth / contentWidth : 1;
          const scaledHeight = Math.ceil(contentHeight * newScale);

          setScale(newScale);
          setHeight(scaledHeight);
        }
      } catch {
        // Cross-origin error, ignore
      }
    };

    // Initial update after load
    const handleLoad = () => {
      // Small delay to ensure content is fully rendered
      setTimeout(updateDimensions, 50);
      setTimeout(updateDimensions, 200);
    };

    iframe.addEventListener('load', handleLoad);
    window.addEventListener('resize', updateDimensions);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [wrappedHtml]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: height > 0 ? `${height}px` : 'auto',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={wrappedHtml}
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        scrolling="no"
        style={{
          width: scale < 1 ? `${100 / scale}%` : '100%',
          height: scale < 1 ? `${height / scale}px` : `${height}px`,
          border: 'none',
          display: 'block',
          transform: scale < 1 ? `scale(${scale})` : 'none',
          transformOrigin: 'top left',
          overflow: 'hidden',
        }}
        title="Email content"
      />
    </div>
  );
}

export function ChatBubble({ message, isSent }: ChatBubbleProps) {
  const [showQuoted, setShowQuoted] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const hasHtml = !!message.bodyHtml;

  const { mainContent, quotedContent } = useMemo(() => {
    if (hasHtml) {
      const { main, quoted } = splitQuotedHtml(message.bodyHtml!);
      return {
        mainContent: processLinks(main),
        quotedContent: quoted ? processLinks(quoted) : null,
      };
    } else {
      const { main, quoted } = splitQuotedContent(message.body || message.snippet);
      return { mainContent: main, quotedContent: quoted };
    }
  }, [message.body, message.bodyHtml, message.snippet, hasHtml]);

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3 min-w-0`}>
      <div
        className={`max-w-full sm:max-w-[75%] min-w-0 rounded-2xl px-2 py-2 sm:px-4 sm:py-3 shadow-sm ${
          isSent
            ? 'bg-[#d3e3fd] rounded-br-sm'
            : 'bg-[#f1f3f4] rounded-bl-sm'
        }`}
      >
        {message.subject && (
          <div className="font-medium text-sm text-[#202124] mb-1">
            {message.subject}
          </div>
        )}
        {hasHtml ? (
          <EmailHtmlFrame html={mainContent} />
        ) : (
          <div className="text-sm text-[#202124] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {mainContent || message.snippet}
          </div>
        )}
        {quotedContent && (
          <div className="mt-2">
            <button
              onClick={() => setShowQuoted(!showQuoted)}
              className="text-xs text-[#1a73e8] hover:underline flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showQuoted ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showQuoted ? 'Hide' : 'Show'} quoted text
            </button>
            {showQuoted && (
              hasHtml ? (
                <div className="mt-2 border-l-2 border-[#1a73e8]/30 pl-2">
                  <EmailHtmlFrame html={quotedContent} />
                </div>
              ) : (
                <div className="mt-2 text-xs text-[#5f6368] whitespace-pre-wrap border-l-2 border-[#1a73e8]/30 pl-2">
                  {quotedContent}
                </div>
              )
            )}
          </div>
        )}
        {message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.attachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1 bg-black/5 rounded px-2 py-1 text-xs"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                {att.filename}
              </span>
            ))}
          </div>
        )}
        <div
          className="text-[10px] mt-1 flex justify-between items-center text-[#5f6368]"
        >
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="opacity-30 hover:opacity-100 transition-opacity"
            title="Debug: View raw content"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <div className="flex items-center">
            {formatTime(message.date)}
            {isSent && (
              <svg
                className="w-4 h-4 ml-1 text-[#1a73e8]"
                fill="currentColor"
                viewBox="0 0 16 15"
              >
                <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-1.979-1.98a.365.365 0 00-.517.006l-.423.433a.364.364 0 00.006.514l2.846 2.848a.365.365 0 00.516-.004l6.09-7.899a.365.365 0 00-.063-.51zm-3.36.004l-.478-.372a.365.365 0 00-.51.063l-5.357 6.872a.32.32 0 01-.484.033L2.843 7.937a.365.365 0 00-.517.006l-.423.433a.364.364 0 00.006.514l2.846 2.848a.365.365 0 00.516-.004l6.09-7.899a.365.365 0 00-.063-.51z" />
              </svg>
            )}
          </div>
        </div>
        {showDebug && (
          <div className="mt-2 p-2 bg-black/5 rounded text-[10px] font-mono overflow-x-auto">
            <div className="font-bold mb-1 text-[#1a73e8]">Raw Body (plain text):</div>
            <pre className="whitespace-pre-wrap break-all text-[#202124] mb-2 max-h-40 overflow-y-auto">
              {message.body || '(empty)'}
            </pre>
            {message.bodyHtml && (
              <>
                <div className="font-bold mb-1 text-[#1a73e8]">Raw Body (HTML):</div>
                <pre className="whitespace-pre-wrap break-all text-[#202124] max-h-40 overflow-y-auto">
                  {message.bodyHtml}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
