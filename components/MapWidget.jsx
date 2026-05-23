'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const STADIUM_CENTER = { lat: 23.0925, lng: 72.5946 };

// Gate positions around the stadium
const INITIAL_MARKERS = [
  { lat: 23.096, lng: 72.5946, label: 'G1', title: 'Gate 1 — North' },
  { lat: 23.0949, lng: 72.5975, label: 'G2', title: 'Gate 2 — NE' },
  { lat: 23.0925, lng: 72.599, label: 'G3', title: 'Gate 3 — East' },
  { lat: 23.0901, lng: 72.5975, label: 'G4', title: 'Gate 4 — SE' },
  { lat: 23.089, lng: 72.5946, label: 'G5', title: 'Gate 5 — South' },
  { lat: 23.0901, lng: 72.5917, label: 'G6', title: 'Gate 6 — SW' },
  { lat: 23.0925, lng: 72.5902, label: 'G7', title: 'Gate 7 — West' },
  { lat: 23.0949, lng: 72.5917, label: 'G8', title: 'Gate 8 — NW' },
];

// Dark map style matching the dashboard theme
// NOTE: styles cannot be used when mapId is present — we deliberately omit mapId here.
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1420' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1420' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#161f2e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#080c14' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080c14' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f1f12' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
];

// ---------------------------------------------------------------------------
// Module-level Loader singleton — prevents double-init in React StrictMode
// which fires useEffect twice in development and causes "setOptions called once" errors.
// ---------------------------------------------------------------------------
let _loaderInstance = null;

function getLoader(apiKey) {
  if (!_loaderInstance) {
    _loaderInstance = new Loader({
      apiKey,
      version: '3.58',
      libraries: ['maps', 'marker'],
    });
  }
  return _loaderInstance;
}

// ---------------------------------------------------------------------------
// Custom Canvas Heatmap Overlay
// Replaces google.maps.visualization.HeatmapLayer, removed in Maps JS API v3.65.
// Draws Gaussian blobs on a <canvas> overlay, blended over the map.
// ---------------------------------------------------------------------------
function createHeatmapOverlay(map) {
  if (!window.google) return null;

  class HeatmapCanvasOverlay extends window.google.maps.OverlayView {
    constructor() {
      super();
      this._points = [];
      this._canvas = document.createElement('canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.top = '0';
      this._canvas.style.left = '0';
      this._canvas.style.pointerEvents = 'none';
    }

    onAdd() {
      this.getPanes().overlayLayer.appendChild(this._canvas);
    }

    onRemove() {
      if (this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
      }
    }

    setData(latLngArray) {
      this._points = latLngArray;
      this.draw();
    }

    draw() {
      const projection = this.getProjection();
      const ctx = this._canvas.getContext('2d');

      if (!projection || !this._points.length) {
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        return;
      }

      const mapDiv = this.getMap().getDiv();
      this._canvas.width = mapDiv.offsetWidth;
      this._canvas.height = mapDiv.offsetHeight;
      this._canvas.style.width = mapDiv.offsetWidth + 'px';
      this._canvas.style.height = mapDiv.offsetHeight + 'px';
      this._canvas.style.top = '0px';
      this._canvas.style.left = '0px';

      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

      const RADIUS = 45;
      this._points.forEach((latlng) => {
        const point = projection.fromLatLngToDivPixel(latlng);
        if (!point) return;

        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, RADIUS
        );
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.75)');
        gradient.addColorStop(0.4, 'rgba(245, 158, 11, 0.55)');
        gradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(point.x, point.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
    }
  }

  const overlay = new HeatmapCanvasOverlay();
  overlay.setMap(map);
  return overlay;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function MapWidget({ gateData, heatmapPoints, evacuationMode }) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const heatmapOverlayRef = useRef(null);
  const markersRef = useRef([]);
  const [mapError, setMapError] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      setMapError(
        'Google Maps API key not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local'
      );
      return;
    }

    // Guard: if map is already initialized (StrictMode double-run), skip
    if (googleMapRef.current) return;

    let cancelled = false;

    async function initMap() {
      try {
        const loader = getLoader(apiKey);
        const google = await loader.load();

        if (cancelled || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: STADIUM_CENTER,
          zoom: 15,
          // styles is only valid WITHOUT a mapId
          // We intentionally omit mapId here to keep our dark theme styles
          styles: MAP_STYLE,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true,
          backgroundColor: '#0d1420',
        });

        googleMapRef.current = map;

        // --- Legacy Marker (deprecated but fully functional on v3.58) ---
        // AdvancedMarkerElement requires a mapId which conflicts with styles.
        // We use Marker here to preserve our custom dark theme map styling.
        const colorMap = { green: '#10b981', amber: '#f59e0b', red: '#ef4444' };

        INITIAL_MARKERS.forEach((markerData) => {
          const m = new google.maps.Marker({
            position: { lat: markerData.lat, lng: markerData.lng },
            map,
            title: markerData.title,
            label: {
              text: markerData.label,
              color: '#fff',
              fontWeight: '700',
              fontSize: '11px',
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#3b82f6',
              fillOpacity: 0.9,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
          markersRef.current.push(m);
        });

        // --- Custom Canvas Heatmap Overlay ---
        heatmapOverlayRef.current = createHeatmapOverlay(map);

        setMapLoaded(true);
      } catch (err) {
        if (!cancelled) {
          console.error('[map] Failed to load Google Maps:', err);
          setMapError('Failed to load Google Maps. Check your API key and network connection.');
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
      // Cleanup on unmount
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (heatmapOverlayRef.current) {
        heatmapOverlayRef.current.setMap(null);
        heatmapOverlayRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update heatmap when crowd data changes
  useEffect(() => {
    if (!heatmapOverlayRef.current || !heatmapPoints?.length) return;
    if (!window.google) return;
    const data = heatmapPoints.map((p) => new window.google.maps.LatLng(p.lat, p.lng));
    heatmapOverlayRef.current.setData(data);
  }, [heatmapPoints]);

  // Update gate marker colors based on status + evacuation mode
  useEffect(() => {
    if (!googleMapRef.current || !gateData?.length || !window.google) return;

    const google = window.google;
    const colorMap = { green: '#10b981', amber: '#f59e0b', red: '#ef4444' };

    markersRef.current.forEach((marker, i) => {
      const gate = gateData[i];
      if (!gate) return;

      const color = evacuationMode ? '#ef4444' : colorMap[gate.status] || '#3b82f6';
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: gate.locked ? 18 : 14,
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: '#fff',
        strokeWeight: gate.locked ? 3 : 2,
      });
    });
  }, [gateData, evacuationMode]);

  return (
    <div className="panel" id="map-panel">
      <div className="panel-header">
        <span className="panel-title">
          <span className="panel-title-icon">🗺️</span>
          Live Crowd Heatmap
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {mapLoaded && <span className="panel-badge green">MAP LIVE</span>}
          <span className="panel-badge blue">Narendra Modi Stadium</span>
        </div>
      </div>

      <div className="map-container">
        {mapError ? (
          <div className="map-placeholder">
            <span className="map-icon">🗺️</span>
            <div style={{ textAlign: 'center', maxWidth: '320px' }}>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--status-amber)',
                  marginBottom: '8px',
                  fontWeight: '600',
                }}
              >
                Map Configuration Required
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.6' }}>{mapError}</div>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={mapRef}
              style={{ width: '100%', height: '100%' }}
              id="google-map"
              aria-label="Stadium crowd heatmap"
            />
            {!mapLoaded && (
              <div
                className="map-placeholder"
                style={{ background: 'var(--bg-base)', zIndex: 10 }}
              >
                <span className="map-icon">🗺️</span>
                <div>Loading stadium map...</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
