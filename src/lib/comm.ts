// 소통 슬라이스 ② (NTC-003·007·008·010·011, ATT-007, SET-004) 응답 타입
import type { FileRef, Target } from './types';

export interface Conversation {
  id: string;
  institutionId: string;
  institutionName: string;
  studentId: string;
  studentName: string;
  guardian: { userId: string; name: string };
  notice: { id: string; title: string } | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unread: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  side: 'PARENT' | 'STAFF';
  body: string;
  createdAt: string;
}

export type AbsenceKind = 'ABSENT' | 'LATE' | 'EARLY_LEAVE';
export type AbsenceStatus = 'SUBMITTED' | 'ACKNOWLEDGED' | 'CANCELLED';
export const ABSENCE_KIND: Record<AbsenceKind, string> = { ABSENT: '결석', LATE: '지각', EARLY_LEAVE: '조퇴' };
export const ABSENCE_STATUS: Record<AbsenceStatus, { label: string; color: 'warning' | 'success' | 'default' }> = {
  SUBMITTED: { label: '확인 대기', color: 'warning' },
  ACKNOWLEDGED: { label: '확인함', color: 'success' },
  CANCELLED: { label: '취소', color: 'default' },
};

export interface AbsenceRequest {
  id: string;
  studentId: string;
  studentName: string;
  guardianName: string;
  date: string;
  kind: AbsenceKind;
  expectedTime: string | null;
  reason: string;
  status: AbsenceStatus;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface NoticeTemplate {
  id: string;
  kind: 'NOTE' | 'ANNOUNCEMENT';
  name: string;
  title: string;
  body: string;
  createdBy: { id: string; name: string };
  useCount: number;
  updatedAt: string;
}

export type QuestionType = 'SINGLE' | 'MULTI' | 'TEXT' | 'RATING';
export const QUESTION_TYPE: Record<QuestionType, string> = { SINGLE: '단일 선택', MULTI: '복수 선택', TEXT: '주관식', RATING: '평점(1~5)' };

export interface SurveyQuestion {
  id: string;
  position: number;
  type: QuestionType;
  text: string;
  options: string[];
  required: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'CLOSED';
  closesAt: string | null;
  createdAt: string;
  author: { id: string; name: string };
  recipients: number;
  responses: number;
  questions: SurveyQuestion[];
}

export interface SurveyResults {
  survey: Survey;
  questions: { question: SurveyQuestion; counts: Record<string, number>; average: number | null; texts: { studentName: string; text: string }[] }[];
  respondents: { studentId: string; studentName: string; guardianName: string; submittedAt: string }[];
  nonRespondents: string[];
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  author: { id: string; name: string };
  createdAt: string;
  itemCount: number;
  items: FileRef[];
  recipients: number | null;
}

export interface ChannelSetting {
  category: string;
  label: string;
  push: boolean;
  alimtalk: boolean;
}

export type { Target };
