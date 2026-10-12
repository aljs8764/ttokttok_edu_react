'use client';

import dayjs from 'dayjs';
import { translate } from '@/lib/i18n';

// Phase 3 P3-⑦ 익명 커뮤니티 (COM-001~009). 응답에 작성자 신원은 없다 — mine(본인 여부)과 익명 번호만.

export type BoardScope = 'LOUNGE' | 'INSTITUTION';
export type BoardAudience = 'OWNER' | 'STAFF' | 'PARENT';
export type PostCategory = 'FREE' | 'QUESTION' | 'INFO' | 'WORRY';
export type ReportReason = 'ABUSE' | 'PRIVACY' | 'SPAM' | 'OBSCENE' | 'OTHER';
export type PostSort = 'LATEST' | 'POPULAR';

export interface CommunityBoard {
  key: string;
  scope: BoardScope;
  audience: BoardAudience;
  institutionId: string | null;
  institutionName: string | null;
}

export interface CommunityPostSummary {
  id: string;
  boardKey: string;
  category: PostCategory;
  title: string;
  preview: string;
  authorRole: string | null;
  authorRegion: string | null;
  likeCount: number;
  commentCount: number;
  mine: boolean;
  hidden: 'REPORTED' | 'MODERATED' | null;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  parentId: string | null;
  anonNo: number;
  body: string | null;
  likeCount: number;
  liked: boolean;
  mine: boolean;
  deleted: boolean;
  hidden: boolean;
  createdAt: string;
}

export interface CommunityPostDetail {
  post: CommunityPostSummary;
  body: string;
  liked: boolean;
  comments: CommunityComment[];
}

export interface CommunityPage {
  items: CommunityPostSummary[];
  page: number;
  hasMore: boolean;
}

export interface CommunityMe {
  rulesAgreed: boolean;
  sanctionedUntil: string | null;
  sanctionPermanent: boolean;
  sanctionReason: string | null;
  newComments: number;
}

export interface MyCommunityComment {
  id: string;
  postId: string;
  postTitle: string;
  body: string | null;
  deleted: boolean;
  createdAt: string;
}

export interface CommunityReport {
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  postId: string;
  boardKey: string;
  title: string | null;
  body: string | null;
  hidden: string | null;
  deleted: boolean;
  reportCount: number;
  reasons: Record<string, number>;
  memos: string[];
  firstReportedAt: string;
  open: boolean;
  authorSanctioned: boolean;
}

export const CATEGORIES: { id: PostCategory; label: string }[] = [
  { id: 'FREE', label: '자유' },
  { id: 'QUESTION', label: '질문' },
  { id: 'INFO', label: '정보' },
  { id: 'WORRY', label: '고민' },
];
export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

export const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'ABUSE', label: '욕설·비방' },
  { id: 'PRIVACY', label: '개인정보 노출' },
  { id: 'SPAM', label: '광고·홍보' },
  { id: 'OBSCENE', label: '음란·유해' },
  { id: 'OTHER', label: '기타' },
];
export const reasonLabel = (r: string) => REASONS.find((x) => x.id === r)?.label ?? r;

export const ROLE_LABEL: Record<string, string> = { OWNER: '원장', ADMIN: '실장', TEACHER: '교사', PARENT: '학부모' };

/** 게시판 이름 (번역 포함) */
export function boardLabel(b: Pick<CommunityBoard, 'scope' | 'audience' | 'institutionName'>): string {
  if (b.scope === 'LOUNGE') {
    return translate(b.audience === 'OWNER' ? '원장 라운지' : b.audience === 'STAFF' ? '교사 라운지' : '학부모 라운지');
  }
  return translate(b.audience === 'STAFF' ? '{0} 교직원' : '{0} 학부모', { 0: b.institutionName ?? '' });
}

/** 게시판 키만 있을 때 (운영 콘솔) */
export function boardKeyLabel(key: string): string {
  if (key === 'L-OWNER') return translate('원장 라운지');
  if (key === 'L-STAFF') return translate('교사 라운지');
  if (key === 'L-PARENT') return translate('학부모 라운지');
  return translate(key.endsWith('-STAFF') ? '기관 교직원 게시판' : '기관 학부모 게시판');
}

/** 라운지 작성자 표시 '원장 · 서울', 기관 게시판은 '익명' */
export function authorLabel(p: Pick<CommunityPostSummary, 'authorRole' | 'authorRegion'>): string {
  if (!p.authorRole) return translate('익명');
  const role = translate(ROLE_LABEL[p.authorRole] ?? p.authorRole);
  return p.authorRegion ? `${role} · ${p.authorRegion}` : role;
}

export const anonLabel = (n: number) => (n === 0 ? translate('글쓴이') : translate('익명{0}', { 0: n }));

/** 방금 · n분 전 · n시간 전 · M/D */
export function ago(iso: string): string {
  const m = dayjs().diff(dayjs(iso), 'minute');
  if (m < 1) return translate('방금');
  if (m < 60) return translate('{0}분 전', { 0: m });
  const h = Math.floor(m / 60);
  if (h < 24) return translate('{0}시간 전', { 0: h });
  return dayjs(iso).format(dayjs(iso).year() === dayjs().year() ? 'M/D' : 'YYYY.M.D');
}

export const RULES: string[] = [
  '이름은 저장되지만 화면에는 보이지 않습니다. 라운지에서는 역할과 지역(시·도)만, 기관 게시판에서는 \'익명\'으로만 표시됩니다.',
  '특정 원생·학부모·교직원을 알아볼 수 있는 이름, 연락처, 사진 설명을 올리지 마세요. 전화번호·이메일은 자동으로 가려집니다.',
  '욕설·비방·차별 표현, 광고·홍보, 음란·유해 게시물은 금지됩니다.',
  '신고가 쌓이면 글이 자동으로 숨겨지고 운영사가 검토합니다. 규칙을 어기면 이용이 제한될 수 있습니다.',
  '명예훼손·모욕 등 법적 문제가 생기면 관련 법에 따라 처리될 수 있습니다.',
];
