'use client';

export default function AIInsightPanel({ insight, isAnalyzing, onApproveAction }) {
  if (isAnalyzing) {
    return (
      <div className="panel" id="ai-insight-panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="panel-title-icon">🤖</span>
            AI Threat Analysis
          </span>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '16px' }}>
          <div className="ai-spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
          <div className="ai-thinking">Gemini AI is analyzing incident context...</div>
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="panel" id="ai-insight-panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="panel-title-icon">🤖</span>
            AI Threat Analysis
          </span>
          <span className="panel-badge blue">READY</span>
        </div>
        <div
          className="panel-body"
          style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '30px 18px' }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤖</div>
          Submit an incident report to trigger Gemini AI analysis
        </div>
      </div>
    );
  }

  return (
    <div className="panel" id="ai-insight-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">🤖</span>
          AI Threat Analysis
        </span>
      </div>
      <div className="panel-body">
        <div className="ai-insight">
          <div className="ai-insight-header">
            <span className="ai-label">Threat Assessment</span>
            <span className={`ai-risk-badge ${insight.riskLevel.toLowerCase()}`}>
              {insight.riskLevel.toUpperCase()} RISK
            </span>
          </div>
          <div className="ai-summary">
            {insight.summary}
          </div>
          <div className="ai-actions-label">Recommended Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {insight.suggestedActions?.map((action, idx) => (
              <div key={idx} className="ai-action-item">
                {action}
              </div>
            ))}
          </div>
          {insight.systemActions && insight.systemActions.length > 0 && (
            <>
              <div className="ai-actions-label" style={{ marginTop: '16px' }}>System Overrides (Awaiting Approval)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {insight.systemActions.map((sysAction, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #facc15' }}>
                    <div style={{ fontSize: '12px', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                      <strong>{sysAction.type}:</strong> {sysAction.targetId} → {sysAction.command}
                    </div>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => onApproveAction && onApproveAction(sysAction)}
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
