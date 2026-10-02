import ComingSoon from '@/components/ComingSoon';

export const metadata = { title: '알림장' };

export default function Page() {
  return <ComingSoon title="알림장" menuId="NTC-001" apis={['POST/GET /notices', 'GET /notices/{id}/receipts', 'POST /notices/{id}/resend-unread']} />;
}
