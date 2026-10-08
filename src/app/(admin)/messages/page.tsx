import { Suspense } from 'react';
import MessagesView from './MessagesView';

export const metadata = { title: '메시지함' };

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesView />
    </Suspense>
  );
}
