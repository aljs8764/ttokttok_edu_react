/**
 * 관리자 웹 디자인 토큰 — 디자인 캔버스 「똑똑에듀 어드민 UI」 inline style 값 기준.
 * 화면 코드는 hex 를 직접 쓰지 말고 이 토큰(또는 MUI 테마 palette)을 쓴다.
 */
export const color = {
  primary: '#1B2559',
  primaryHover: '#232D66',
  accent: '#FF6B4A',
  success: '#12A189',
  info: '#3B6FD8',
  warning: '#E8A317',
  error: '#D93B3B',

  bg: '#F6F7FB',
  paper: '#FFFFFF',
  text: '#1B2559',
  textSecondary: '#5B6380',
  textMuted: '#8F98C2',
  link: '#2851A8',

  divider: '#E4E7F0',
  /** 표 행 구분선 */
  rowDivider: '#EEF0F7',
  /** 입력·보조 버튼 테두리 */
  border: '#D5D9E6',
  /** 세그먼트 탭 트랙 */
  track: '#F1F3F9',
  /** 메뉴ID 칩·중립 배지 배경 */
  neutral: '#EEF0F7',
  /** 선택된 카드·칩 배경 */
  selected: '#F1F4FD',
} as const;

/** 기관 사이드바 (Sidebar.dc.html) */
export const sidebar = {
  bg: '#1B2559',
  card: '#232D66',
  cardBorder: '#36407A',
  dashed: '#4A5490',
  groupLabel: '#8F98C2',
  subText: '#AEB6D6',
  item: '#D5DAEE',
  activeBg: '#FFFFFF',
  activeFg: '#1B2559',
  logoBg: '#FF6B4A',
} as const;

/** 운영사 콘솔 사이드바 (OpsSidebar.dc.html) */
export const ops = {
  main: '#10163A',
  bg: '#F4F5F9',
  card: '#1B2350',
  dashed: '#3A4373',
  groupLabel: '#8790B8',
  subText: '#9AA3C8',
  item: '#D5DAEE',
  activeBg: '#FFFFFF',
  activeFg: '#10163A',
  logoBg: '#12A189',
} as const;

/** 상태 배지 톤 {배경, 글자}. 대비 4.5:1 이상 */
export const tone = {
  green: { bg: '#E3F5F1', fg: '#0B7A67' },
  blue: { bg: '#E8EFFC', fg: '#2851A8' },
  amber: { bg: '#FFF4DC', fg: '#8A5A00' },
  red: { bg: '#FDECEC', fg: '#B42323' },
  gray: { bg: '#EEF0F7', fg: '#4A5272' },
  coral: { bg: '#FFE9E3', fg: '#B23A1C' },
} as const;
export type Tone = keyof typeof tone;

export const font = {
  sans: 'var(--font-plex-sans), "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
  mono: 'var(--font-plex-mono), "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export const radius = { control: 8, card: 12, pill: 999 } as const;

/** 차트 계열 색 (SVG 차트 공용) */
export const chart = {
  primary: color.primary,
  blue: color.info,
  green: color.success,
  amber: color.warning,
  red: color.error,
  accent: color.accent,
  gray: '#9AA0B8',
  violet: '#6C63C7',
  teal: '#2A8FBD',
  pink: '#C2569B',
  /** 0 값·트랙 */
  track: color.neutral,
  /** 히트맵용 rgb 문자열 */
  rgbPrimary: '27,37,89',
  rgbAccent: '255,107,74',
} as const;
