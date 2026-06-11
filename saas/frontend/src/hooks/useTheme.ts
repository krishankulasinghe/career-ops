import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme.store';

export function useTheme() {
  const { mode, toggle, setMode } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', mode);
  }, [mode]);

  return { mode, toggle, setMode };
}
