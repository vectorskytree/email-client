import { useAuth, useContacts, useConversation, useSendEmail, useMobile } from '@/hooks';
import { LoginScreen } from '@/components/auth';
import { AppLayout, Sidebar } from '@/components/layout';
import { ContactList } from '@/components/contacts';
import { ChatView } from '@/components/chat';
import type { Contact, EmailAddress } from '@/types';

export default function App() {
  const {
    isInitialized,
    isAuthenticated,
    maybeAuthenticated,
    userEmail,
    isLoading: authLoading,
    error: authError,
    signIn,
    signOut,
  } = useAuth();

  const {
    contacts,
    isLoading: contactsLoading,
    error: contactsError,
  } = useContacts();

  const {
    selectedContact,
    messages,
    isLoading: conversationLoading,
    error: conversationError,
    selectContact,
    prefetch,
  } = useConversation();

  const { send, isSending } = useSendEmail();
  const { isMobile, showChat, openChat, closeChat } = useMobile();

  const handleSend = async (message: string, recipients: EmailAddress[], subject: string) => {
    try {
      await send(message, recipients, subject);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    selectContact(contact);
    if (isMobile) {
      openChat();
    }
  };

  // Show login screen only if not authenticated and no stored credentials
  if (!isAuthenticated && !maybeAuthenticated) {
    return (
      <LoginScreen
        onSignIn={signIn}
        isLoading={authLoading}
        isInitialized={isInitialized}
        error={authError}
      />
    );
  }

  return (
    <AppLayout
      userEmail={userEmail}
      onSignOut={signOut}
      isMobile={isMobile}
      showChat={showChat}
      onCloseChat={closeChat}
      sidebar={
        <Sidebar>
          <ContactList
            contacts={contacts}
            selectedContact={selectedContact}
            isLoading={contactsLoading}
            error={contactsError}
            onSelectContact={handleSelectContact}
            onPrefetchContact={prefetch}
          />
        </Sidebar>
      }
      main={
        <ChatView
          contact={selectedContact}
          messages={messages}
          userEmail={userEmail}
          isLoading={conversationLoading}
          isSending={isSending}
          error={conversationError}
          onSend={handleSend}
          isMobile={isMobile}
          onBack={closeChat}
        />
      }
    />
  );
}
