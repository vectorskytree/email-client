import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Contact, EmailMessage } from '@/types';

const MAX_CACHED_CONVERSATIONS = 20;
const MAX_MESSAGES_PER_CONVERSATION = 30;

interface ChatState {
  selectedContact: Contact | null;
  messages: EmailMessage[];
  messageCache: Record<string, EmailMessage[]>;
  isLoading: boolean;
  isSending: boolean;
  hasMore: boolean;
  nextPageToken: string | null;
  error: string | null;
  selectContact: (contact: Contact | null) => void;
  setMessages: (messages: EmailMessage[], contactEmail?: string) => void;
  addMessages: (messages: EmailMessage[], contactEmail?: string) => void;
  addMessage: (message: EmailMessage) => void;
  markMessageAsRead: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setHasMore: (hasMore: boolean, nextPageToken?: string | null) => void;
  setError: (error: string | null) => void;
  getCachedMessages: (contactEmail: string) => EmailMessage[] | null;
  reset: () => void;
}

// Helper to parse dates when loading from localStorage
const parseMessages = (messages: EmailMessage[]): EmailMessage[] => {
  return messages.map(msg => ({
    ...msg,
    date: new Date(msg.date),
  }));
};

// Limit cache size to prevent quota errors
const limitCache = (cache: Record<string, EmailMessage[]>): Record<string, EmailMessage[]> => {
  const entries = Object.entries(cache);

  // If within limits, just trim messages per conversation
  if (entries.length <= MAX_CACHED_CONVERSATIONS) {
    const limited: Record<string, EmailMessage[]> = {};
    for (const [email, messages] of entries) {
      limited[email] = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
    }
    return limited;
  }

  // Too many conversations - keep only the most recent ones
  // Sort by most recent message date
  const sorted = entries.sort((a, b) => {
    const aDate = a[1][a[1].length - 1]?.date || 0;
    const bDate = b[1][b[1].length - 1]?.date || 0;
    const aTime = typeof aDate === 'string' ? new Date(aDate).getTime() : aDate instanceof Date ? aDate.getTime() : 0;
    const bTime = typeof bDate === 'string' ? new Date(bDate).getTime() : bDate instanceof Date ? bDate.getTime() : 0;
    return bTime - aTime;
  });

  const limited: Record<string, EmailMessage[]> = {};
  for (const [email, messages] of sorted.slice(0, MAX_CACHED_CONVERSATIONS)) {
    limited[email] = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
  }
  return limited;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  selectedContact: null,
  messages: [],
  messageCache: {},
  isLoading: false,
  isSending: false,
  hasMore: false,
  nextPageToken: null,
  error: null,
  selectContact: (contact) => {
    // Load cached messages immediately if available
    const cached = contact ? get().messageCache[contact.email] : null;
    set({
      selectedContact: contact,
      messages: cached ? parseMessages(cached) : [],
      hasMore: false,
      nextPageToken: null,
      error: null,
      isLoading: !cached, // Only show loading if no cache
    });
  },
  setMessages: (messages, contactEmail) => {
    const sorted = messages.sort((a, b) => a.date.getTime() - b.date.getTime());
    const email = contactEmail || get().selectedContact?.email;
    const currentSelectedEmail = get().selectedContact?.email;
    set((state) => ({
      // Only update displayed messages if this is for the currently selected contact
      messages: email === currentSelectedEmail ? sorted : state.messages,
      isLoading: email === currentSelectedEmail ? false : state.isLoading,
      messageCache: email
        ? { ...state.messageCache, [email]: sorted }
        : state.messageCache,
    }));
  },
  addMessages: (newMessages, contactEmail) => {
    const currentSelectedEmail = get().selectedContact?.email;
    const email = contactEmail || currentSelectedEmail;
    // Only update if for currently selected contact
    if (email !== currentSelectedEmail) {
      return;
    }
    set((state) => {
      const sorted = [...state.messages, ...newMessages].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
      return {
        messages: sorted,
        messageCache: email
          ? { ...state.messageCache, [email]: sorted }
          : state.messageCache,
      };
    });
  },
  addMessage: (message) =>
    set((state) => {
      const sorted = [...state.messages, message].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
      const email = state.selectedContact?.email;
      return {
        messages: sorted,
        messageCache: email
          ? { ...state.messageCache, [email]: sorted }
          : state.messageCache,
      };
    }),
  markMessageAsRead: (messageId) =>
    set((state) => {
      const updatedMessages = state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, isRead: true } : msg
      );
      const email = state.selectedContact?.email;
      return {
        messages: updatedMessages,
        messageCache: email
          ? { ...state.messageCache, [email]: updatedMessages }
          : state.messageCache,
      };
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSending: (sending) => set({ isSending: sending }),
  setHasMore: (hasMore, nextPageToken = null) =>
    set({ hasMore, nextPageToken }),
  setError: (error) => set({ error }),
  getCachedMessages: (contactEmail) => {
    const cached = get().messageCache[contactEmail];
    return cached ? parseMessages(cached) : null;
  },
  reset: () =>
    set({
      selectedContact: null,
      messages: [],
      messageCache: {},
      isLoading: false,
      isSending: false,
      hasMore: false,
      nextPageToken: null,
      error: null,
    }),
    }),
    {
      name: 'email-chat-cache',
      partialize: (state) => ({
        messageCache: limitCache(state.messageCache),
      }),
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            // Quota exceeded - clear old cache and try again
            console.warn('Storage quota exceeded, clearing cache');
            try {
              localStorage.removeItem(name);
              localStorage.setItem(name, JSON.stringify(value));
            } catch {
              // Still failing, just skip caching
              console.warn('Failed to save cache');
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // Ignore errors
          }
        },
      },
    }
  )
);
