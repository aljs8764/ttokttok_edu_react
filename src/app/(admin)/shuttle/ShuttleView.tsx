'use client';

import { useState } from 'react';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import PageHeader from '@/components/PageHeader';
import { useSession } from '@/lib/session';
import LiveTab from './LiveTab';
import RoutesTab from './RoutesTab';
import HistoryTab from './HistoryTab';
import { useT } from '@/lib/i18n';

/** ATT-009 셔틀버스 실시간 GPS 관제 */
export default function ShuttleView() {
  const t = useT();
  const { manager } = useSession();
  const [tab, setTab] = useState('live');
  return (
    <>
      <PageHeader
        title={t('셔틀 관제')}
        menuId="ATT-009"
        description={t('운행 중인 셔틀 위치와 정류장별 도착 예정 시간을 봅니다. 기사(교직원)가 교사 앱에서 운행을 시작하면 위치가 올라오고, 학부모 앱에도 우리 아이 정류장 도착 예정이 보입니다.')}
      />
      <Tabs value={tab} onChange={(_, v: string) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="live" label={t('실시간 관제')} />
        <Tab value="routes" label={t('노선·정류장')} />
        {manager && <Tab value="history" label={t('운행 기록')} />}
      </Tabs>
      {tab === 'live' && <LiveTab />}
      {tab === 'routes' && <RoutesTab />}
      {tab === 'history' && manager && <HistoryTab />}
    </>
  );
}
