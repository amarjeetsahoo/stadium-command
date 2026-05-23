'use client';

import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

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
// Custom Canvas Heatmap Overlay
// Replaces google.maps.visualization.HeatmapLayer, which was removed in v3.65.
// Draws Gaussian blobs on a canvas overlay, blended over the map.
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
      const panes = this.getPanes();
      panes.overlayLayer.appendChild(this._canvas);
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
      if (!projection || !this._points.length) {
        // Clear canvas if no points
        const ctx = this._canvas.getContext('2d');
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        return;
      }

      // Size the canvas to the map div
      const mapDiv = this.getMap().getDiv();
      this._canvas.width = mapDiv.offsetWidth;
      this._canvas.height = mapDiv.offsetHeight;
      this._canvas.style.width = mapDiv.offsetWidth + 'px';
      this._canvas.style.height = mapDiv.offsetHeight + 'px';

      // Offset the canvas to align with the map pane origin
      const overlayProjection = projection;
      // Reset position to top-left of map
      const sw = overlayProjection.fromLatLngToDivPixel(
        new window.google.maps.LatLng(90, -180)
      );
      // Canvas is placed at overlay pane top/left = 0,0
      this._canvas.style.top = '0px';
      this._canvas.style.left = '0px';

      const ctx = this._canvas.getContext('2d');
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

      const RADIUS = 45;

      this._points.forEach((latlng) => {
        const point = overlayProjection.fromLatLngToDivPixel(latlng);
        if (!point) return;

        // Draw radial gradient blob
        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, RADIUS
        );
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.75)');   // red core
        gradient.addColorStop(0.4, 'rgba(245, 158, 11, 0.55)'); // amber mid
        gradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.3)');  // green edge
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');           // transparent edge

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
// Helper: build a DOM element for AdvancedMarkerElement
// ---------------------------------------------------------------------------
function createMarkerElement(label, color) {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${color};
    border: 2.5px solid rgba(255,255,255,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 10px;
    font-family: Inter, sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.6);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  `;
  el.textContent = label;
  el.onmouseenter = () => {
    el.style.transform = 'scale(1.2)';
    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.8)';
  };
  el.onmouseleave = () => {
    el.style.transform = 'scale(1)';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.6)';
  };
  return el;
}

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
        'Google Maps API key not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment.'
      );
      return;
    }

    let cancelled = false;

    async function initMap() {
      try {
        // Pin to stable version 3.58 — avoids unexpected removals like HeatmapLayer in 3.65+
        setOptions({ apiKey, version: '3.58' });

        const mapsLib = await importLibrary('maps');
        const markerLib = await importLibrary('marker');

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
          // mapId is required for AdvancedMarkerElement
          mapId: 'crowd_command_map',
        });

        googleMapRef.current = map;

        // --- AdvancedMarkerElement gate markers (replaces deprecated Marker) ---
        const { AdvancedMarkerElement } = markerLib;

        INITIAL_MARKERS.forEach((markerData) => {
          const el = createMarkerElement(markerData.label, '#3b82f6');
          const marker = new AdvancedMarkerElement({
            position: { lat: markerData.lat, lng: markerData.lng },
            map,
            title: markerData.title,
            content: el,
          });
          // Attach the DOM element reference so we can update color later
          marker._el = el;
          markersRef.current.push(marker);
        });

        // --- Custom Canvas Heatmap Overlay (replaces removed HeatmapLayer) ---
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
      // Cleanup markers on unmount
      markersRef.current.forEach((m) => (m.map = null));
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
    if (!googleMapRef.current || !gateData?.length) return;

    const colorMap = {
      green: '#10b981',
      amber: '#f59e0b',
      red: '#ef4444',
    };

    markersRef.current.forEach((marker, i) => {
      const gate = gateData[i];
      if (!gate || !marker._el) return;

      const color = evacuationMode ? '#ef4444' : colorMap[gate.status] || '#3b82f6';
      marker._el.style.background = color;
      marker._el.style.width = gate.locked ? '38px' : '32px';
      marker._el.style.height = gate.locked ? '38px' : '32px';
      marker._el.style.borderWidth = gate.locked ? '3px' : '2.5px';
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
