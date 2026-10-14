'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import PageHeader from '@/components/PageHeader';
import { usePlatformAdmin } from '@/lib/platform';
import MetricsTab from './MetricsTab';
import InstitutionsTab from './InstitutionsTab';
import PaymentsTab from './PaymentsTab';
import VouchersTab from './VouchersTab';
import TicketsTab from './TicketsTab';
import NoticesTab from './NoticesTab';
import UsageTab from './UsageTab';
import CommunityReportsTab from './CommunityReportsTab';
import { useT } from '@/lib/i18n';

const TABS = [
  { id: 'metrics', label: '경영 지표', group: 'SaaS 운영', menuId: 'SAAS-007', node: <MetricsTab /> },
  { id: 'institutions', label: '가입 기관', group: 'SaaS 운영', menuId: 'SAAS-001', node: <InstitutionsTab /> },
  { id: 'usage', label: '사용량·이상 탐지', group: 'SaaS 운영', menuId: 'SAAS-006', node: <UsageTab /> },
  { id: 'payments', label: '구독 결제', group: 'SaaS 운영', menuId: 'SAAS-002', node: <PaymentsTab /> },
  { id: 'vouchers', label: '바우처', group: 'SaaS 운영', menuId: 'SAAS-003', node: <VouchersTab /> },
  { id: 'tickets', label: '문의(CS)', group: 'CS·공지', menuId: 'SAAS-004', node: <TicketsTab /> },
  { id: 'notices', label: '공지·점검', group: 'CS·공지', menuId: 'SAAS-005', node: <NoticesTab /> },
  { id: 'community', label: '커뮤니티 신고', group: 'CS·공지', menuId: 'COM-008', node: <CommunityReportsTab /> },
];

/** SAAS-001~007 운영사 전용 백오피스 */
export default function PlatformView() {
  const tr = useT();
  const isAdmin = usePlatformAdmin();
  const router = useRouter();
  const params = useSearchParams();
  // 탭은 ?tab= 과 맞춘다 — 운영사 사이드바 메뉴가 같은 주소로 이동한다
  const param = params.get('tab');
  const tab = TABS.some((t) => t.id === param) ? (param as string) : 'metrics';
  const setTab = (v: string) => router.replace(`/platform?tab=${v}`, { scroll: false });
  const current = TABS.find((t) => t.id === tab)!;
  if (!isAdmin) return <Alert severity="info">{tr('운영사 계정만 볼 수 있습니다.')}</Alert>;
  return (
    <>
      <PageHeader
        title={tr(current.label)}
        menuId={current.menuId}
        breadcrumb={<>{tr('운영 콘솔')} › {tr(current.group)}</>}
        description={tr('가입 기관 승인·정지, 사용량·이상 탐지, 구독 결제, 바우처 정산, 문의 응대, 공지·점검, 커뮤니티 신고, 핵심 지표를 관리합니다.')}
        tabs={
          // 넓은 화면은 운영사 사이드바가 같은 메뉴를 보여 주므로 좁은 화면에서만 탭을 둔다
          <Box sx={{ display: { md: 'none' } }}>
            <Tabs value={tab} onChange={(_, v: string) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
              {TABS.map((t) => <Tab key={t.id} value={t.id} label={tr(t.label)} />)}
            </Tabs>
          </Box>
        }
      />
      <Box>{current.node}</Box>
    </>
  );
}
