import type { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-full md:w-[30%] md:min-w-[300px] md:max-w-[400px] bg-white md:border-r border-[#e8eaed] flex flex-col h-full min-h-0 flex-shrink-0">
      {children}
    </aside>
  );
}
