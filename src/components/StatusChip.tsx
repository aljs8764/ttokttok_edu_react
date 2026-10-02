import Chip from '@mui/material/Chip';
import type { AttendanceStatus } from '@/lib/types';
import { attendanceLabel } from '@/lib/format';

export default function StatusChip({ status, isLate, isEarlyLeave }: { status: AttendanceStatus; isLate?: boolean; isEarlyLeave?: boolean }) {
  const { label, color } = attendanceLabel(status, isLate, isEarlyLeave);
  return <Chip size="small" label={label} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />;
}
