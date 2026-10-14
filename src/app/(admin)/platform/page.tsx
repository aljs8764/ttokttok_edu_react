import { Suspense } from 'react';
import PlatformView from './PlatformView';

export const metadata = { title: '운영 콘솔' };

export default function PlatformPage() {
  // ?tab= 을 읽으므로 Suspense 경계 필요
  return (
    <Suspense>
      <PlatformView />
    </Suspense>
  );
}
