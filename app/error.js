'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App Runtime Error:', error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Something went wrong!</h2>
      <div style={{ color: 'red', margin: '1rem 0', fontFamily: 'monospace' }}>
        {error?.message || 'Unknown error occurred'}
      </div>
      <button
        onClick={() => reset()}
        style={{ padding: '10px 20px', marginTop: '1rem', cursor: 'pointer', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}
      >
        Try again
      </button>
    </div>
  );
}
