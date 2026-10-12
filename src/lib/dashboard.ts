'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Phase 3 P3-⑥ 역할별 대시보드 (DASH-008~023) 응답 타입. 비율은 0~1 (null = 분모 0), 금액은 원.

export interface OwnerKpi {
  asOf: string;
  activeStudents: number;
  activeStudentsLastMonth: number;
  newThisMonth: number;
  withdrawnThisMonth: number;
  capacity: number;
  fillRate: number | null;
  billedThisMonth: number;
  paidThisMonth: number;
  collectionRate: number | null;
  unpaidAmount: number;
  unpaidCount: number;
  todayScheduled: number;
  todayPresent: number;
  todayAttendanceRate: number | null;
}

export type ClassFlag = 'NO_TEACHER' | 'FULL' | 'MISSING' | 'LOW_READ';
export interface OwnerClassRow {
  classroomId: string;
  name: string;
  teachers: string[];
  heldToday: boolean;
  startTime: string;
  endTime: string;
  scheduled: number;
  present: number;
  absent: number;
  notArrived: number;
  capacity: number;
  headcount: number;
  waiting: number;
  readRate7d: number | null;
  missingAlertsToday: number;
  flags: ClassFlag[];
}

export type InboxKey = 'JOIN_REQUEST' | 'ABSENCE_REQUEST' | 'UNANSWERED_MESSAGE' | 'NEW_CONSULT' | 'SUPPORT_REPLY';
export interface InboxItem {
  key: InboxKey;
  count: number;
  oldestAt: string | null;
}

export interface InvoiceBrief {
  id: string;
  studentName: string;
  title: string;
  amount: number;
  dueDate: string;
  paidOn: string | null;
}
export interface OwnerBilling {
  unpaidCount: number;
  unpaidAmount: number;
  overdueCount: number;
  overdueAmount: number;
  dueSoon: InvoiceBrief[];
  recentPaid: InvoiceBrief[];
}

export type ChurnReason = 'ABSENCE_UP' | 'UNREAD' | 'PAUSED_BEFORE' | 'OVERDUE' | 'COUNSEL_WITHDRAW';
export interface ChurnRisk {
  studentId: string;
  studentName: string;
  classroomNames: string[];
  score: number;
  reasons: ChurnReason[];
  absentRecent: number;
  absentBefore: number;
  lastCounselOn: string | null;
}

export interface StaffTodayRow {
  userId: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'TEACHER';
  checkInAt: string | null;
  checkOutAt: string | null;
  classesToday: string[];
  unansweredMessages: number;
}
export interface OwnerStaff {
  staff: StaffTodayRow[];
  coverNeeded: { classroomId: string; classroomName: string; startTime: string; teachers: string[] }[];
}

export interface InstitutionCard {
  institutionId: string;
  name: string;
  role: string;
  activeStudents: number;
  todayAttendanceRate: number | null;
  collectionRate: number | null;
  pending: number;
}

export interface StaffMemo {
  id: string;
  title: string;
  body: string | null;
  dueDate: string | null;
  authorName: string;
  createdAt: string;
  toAll: boolean;
  canceled: boolean;
  readAt: string | null;
  doneAt: string | null;
  targets: number;
  readCount: number;
  doneCount: number;
}
export interface StaffMemoAck {
  userId: string;
  name: string;
  readAt: string | null;
  doneAt: string | null;
}

export interface TeacherDashboard {
  teacherId: string;
  teacherName: string;
  date: string;
  classes: { classroomId: string; name: string; startTime: string; endTime: string; phase: 'NOW' | 'UPCOMING' | 'DONE'; scheduled: number; present: number; checkedOut: number; absent: number }[];
  notArrived: TodoStudent[];
  notCheckedOut: TodoStudent[];
  absenceRequests: { id: string; studentName: string; date: string; kind: 'ABSENT' | 'LATE' | 'EARLY_LEAVE'; expectedTime: string | null; reason: string | null }[];
  cautions: { studentId: string; studentName: string; classroomName: string; kind: 'HEALTH' | 'BIRTHDAY' | 'ABSENCE_NOTE' | 'COUNSEL'; text: string | null; sub: string | null }[];
  conversations: { conversationId: string; studentName: string; preview: string | null; unread: number; lastMessageAt: string }[];
  notices: { noticeId: string; title: string; sentAt: string; targets: number; unread: number; canResendAt: string | null }[];
  events: { eventId: string; title: string; deadline: string; noResponse: number }[];
  consults: { slotId: string; startsAt: string; studentName: string | null; mode: 'IN_PERSON' | 'PHONE' | 'VIDEO'; topic: string | null }[];
  progressMissing: { classroomId: string; classroomName: string; endTime: string }[];
  work: { checkInAt: string | null; checkOutAt: string | null; weekMinutes: number; runningTripId: string | null; runningRouteName: string | null; hasShuttleRoutes: boolean };
  memos: StaffMemo[];
}
export interface TodoStudent {
  studentId: string;
  studentName: string;
  classroomId: string;
  classroomName: string;
  attendanceDayId: string | null;
  minutes: number;
  guardianPhone: string | null;
}

// ───────── DASH-017 위젯 배치 ─────────
export type DashboardKind = 'OWNER' | 'TEACHER';
export interface DashboardWidget {
  key: string;
  visible: boolean;
}

/**
 * 저장된 배치를 기본 위젯 목록에 맞춘다: 저장 순서를 따르고, 새로 생긴 위젯은 기본 위치(끝)에 보이게 붙이고, 없어진 위젯은 버린다.
 */
export function mergeLayout(saved: DashboardWidget[] | undefined, defaults: string[]): DashboardWidget[] {
  if (!saved?.length) return defaults.map((key) => ({ key, visible: true }));
  const known = saved.filter((w) => defaults.includes(w.key));
  const missing = defaults.filter((k) => !known.some((w) => w.key === k)).map((key) => ({ key, visible: true }));
  return [...known, ...missing];
}

export function useDashboardLayout(kind: DashboardKind, defaults: string[]) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['dashboard-layout', kind],
    queryFn: () => api.get<{ widgets: DashboardWidget[] }>(`me/dashboard-layout/${kind}`),
    staleTime: 10 * 60_000,
  });
  const widgets = useMemo(() => mergeLayout(q.data?.widgets, defaults), [q.data, defaults]);
  const save = useMutation({
    mutationFn: (w: DashboardWidget[]) => api.put<{ widgets: DashboardWidget[] }>(`me/dashboard-layout/${kind}`, { widgets: w }),
    onSuccess: (d) => qc.setQueryData(['dashboard-layout', kind], d),
  });
  const reset = useMutation({
    mutationFn: () => api.delete(`me/dashboard-layout/${kind}`),
    onSuccess: () => qc.setQueryData(['dashboard-layout', kind], { widgets: [] }),
  });
  return { widgets, loaded: !q.isLoading, save, reset };
}
