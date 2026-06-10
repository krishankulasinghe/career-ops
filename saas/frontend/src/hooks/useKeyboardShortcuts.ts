import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Skip if typing in an input/textarea/select or a contenteditable
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;

      // Navigation shortcuts (no modifier)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'g':
          // g then d → dashboard (handled via two-key sequence is complex; use single keys)
          navigate('/');
          break;
        case 'a':
          navigate('/applications');
          break;
        case 'e':
          navigate('/evaluations/new');
          break;
        case 'p':
          navigate('/pipeline');
          break;
        case '/': {
          // Focus search input if present
          e.preventDefault();
          const search = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="earch"]');
          if (search) search.focus();
          break;
        }
        case 'Escape': {
          // Close any open modal
          const overlay = document.querySelector<HTMLElement>('.modal-overlay');
          if (overlay) overlay.click();
          break;
        }
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
