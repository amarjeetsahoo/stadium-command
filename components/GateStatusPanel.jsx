'use client';

export default function GateStatusPanel({ gates, onGateAction }) {
  if (!gates || gates.length === 0) {
    return (
      <div className="gate-grid">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="gate-card">
            <div className="skeleton" style={{ height: '10px', width: '40%', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '28px', width: '60%', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '3px', width: '100%', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '10px', width: '80%' }} />
          </div>
        ))}
      </div>
    );
  }

  const statusLabel = { green: 'CLEAR', amber: 'BUSY', red: 'CRITICAL' };

  return (
    <div className="gate-grid" role="list" aria-label="Gate status">
      {gates.map((gate) => {
        const cardClass = gate.locked ? 'locked' : gate.redirect ? 'amber' : gate.status;

        return (
          <div
            key={gate.id}
            id={`gate-card-${gate.id.toLowerCase()}`}
            className={`gate-card ${cardClass}`}
            role="listitem"
            aria-label={`${gate.name}, congestion ${gate.congestion}%`}
          >
            <div className="gate-name">{gate.id}</div>

            <div className="gate-congestion">
              {gate.locked ? '🔒' : gate.redirect ? '↪' : `${gate.congestion}%`}
            </div>
            <div className="gate-label">
              {gate.locked ? 'LOCKED' : gate.redirect ? 'REDIRECT' : 'Congestion'}
            </div>

            <div className="congestion-bar" aria-hidden="true">
              <div
                className="congestion-fill"
                style={{ width: `${gate.locked ? 100 : gate.congestion}%` }}
              />
            </div>

            <div className="gate-stats">
              <span>{gate.occupancy?.toLocaleString('en-IN')} pax</span>
              <span className={`gate-status-pill ${gate.locked ? 'locked' : cardClass}`}>
                {gate.locked ? 'LOCKED' : gate.redirect ? 'REDIR' : statusLabel[gate.status]}
              </span>
            </div>

            <div
              style={{
                marginTop: '8px',
                fontSize: '10px',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>⏱ {gate.waitTime}m wait</span>
              {onGateAction && !gate.locked && (
                <button
                  id={`btn-gate-action-${gate.id.toLowerCase()}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '10px',
                    cursor: 'pointer',
                    padding: '0',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: '600',
                  }}
                  onClick={() => onGateAction(gate)}
                  aria-label={`Actions for ${gate.id}`}
                >
                  Manage →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
