import type { ReactNode } from 'react';
import { Header } from './Header';
import { TopNav } from './TopNav';
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
    <div className="page">
      <Header />
      <TopNav />
      <div className="page-wrapper">
        {title && (
          <div className="page-header d-print-none">
            <div className="container-xl">
              <div className="row align-items-center">
                <div className="col">
                  <h2 className="page-title">{title}</h2>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="page-body">
          <div className="container-xl">
            {children}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
