// app/api/alerts/route.js
// Logs broadcast alerts. Returns the alert payload with a generated ID.
// Client-side AlertBroadcast.jsx writes directly to Firebase for live sync.
// This route exists for server-triggered alerts (e.g., evacuation, AI-generated).

import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/authVerify';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  // Enforce authentication
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { zone, message, type } = await request.json();

    if (!zone || !message) {
      return NextResponse.json({ error: 'zone and message are required' }, { status: 400 });
    }

    const alert = {
      id: `alert-${Date.now()}`,
      zone,
      message,
      type: type || 'info',
      timestamp: Date.now(),
    };

    return NextResponse.json(alert, { status: 201 });

  } catch (err) {
    console.error('[alerts] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
