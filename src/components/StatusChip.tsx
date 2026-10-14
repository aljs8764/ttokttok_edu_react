import type { AttendanceStatus } from '@/lib/types';
import { attendanceLabel } from '@/lib/format';
import { attendanceKind } from '@/theme/status';
import StatusBadge from '@/components/ui/StatusBadge';

/** 출결 상태 배지 (등원 green · 하원 blue · 지각/조퇴 amber · 결석 red · 예정 gray) */
export default function StatusChip({ status, isLate, isEarlyLeave }: { status: AttendanceStatus; isLate?: boolean; isEarlyLeave?: boolean }) {
  const { label } = attendanceLabel(status, isLate, isEarlyLeave);
  return <StatusBadge label={label} kind={attendanceKind(status, isLate, isEarlyLeave)} />;
}
