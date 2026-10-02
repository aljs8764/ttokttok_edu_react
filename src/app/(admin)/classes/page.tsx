import ComingSoon from '@/components/ComingSoon';

export const metadata = { title: '반 관리' };

export default function Page() {
  return <ComingSoon title="반 관리" menuId="CLS-001" apis={['GET/POST /classes', 'PATCH/DELETE /classes/{id}', 'PUT /classes/{id}/teachers']} />;
}
