import { create } from 'zustand';
import type { Contact } from '@/types';

interface ContactsState {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  setContacts: (contacts: Contact[]) => void;
  updateContact: (email: string, updates: Partial<Contact>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],
  isLoading: false,
  error: null,
  setContacts: (contacts) => set({ contacts }),
  updateContact: (email, updates) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.email === email ? { ...c, ...updates } : c
      ),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({ contacts: [], isLoading: false, error: null }),
}));
