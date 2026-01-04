import { type ReactNode, useRef, useEffect, useCallback } from 'react';
import { Header } from './Header';

interface AppLayoutProps {
  userEmail?: string | null;
  onSignOut: () => void;
  sidebar: ReactNode;
  main: ReactNode;
  isMobile: boolean;
  showChat: boolean;
  onCloseChat: () => void;
}

export function AppLayout({
  userEmail,
  onSignOut,
  sidebar,
  main,
  isMobile,
  showChat,
  onCloseChat,
}: AppLayoutProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Handle swipe gesture to go back
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    // Ignore if touch started on a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea')) {
      return;
    }
    // Only start tracking if touch starts from left edge (within 30px)
    if (touch.clientX <= 30) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      isDraggingRef.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Must be a horizontal swipe (more horizontal than vertical)
    if (deltaX > 10 && deltaX > deltaY) {
      isDraggingRef.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isDraggingRef.current && touchStartRef.current) {
      onCloseChat();
    }
    touchStartRef.current = null;
    isDraggingRef.current = false;
  }, [onCloseChat]);

  useEffect(() => {
    if (!isMobile || !showChat) return;

    const mainEl = mainRef.current;
    if (!mainEl) return;

    mainEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainEl.addEventListener('touchmove', handleTouchMove, { passive: true });
    mainEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      mainEl.removeEventListener('touchstart', handleTouchStart);
      mainEl.removeEventListener('touchmove', handleTouchMove);
      mainEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, showChat, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="h-screen flex flex-col bg-[#f6f8fc]">
        <Header userEmail={userEmail} onSignOut={onSignOut} />
        <div className="flex-1 flex overflow-hidden min-h-0">
          {sidebar}
          <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-white">{main}</main>
        </div>
      </div>
    );
  }

  // Mobile layout with slide animation
  return (
    <div className="h-screen flex flex-col bg-[#f6f8fc] overflow-hidden">
      <Header userEmail={userEmail} onSignOut={onSignOut} isMobile />
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* Sidebar (contacts) - always rendered */}
        <div className="mobile-panel bg-white">
          {sidebar}
        </div>

        {/* Main (chat) - slides over sidebar */}
        <div
          ref={mainRef}
          className={`mobile-slide-panel bg-white shadow-xl overflow-hidden ${showChat ? '' : 'offscreen'}`}
        >
          <div className="h-full w-full overflow-hidden flex flex-col">
            {main}
          </div>
        </div>
      </div>
    </div>
  );
}
