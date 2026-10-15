import type { ReactNode } from 'react';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import ChecklistIcon from '@mui/icons-material/FactCheckOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import ClassIcon from '@mui/icons-material/MenuBookOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CampaignIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import EventIcon from '@mui/icons-material/OutlinedFlag';
import SettingsIcon from '@mui/icons-material/TuneOutlined';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import ChatIcon from '@mui/icons-material/ForumOutlined';
import ForumIcon from '@mui/icons-material/Diversity3Outlined';
import PollIcon from '@mui/icons-material/AssignmentOutlined';
import PhotoIcon from '@mui/icons-material/PhotoLibraryOutlined';
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import ScheduleIcon from '@mui/icons-material/GridViewOutlined';
import HourglassIcon from '@mui/icons-material/HourglassEmptyOutlined';
import EventNoteIcon from '@mui/icons-material/EventNoteOutlined';
import RepeatIcon from '@mui/icons-material/EventRepeatOutlined';
import TimerIcon from '@mui/icons-material/AssignmentIndOutlined';
import ReceiptIcon from '@mui/icons-material/CreditCardOutlined';
import InsightsIcon from '@mui/icons-material/BarChartOutlined';
import SupportIcon from '@mui/icons-material/SupportAgentOutlined';
import BusIcon from '@mui/icons-material/DirectionsBusOutlined';
import ConsultIcon from '@mui/icons-material/EventAvailableOutlined';
import TrendIcon from '@mui/icons-material/TrendingUpOutlined';
import ApartmentIcon from '@mui/icons-material/ApartmentOutlined';
import SpeedIcon from '@mui/icons-material/SpeedOutlined';
import MenuGroupIcon from '@mui/icons-material/AccountTreeOutlined';
import AdminIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import VoucherIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import HeadsetIcon from '@mui/icons-material/HeadsetMicOutlined';
import AnnouncementIcon from '@mui/icons-material/CampaignOutlined';
import ReportIcon from '@mui/icons-material/FlagOutlined';

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** 원장·실장만 (기존 권한 로직 그대로) */
  managerOnly?: boolean;
  /** 메뉴 그룹(SAAS-008)으로 끌 수 없는 메뉴 — 설정·문의는 끄면 기관이 되돌릴 방법이 없다 */
  required?: boolean;
}
export interface NavGroup {
  group: string;
  items: NavItem[];
}

/**
 * 기관 사이드바 메뉴 — 디자인 그룹(운영·소통·경영·설정)에 기존 라우트를 모두 배치.
 * 노출 권한(managerOnly)은 이전 AdminShell 과 같다.
 */
export const NAV: NavGroup[] = [
  {
    group: '운영',
    items: [
      { href: '/dashboard', label: '대시보드', icon: <DashboardIcon /> },
      { href: '/students', label: '원생 관리', icon: <PeopleIcon /> },
      { href: '/classes', label: '반 관리', icon: <ClassIcon /> },
      { href: '/staff', label: '교직원', icon: <BadgeIcon />, managerOnly: true },
      { href: '/timetable', label: '시간표', icon: <ScheduleIcon /> },
      { href: '/waitlist', label: '대기자', icon: <HourglassIcon />, managerOnly: true },
      { href: '/attendance', label: '데일리 리포트', icon: <ChecklistIcon /> },
      { href: '/attendance/monthly', label: '월간 출석부', icon: <CalendarIcon /> },
      { href: '/absence-requests', label: '결석·지각 신청', icon: <EventBusyIcon /> },
      { href: '/shuttle', label: '셔틀 관제', icon: <BusIcon /> },
      { href: '/qr-codes', label: '출석 QR', icon: <QrCodeIcon />, managerOnly: true },
    ],
  },
  {
    group: '소통',
    items: [
      { href: '/notices', label: '알림장', icon: <CampaignIcon /> },
      { href: '/notice-templates', label: '알림장 템플릿', icon: <ArticleIcon /> },
      { href: '/messages', label: '메시지함', icon: <ChatIcon /> },
      { href: '/consults', label: '상담 예약', icon: <ConsultIcon /> },
      { href: '/surveys', label: '설문', icon: <PollIcon /> },
      { href: '/albums', label: '앨범', icon: <PhotoIcon /> },
      { href: '/events', label: '행사(RSVP)', icon: <EventIcon /> },
      { href: '/event-calendar', label: '행사 달력', icon: <EventNoteIcon /> },
      { href: '/event-templates', label: '행사 템플릿', icon: <RepeatIcon /> },
      { href: '/community', label: '커뮤니티', icon: <ForumIcon /> },
    ],
  },
  {
    group: '경영',
    items: [
      { href: '/invoices', label: '수납 관리', icon: <ReceiptIcon />, managerOnly: true },
      { href: '/stats', label: '통계·분석', icon: <InsightsIcon />, managerOnly: true },
      { href: '/staff-attendance', label: '교직원 출퇴근', icon: <TimerIcon /> },
    ],
  },
  {
    group: '설정',
    items: [
      { href: '/settings', label: '설정', icon: <SettingsIcon />, required: true },
      { href: '/support', label: '문의하기', icon: <SupportIcon />, managerOnly: true, required: true },
    ],
  },
];

/** 운영사 콘솔 사이드바 — 기존 운영 콘솔 탭을 메뉴로 (`/platform?tab=`) */
export const OPS_NAV: NavGroup[] = [
  {
    group: 'SaaS 운영',
    items: [
      { href: '/platform?tab=metrics', label: '경영 지표', icon: <TrendIcon /> },
      { href: '/platform?tab=institutions', label: '가입 기관', icon: <ApartmentIcon /> },
      { href: '/platform?tab=usage', label: '사용량·이상 탐지', icon: <SpeedIcon /> },
      { href: '/platform?tab=payments', label: '구독 결제', icon: <PaymentsIcon /> },
      { href: '/platform?tab=vouchers', label: '바우처', icon: <VoucherIcon /> },
      { href: '/platform?tab=menu-groups', label: '메뉴 그룹', icon: <MenuGroupIcon /> },
    ],
  },
  {
    group: 'CS·공지',
    items: [
      { href: '/platform?tab=tickets', label: '문의(CS)', icon: <HeadsetIcon /> },
      { href: '/platform?tab=notices', label: '공지·점검', icon: <AnnouncementIcon /> },
      { href: '/platform?tab=community', label: '커뮤니티 신고', icon: <ReportIcon /> },
    ],
  },
  {
    group: '운영사 설정',
    items: [
      { href: '/platform?tab=admins', label: '운영사 계정', icon: <AdminIcon /> },
    ],
  },
];

/** 현재 경로가 속한 메뉴 (가장 긴 href 일치) — 사이드바 활성 표시·브레드크럼용 */
export function findNav(pathname: string): { group: string; item: NavItem } | null {
  let best: { group: string; item: NavItem } | null = null;
  for (const g of NAV) {
    for (const item of g.items) {
      const hit = pathname === item.href || pathname.startsWith(item.href + '/');
      if (hit && (!best || item.href.length > best.item.href.length)) best = { group: g.group, item };
    }
  }
  return best;
}

/** 메뉴 그룹에서 끈 메뉴를 빼고, 역할에 맞는 첫 메뉴 — 대시보드가 꺼진 기관의 첫 화면 */
export function firstEnabledHref(disabled: Set<string>, manager: boolean): string {
  for (const g of NAV) {
    for (const i of g.items) {
      if ((!i.managerOnly || manager) && !disabled.has(i.href)) return i.href;
    }
  }
  return '/settings';
}
