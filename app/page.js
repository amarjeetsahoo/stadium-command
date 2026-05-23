'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toHeatmapPoints } from '@/lib/mockData';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import AuthOverlay from '@/components/AuthOverlay';
import MapWidget from '@/components/MapWidget';
import MetricsBar from '@/components/MetricsBar';
import GateStatusPanel from '@/components/GateStatusPanel';
import WeatherWidget from '@/components/WeatherWidget';
import AIInsightPanel from '@/components/AIInsightPanel';
import IncidentReporter from '@/components/IncidentReporter';
import VIPTracker from '@/components/VIPTracker';
import AlertBroadcast from '@/components/AlertBroadcast';

const POLL_INTERVAL_MS = 10000; // 10 seconds

export default function CommandDashboard() {
  // ── Auth State ─────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // ── UI State ───────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('overview');
  const [evacuationMode, setEvacuationMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Data State ─────────────────────────────────────────────────────────────
  const [crowdData, setCrowdData] = useState(null);   // { gates, metrics }
  const [weather, setWeather] = useState(null);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [gateOverrides, setGateOverrides] = useState({});

  // ── Firebase Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // ── Fetch Crowd Data ───────────────────────────────────────────────────────
  const fetchCrowdData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/crowd-data', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
      if (!res.ok) return;
      const data = await res.json();
      setCrowdData(data);
      setHeatmapPoints(toHeatmapPoints(data.gates));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[dashboard] Crowd data fetch error:', err);
    }
  }, [user]);

  // ── Fetch Weather ──────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/weather', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });
      if (!res.ok) return;
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      console.error('[dashboard] Weather fetch error:', err);
    }
  }, [user]);

  // ── Initial Fetch + Polling ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Fetch immediately on mount
    fetchCrowdData();
    fetchWeather();

    // Poll crowd data every 10s
    const crowdInterval = setInterval(fetchCrowdData, POLL_INTERVAL_MS);
    // Weather every 5 minutes
    const weatherInterval = setInterval(fetchWeather, 5 * 60 * 1000);

    return () => {
      clearInterval(crowdInterval);
      clearInterval(weatherInterval);
    };
  }, [user, fetchCrowdData, fetchWeather]);

  // ── Auth Handlers ──────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('[auth] Sign out failed:', err);
    }
  };

  const handleAuthenticated = (firebaseUser) => {
    setUser(firebaseUser);
  };

  // ── Gate Action Handler ────────────────────────────────────────────────────
  const handleGateAction = (gate) => {
    // Phase 4 will add the full modal — for now just log
    console.warn('[dashboard] Gate action:', gate.id);
  };

  // ── Incident Reporter Handlers ─────────────────────────────────────────────
  const handleIncidentStart = () => setIsAnalyzingAI(true);
  const handleIncidentSubmit = (incident) => {
    setIsAnalyzingAI(false);
    setAiInsight(incident.aiAnalysis);
  };

  // ── VIP / Gate Override Handlers ───────────────────────────────────────────
  const handleGateUpdate = (overrides) => {
    setGateOverrides(overrides);
  };

  // ── Evacuation Mode ────────────────────────────────────────────────────────
  const handleEvacuationToggle = async () => {
    const newMode = !evacuationMode;
    setEvacuationMode(newMode);
    // Broadcast evacuation alert to Firebase
    if (newMode) {
      try {
        const { ref: fbRef, push: fbPush } = await import('firebase/database');
        const { db: fbDb } = await import('@/lib/firebase');
        await fbPush(fbRef(fbDb, 'alerts'), {
          zone: 'Stadium-Wide',
          message: '🆘 EVACUATION ACTIVATED — All staff proceed to emergency exit posts immediately.',
          type: 'evacuation',
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn('[evacuation] Alert broadcast failed:', err.message);
      }
    }
  };

  // ── Derived: apply evacuation + gate overrides to gate cards ───────────────────
  const displayGates = (crowdData?.gates || []).map((g) => {
    if (evacuationMode) return { ...g, status: 'red', congestion: 100 };
    const override = gateOverrides[g.id];
    if (override === 'locked') return { ...g, locked: true, status: 'red' };
    if (override === 'redirect') return { ...g, redirect: true, status: 'amber' };
    return g;
  });

  // ── Loading / Auth Guards ──────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
          color: 'var(--text-muted)',
        }}
      >
        <div className="ai-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <span style={{ fontSize: '13px' }}>Initializing Command Center...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthOverlay onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Header
        user={user}
        onSignOut={handleSignOut}
        evacuationMode={evacuationMode}
        isSidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isCollapsed={sidebarCollapsed}
      />

      <main className="main-content" id="main-content" aria-label="Dashboard content">

        {/* ── Metrics Bar ── */}
        <MetricsBar metrics={crowdData?.metrics} />

        {/* ── Last updated ticker ── */}
        {lastUpdated && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textAlign: 'right',
              marginTop: '-12px',
              fontFamily: 'var(--font-mono)',
            }}
            aria-live="polite"
          >
            Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour12: false })} · Auto-refresh
            every 10s
          </div>
        )}

        <div className="dashboard-grid">
          <div className="dashboard-left">

            {/* ── Google Maps Heatmap ── */}
            <MapWidget
              gateData={displayGates}
              heatmapPoints={heatmapPoints}
              evacuationMode={evacuationMode}
            />

            {/* ── Gate Status Panel ── */}
            <div className="panel" id="gate-status-panel">
              <div className="panel-header">
                <span className="panel-title">
                  <span className="panel-title-icon">🚪</span>
                  Gate Status — All 8 Entrances
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span
                    className="panel-badge green"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    aria-live="polite"
                  >
                    {displayGates.filter((g) => g.status === 'green').length} CLEAR
                  </span>
                  <span className="panel-badge amber" aria-live="polite">
                    {displayGates.filter((g) => g.status === 'amber').length} BUSY
                  </span>
                  <span className="panel-badge red" aria-live="polite">
                    {displayGates.filter((g) => g.status === 'red').length} CRIT
                  </span>
                </div>
              </div>
              <GateStatusPanel gates={displayGates} onGateAction={handleGateAction} />
            </div>

            {/* ── VIP Zone Management ── */}
            <VIPTracker onGateUpdate={handleGateUpdate} />

          </div>

          <div className="dashboard-right">

            {/* ── Weather Widget ── */}
            <WeatherWidget weather={weather} />

            {/* ── Alert Broadcast ── */}
            <AlertBroadcast />

            {/* ── AI Threat Analysis ── */}
            <AIInsightPanel insight={aiInsight} isAnalyzing={isAnalyzingAI} />

            {/* ── Incident Reporter ── */}
            <IncidentReporter user={user} onIncidentSubmitted={handleIncidentSubmit} onAnalysisStart={handleIncidentStart} />

            {/* ── Emergency Controls ── */}
            <div className="panel" id="emergency-panel">
              <div className="panel-header">
                <span className="panel-title">
                  <span className="panel-title-icon">🚨</span>
                  Emergency Controls
                </span>
              </div>
              <div className="panel-body">
                <button
                  id="btn-evacuation-toggle"
                  className={`btn ${evacuationMode ? 'btn-ghost' : 'btn-danger'}`}
                  style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  onClick={handleEvacuationToggle}
                  aria-pressed={evacuationMode}
                >
                  {evacuationMode ? '✅ Cancel Evacuation' : '🚨 Activate Evacuation Mode'}
                </button>
                {evacuationMode && (
                  <div className="evacuation-banner" style={{ marginTop: '12px' }}>
                    <span className="evac-icon">🚨</span>
                    <div className="evac-text">
                      <div className="evac-title">EVACUATION ACTIVE</div>
                      <div className="evac-sub">All gates set to emergency exit protocol</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
