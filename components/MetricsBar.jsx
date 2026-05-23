'use client';

export default function MetricsBar({ metrics }) {
  if (!metrics) {
    return (
      <div className="metrics-bar">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="metric-card">
            <div className="skeleton" style={{ height: '12px', width: '60%', marginBottom: '10px' }} />
            <div className="skeleton" style={{ height: '32px', width: '80%' }} />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      id: 'metric-attendance',
      label: 'Total Attendance',
      value: metrics.totalOccupancy?.toLocaleString('en-IN') || '—',
      sub: `${metrics.occupancyPct || 0}% of ${(metrics.stadiumCapacity / 1000).toFixed(0)}K capacity`,
      icon: '👥',
      accent:
        metrics.occupancyPct > 90
          ? 'var(--status-red)'
          : metrics.occupancyPct > 70
            ? 'var(--status-amber)'
            : 'var(--status-green)',
    },
    {
      id: 'metric-congestion',
      label: 'Avg Congestion',
      value: `${metrics.avgCongestion || 0}%`,
      sub: `${metrics.redGates || 0} critical · ${metrics.amberGates || 0} warning`,
      icon: '🚦',
      accent:
        metrics.avgCongestion > 70
          ? 'var(--status-red)'
          : metrics.avgCongestion > 50
            ? 'var(--status-amber)'
            : 'var(--status-green)',
    },
    {
      id: 'metric-wait',
      label: 'Avg Wait Time',
      value: `${metrics.avgWaitTime || 0} min`,
      sub: metrics.avgWaitTime > 10 ? '⚠️ Above threshold' : '✅ Within limits',
      icon: '⏱️',
      accent:
        metrics.avgWaitTime > 12
          ? 'var(--status-red)'
          : metrics.avgWaitTime > 8
            ? 'var(--status-amber)'
            : 'var(--status-green)',
    },
    {
      id: 'metric-incidents',
      label: 'Active Incidents',
      value: metrics.activeIncidents ?? '0',
      sub: metrics.activeIncidents > 0 ? '⚠️ Requires attention' : '✅ All clear',
      icon: '🚨',
      accent:
        metrics.activeIncidents > 3
          ? 'var(--status-red)'
          : metrics.activeIncidents > 0
            ? 'var(--status-amber)'
            : 'var(--status-green)',
    },
  ];

  return (
    <div className="metrics-bar" role="region" aria-label="Key performance metrics">
      {items.map((item) => (
        <div
          key={item.id}
          id={item.id}
          className="metric-card"
          style={{ borderBottom: `2px solid ${item.accent}` }}
        >
          <span className="metric-icon" aria-hidden="true">
            {item.icon}
          </span>
          <div className="metric-label">{item.label}</div>
          <div className="metric-value" style={{ color: item.accent }}>
            {item.value}
          </div>
          <div className="metric-sub">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}
