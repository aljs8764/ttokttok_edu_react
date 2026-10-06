import { Suspense } from 'react';
import PrintQrView from './PrintQrView';

export const metadata = { title: '출석 QR 인쇄' };

export default function PrintQrPage() {
  return (
    <Suspense>
      <PrintQrView />
    </Suspense>
  );
}
