// app/api/weather/route.js
// Secure server-side proxy for OpenWeatherMap API.
// OPENWEATHER_API_KEY is never exposed to the client bundle.

import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/authVerify';

export const dynamic = 'force-dynamic';

// Fallback mock data when API key is not yet active
function getMockWeather() {
  return {
    temp: 34,
    feelsLike: 38,
    humidity: 52,
    windSpeed: 14,
    windDeg: 220,
    description: 'Partly Cloudy',
    icon: '02d',
    cityName: 'Ahmedabad',
    visibility: 8000,
    pressure: 1008,
    rainAlert: false,
    thunderstormAlert: false,
    isMock: true,
  };
}

export async function GET(request) {
  // Enforce authentication
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Return mock data if key not configured or still activating
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    return NextResponse.json(getMockWeather(), { status: 200 });
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Ahmedabad,IN&appid=${apiKey}&units=metric`,
      { next: { revalidate: 300 } } // cache 5 minutes
    );

    if (!res.ok) {
      // Key not yet active — return mock
      console.warn(`[weather] OpenWeatherMap responded ${res.status} — using mock data`);
      return NextResponse.json(getMockWeather(), { status: 200 });
    }

    const data = await res.json();

    const weatherId = data.weather?.[0]?.id || 800;
    const rainAlert = weatherId >= 500 && weatherId < 600; // Rain group
    const thunderstormAlert = weatherId >= 200 && weatherId < 300; // Thunderstorm

    return NextResponse.json(
      {
        temp: Math.round(data.main?.temp),
        feelsLike: Math.round(data.main?.feels_like),
        humidity: data.main?.humidity,
        windSpeed: Math.round(data.wind?.speed * 3.6), // m/s → km/h
        windDeg: data.wind?.deg,
        description: data.weather?.[0]?.description
          ?.split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        icon: data.weather?.[0]?.icon,
        cityName: data.name,
        visibility: data.visibility,
        pressure: data.main?.pressure,
        rainAlert,
        thunderstormAlert,
        isMock: false,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=300' },
      }
    );
  } catch (err) {
    console.error('[weather] Fetch error:', err.message);
    return NextResponse.json(getMockWeather(), { status: 200 });
  }
}
