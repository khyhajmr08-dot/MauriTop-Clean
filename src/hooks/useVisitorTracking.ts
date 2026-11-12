import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/useAuth';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';

function generateSecureSessionId(): string {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback if crypto fails
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useVisitorTracking() {
  const { user } = useAuth();
  const location = useLocation();
  const lastTrackedRef = useRef<{ path: string; time: number }>({ path: '', time: 0 });

  const userId = user?.uid || null;
  const path = location.pathname;

  useEffect(() => {
    let isSubscribed = true;

    const trackVisitor = async () => {
      // Avoid tracking if document is hidden to conserve resources and bandwidth
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      const now = Date.now();
      // Skip redundant tracking if path hasn't changed and last update was less than 45s ago
      if (lastTrackedRef.current.path === path && now - lastTrackedRef.current.time < 45000) {
        return;
      }

      try {
        let sessionId = localStorage.getItem('visitor_session_id');
        if (!sessionId) {
          sessionId = generateSecureSessionId();
          localStorage.setItem('visitor_session_id', sessionId);
        }

        const visitorRef = doc(db, 'active_visitors', sessionId);
        const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const deviceType = isMobile ? 'Mobile' : 'Desktop';

        const getBrowserName = () => {
          if (typeof navigator === 'undefined') return 'Web';
          const ua = navigator.userAgent;
          if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
          if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari';
          if (/firefox|fxios/i.test(ua)) return 'Firefox';
          if (/edg/i.test(ua)) return 'Edge';
          return 'Web';
        };

        const timeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC';

        // Anonymized telemetry: strictly NO personal names, phone numbers, or emails
        await setDoc(visitorRef, {
          sessionId,
          isRegistered: !!userId,
          device: deviceType,
          browser: getBrowserName(),
          timeZone,
          lastActive: serverTimestamp(),
          path,
        }, { merge: true });

        if (isSubscribed) {
          lastTrackedRef.current = { path, time: Date.now() };
        }
      } catch (error) {
        // Silently handle error (e.g. offline/rules) to prevent breaking UI
        console.warn('Visitor tracking skipped:', error);
      }
    };

    trackVisitor();

    // Heartbeat every 3 minutes (only runs when active tab is visible)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        trackVisitor();
      }
    }, 180000);

    // Track immediately when returning to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        trackVisitor();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, path]);
}
