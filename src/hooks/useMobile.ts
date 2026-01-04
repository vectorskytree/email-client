import { useEffect } from 'react';
import { create } from 'zustand';

const MOBILE_BREAKPOINT = 768;

interface MobileState {
  isMobile: boolean;
  showChat: boolean;
  setIsMobile: (isMobile: boolean) => void;
  openChat: () => void;
  closeChat: () => void;
}

const useMobileStore = create<MobileState>((set) => ({
  isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
  showChat: false,
  setIsMobile: (isMobile) => set((state) => ({
    isMobile,
    // Reset chat view when switching to desktop
    showChat: isMobile ? state.showChat : false
  })),
  openChat: () => set({ showChat: true }),
  closeChat: () => set({ showChat: false }),
}));

interface UseMobileReturn {
  isMobile: boolean;
  showChat: boolean;
  openChat: () => void;
  closeChat: () => void;
}

export function useMobile(): UseMobileReturn {
  const { isMobile, showChat, setIsMobile, openChat, closeChat } = useMobileStore();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  return { isMobile, showChat, openChat, closeChat };
}
