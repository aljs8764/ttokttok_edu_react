// 통계/분석 (STAT-001~007) · 대시보드 위젯 (DASH-004·006) 응답 타입. 비율은 0~1 (null = 분모 0)

export interface DailyKpi {
  date: string;
  scheduled: number;
  present: number;
  late: number;
  earlyLeave: number;
  absent: number;
  attendanceRate: number | null;
}

export interface KpiReport {
  from: string;
  to: string;
  summary: {
    scheduled: number;
    present: number;
    late: number;
    absent: number;
    attendanceRate: number | null;
    lateRate: number | null;
    absentRate: number | null;
    noticeCount: number;
    noticeReadRate: number | null;
  };
  days: DailyKpi[];
  noticeReads: { date: string; notices: number; readRate: number | null }[];
}

export interface CongestionCell {
  /** 1=월 … 7=일 */
  weekday: number;
  hour: number;
  checkIns: number;
  checkOuts: number;
}

export interface CongestionReport {
  from: string;
  to: string;
  cells: CongestionCell[];
  weekdayCounts: Record<string, number>;
  peaks: CongestionCell[];
}

export interface ClassroomStat {
  classroomId: string;
  name: string;
  students: number;
  scheduled: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number | null;
  noticeReadRate: number | null;
}

export interface ClassroomComparison {
  from: string;
  to: string;
  classrooms: ClassroomStat[];
}

export interface ClassroomTrend {
  classroomId: string;
  name: string;
  from: string;
  to: string;
  days: DailyKpi[];
}

export interface EnrollmentStatusReport {
  active: number;
  paused: number;
  withdrawn: number;
  byGrade: { grade: string; count: number }[];
}

export interface EnrollmentTrendReport {
  from: string;
  to: string;
  months: { month: string; joined: number; withdrawn: number; net: number }[];
  reasons: { reason: string; count: number }[];
}

export interface LowReadNotices {
  threshold: number;
  notices: { noticeId: string; title: string; sentAt: string; targetStudents: number; readStudents: number; readRate: number }[];
}

export interface CongestionToday {
  date: string;
  hours: { hour: number; checkIns: number; checkOuts: number }[];
  peakHour: number | null;
}

export const ratioText = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? '-' : `${(v * 100).toFixed(digits)}%`);

export const WEEKDAY_LABEL = ['', '월', '화', '수', '목', '금', '토', '일'];
