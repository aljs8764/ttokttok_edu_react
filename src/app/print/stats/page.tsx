import { Suspense } from 'react';
import PrintStatsView from './PrintStatsView';

export const metadata = { title: '통계 리포트' };

export default function PrintStatsPage() {
  return (
    <Suspense>
      <PrintStatsView />
    </Suspense>
  );
}
