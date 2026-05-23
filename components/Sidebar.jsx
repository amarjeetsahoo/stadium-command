'use client';

export default function Sidebar({ activeSection, onSectionChange, isCollapsed }) {
  const navItems = [
    { id: 'overview', icon: '📊', label: 'Overview', section: 'overview' },
    { id: 'map', icon: '🗺️', label: 'Live Heatmap', section: 'map' },
    { id: 'gates', icon: '🚪', label: 'Gate Status', section: 'gates' },
    { id: 'incidents', icon: '⚠️', label: 'Incidents', section: 'incidents' },
    { id: 'ai', icon: '🤖', label: 'AI Analysis', section: 'ai' },
    { id: 'vip', icon: '⭐', label: 'VIP Tracking', section: 'vip' },
    { id: 'alerts', icon: '📢', label: 'Broadcast Alerts', section: 'alerts' },
  ];

  const statusItems = [
    { id: 'weather', icon: '🌤️', label: 'Weather', section: 'weather' },
    { id: 'settings', icon: '⚙️', label: 'Settings', section: 'settings' },
  ];

  return (
    <aside className="sidebar" id="app-sidebar" aria-label="Navigation">
      <nav className="sidebar-section" aria-label="Main navigation">
        {!isCollapsed && <div className="sidebar-section-label">Mission Control</div>}
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item ${activeSection === item.section ? 'active' : ''}`}
            onClick={() => onSectionChange(item.section)}
            aria-current={activeSection === item.section ? 'page' : undefined}
            title={isCollapsed ? item.label : undefined}
            style={{
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '9px 0' : '9px 12px',
            }}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {!isCollapsed && item.label}
          </button>
        ))}
      </nav>

      <nav className="sidebar-section" aria-label="Status and settings">
        {!isCollapsed && <div className="sidebar-section-label">System</div>}
        {statusItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item ${activeSection === item.section ? 'active' : ''}`}
            onClick={() => onSectionChange(item.section)}
            title={isCollapsed ? item.label : undefined}
            style={{
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '9px 0' : '9px 12px',
            }}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {!isCollapsed && item.label}
          </button>
        ))}
      </nav>

      {isCollapsed ? (
        <div
          className="sidebar-section"
          style={{
            marginTop: 'auto',
            textAlign: 'center',
            fontSize: '16px',
            padding: '16px 0',
          }}
          title="🏏 Narendra Modi Stadium — Ahmedabad, Gujarat"
        >
          🏏
        </div>
      ) : (
        <div className="sidebar-section" style={{ marginTop: 'auto' }}>
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--card-radius)',
              padding: '12px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '6px',
              }}
            >
              Venue
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-primary)',
              }}
            >
              🏏 Narendra Modi Stadium
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              Ahmedabad, Gujarat
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                marginTop: '6px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Cap: 1,32,000
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
