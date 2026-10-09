'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import ChecklistIcon from '@mui/icons-material/FactCheckOutlined';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import ClassIcon from '@mui/icons-material/MeetingRoomOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import EventIcon from '@mui/icons-material/EventAvailableOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import PollIcon from '@mui/icons-material/PollOutlined';
import PhotoIcon from '@mui/icons-material/PhotoLibraryOutlined';
import EventBusyIcon from '@mui/icons-material/EventBusyOutlined';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
import HourglassIcon from '@mui/icons-material/HourglassEmptyOutlined';
import EventNoteIcon from '@mui/icons-material/EventNoteOutlined';
import RepeatIcon from '@mui/icons-material/EventRepeatOutlined';
import TimerIcon from '@mui/icons-material/TimerOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import AccountIcon from '@mui/icons-material/AccountCircleOutlined';
import { useSession, useSwitchInstitution, logout } from '@/lib/session';
import { usePlatformAdmin } from '@/lib/platform';
import PlatformNoticeBanner from '@/components/PlatformNoticeBanner';
import SupportIcon from '@mui/icons-material/SupportAgentOutlined';
import AdminPanelIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import BusIcon from '@mui/icons-material/DirectionsBusOutlined';
import { ROLE_LABEL } from '@/lib/format';
import ChangePasswordDialog from './ChangePasswordDialog';
import TermsGate from './TermsGate';

const DRAWER = 232;

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  managerOnly?: boolean;
}

/** IA 대분류 (Phase1) — 메뉴ID 는 기획서 기준 */
const NAV: { group: string; items: NavItem[] }[] = [
  { group: '운영', items: [{ href: '/dashboard', label: '대시보드', icon: <DashboardIcon /> }] },
  {
    group: '출결',
    items: [
      { href: '/attendance', label: '데일리 리포트', icon: <ChecklistIcon /> },
      { href: '/attendance/monthly', label: '월간 출석부', icon: <CalendarIcon /> },
      { href: '/absence-requests', label: '결석·지각 신청', icon: <EventBusyIcon /> },
      { href: '/shuttle', label: '셔틀 관제', icon: <BusIcon /> },
    ],
  },
  {
    group: '원생·반',
    items: [
      { href: '/students', label: '원생 관리', icon: <PeopleIcon /> },
      { href: '/classes', label: '반 관리', icon: <ClassIcon /> },
      { href: '/timetable', label: '시간표', icon: <ScheduleIcon /> },
      { href: '/waitlist', label: '대기자', icon: <HourglassIcon />, managerOnly: true },
      { href: '/staff', label: '교직원', icon: <BadgeIcon />, managerOnly: true },
      { href: '/staff-attendance', label: '교직원 출퇴근', icon: <TimerIcon /> },
    ],
  },
  {
    group: '소통',
    items: [
      { href: '/notices', label: '알림장', icon: <CampaignIcon /> },
      { href: '/events', label: '행사(RSVP)', icon: <EventIcon /> },
      { href: '/event-calendar', label: '행사 달력', icon: <EventNoteIcon /> },
      { href: '/event-templates', label: '행사 템플릿', icon: <RepeatIcon /> },
      { href: '/messages', label: '메시지함', icon: <ChatIcon /> },
      { href: '/surveys', label: '설문', icon: <PollIcon /> },
      { href: '/albums', label: '앨범', icon: <PhotoIcon /> },
      { href: '/notice-templates', label: '알림장 템플릿', icon: <ArticleIcon /> },
    ],
  },
  {
    group: '분석',
    items: [
      { href: '/invoices', label: '수납 관리', icon: <ReceiptIcon />, managerOnly: true },
      { href: '/stats', label: '통계·분석', icon: <InsightsIcon />, managerOnly: true },
    ],
  },
  {
    group: '기관',
    items: [
      { href: '/qr-codes', label: '출석 QR', icon: <QrCodeIcon />, managerOnly: true },
      { href: '/support', label: '문의하기', icon: <SupportIcon />, managerOnly: true },
      { href: '/settings', label: '설정', icon: <SettingsIcon /> },
    ],
  },
];

const PLATFORM_GROUP: { group: string; items: NavItem[] } = {
  group: '운영사',
  items: [{ href: '/platform', label: '운영 콘솔', icon: <AdminPanelIcon /> }],
};

export default function AdminShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const pathname = usePathname();
  const { session, manager } = useSession();
  const switchInst = useSwitchInstitution();
  const platformAdmin = usePlatformAdmin();

  const isActive = (href: string) => (href === '/attendance' ? pathname === href : pathname === href || pathname.startsWith(href + '/'));

  const nav = (
    <Box sx={{ py: 1 }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Typography variant="h3" sx={{ color: 'primary.main', letterSpacing: -0.5 }}>
          똑똑<Box component="span" sx={{ color: 'secondary.main' }}>.</Box>
        </Typography>
      </Toolbar>
      {[...NAV, ...(platformAdmin ? [PLATFORM_GROUP] : [])].map((g) => {
        const items = g.items.filter((i) => !i.managerOnly || manager);
        if (items.length === 0) return null;
        return (
          <List key={g.group} dense subheader={<ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '32px' }}>{g.group}</ListSubheader>}>
            {items.map((i) => (
              <ListItemButton
                key={i.href}
                component={Link}
                href={i.href}
                selected={isActive(i.href)}
                onClick={() => setMobileOpen(false)}
                sx={{ mx: 1, borderRadius: 1, '&.Mui-selected': { bgcolor: 'rgba(27,37,89,0.08)', fontWeight: 700 } }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{i.icon}</ListItemIcon>
                <ListItemText primary={i.label} />
              </ListItemButton>
            ))}
          </List>
        );
      })}
    </Box>
  );

  const memberships = session?.user.memberships ?? [];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        sx={{ width: { md: `calc(100% - ${DRAWER}px)` }, ml: { md: `${DRAWER}px` }, borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          {!desktop && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="메뉴">
              <MenuIcon />
            </IconButton>
          )}
          {memberships.length > 1 ? (
            <Select
              size="small"
              value={session?.institution?.institutionId ?? ''}
              onChange={(e) => switchInst.mutate(e.target.value)}
              sx={{ minWidth: 200, fontWeight: 600 }}
            >
              {memberships.map((m) => (
                <MenuItem key={m.institutionId} value={m.institutionId}>
                  {m.institutionName} · {ROLE_LABEL[m.role]}
                </MenuItem>
              ))}
            </Select>
          ) : (
            <Typography variant="subtitle1">{session?.institution?.institutionName}</Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {session?.user.name} {session?.institution ? `· ${ROLE_LABEL[session.institution.role]}` : ''}
          </Typography>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="계정">
            <AccountIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setPwOpen(true);
              }}
            >
              비밀번호 변경
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => void logout()}>로그아웃</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={desktop ? 'permanent' : 'temporary'}
          open={desktop || mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' } }}
        >
          {nav}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 }, mt: 8 }}>
        <PlatformNoticeBanner />
        {children}
      </Box>

      {/* 임시 비밀번호로 들어온 경우 변경을 강제 (AUTH-005) */}
      {/* 비밀번호 강제 변경이 먼저, 그다음 약관 재동의 */}
      {!session?.user.mustChangePassword && <TermsGate />}
      <ChangePasswordDialog open={pwOpen || !!session?.user.mustChangePassword} forced={!!session?.user.mustChangePassword} onClose={() => setPwOpen(false)} />
    </Box>
  );
}
