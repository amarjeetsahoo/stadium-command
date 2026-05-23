'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, push, onValue, off, serverTimestamp } from 'firebase/database';

const ZONES = [
  'Gate 1', 'Gate 2', 'Gate 3', 'Gate 4',
  'Gate 5', 'Gate 6', 'Gate 7', 'Gate 8',
  'All Gates', 'Concourse A', 'Concourse B',
  'VIP Section', 'Stadium-Wide',
];

const ALERT_PRESETS = [
  { label: 'Redirect Crowds', message: 'Please use alternate entrances. Gate is at capacity.', icon: '↪️', type: 'redirect' },
  { label: 'Medical Response', message: 'Medical team responding. Please clear the area.', icon: '🏥', type: 'medical' },
  { label: 'Security Alert', message: 'Security personnel required immediately.', icon: '🚨', type: 'security' },
  { label: 'Hold Position', message: 'All personnel hold position. Await further instructions.', icon: '✋', type: 'hold' },
  { label: 'All Clear', message: 'Area is clear. Normal operations resumed.', icon: '✅', type: 'clear' },
];

const TYPE_ICONS = {
  redirect: '↪️', medical: '🏥', security: '🚨',
  hold: '✋', clear: '✅', info: 'ℹ️', evacuation: '🆘',
};

export default function AlertBroadcast() {
  const [zone, setZone] = useState('All Gates');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const feedRef = useRef(null);

  // Subscribe to Firebase alerts feed
  useEffect(() => {
    try {
      const alertsRef = ref(db, 'alerts');
      onValue(alertsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 20);
        setAlerts(list);
      });
      return () => off(alertsRef);
    } catch (err) {
      console.warn('[AlertBroadcast] Firebase listener not available:', err.message);
    }
  }, []);

  // Auto-scroll feed to top when new alert added
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  const handlePreset = (preset) => {
    setMessage(preset.message);
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);

    const type = ALERT_PRESETS.find((p) => p.message === message)?.type || 'info';
    const alertData = { zone, message, type, timestamp: Date.now() };

    try {
      // Write directly to Firebase client-side
      const alertsRef = ref(db, 'alerts');
      await push(alertsRef, { ...alertData, serverTimestamp: serverTimestamp() });
    } catch (err) {
      // Fallback: add to local state optimistically
      console.warn('[AlertBroadcast] Firebase write failed, adding locally:', err.message);
      setAlerts((prev) => [{ id: `local-${Date.now()}`, ...alertData }, ...prev]);
    }

    setMessage('');
    setSending(false);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  };

  return (
    <div className="panel" id="alert-broadcast-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">📢</span>
          Alert Broadcast
        </span>
        {alerts.length > 0 && (
          <span className="panel-badge amber">{alerts.length} SENT</span>
        )}
      </div>
      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Quick Preset Buttons */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {ALERT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                id={`btn-preset-${preset.type}`}
                className="btn btn-ghost btn-sm"
                onClick={() => handlePreset(preset)}
                style={{ fontSize: '11px', gap: '4px' }}
              >
                {preset.icon} {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Broadcast Form */}
        <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Target Zone</label>
              <select className="form-select" value={zone} onChange={(e) => setZone(e.target.value)}>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className="form-textarea"
              placeholder="Type a broadcast message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ minHeight: '60px' }}
              required
            />
          </div>
          <button
            id="btn-broadcast-send"
            type="submit"
            className="btn btn-primary"
            disabled={sending || !message.trim()}
            style={{ alignSelf: 'flex-end', minWidth: '130px' }}
          >
            {sending ? 'Broadcasting...' : '📢 Broadcast'}
          </button>
        </form>

        {/* Alert Feed */}
        {alerts.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Recent Broadcasts
            </div>
            <div className="alert-feed" ref={feedRef}>
              {alerts.map((alert) => (
                <div key={alert.id} className="alert-item">
                  <span className="alert-icon">{TYPE_ICONS[alert.type] || 'ℹ️'}</span>
                  <div className="alert-text">
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px' }}>
                      [{alert.zone}]
                    </span>{' '}
                    {alert.message}
                  </div>
                  <span className="alert-time">{formatTime(alert.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
