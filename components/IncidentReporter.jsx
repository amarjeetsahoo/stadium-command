'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, push, serverTimestamp } from 'firebase/database';

export default function IncidentReporter({ user, onIncidentSubmitted, onAnalysisStart }) {
  const [location, setLocation] = useState('Gate 3');
  const [type, setType] = useState('Medical Emergency');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    if (onAnalysisStart) onAnalysisStart();

    try {
      const incidentData = {
        location,
        type,
        severity,
        description,
        status: 'active',
        timestamp: serverTimestamp(),
      };

      // 1. Save to Firebase (if DB is configured)
      try {
        const incidentsRef = ref(db, 'incidents');
        await push(incidentsRef, incidentData);
      } catch (dbErr) {
        console.warn('[incident-reporter] Firebase push failed (expected in demo if not fully configured):', dbErr);
        // Continue anyway to show AI analysis
      }

      // 2. Trigger AI Analysis
      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers,
        body: JSON.stringify({ location, type, severity, description }),
      });

      if (!res.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const aiAnalysis = await res.json();
      
      setSuccess(true);
      setDescription('');
      
      if (onIncidentSubmitted) {
        onIncidentSubmitted({ ...incidentData, aiAnalysis });
      }

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to submit incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" id="incident-reporter-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">⚠️</span>
          Report Incident
        </span>
      </div>
      <div className="panel-body">
        {error && (
          <div style={{ color: 'var(--status-red)', fontSize: '12px', marginBottom: '10px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ color: 'var(--status-green)', fontSize: '12px', marginBottom: '10px' }}>
            Incident reported successfully.
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div className="form-group">
            <label className="form-label">Severity Level</label>
            <div className="severity-group">
              <button type="button" className={`severity-btn low ${severity === 'low' ? 'active' : ''}`} onClick={() => setSeverity('low')}>Low</button>
              <button type="button" className={`severity-btn medium ${severity === 'medium' ? 'active' : ''}`} onClick={() => setSeverity('medium')}>Medium</button>
              <button type="button" className={`severity-btn high ${severity === 'high' ? 'active' : ''}`} onClick={() => setSeverity('high')}>High</button>
              <button type="button" className={`severity-btn critical ${severity === 'critical' ? 'active' : ''}`} onClick={() => setSeverity('critical')}>Critical</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Location</label>
              <select className="form-select" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="Gate 1">Gate 1</option>
                <option value="Gate 2">Gate 2</option>
                <option value="Gate 3">Gate 3</option>
                <option value="Gate 4">Gate 4</option>
                <option value="Gate 5">Gate 5</option>
                <option value="Gate 6">Gate 6</option>
                <option value="Gate 7">Gate 7</option>
                <option value="Gate 8">Gate 8</option>
                <option value="Concourse A">Concourse A</option>
                <option value="Concourse B">Concourse B</option>
                <option value="VIP Lounge">VIP Lounge</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Medical Emergency">Medical Emergency</option>
                <option value="Overcrowding">Overcrowding</option>
                <option value="Brawl / Fight">Brawl / Fight</option>
                <option value="Suspicious Package">Suspicious Package</option>
                <option value="Unauthorized Entry">Unauthorized Entry</option>
                <option value="Infrastructure Failure">Infrastructure Failure</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-textarea" 
              placeholder="Provide brief details about the incident..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ marginTop: '4px' }}
          >
            {loading ? 'Analyzing...' : 'Submit & Analyze'}
          </button>
        </form>
      </div>
    </div>
  );
}
