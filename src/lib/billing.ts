import { translate } from '@/lib/i18n';
// Phase 2 ④ 결제·구독 응답 타입 (PAY-001~003, SET-003, DASH-007)

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'CANCELED';
export type InvoiceFilter = 'ALL' | 'UNPAID' | 'OVERDUE' | 'PAID' | 'CANCELED';
export type PayMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';

export const PAY_METHOD: Record<PayMethod, string> = { CASH: '현금', TRANSFER: '계좌이체', CARD: '카드', OTHER: '기타' };

export const INVOICE_FILTER: { value: InvoiceFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'UNPAID', label: '미납' },
  { value: 'OVERDUE', label: '연체' },
  { value: 'PAID', label: '수납 완료' },
  { value: 'CANCELED', label: '취소' },
];

export interface Invoice {
  id: string;
  institutionId: string;
  institutionName: string;
  student: { id: string; name: string };
  classroomName: string | null;
  title: string;
  amount: number;
  dueDate: string;
  memo: string | null;
  status: InvoiceStatus;
  /** 미납이고 기한이 지났을 때 지난 일수 */
  overdueDays: number;
  paidOn: string | null;
  payMethod: PayMethod | null;
  paidNote: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface InvoiceSummary {
  month: string;
  count: number;
  totalAmount: number;
  paidAmount: number;
  unpaidCount: number;
  overdueCount: number;
  overdueAmount: number;
  collectionRate: number | null;
}

export interface Plan {
  code: string;
  name: string;
  monthlyPrice: number | null;
  studentLimit: number | null;
  description: string | null;
}

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; color: 'info' | 'success' | 'warning' | 'default' }> = {
  TRIAL: { label: '무료 체험', color: 'info' },
  ACTIVE: { label: '이용 중', color: 'success' },
  PAST_DUE: { label: '결제 실패', color: 'warning' },
  CANCELED: { label: '해지', color: 'default' },
};

export interface Subscription {
  plan: Plan;
  status: SubscriptionStatus;
  trialEndsOn: string | null;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  card: { brand: string | null; last4: string } | null;
  studentCount: number;
  studentLimit: number | null;
  usagePercent: number | null;
}

export interface SubscriptionPayment {
  id: string;
  planCode: string;
  amount: number;
  status: 'PAID' | 'FAILED' | 'REFUNDED';
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  failureReason: string | null;
}

export interface BillingWidgetData {
  planName: string;
  status: SubscriptionStatus;
  nextBillingDate: string | null;
  trialDaysLeft: number | null;
  studentCount: number;
  studentLimit: number | null;
  usagePercent: number | null;
  invoices: InvoiceSummary;
}

export const won = (n: number | null | undefined) => (n === null || n === undefined ? '-' : translate('{0}원', { 0: n.toLocaleString('ko-KR') }));
