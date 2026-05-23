// app/api/validate-keys/route.js
// DEV-ONLY endpoint — validates all configured API keys.
// Automatically disabled in production builds.

import { NextResponse } from 'next/server';

// Force dynamic so Next.js never caches this response
export const dynamic = 'force-dynamic';

const PLACEHOLDER_PREFIXES = ['YOUR_', 'placeholder'];

function isPlaceholder(val) {
  if (!val || val.trim() === '') return true;
  return PLACEHOLDER_PREFIXES.some((p) => val.startsWith(p));
}

async function testGoogleMaps(key) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Narendra+Modi+Stadium&key=${key}`
    );
    const json = await res.json();
    if (json.status === 'OK') {
      return { ok: true, detail: `Geocoded stadium: ${JSON.stringify(json.results[0].geometry.location)}` };
    }
    return { ok: false, detail: json.error_message || json.status };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}

async function testOpenWeather(key) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Ahmedabad&appid=${key}&units=metric`
    );
    const json = await res.json();
    if (res.ok) {
      return { ok: true, detail: `Weather: ${json.weather?.[0]?.description}, ${json.main?.temp}°C` };
    }
    return { ok: false, detail: json.message || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}

async function testGemini(key) {
  // Try gemini-2.0-flash first (latest), fallback to gemini-pro
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
  for (const modelName of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.candidates) {
        const text = json.candidates[0]?.content?.parts?.[0]?.text?.trim();
        return { ok: true, detail: `Model "${modelName}" replied: "${text}"` };
      }
      // If model not found, try next
      if (json.error?.status === 'NOT_FOUND') continue;
      return { ok: false, detail: json.error?.message || `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, detail: e.message };
    }
  }
  return { ok: false, detail: 'No supported Gemini model found for this key' };
}

async function testFirebase(apiKey, projectId) {
  // Validate Firebase by calling the REST API to check project existence
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases`,
      {
        headers: { 'x-goog-api-key': apiKey },
      }
    );
    if (res.status === 401 || res.status === 403) {
      // Key exists but needs proper auth — that's fine for client keys
      return { ok: true, detail: 'Firebase project reachable (auth required for full access — expected)' };
    }
    if (res.ok) {
      return { ok: true, detail: `Firebase project "${projectId}" connected` };
    }
    return { ok: false, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}

export async function GET() {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Key validation not available in production' }, { status: 403 });
  }

  // Debug: log what the server process sees
  const debugEnv = {
    mapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    weatherKey: process.env.OPENWEATHER_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY,
    fbKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  };
  console.warn('[validate-keys] env snapshot:', JSON.stringify({
    mapsKey: debugEnv.mapsKey ? debugEnv.mapsKey.slice(0,8)+'...' : 'undefined',
    weatherKey: debugEnv.weatherKey ? 'set' : 'undefined',
    geminiKey: debugEnv.geminiKey ? 'set' : 'undefined',
    fbKey: debugEnv.fbKey ? 'set' : 'undefined',
  }));

  const keys = {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const results = [];

  // ── Google Maps ──────────────────────────────────────────────────────────
  const mapsKey = keys.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (isPlaceholder(mapsKey)) {
    results.push({ service: 'Google Maps', status: 'missing', detail: 'Key not set in .env.local' });
  } else {
    const test = await testGoogleMaps(mapsKey);
    results.push({ service: 'Google Maps', status: test.ok ? 'ok' : 'error', detail: test.detail, keyPreview: mapsKey.slice(0, 8) + '...' + mapsKey.slice(-4) });
  }

  // ── OpenWeatherMap ───────────────────────────────────────────────────────
  const weatherKey = keys.OPENWEATHER_API_KEY;
  if (isPlaceholder(weatherKey)) {
    results.push({ service: 'OpenWeatherMap', status: 'missing', detail: 'Key not set in .env.local' });
  } else {
    const test = await testOpenWeather(weatherKey);
    results.push({ service: 'OpenWeatherMap', status: test.ok ? 'ok' : 'error', detail: test.detail, keyPreview: weatherKey.slice(0, 4) + '...' + weatherKey.slice(-4) });
  }

  // ── Gemini AI ────────────────────────────────────────────────────────────
  const geminiKey = keys.GEMINI_API_KEY;
  if (isPlaceholder(geminiKey)) {
    results.push({ service: 'Gemini AI', status: 'missing', detail: 'Key not set in .env.local' });
  } else {
    const test = await testGemini(geminiKey);
    results.push({ service: 'Gemini AI', status: test.ok ? 'ok' : 'error', detail: test.detail, keyPreview: geminiKey.slice(0, 6) + '...' + geminiKey.slice(-4) });
  }

  // ── Firebase ─────────────────────────────────────────────────────────────
  const fbKey = keys.NEXT_PUBLIC_FIREBASE_API_KEY;
  const fbProject = keys.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const fbDbUrl = keys.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  const fbDomain = keys.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const fbAppId = keys.NEXT_PUBLIC_FIREBASE_APP_ID;

  const fbConfigured = !isPlaceholder(fbKey) && !isPlaceholder(fbProject);

  if (!fbConfigured) {
    results.push({ service: 'Firebase', status: 'missing', detail: 'FIREBASE_API_KEY and/or PROJECT_ID not set' });
  } else {
    const test = await testFirebase(fbKey, fbProject);
    results.push({
      service: 'Firebase',
      status: test.ok ? 'ok' : 'error',
      detail: test.detail,
      keyPreview: fbKey.slice(0, 8) + '...' + fbKey.slice(-4),
      extras: {
        authDomain: isPlaceholder(fbDomain) ? '❌ missing' : fbDomain,
        databaseUrl: isPlaceholder(fbDbUrl) ? '❌ missing' : fbDbUrl,
        appId: isPlaceholder(fbAppId) ? '❌ missing' : '✅ set',
      },
    });
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    missing: results.filter((r) => r.status === 'missing').length,
    error: results.filter((r) => r.status === 'error').length,
    readyForPhase2: results.filter((r) => r.service === 'Google Maps')[0]?.status === 'ok',
    readyForPhase3: results.filter((r) => r.service === 'Gemini AI')[0]?.status === 'ok',
    readyForAuth: results.filter((r) => r.service === 'Firebase')[0]?.status === 'ok',
  };

  return NextResponse.json({ summary, results }, { status: 200 });
}
