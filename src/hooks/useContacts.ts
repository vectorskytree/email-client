import { useCallback, useEffect } from 'react';
import { useContactsStore, useAuthStore } from '@/store';
import { listMessages } from '@/services/gmail';
import { groupMessagesByContact } from '@/utils';

export function useContacts() {
  const { contacts, isLoading, error, setContacts, setLoading, setError } =
    useContactsStore();
  const { isAuthenticated, userEmail } = useAuthStore();

  const fetchContacts = useCallback(async () => {
    if (!isAuthenticated || !userEmail) return;

    setLoading(true);
    setError(null);
    try {
      const { messages } = await listMessages('', 100);
      const contactList = groupMessagesByContact(messages, userEmail);
      setContacts(contactList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, userEmail, setContacts, setLoading, setError]);

  useEffect(() => {
    if (isAuthenticated && contacts.length === 0) {
      fetchContacts();
    }
  }, [isAuthenticated, contacts.length, fetchContacts]);

  return {
    contacts,
    isLoading,
    error,
    refetch: fetchContacts,
  };
}
