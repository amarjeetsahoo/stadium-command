'use client';

const WEATHER_ICONS = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '⛅',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

function WindDirection({ deg }) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return <span>{dirs[index]}</span>;
}

export default function WeatherWidget({ weather }) {
  if (!weather) {
    return (
      <div className="panel" id="weather-panel">
        <div className="panel-header">
          <span className="panel-title">
            <span className="panel-title-icon">🌤️</span>
            Weather — Ahmedabad
          </span>
        </div>
        <div className="weather-widget">
          <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: '32px', width: '80px', marginBottom: '6px' }} />
            <div className="skeleton" style={{ height: '12px', width: '120px' }} />
          </div>
        </div>
      </div>
    );
  }

  const icon = WEATHER_ICONS[weather.icon] || '🌤️';
  const hasAlert = weather.rainAlert || weather.thunderstormAlert;

  return (
    <div className="panel" id="weather-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">🌤️</span>
          Weather — Ahmedabad
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {weather.isMock && (
            <span className="panel-badge amber" title="OpenWeatherMap key activating">
              SIMULATED
            </span>
          )}
          {hasAlert && (
            <span className="panel-badge red" aria-live="assertive">
              ⚠️ WEATHER ALERT
            </span>
          )}
        </div>
      </div>

      {hasAlert && (
        <div
          style={{
            background: 'var(--status-red-bg)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            padding: '8px 18px',
            fontSize: '12px',
            color: 'var(--status-red)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          role="alert"
          aria-live="assertive"
        >
          {weather.thunderstormAlert ? '⛈️ Thunderstorm advisory' : '🌧️ Rain advisory'} — Crowd
          advisory: consider sheltered areas
        </div>
      )}

      <div className="weather-widget">
        <span className="weather-icon" aria-hidden="true">{icon}</span>

        <div>
          <div className="weather-temp" id="weather-temp">
            {weather.temp}°C
          </div>
          <div className="weather-desc">{weather.description}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Feels like {weather.feelsLike}°C
          </div>
        </div>

        <div className="weather-stats">
          <div className="weather-stat" id="weather-humidity">
            <span className="weather-stat-icon">💧</span>
            <span>{weather.humidity}% humidity</span>
          </div>
          <div className="weather-stat" id="weather-wind">
            <span className="weather-stat-icon">💨</span>
            <span>
              {weather.windSpeed} km/h{' '}
              <WindDirection deg={weather.windDeg} />
            </span>
          </div>
          <div className="weather-stat" id="weather-visibility">
            <span className="weather-stat-icon">👁️</span>
            <span>{((weather.visibility || 0) / 1000).toFixed(1)} km vis</span>
          </div>
          <div className="weather-stat" id="weather-pressure">
            <span className="weather-stat-icon">🌡️</span>
            <span>{weather.pressure} hPa</span>
          </div>
        </div>
      </div>
    </div>
  );
}
