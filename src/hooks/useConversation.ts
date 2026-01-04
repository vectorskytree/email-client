import { useCallback, useEffect, useRef } from 'react';
import { useChatStore, useAuthStore, useContactsStore } from '@/store';
import { getConversation, markAsRead } from '@/services/gmail';
import type { Contact } from '@/types';

const POLL_INTERVAL = 30000; // 30 seconds

export function useConversation() {
  const {
    selectedContact,
    messages,
    isLoading,
    hasMore,
    nextPageToken,
    error,
    selectContact,
    setMessages,
    addMessages,
    markMessageAsRead,
    setLoading,
    setHasMore,
    setError,
    getCachedMessages,
  } = useChatStore();
  const { userEmail } = useAuthStore();
  const { updateContact } = useContactsStore();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversation = useCallback(
    async (contact: Contact, pageToken?: string, silent = false) => {
      // Only show loading if no cached data and not a silent refresh
      const hasCachedData = !pageToken && getCachedMessages(contact.email);
      if (!silent && !hasCachedData) {
        setLoading(true);
      }
      setError(null);
      try {
        const { messages: newMessages, nextPageToken: token } =
          await getConversation(contact.email, 50, pageToken);

        if (pageToken) {
          addMessages(newMessages, contact.email);
        } else {
          setMessages(newMessages, contact.email);
        }
        setHasMore(!!token, token);

        // Mark messages as read
        const unreadMessages = newMessages.filter((msg) => !msg.isRead);
        if (unreadMessages.length > 0) {
          // Update contact's unread count
          updateContact(contact.email, { unreadCount: 0 });

          // Mark each message as read
          for (const msg of unreadMessages) {
            markAsRead(msg.id)
              .then(() => markMessageAsRead(msg.id))
              .catch(console.error);
          }
        }
      } catch (err) {
        // Only show error if not a silent refresh
        if (!silent) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch conversation'
          );
        }
      } finally {
        if (!silent && !hasCachedData) {
          setLoading(false);
        }
      }
    },
    [setLoading, setError, setMessages, addMessages, setHasMore, updateContact, markMessageAsRead, getCachedMessages]
  );

  const handleSelectContact = useCallback(
    (contact: Contact | null) => {
      selectContact(contact);
      if (contact) {
        // Always fetch silently if we have cached data (store sets isLoading based on cache)
        const hasCached = getCachedMessages(contact.email);
        fetchConversation(contact, undefined, !!hasCached);
      }
    },
    [selectContact, fetchConversation, getCachedMessages]
  );

  const loadMore = useCallback(() => {
    if (selectedContact && hasMore && nextPageToken && !isLoading) {
      fetchConversation(selectedContact, nextPageToken);
    }
  }, [selectedContact, hasMore, nextPageToken, isLoading, fetchConversation]);

  const refetch = useCallback(() => {
    if (selectedContact) {
      fetchConversation(selectedContact);
    }
  }, [selectedContact, fetchConversation]);

  // Prefetch a conversation (for hover preloading)
  const prefetchingRef = useRef<Set<string>>(new Set());
  const prefetch = useCallback(
    async (contact: Contact) => {
      // Skip if already cached or currently prefetching
      if (getCachedMessages(contact.email) || prefetchingRef.current.has(contact.email)) {
        return;
      }

      prefetchingRef.current.add(contact.email);
      try {
        const { messages: newMessages } = await getConversation(contact.email, 50);
        // Only cache, don't mark as read since user hasn't opened it
        setMessages(newMessages, contact.email);
      } catch {
        // Silently ignore prefetch errors
      } finally {
        prefetchingRef.current.delete(contact.email);
      }
    },
    [getCachedMessages, setMessages]
  );

  // Background polling for new messages
  useEffect(() => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Start polling if a contact is selected
    if (selectedContact) {
      pollIntervalRef.current = setInterval(() => {
        fetchConversation(selectedContact, undefined, true);
      }, POLL_INTERVAL);
    }

    // Cleanup on unmount or contact change
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [selectedContact, fetchConversation]);

  return {
    selectedContact,
    messages,
    isLoading,
    hasMore,
    error,
    userEmail,
    selectContact: handleSelectContact,
    loadMore,
    refetch,
    prefetch,
  };
}
