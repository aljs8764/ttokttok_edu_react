import ComingSoon from '@/components/ComingSoon';

export const metadata = { title: '행사(RSVP)' };

export default function Page() {
  return <ComingSoon title="행사(RSVP)" menuId="EVT-001" apis={['POST/GET /events', 'GET /events/{id}/summary', 'POST /events/{id}/remind']} />;
}
