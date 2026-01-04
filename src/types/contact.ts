import type { EmailMessage } from './email';

export interface Contact {
  email: string;
  name?: string;
  avatarUrl?: string;
  lastMessage?: EmailMessage;
  lastMessageDate?: Date;
  unreadCount: number;
}

export interface Conversation {
  contact: Contact;
  messages: EmailMessage[];
  hasMore: boolean;
  nextPageToken?: string;
}
