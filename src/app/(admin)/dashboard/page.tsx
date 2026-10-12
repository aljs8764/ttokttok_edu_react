import { Suspense } from 'react';
import DashboardView from './DashboardView';

export const metadata = { title: '대시보드' };

export default function DashboardPage() {
  // ?teacherId= (교사 화면 보기)를 읽으므로 Suspense 경계 필요
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
