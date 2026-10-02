import type { NoticeKind, NoticeStatus } from './types';

export const NOTICE_KIND: Record<NoticeKind, string> = { NOTE: '알림장', ANNOUNCEMENT: '공지' };

export const NOTICE_STATUS: Record<NoticeStatus, { label: string; color: 'default' | 'success' | 'warning' | 'info' }> = {
  SCHEDULED: { label: '예약', color: 'info' },
  SENT: { label: '발송', color: 'success' },
  CANCELED: { label: '취소', color: 'default' },
};
