'use client';

import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const STADIUM_CENTER = { lat: 23.0925, lng: 72.5946 };

// Will be replaced with real gate data in Phase 2
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

export default function MapWidget({ gateData, heatmapPoints, evacuationMode }) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const heatmapLayerRef = useRef(null);
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

    let cancelled = false;

    async function initMap() {
      try {
        // v2 API: configure once globally, then import libraries
        setOptions({ apiKey, version: 'weekly' });

        const mapsLib = await importLibrary('maps');
        const visualizationLib = await importLibrary('visualization');

        if (cancelled || !mapRef.current) return;

        const map = new mapsLib.Map(mapRef.current, {
          center: STADIUM_CENTER,
          zoom: 15,
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

        // Add gate markers using legacy Marker (still supported on weekly channel)
        const markerLib = await importLibrary('marker');
        const { Marker } = markerLib;

        INITIAL_MARKERS.forEach((markerData) => {
          const m = new Marker({
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
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#3b82f6',
              fillOpacity: 0.9,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });
          markersRef.current.push(m);
        });

        // Initialize heatmap layer (Phase 2+)
        heatmapLayerRef.current = new visualizationLib.HeatmapLayer({
          data: [],
          map,
          radius: 35,
          opacity: 0.7,
          gradient: [
            'rgba(0,0,0,0)',
            'rgba(16,185,129,0.4)',
            'rgba(245,158,11,0.6)',
            'rgba(239,68,68,0.8)',
            'rgba(220,38,38,1)',
          ],
        });

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
      // Cleanup markers on unmount
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update heatmap when data changes (Phase 2+)
  useEffect(() => {
    if (!heatmapLayerRef.current || !heatmapPoints?.length) return;

    const google = window.google;
    if (!google) return;

    const data = heatmapPoints.map((p) => new google.maps.LatLng(p.lat, p.lng));
    heatmapLayerRef.current.setData(data);
  }, [heatmapPoints]);

  // Update gate marker colors based on status
  useEffect(() => {
    if (!googleMapRef.current || !gateData?.length || !window.google) return;

    const google = window.google;
    const colorMap = {
      green: '#10b981',
      amber: '#f59e0b',
      red: '#ef4444',
    };

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
