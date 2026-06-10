import { useEffect } from 'react';
import { useMe } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  const { data, isLoading, isError } = useMe();
  const { user, org, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    if (data) {
      setAuth(data.user, data.org);
    } else if (isError) {
      clearAuth();
    }
  }, [data, isError, setAuth, clearAuth]);

  return {
    user: data?.user ?? user,
    org: data?.org ?? org,
    isLoading,
    isAuthenticated: !!(data?.user ?? user),
  };
}
