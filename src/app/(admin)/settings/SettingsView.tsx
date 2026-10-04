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

const TABS = [
  { key: 'institution', label: '기관 정보', menuId: 'SET-001' },
  { key: 'destinations', label: '하원 목적지', menuId: 'SET-002' },
  { key: 'terms', label: '약관', menuId: 'SET-005' },
  { key: 'audit', label: '감사 로그', menuId: 'SEC-002', ownerOnly: true },
  { key: 'account', label: '내 계정', menuId: 'AUTH-005' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** 기관 설정 — 탭은 ?tab= 으로 유지 (새로고침·링크 공유) */
export default function SettingsView() {
  const { role } = useSession();
  const owner = role === 'OWNER';
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabs = TABS.filter((t) => !('ownerOnly' in t && t.ownerOnly) || owner);
  const current = (tabs.find((t) => t.key === params.get('tab')) ?? tabs[0]).key as TabKey;
  const meta = tabs.find((t) => t.key === current)!;

  return (
    <>
      <PageHeader title="설정" menuId={meta.menuId} />
      <Tabs value={current} onChange={(_, v) => router.replace(`${pathname}?tab=${v}`)} variant="scrollable" sx={{ mb: 3 }}>
        {tabs.map((t) => (
          <Tab key={t.key} value={t.key} label={t.label} />
        ))}
      </Tabs>
      {current === 'institution' && <InstitutionTab />}
      {current === 'destinations' && <DestinationsTab />}
      {current === 'terms' && <TermsTab />}
      {current === 'audit' && owner && <AuditTab />}
      {current === 'account' && <AccountTab />}
    </>
  );
}
