'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthOverlay({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      onAuthenticated(credential.user);
    } catch (err) {
      console.error('[auth] Sign in failed:', err.code);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password. Please try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please wait before trying again.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Check your connection.');
          break;
        case 'auth/operation-not-allowed':
          setError(
            'Email/Password sign-in method is disabled in your Firebase console. Please go to Build > Authentication > Sign-in method, enable Email/Password, and save changes.'
          );
          break;
        default:
          setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@crowdcommand.io');
    setPassword('demo1234');
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        'demo@crowdcommand.io',
        'demo1234'
      );
      onAuthenticated(credential.user);
    } catch (err) {
      console.error('[auth] Demo login failed, trying to auto-register:', err.code);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const credential = await createUserWithEmailAndPassword(
            auth,
            'demo@crowdcommand.io',
            'demo1234'
          );
          // eslint-disable-next-line no-console
          console.log('[auth] Demo user created successfully on the fly!');
          onAuthenticated(credential.user);
        } catch (createErr) {
          console.error('[auth] Auto-registration failed:', createErr.code);
          if (createErr.code === 'auth/operation-not-allowed') {
            setError(
              'Email/Password sign-in method is disabled in your Firebase console. Please go to Build > Authentication > Sign-in method, enable Email/Password, and save changes.'
            );
          } else {
            setError(`Auto-registration failed: ${createErr.message}`);
          }
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password sign-in method is disabled in your Firebase console. Please go to Build > Authentication > Sign-in method, enable Email/Password, and save changes.'
        );
      } else {
        setError(`Demo login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" aria-hidden="true">🏟️</div>
          <h1 className="auth-title">CrowdCommand</h1>
          <p className="auth-subtitle">Stadium Mission Control — Authorized Access Only</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@stadium.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="btn-signin"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '12px', fontSize: '14px', marginTop: '4px' }}
          >
            {loading ? (
              <>
                <span className="ai-spinner" style={{ width: '16px', height: '16px' }} />
                Authenticating...
              </>
            ) : (
              'Sign In to Command Center'
            )}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--text-muted)',
            fontSize: '12px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          or
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        <button
          id="btn-demo-login"
          className="btn btn-ghost"
          onClick={handleDemoLogin}
          disabled={loading}
          style={{ padding: '12px', fontSize: '14px' }}
        >
          🎮 Demo Mode (No login required in dev)
        </button>

        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: '1.6',
          }}
        >
          Unauthorized access is prohibited. All sessions are logged.
        </p>
      </div>
    </div>
  );
}
