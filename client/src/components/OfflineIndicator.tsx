import { useState, useEffect } from 'react';

/**
 * Role-based offline handler.
 * - Collectors: returns null (collector dashboard has its own offline collection UI)
 * - All other roles: shows a full-screen branded "You're offline" page
 */
export function OfflineIndicator({ userRole }: { userRole?: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check (every 15s when offline)
    const interval = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        await fetch('/manifest.json', { method: 'HEAD', cache: 'no-cache' });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Online: nothing to show
  if (isOnline) return null;

  // Collector: let the collector dashboard handle offline (it has its own offline form)
  if (userRole === 'collector') return null;

  // All other roles: full-screen offline overlay
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #f8fafc 100%)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        textAlign: 'center' as const,
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: '420px', width: '100%' }}>
        {/* Logo */}
        <div style={{ marginBottom: '2rem' }}>
          <svg width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="48" fill="#059669" />
            <path d="M30 55 C30 35, 50 20, 70 35 C60 30, 45 35, 40 50 C55 30, 70 40, 65 60 C60 50, 50 48, 40 55 C50 45, 35 55, 30 55Z" fill="#fff" opacity="0.95"/>
            <path d="M50 45 L50 72" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', marginTop: '0.5rem' }}>
            GreenPath
          </div>
        </div>

        {/* Wifi-off icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            background: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
          You're currently offline
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#64748b',
            lineHeight: 1.6,
            marginBottom: '2rem',
            maxWidth: '340px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          It looks like your internet connection dropped.
          Please check your Wi-Fi or mobile data and try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 2rem',
            background: '#059669',
            color: '#fff',
            border: 'none',
            borderRadius: '0.75rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Try Again
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          Your session is saved — you'll pick up right where you left off.
        </p>
      </div>
    </div>
  );
}