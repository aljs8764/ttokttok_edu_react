'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/ko';
import { EN_SCREENS } from './i18n-en';

/**
 * SET-007 다국어 UI (한국어·영어). 한국어 문구 자체를 키로 쓰고, 영어 사전에 있는 문구만 바꾼다.
 * → 화면 문구는 i18n-en.ts, 메뉴·로그인 등 기본 문구는 아래 EN. 사전에 없는 문구는 한국어 그대로 보인다.
 * 값이 끼는 문구는 t('{0}명', { 0: n }) 처럼 자리표시를 쓴다.
 * 선택한 언어는 브라우저(localStorage)와 계정(/me/locale)에 함께 저장한다.
 */
export type Locale = 'ko' | 'en';

const EN: Record<string, string> = {
  // 메뉴 그룹
  운영: 'Operations', 출결: 'Attendance', '원생·반': 'Students & Classes', 소통: 'Communication', 분석: 'Analytics', 기관: 'Institution', 운영사: 'Platform',
  // 메뉴·화면 제목
  대시보드: 'Dashboard', '데일리 리포트': 'Daily report', '월간 출석부': 'Monthly register', '결석·지각 신청': 'Absence requests', '셔틀 관제': 'Shuttle tracking',
  '원생 관리': 'Students', '반 관리': 'Classes', 시간표: 'Timetable', 대기자: 'Waitlist', 교직원: 'Staff', '교직원 출퇴근': 'Staff attendance',
  알림장: 'Notices', '행사(RSVP)': 'Events (RSVP)', 행사: 'Events', '행사 달력': 'Event calendar', '행사 템플릿': 'Event templates', 메시지함: 'Messages',
  '상담 예약': 'Consultations', 설문: 'Surveys', 앨범: 'Albums', '알림장 템플릿': 'Notice templates', '수납 관리': 'Billing', '통계·분석': 'Statistics',
  '출석 QR': 'Check-in QR', 문의하기: 'Support', 설정: 'Settings', '운영 콘솔': 'Platform console', '원생 등록': 'New student', '알림장 작성': 'New notice',
  // 계정 메뉴
  '비밀번호 변경': 'Change password', '체험 기관으로 이동': 'Go to demo institution', '샘플 데이터로 체험하기': 'Try with sample data', 로그아웃: 'Log out',
  계정: 'Account', 메뉴: 'Menu', 언어: 'Language', 한국어: '한국어', English: 'English',
  // 설정 탭
  '기관 정보': 'Institution', '하원 목적지': 'Destinations', '알림 채널': 'Notification channels', '미등원 경고': 'Missing check-in alert',
  '구독·결제': 'Subscription', 약관: 'Terms', '감사 로그': 'Audit log', '데이터 내보내기': 'Data export', 보안: 'Security', '내 계정': 'My account',
  // 로그인
  이메일: 'Email', 비밀번호: 'Password', '아이디 저장': 'Remember email', '자동 로그인': 'Keep me signed in', 로그인: 'Sign in',
  '비밀번호를 잊으셨나요?': 'Forgot password?', '2단계 인증': 'Two-step verification', '인증 코드': 'Verification code', 확인: 'Confirm', 처음으로: 'Back',
  '관리할 기관을 선택하세요': 'Choose an institution', '임시 비밀번호 받기': 'Get a temporary password', '가입한 이메일': 'Email you signed up with',
  닫기: 'Close', 보내기: 'Send', '로그인에 실패했습니다': 'Sign-in failed', '서버에 연결할 수 없습니다': 'Cannot reach the server',
  '시도가 너무 많습니다. 1분 뒤 다시 시도하세요': 'Too many attempts. Try again in a minute.', '시도가 너무 많습니다. 잠시 후 다시 시도하세요': 'Too many attempts. Try again shortly.',
  '요청에 실패했습니다': 'Request failed', '인증에 실패했습니다': 'Verification failed', '기관을 선택할 수 없습니다': 'Cannot select the institution',
  '인증 앱(Google Authenticator 등)에 표시된 6자리 숫자를 입력하세요. 휴대폰을 잃어버렸다면 복구 코드(XXXXX-XXXXX)를 입력할 수 있습니다.':
    'Enter the 6-digit code from your authenticator app (e.g. Google Authenticator). If you lost your phone, enter a recovery code (XXXXX-XXXXX).',
  '가입된 이메일이면 임시 비밀번호를 보냈습니다. 로그인 후 바로 새 비밀번호로 바꿔 주세요.':
    'If the email is registered, we sent a temporary password. Please change it right after signing in.',
  '학원 운영 관리자': 'Academy admin console', '사용량·이상 탐지': 'Usage & anomalies',
  // 역할
  원장: 'Owner', 실장: 'Manager', 교사: 'Teacher', 학부모: 'Parent',
  // 언어 설정
  '화면 언어': 'Display language',
  '관리자 웹 화면과 서버 안내 문구를 영어로 볼 수 있습니다. 원생 이름·알림장 본문처럼 직접 입력한 내용은 번역하지 않습니다.':
    'The admin web screens and server messages are available in English. Content you enter yourself, such as student names and notice text, is not translated.',
};

// 화면 문구 사전(i18n-en.ts) 위에 메뉴·로그인 등 기본 사전을 얹는다
const DICT: Record<Locale, Record<string, string>> = { ko: {}, en: { ...EN_SCREENS, ...EN } };
const STORAGE_KEY = 'ttok.locale';

function readStored(): Locale | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'ko' ? v : null;
  } catch {
    return null;
  }
}

function writeStored(l: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* 저장 못 해도 이번 화면에는 적용된다 */
  }
  writeCookie(l);
}

/** BFF 가 백엔드에 Accept-Language 로 넘길 언어 (lib/server/session.ts languageOf) */
function writeCookie(l: Locale) {
  try {
    document.cookie = `ttok_locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    /* 쿠키를 못 쓰면 서버 오류 문장만 한국어로 온다 */
  }
}

/** 문구 안의 {0}·{1}… 자리에 값을 넣는다 (사전에 없으면 한국어 원문에 넣는다) */
type Vars = Record<string | number, unknown>;
export type TFunc = (ko: string | null | undefined, vars?: Vars) => string;

function fill(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? '') : m));
}

/** 컴포넌트 밖(모듈 상수·유틸)에서 쓰는 번역. 현재 언어는 LocaleProvider 가 맞춰 둔다 */
let currentLocale: Locale = 'ko';
export const translate: TFunc = (ko, vars) => (ko == null ? '' : fill(DICT[currentLocale][ko] ?? ko, vars));

interface Ctx { locale: Locale; setLocale: (l: Locale, sync?: boolean) => void; t: TFunc }
const LocaleContext = createContext<Ctx>({ locale: 'ko', setLocale: () => {}, t: (s, v) => (s == null ? '' : fill(s, v)) });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<Locale>('ko');

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setState(stored);
      writeCookie(stored);
    }
  }, []);

  useEffect(() => {
    currentLocale = locale;
    document.documentElement.lang = locale;
    dayjs.locale(locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale, sync = true) => {
    setState(l);
    writeStored(l);
    if (sync) {
      // 로그인 전이면 401 → 무시 (브라우저에는 저장됨)
      void fetch('/api/proxy/me/locale', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: l }) }).catch(() => {});
    }
  }, []);

  currentLocale = locale; // 렌더 중 translate() 호출도 같은 언어로
  const t = useCallback<TFunc>((ko, vars) => (ko == null ? '' : fill(DICT[locale][ko] ?? ko, vars)), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
export const useT = () => useContext(LocaleContext).t;

/**
 * 로그인 뒤 한 번: 이 브라우저에서 고른 언어가 있으면 계정에 저장하고,
 * 없으면 계정에 저장된 언어(다른 기기에서 고른 것)를 불러온다.
 */
export function useAccountLocaleSync(enabled: boolean) {
  const { setLocale } = useLocale();
  useEffect(() => {
    if (!enabled) return;
    const stored = readStored();
    if (stored) {
      setLocale(stored, true);
      return;
    }
    let cancelled = false;
    fetch('/api/proxy/me/locale')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { locale?: string } | null) => {
        if (!cancelled && (d?.locale === 'en' || d?.locale === 'ko')) setLocale(d.locale, false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, setLocale]);
}
