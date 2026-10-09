// Phase 2 ⑥ ATT-009 셔틀 GPS 관제 응답 타입

export interface ShuttleStop { id: string; seq: number; name: string; lat: number; lng: number; riderCount: number }

export interface ShuttleRoute {
  id: string;
  name: string;
  vehicleName: string | null;
  plateNo: string | null;
  driverName: string | null;
  driverPhone: string | null;
  active: boolean;
  riderCount: number;
  runningTripId: string | null;
  stops: ShuttleStop[];
}

export interface ShuttleRider { studentId: string; studentName: string; classroomName: string | null; stopId: string; stopName: string }

export interface StopEta { id: string; seq: number; name: string; lat: number; lng: number; passed: boolean; etaMinutes: number | null }

export interface TripLive {
  id: string;
  routeId: string;
  routeName: string;
  vehicleName: string | null;
  plateNo: string | null;
  driverName: string;
  status: 'RUNNING' | 'ENDED';
  startedAt: string;
  endedAt: string | null;
  position: { lat: number; lng: number; speedKmh: number | null; at: string } | null;
  /** 2분 넘게 위치가 안 들어옴 */
  stale: boolean;
  stops: StopEta[];
}

export interface TripHistory { id: string; routeName: string; driverName: string; status: 'RUNNING' | 'ENDED'; startedAt: string; endedAt: string | null; pointCount: number }

export interface LatLng { lat: number; lng: number }

/** 지도 초기 중심 (서울시청) */
export const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
