'use client';

import { useState, useEffect } from 'react';

export default function Header({ user, onSignOut, evacuationMode, isSidebarCollapsed, onToggleSidebar, theme, toggleTheme }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header" id="app-header">
      <div className="header-brand">
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className="btn btn-ghost btn-sm"
          style={{
            marginRight: '8px',
            fontSize: '12px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isSidebarCollapsed ? '▶️' : '◀️'}
        </button>
        <div className="header-logo" aria-hidden="true">
          🏟️
        </div>
        <div>
          <div className="header-title">CrowdCommand</div>
          <div className="header-subtitle">Stadium Mission Control</div>
        </div>
      </div>

      <div className="header-center">
        {evacuationMode ? (
          <div
            className="live-badge"
            style={{
              background: 'rgba(239,68,68,0.15)',
              borderColor: 'rgba(239,68,68,0.4)',
              color: 'var(--status-red)',
            }}
            aria-live="assertive"
          >
            <span
              className="live-dot"
              style={{ background: 'var(--status-red)' }}
            />
            EVACUATION ACTIVE
          </div>
        ) : (
          <div className="live-badge" aria-live="polite">
            <span className="live-dot" />
            LIVE
          </div>
        )}
      </div>

      <div className="header-right">
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '14px', padding: '4px 8px', marginRight: '8px' }}
          title="Toggle Light/Dark Mode"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <time className="header-time" dateTime={new Date().toISOString()}>
          {time} IST
        </time>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.email}
            </span>
            <button
              id="btn-signout"
              className="btn btn-ghost btn-sm"
              onClick={onSignOut}
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
