'use client';

import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_CENTER, type LatLng } from '@/lib/shuttle';
import { useT } from '@/lib/i18n';

export interface MapStop extends LatLng { name: string; seq: number; passed?: boolean; etaMinutes?: number | null }
export interface MapVehicle extends LatLng { id: string; label: string; stale?: boolean }

/**
 * OpenStreetMap + Leaflet 지도 (ATT-009). API 키가 필요 없다.
 * 운영 트래픽이 커지면 OSM 타일 사용 정책상 자체/유료 타일 서버로 바꿔야 한다 (NEXT_PUBLIC_MAP_TILE_URL).
 */
export default function ShuttleMap({
  stops = [],
  vehicles = [],
  path = [],
  onMapClick,
  fitKey,
  height = 420,
}: {
  stops?: MapStop[];
  vehicles?: MapVehicle[];
  path?: LatLng[];
  onMapClick?: (p: LatLng) => void;
  /** 이 값이 바뀔 때만 지도 범위를 다시 맞춘다 (실시간 갱신마다 화면이 튀지 않게) */
  fitKey?: string;
  height?: number;
}) {
  const t = useT();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;
  const fitted = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((mod) => {
      const L = (mod as unknown as { default: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      if (cancelled || !el.current || map.current) return;
      lib.current = L;
      const m = L.map(el.current).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13);
      L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(m);
      m.on('click', (e: Leaflet.LeafletMouseEvent) => clickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      map.current = m;
      layer.current = L.layerGroup().addTo(m);
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, vehicles, path, fitKey]);

  function draw() {
    const L = lib.current;
    const m = map.current;
    const g = layer.current;
    if (!L || !m || !g) return;
    g.clearLayers();
    const sorted = [...stops].sort((a, b) => a.seq - b.seq);
    if (sorted.length > 1) {
      L.polyline(sorted.map((s) => [s.lat, s.lng] as [number, number]), { color: '#94a3b8', weight: 3, dashArray: '6 6' }).addTo(g);
    }
    if (path.length > 1) {
      L.polyline(path.map((p) => [p.lat, p.lng] as [number, number]), { color: '#2563eb', weight: 4 }).addTo(g);
    }
    sorted.forEach((s) => {
      const eta = s.passed ? t('지남') : s.etaMinutes != null ? t('{0}분', { 0: s.etaMinutes }) : '';
      L.circleMarker([s.lat, s.lng], {
        radius: 8, weight: 2, color: s.passed ? '#94a3b8' : '#0f766e', fillColor: '#fff', fillOpacity: 1,
      })
        .bindTooltip(`${s.seq}. ${s.name}${eta ? ` · ${eta}` : ''}`, { permanent: sorted.length <= 12, direction: 'top', offset: [0, -8] })
        .addTo(g);
    });
    vehicles.forEach((v) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${v.stale ? '#9ca3af' : '#f59e0b'};color:#111;border:2px solid #fff;border-radius:16px;padding:2px 8px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35)">🚌 ${escapeHtml(v.label)}</div>`,
        iconAnchor: [20, 12],
      });
      L.marker([v.lat, v.lng], { icon }).addTo(g);
    });
    if (fitted.current !== fitKey) {
      const pts: [number, number][] = [...sorted.map((s) => [s.lat, s.lng] as [number, number]), ...vehicles.map((v) => [v.lat, v.lng] as [number, number]), ...path.map((p) => [p.lat, p.lng] as [number, number])];
      if (pts.length === 1) m.setView(pts[0], 15);
      else if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
      fitted.current = fitKey;
    }
  }

  return <Box ref={el} sx={{ height, width: '100%', borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider', zIndex: 0, position: 'relative' }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
