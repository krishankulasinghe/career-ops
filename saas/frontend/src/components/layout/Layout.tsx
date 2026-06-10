import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  useKeyboardShortcuts();
  useRealtimeEvents();
  return (
    <main className="main" id="top">
      <div className="container" data-layout="container">
        <Sidebar />
        <div className="content">
          <Header title={title} />
          {children}
          <Footer />
        </div>
      </div>
    </main>
  );
}
