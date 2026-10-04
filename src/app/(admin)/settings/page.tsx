import { Suspense } from 'react';
import SettingsView from './SettingsView';

export const metadata = { title: '설정' };

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
