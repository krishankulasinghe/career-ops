import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

export interface RealtimeEvent {
  type: string;
  orgId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export function useRealtimeEvents(onEvent?: (event: RealtimeEvent) => void) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(1000);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!user) return;
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      const es = new EventSource('/api/v1/events', { withCredentials: true });
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as RealtimeEvent;
          backoffRef.current = 1000;

          // Invalidate relevant query caches
          switch (event.type) {
            case 'evaluation.completed':
              qc.invalidateQueries({ queryKey: ['evaluations'] });
              qc.invalidateQueries({ queryKey: ['applications'] });
              break;
            case 'scan.completed':
              qc.invalidateQueries({ queryKey: ['scan-results'] });
              break;
            case 'pdf.ready':
              qc.invalidateQueries({ queryKey: ['evaluations', event.data['evaluationId']] });
              break;
            case 'notification':
              qc.invalidateQueries({ queryKey: ['notifications'] });
              break;
          }

          onEvent?.(event);
        } catch { /* malformed JSON */ }
      };

      es.onerror = () => {
        es.close();
        if (!mountedRef.current) return;
        // Exponential backoff up to 60s
        setTimeout(connect, Math.min(backoffRef.current, 60_000));
        backoffRef.current = Math.min(backoffRef.current * 2, 60_000);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [user?.id]);
}
