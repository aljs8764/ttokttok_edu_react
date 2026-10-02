import { Suspense } from 'react';
import StudentsView from './StudentsView';

export const metadata = { title: '원생 관리' };

export default function StudentsPage() {
  return (
    <Suspense>
      <StudentsView />
    </Suspense>
  );
}
