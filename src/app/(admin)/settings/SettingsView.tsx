'use client';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/session';
import PageHeader from '@/components/PageHeader';
import InstitutionTab from './InstitutionTab';
import DestinationsTab from './DestinationsTab';
import TermsTab from './TermsTab';
import AuditTab from './AuditTab';
import AccountTab from './AccountTab';
import NotificationChannelsTab from './NotificationChannelsTab';
import SubscriptionTab from './SubscriptionTab';
import SecurityTab from './SecurityTab';
import MissingAlertTab from './MissingAlertTab';
import DataExportTab from './DataExportTab';
import { LanguageCard } from '@/components/LanguageSwitch';
import { useT } from '@/lib/i18n';

const TABS = [
  { key: 'institution', label: '기관 정보', menuId: 'SET-001' },
  { key: 'destinations', label: '하원 목적지', menuId: 'SET-002' },
  { key: 'channels', label: '알림 채널', menuId: 'SET-004' },
  { key: 'missing', label: '미등원 경고', menuId: 'ATT-010' },
  { key: 'subscription', label: '구독·결제', menuId: 'SET-003', managerOnly: true },
  { key: 'terms', label: '약관', menuId: 'SET-005' },
  { key: 'audit', label: '감사 로그', menuId: 'SEC-002', ownerOnly: true },
  { key: 'export', label: '데이터 내보내기', menuId: 'SET-006', ownerOnly: true },
  { key: 'security', label: '보안', menuId: 'AUTH-007' },
  { key: 'account', label: '내 계정', menuId: 'AUTH-005' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** 기관 설정 — 탭은 ?tab= 으로 유지 (새로고침·링크 공유) */
export default function SettingsView() {
  const { role } = useSession();
  const owner = role === 'OWNER';
  const manager = role === 'OWNER' || role === 'ADMIN';
  const router = useRouter();
  const tr = useT();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabs = TABS.filter((t) => (!('ownerOnly' in t && t.ownerOnly) || owner) && (!('managerOnly' in t && t.managerOnly) || manager));
  const current = (tabs.find((t) => t.key === params.get('tab')) ?? tabs[0]).key as TabKey;
  const meta = tabs.find((t) => t.key === current)!;

  return (
    <>
      <PageHeader
        title={tr('설정')}
        menuId={meta.menuId}
        tabs={
          <Tabs value={current} onChange={(_, v) => router.replace(`${pathname}?tab=${v}`)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label={tr('설정')}>
            {tabs.map((t) => (
              <Tab key={t.key} value={t.key} label={tr(t.label)} />
            ))}
          </Tabs>
        }
      />
      {current === 'institution' && <InstitutionTab />}
      {current === 'destinations' && <DestinationsTab />}
      {current === 'channels' && <NotificationChannelsTab />}
      {current === 'missing' && <MissingAlertTab />}
      {current === 'subscription' && manager && <SubscriptionTab />}
      {current === 'terms' && <TermsTab />}
      {current === 'audit' && owner && <AuditTab />}
      {current === 'export' && owner && <DataExportTab />}
      {current === 'security' && <SecurityTab />}
      {current === 'account' && (
        <>
          <AccountTab />
          <LanguageCard />
        </>
      )}
    </>
  );
}
