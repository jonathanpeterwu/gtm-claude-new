'use client';

import { Email } from '@/types';
import { format } from 'date-fns';
import { Paperclip, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, memo } from 'react';
import clsx from 'clsx';
import DOMPurify from 'dompurify';

interface MessageBubbleProps {
  message: Email;
  isLast: boolean;
}

/**
 * Sanitize and prepare HTML email content for safe rendering.
 */
function sanitizeEmailHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
      'blockquote', 'pre', 'code',
      'img', 'hr', 'sup', 'sub', 'small',
      'abbr', 'address', 'cite',
      'font', 'center',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height',
      'style', 'class', 'dir', 'align', 'valign',
      'colspan', 'rowspan', 'cellpadding', 'cellspacing', 'border',
      'color', 'size', 'face', 'bgcolor',
      'target', 'rel',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });

  // Post-process: make all links open in new tab and add rel=noopener
  return clean
    .replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
    // Remove duplicate target attrs from the sanitizer
    .replace(/target="_blank"\s+target="_blank"/g, 'target="_blank"');
}

/**
 * Convert plain text to HTML with clickable links.
 */
function linkifyText(text: string): string {
  // URL pattern
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  // Email pattern
  const emailPattern = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;

  let result = text
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Replace URLs with links
  result = result.replace(urlPattern, (url) => {
    const display = url.length > 60 ? url.slice(0, 57) + '...' : url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="email-link">${display}</a>`;
  });

  // Replace email addresses with mailto links
  result = result.replace(emailPattern, (email) => {
    return `<a href="mailto:${email}" class="email-link">${email}</a>`;
  });

  return result;
}

export const MessageBubble = memo(function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(isLast);
  const [showHtml, setShowHtml] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(200);

  const hasHtml = !!message.bodyHtml;

  const sanitizedHtml = useMemo(() => {
    if (!message.bodyHtml) return '';
    return sanitizeEmailHtml(message.bodyHtml);
  }, [message.bodyHtml]);

  const linkifiedText = useMemo(() => {
    return linkifyText(message.body || message.snippet || '');
  }, [message.body, message.snippet]);

  // Auto-resize iframe to content height
  useEffect(() => {
    if (!expanded || !showHtml || !hasHtml) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const updateHeight = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          const height = doc.body.scrollHeight;
          setIframeHeight(Math.min(Math.max(height + 16, 100), 2000));
        }
      } catch {
        // Cross-origin restriction — unlikely since we control the content
      }
    };

    iframe.addEventListener('load', updateHeight);
    return () => iframe.removeEventListener('load', updateHeight);
  }, [expanded, showHtml, hasHtml, sanitizedHtml]);

  // Build iframe srcdoc with theme-aware styles
  const iframeSrcDoc = useMemo(() => {
    if (!sanitizedHtml) return '';
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #f4f4f5;
    background: transparent;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  @media (prefers-color-scheme: light) {
    body { color: #0f172a; }
    a { color: #2563eb; }
    blockquote { border-color: #e2e8f0; color: #475569; }
    hr { border-color: #e2e8f0; }
    table { border-color: #e2e8f0; }
    th, td { border-color: #e2e8f0; }
  }
  a {
    color: #60a5fa;
    text-decoration: underline;
    text-underline-offset: 2px;
    word-break: break-all;
  }
  a:hover { opacity: 0.8; }
  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
  blockquote {
    margin: 8px 0;
    padding: 4px 12px;
    border-left: 3px solid #3f3f46;
    color: #a1a1aa;
  }
  pre, code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    background: rgba(255,255,255,0.05);
    border-radius: 4px;
  }
  pre { padding: 12px; overflow-x: auto; }
  code { padding: 1px 4px; }
  table {
    border-collapse: collapse;
    max-width: 100%;
    margin: 8px 0;
  }
  th, td {
    padding: 6px 10px;
    border: 1px solid #27272a;
    text-align: left;
    font-size: 13px;
  }
  th { font-weight: 600; }
  hr {
    border: none;
    border-top: 1px solid #27272a;
    margin: 12px 0;
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 12px 0 4px;
    font-weight: 600;
  }
  h1 { font-size: 20px; }
  h2 { font-size: 18px; }
  h3 { font-size: 16px; }
  p { margin: 4px 0; }
  ul, ol { padding-left: 20px; }
  .gmail_quote { color: #71717a; border-left: 2px solid #3f3f46; padding-left: 8px; margin: 8px 0; }
</style>
</head>
<body>${sanitizedHtml}</body>
</html>`;
  }, [sanitizedHtml]);

  return (
    <div className={clsx('rounded-lg border border-border-subtle transition', expanded ? 'bg-bg-secondary' : 'bg-bg-primary')}>
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-blue/20 text-sm font-medium text-accent-blue">
          {(message.from.name || message.from.email)[0]?.toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{message.from.name || message.from.email}</span>
            <span className="text-2xs text-text-muted flex-shrink-0">
              {format(new Date(message.date), 'MMM d, h:mm a')}
            </span>
          </div>
          {!expanded && <p className="truncate text-xs text-text-muted mt-0.5">{message.snippet}</p>}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {message.hasAttachments && <Paperclip className="h-3.5 w-3.5 text-text-muted" />}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Body - expandable */}
      {expanded && (
        <div className="border-t border-border-subtle px-4 py-3 animate-fade-in">
          {/* Recipients */}
          <div className="mb-2 text-xs text-text-muted">
            To: {message.to.map((t) => t.name || t.email).join(', ')}
            {message.cc.length > 0 && (
              <span className="ml-2">Cc: {message.cc.map((c) => c.name || c.email).join(', ')}</span>
            )}
          </div>

          {/* View toggle when HTML is available */}
          {hasHtml && (
            <div className="mb-2 flex items-center gap-2">
              <button
                onClick={() => setShowHtml(true)}
                className={clsx(
                  'rounded px-2 py-0.5 text-2xs font-medium transition compact-touch',
                  showHtml
                    ? 'bg-accent-blue/15 text-accent-blue'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                Rich
              </button>
              <button
                onClick={() => setShowHtml(false)}
                className={clsx(
                  'rounded px-2 py-0.5 text-2xs font-medium transition compact-touch',
                  !showHtml
                    ? 'bg-accent-blue/15 text-accent-blue'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                Plain
              </button>
            </div>
          )}

          {/* Email content */}
          {hasHtml && showHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={iframeSrcDoc}
              className="w-full border-0 rounded"
              style={{ height: iframeHeight, minHeight: 100 }}
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              title="Email content"
            />
          ) : (
            <div
              className="email-plain-text text-sm text-text-primary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: linkifiedText }}
            />
          )}
        </div>
      )}
    </div>
  );
});
