// Phase 2 ⑤ SaaS 운영 백오피스 응답 타입 (SAAS-001~007)
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ServiceStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export const SERVICE_STATUS: Record<ServiceStatus, { label: string; color: 'warning' | 'success' | 'error' }> = {
  PENDING: { label: '승인 대기', color: 'warning' },
  ACTIVE: { label: '운영 중', color: 'success' },
  SUSPENDED: { label: '정지', color: 'error' },
};

export interface PlatformPayment {
  id: string;
  institutionId: string;
  institutionName: string;
  planCode: string;
  amount: number;
  status: 'PAID' | 'FAILED' | 'REFUNDED';
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export const PAYMENT_STATUS: Record<PlatformPayment['status'], { label: string; color: 'success' | 'error' | 'default' }> = {
  PAID: { label: '결제 완료', color: 'success' },
  FAILED: { label: '실패', color: 'error' },
  REFUNDED: { label: '환불', color: 'default' },
};

export interface PlatformInstitution {
  id: string;
  name: string;
  ownerName: string;
  type: string;
  serviceStatus: ServiceStatus;
  statusReason: string | null;
  planCode: string | null;
  subscriptionStatus: string | null;
  studentCount: number;
  voucherCode: string | null;
  createdAt: string;
}

export interface PlatformInstitutionDetail extends PlatformInstitution {
  nextBillingDate: string | null;
  trialEndsOn: string | null;
  cancelAtPeriodEnd: boolean;
  card: { brand: string | null; last4: string } | null;
  staffCount: number;
  recentPayments: PlatformPayment[];
  /** 운영사가 만든 기관의 가장 최근 원장 초대 */
  ownerInvitation: OwnerInvitation | null;
}

export interface OwnerInvitation {
  email: string;
  name: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  acceptedAt: string | null;
}

export interface Voucher {
  id: string;
  institutionId: string;
  institutionName: string;
  voucherCode: string;
  supportRatio: number;
  status: 'ACTIVE' | 'ENDED';
  startedOn: string | null;
  endedOn: string | null;
  memo: string | null;
}

export interface VoucherSettlement {
  id: string;
  institutionId: string;
  institutionName: string;
  periodMonth: string;
  billedAmount: number;
  supportAmount: number;
  status: 'PENDING' | 'SETTLED';
  settledOn: string | null;
  memo: string | null;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'GENERAL' | 'BILLING' | 'BUG' | 'FEATURE';
export const TICKET_STATUS: Record<TicketStatus, { label: string; color: 'warning' | 'info' | 'success' | 'default' }> = {
  OPEN: { label: '접수', color: 'warning' },
  IN_PROGRESS: { label: '처리 중', color: 'info' },
  RESOLVED: { label: '해결', color: 'success' },
  CLOSED: { label: '종료', color: 'default' },
};
export const TICKET_CATEGORY: Record<TicketCategory, string> = { GENERAL: '일반 문의', BILLING: '결제·요금', BUG: '오류 신고', FEATURE: '기능 제안' };

export interface TicketMessage { id: string; authorName: string; fromOperator: boolean; body: string; createdAt: string }
export interface Ticket {
  id: string;
  institutionId: string;
  institutionName: string;
  createdByName: string;
  subject: string;
  category: TicketCategory;
  categoryLabel: string;
  status: TicketStatus;
  assigneeName: string | null;
  lastMessageAt: string;
  createdAt: string;
  messages: TicketMessage[] | null;
}

export type NoticeKind = 'NOTICE' | 'MAINTENANCE';
export interface PlatformNotice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string | null;
  cancelled: boolean;
  createdAt: string;
}

export interface PlatformMetrics {
  month: string;
  mrr: number;
  arr: number;
  payingInstitutions: number;
  trialInstitutions: number;
  newPaid: number;
  churned: number;
  churnRate: number | null;
  marketingCost: number | null;
  cac: number | null;
  trend: { month: string; newPaid: number; churned: number; activeAtEnd: number; mrr: number }[];
}

/** 운영사 계정 여부 — 콘솔 메뉴 노출 판단 */
export function usePlatformAdmin() {
  const q = useQuery({
    queryKey: ['platform', 'me'],
    queryFn: () => api.get<{ platformAdmin: boolean }>('platform/me'),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return q.data?.platformAdmin === true;
}
