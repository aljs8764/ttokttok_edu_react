import ComingSoon from '@/components/ComingSoon';

export const metadata = { title: '교직원' };

export default function Page() {
  return <ComingSoon title="교직원" menuId="STF-001" apis={['GET/POST /staff', 'POST/GET/DELETE /staff/invitations']} />;
}
