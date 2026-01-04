import DOMPurify from 'dompurify';
import type { EmailMessage, EmailAddress, Attachment } from '@/types';

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload: GmailPayload;
  internalDate: string;
}

interface GmailPayload {
  headers: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPart[];
  mimeType: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailBody {
  size: number;
  data?: string;
  attachmentId?: string;
}

interface GmailPart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers: GmailHeader[];
  body: GmailBody;
  parts?: GmailPart[];
}

function getHeader(headers: GmailHeader[], name: string): string {
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? '';
}

function parseEmailAddress(value: string): EmailAddress {
  // Match "Name <email>" format
  const matchWithName = value.match(/^(.+?)\s*<(.+?)>$/);
  if (matchWithName && matchWithName[1].trim()) {
    return { name: matchWithName[1].trim().replace(/^"|"$/g, ''), email: matchWithName[2].toLowerCase() };
  }

  // Match "<email>" format (no name)
  const matchEmailOnly = value.match(/^<(.+?)>$/);
  if (matchEmailOnly) {
    return { email: matchEmailOnly[1].toLowerCase() };
  }

  // Plain email address - strip any angle brackets and normalize
  return { email: value.trim().replace(/^<|>$/g, '').toLowerCase() };
}

function parseEmailAddressList(value: string): EmailAddress[] {
  if (!value) return [];
  return value.split(',').map((addr) => parseEmailAddress(addr.trim()));
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

function extractBody(payload: GmailPayload): { text: string; html?: string } {
  let textBody = '';
  let htmlBody: string | undefined;

  function processPart(part: GmailPart | GmailPayload): void {
    if (part.body?.data) {
      const content = decodeBase64Url(part.body.data);
      if (part.mimeType === 'text/plain') {
        textBody = content;
      } else if (part.mimeType === 'text/html') {
        htmlBody = content;
      }
    }

    if ('parts' in part && part.parts) {
      for (const subPart of part.parts) {
        processPart(subPart);
      }
    }
  }

  processPart(payload);

  return { text: textBody, html: htmlBody };
}

function parseUnsubscribeUrl(value: string): string | undefined {
  if (!value) return undefined;

  // Clean up the value - remove newlines and extra whitespace
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').trim();

  // List-Unsubscribe can contain multiple URLs/mailto links, comma or space separated
  // Format: <https://example.com/unsub>, <mailto:unsub@example.com>
  // We prefer https URLs over mailto
  const matches = cleaned.match(/<([^>]+)>/g);

  let urls: string[] = [];

  if (matches) {
    urls = matches.map(m => m.slice(1, -1).trim());
  } else {
    // Some providers don't use angle brackets - try to find URLs directly
    const urlMatch = cleaned.match(/https?:\/\/[^\s,<>]+/gi);
    if (urlMatch) {
      urls = urlMatch;
    }
  }

  // Clean up each URL
  urls = urls.map(url => {
    // Remove any trailing punctuation that might have been captured
    return url.replace(/[,;'"]+$/, '').trim();
  });

  // Prefer https URL, validate it looks like a real URL
  const httpUrl = urls.find(url => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
  if (httpUrl) return httpUrl;

  // Fall back to mailto
  const mailtoUrl = urls.find(url => url.startsWith('mailto:'));
  if (mailtoUrl) return mailtoUrl;

  return undefined;
}

function extractAttachments(payload: GmailPayload): Attachment[] {
  const attachments: Attachment[] = [];

  function processPart(part: GmailPart): void {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        id: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
      });
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        processPart(subPart);
      }
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      processPart(part);
    }
  }

  return attachments;
}

export function parseGmailMessage(raw: GmailMessage): EmailMessage {
  const headers = raw.payload.headers;
  const { text, html } = extractBody(raw.payload);

  return {
    id: raw.id,
    threadId: raw.threadId,
    from: parseEmailAddress(getHeader(headers, 'From')),
    to: parseEmailAddressList(getHeader(headers, 'To')),
    cc: parseEmailAddressList(getHeader(headers, 'Cc')) || undefined,
    subject: getHeader(headers, 'Subject') || '(No Subject)',
    snippet: raw.snippet,
    body: text,
    bodyHtml: html ? DOMPurify.sanitize(html) : undefined,
    date: new Date(parseInt(raw.internalDate, 10)),
    isRead: !raw.labelIds?.includes('UNREAD'),
    labels: raw.labelIds ?? [],
    attachments: extractAttachments(raw.payload),
    unsubscribeUrl: parseUnsubscribeUrl(getHeader(headers, 'List-Unsubscribe')),
  };
}

export function getContactEmail(message: EmailMessage, userEmail: string): string {
  const fromEmail = message.from.email.toLowerCase();
  const user = userEmail.toLowerCase();

  if (fromEmail === user) {
    return message.to[0]?.email.toLowerCase() ?? fromEmail;
  }
  return fromEmail;
}

export function getContactName(message: EmailMessage, userEmail: string): string | undefined {
  const fromEmail = message.from.email.toLowerCase();
  const user = userEmail.toLowerCase();

  if (fromEmail === user) {
    return message.to[0]?.name ?? message.to[0]?.email;
  }
  return message.from.name ?? message.from.email;
}
