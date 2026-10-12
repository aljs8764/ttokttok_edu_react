'use client';

import { useState } from 'react';
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
  { id: 'metrics', label: '지표', node: <MetricsTab /> },
  { id: 'institutions', label: '기관', node: <InstitutionsTab /> },
  { id: 'usage', label: '사용량·이상 탐지', node: <UsageTab /> },
  { id: 'payments', label: '구독 결제', node: <PaymentsTab /> },
  { id: 'vouchers', label: '바우처', node: <VouchersTab /> },
  { id: 'tickets', label: '문의(CS)', node: <TicketsTab /> },
  { id: 'notices', label: '공지·점검', node: <NoticesTab /> },
  { id: 'community', label: '커뮤니티 신고', node: <CommunityReportsTab /> },
];

/** SAAS-001~007 운영사 전용 백오피스 */
export default function PlatformView() {
  const tr = useT();
  const isAdmin = usePlatformAdmin();
  const [tab, setTab] = useState('metrics');
  if (!isAdmin) return <Alert severity="info">{tr('운영사 계정만 볼 수 있습니다.')}</Alert>;
  return (
    <>
      <PageHeader title={tr('운영 콘솔')} menuId="SAAS" description={tr('가입 기관 승인·정지, 사용량·이상 탐지, 구독 결제, 바우처 정산, 문의 응대, 공지·점검, 커뮤니티 신고, 핵심 지표를 관리합니다.')} />
      <Tabs value={tab} onChange={(_, v: string) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {TABS.map((t) => <Tab key={t.id} value={t.id} label={tr(t.label)} />)}
      </Tabs>
      <Box>{TABS.find((t) => t.id === tab)?.node}</Box>
    </>
  );
}
