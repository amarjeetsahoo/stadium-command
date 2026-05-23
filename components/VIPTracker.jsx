'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, set } from 'firebase/database';

const VIP_ZONES = [
  { id: 'vip-01', name: 'BCCI President Box', location: 'North Stand, Level 4', emoji: '🏏' },
  { id: 'vip-02', name: 'State Guest Pavilion', location: 'West Stand, Level 3', emoji: '🎖️' },
  { id: 'vip-03', name: 'Corporate Suite A', location: 'East Stand, Level 3', emoji: '🏢' },
  { id: 'vip-04', name: 'Media Press Box', location: 'South Stand, Level 2', emoji: '📹' },
];

export default function VIPTracker({ onGateUpdate }) {
  const [vipStates, setVipStates] = useState(() =>
    Object.fromEntries(VIP_ZONES.map((z) => [z.id, { active: false, escortEn: false }]))
  );
  const [gateOverrides, setGateOverrides] = useState({});

  const toggleVIP = async (zoneId) => {
    const newActive = !vipStates[zoneId]?.active;
    setVipStates((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], active: newActive } }));

    // Write VIP state to Firebase
    try {
      await set(ref(db, `vip_zones/${zoneId}`), {
        active: newActive,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('[VIPTracker] Firebase write failed:', err.message);
    }
  };

  const toggleEscort = async (zoneId) => {
    const newEscort = !vipStates[zoneId]?.escortEn;
    setVipStates((prev) => ({ ...prev, [zoneId]: { ...prev[zoneId], escortEn: newEscort } }));
  };

  const handleGateAction = async (gateId, action) => {
    const newState = { ...gateOverrides };

    if (action === 'lock') {
      newState[gateId] = 'locked';
      // Write to Firebase
      try {
        await set(ref(db, `gate_overrides/${gateId}`), { locked: true, updatedAt: Date.now() });
      } catch (err) {
        console.warn('[VIPTracker] Firebase write failed:', err.message);
      }
    } else if (action === 'redirect') {
      newState[gateId] = 'redirect';
      try {
        await set(ref(db, `gate_overrides/${gateId}`), { redirect: true, updatedAt: Date.now() });
      } catch (err) {
        console.warn('[VIPTracker] Firebase write failed:', err.message);
      }
    } else {
      delete newState[gateId];
      try {
        await set(ref(db, `gate_overrides/${gateId}`), null);
      } catch (err) {
        console.warn('[VIPTracker] Firebase write failed:', err.message);
      }
    }

    setGateOverrides(newState);
    if (onGateUpdate) onGateUpdate(newState);
  };

  const GATE_ACTIONS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'];

  return (
    <div className="panel" id="vip-tracker-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">👑</span>
          VIP Zone Management
        </span>
        <span className="panel-badge amber">
          {Object.values(vipStates).filter((v) => v.active).length} ACTIVE
        </span>
      </div>
      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* VIP Zones */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
            VIP Zones
          </div>
          <div className="vip-zone-list">
            {VIP_ZONES.map((zone) => {
              const state = vipStates[zone.id];
              return (
                <div key={zone.id} className={`vip-zone-card ${state?.active ? 'active' : ''}`}>
                  <div className="vip-avatar">{zone.emoji}</div>
                  <div className="vip-info">
                    <div className="vip-name">{zone.name}</div>
                    <div className="vip-location">{zone.location}</div>
                    {state?.active && state?.escortEn && (
                      <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>
                        🚶 Escort active
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    <button
                      id={`btn-vip-toggle-${zone.id}`}
                      className={`vip-toggle ${state?.active ? 'on' : ''}`}
                      onClick={() => toggleVIP(zone.id)}
                      aria-label={`${state?.active ? 'Deactivate' : 'Activate'} ${zone.name}`}
                    />
                    {state?.active && (
                      <button
                        id={`btn-vip-escort-${zone.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '10px', padding: '2px 6px' }}
                        onClick={() => toggleEscort(zone.id)}
                      >
                        {state?.escortEn ? '🚶 Escort On' : 'Escort Off'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gate Override Controls */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Gate Override Commands
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {GATE_ACTIONS.map((gate) => {
              const state = gateOverrides[gate];
              return (
                <div key={gate} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{
                    fontSize: '10px', fontWeight: 700,
                    color: state === 'locked' ? 'var(--accent-secondary)' : state === 'redirect' ? 'var(--status-amber)' : 'var(--text-muted)',
                    textAlign: 'center', fontFamily: 'var(--font-mono)',
                  }}>
                    {gate}
                    {state === 'locked' && ' 🔒'}
                    {state === 'redirect' && ' ↪'}
                  </div>
                  {state ? (
                    <button
                      id={`btn-gate-clear-${gate.toLowerCase()}`}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '10px', padding: '4px', width: '100%' }}
                      onClick={() => handleGateAction(gate, 'clear')}
                    >
                      Clear
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <button
                        id={`btn-gate-lock-${gate.toLowerCase()}`}
                        className="btn btn-sm"
                        style={{ fontSize: '10px', padding: '3px 6px', background: 'rgba(139,92,246,0.15)', color: 'var(--accent-secondary)', border: '1px solid rgba(139,92,246,0.3)', width: '100%' }}
                        onClick={() => handleGateAction(gate, 'lock')}
                      >
                        🔒 Lock
                      </button>
                      <button
                        id={`btn-gate-redirect-${gate.toLowerCase()}`}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '10px', padding: '3px 6px', width: '100%' }}
                        onClick={() => handleGateAction(gate, 'redirect')}
                      >
                        ↪ Redir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
