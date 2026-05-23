// app/api/crowd-data/route.js
// Server-side crowd simulation API.
// Returns live-looking gate congestion data driven by deterministic math.
// No real sensors needed — the sine-wave cycling makes it look alive.

import { NextResponse } from 'next/server';
import { generateCrowdData } from '@/lib/mockData';
import { verifyAuthToken } from '@/lib/authVerify';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Enforce authentication
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const gateData = generateCrowdData();

    // Compute aggregate metrics
    const totalOccupancy = gateData.reduce((sum, g) => sum + g.occupancy, 0);
    const avgCongestion = Math.round(
      gateData.reduce((sum, g) => sum + g.congestion, 0) / gateData.length
    );
    const avgWaitTime = Math.round(
      gateData.reduce((sum, g) => sum + g.waitTime, 0) / gateData.length
    );
    const redGates = gateData.filter((g) => g.status === 'red').length;
    const amberGates = gateData.filter((g) => g.status === 'amber').length;

    return NextResponse.json(
      {
        gates: gateData,
        metrics: {
          totalOccupancy,
          stadiumCapacity: 132000,
          occupancyPct: Math.round((totalOccupancy / 132000) * 100),
          avgCongestion,
          avgWaitTime,
          redGates,
          amberGates,
          activeIncidents: 0, // will be live-updated from Firebase in Phase 3
        },
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err) {
    console.error('[crowd-data] Error generating crowd data:', err);
    return NextResponse.json({ error: 'Failed to generate crowd data' }, { status: 500 });
  }
}
