import { useState, useMemo } from 'react';
import { ContactItem } from './ContactItem';
import { ContactSearch } from './ContactSearch';
import { ContactListSkeleton } from '@/components/ui';
import type { Contact } from '@/types';

interface ContactListProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  isLoading: boolean;
  error?: string | null;
  onSelectContact: (contact: Contact) => void;
  onPrefetchContact?: (contact: Contact) => void;
}

export function ContactList({
  contacts,
  selectedContact,
  isLoading,
  error,
  onSelectContact,
  onPrefetchContact,
}: ContactListProps) {
  const [search, setSearch] = useState('');

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const query = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.email.toLowerCase().includes(query) ||
        c.name?.toLowerCase().includes(query)
    );
  }, [contacts, search]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ContactSearch value={search} onChange={setSearch} />
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && contacts.length === 0 ? (
          <ContactListSkeleton />
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-[#667781]">
            {search ? 'No contacts found' : 'No conversations yet'}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <ContactItem
              key={contact.email}
              contact={contact}
              isSelected={selectedContact?.email === contact.email}
              onClick={() => onSelectContact(contact)}
              onPrefetch={onPrefetchContact ? () => onPrefetchContact(contact) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
