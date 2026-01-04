import { fetchGmailApi } from './client';
import { parseGmailMessage } from './parser';
import type { EmailMessage, EmailDraft } from '@/types';

interface MessagesListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

interface MessageResponse {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { size: number; data?: string; attachmentId?: string };
    parts?: unknown[];
    mimeType: string;
  };
  internalDate: string;
}

export async function listMessages(
  query: string = '',
  maxResults: number = 50,
  pageToken?: string
): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
  });

  if (query) params.append('q', query);
  if (pageToken) params.append('pageToken', pageToken);

  const response = await fetchGmailApi<MessagesListResponse>(
    `/messages?${params.toString()}`
  );

  if (!response.messages || response.messages.length === 0) {
    return { messages: [] };
  }

  const messages = await Promise.all(
    response.messages.map((msg) => getMessage(msg.id))
  );

  return {
    messages: messages.filter((m): m is EmailMessage => m !== null),
    nextPageToken: response.nextPageToken,
  };
}

export async function getMessage(id: string): Promise<EmailMessage | null> {
  try {
    const response = await fetchGmailApi<MessageResponse>(
      `/messages/${id}?format=full`
    );
    return parseGmailMessage(response as Parameters<typeof parseGmailMessage>[0]);
  } catch {
    console.error(`Failed to fetch message ${id}`);
    return null;
  }
}

export async function getConversation(
  contactEmail: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> {
  const query = `from:${contactEmail} OR to:${contactEmail}`;
  return listMessages(query, maxResults, pageToken);
}

export async function sendMessage(draft: EmailDraft): Promise<EmailMessage> {
  const headers = [
    `To: ${draft.to.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(', ')}`,
    draft.cc?.length ? `Cc: ${draft.cc.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(', ')}` : '',
    `Subject: ${draft.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: text/plain; charset="UTF-8"`,
  ]
    .filter(Boolean)
    .join('\r\n');

  if (draft.inReplyTo) {
    headers.concat(`\r\nIn-Reply-To: ${draft.inReplyTo}`);
    if (draft.references) {
      headers.concat(`\r\nReferences: ${draft.references.join(' ')}`);
    }
  }

  const email = `${headers}\r\n\r\n${draft.body}`;
  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetchGmailApi<MessageResponse>('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: encodedEmail }),
  });

  const fullMessage = await getMessage(response.id);
  if (!fullMessage) {
    throw new Error('Failed to retrieve sent message');
  }
  return fullMessage;
}

export async function markAsRead(messageId: string): Promise<void> {
  await fetchGmailApi(`/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: ['UNREAD'],
    }),
  });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await fetchGmailApi(`/messages/${messageId}/trash`, {
    method: 'POST',
  });
}

export async function getAttachment(
  messageId: string,
  attachmentId: string
): Promise<Blob> {
  const response = await fetchGmailApi<{ size: number; data: string }>(
    `/messages/${messageId}/attachments/${attachmentId}`
  );

  const base64 = response.data.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes]);
}

export async function getUserEmail(): Promise<string> {
  const response = await fetchGmailApi<{ emailAddress: string }>('/profile');
  return response.emailAddress;
}
