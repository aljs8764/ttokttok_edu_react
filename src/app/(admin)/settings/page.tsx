import ComingSoon from '@/components/ComingSoon';

export const metadata = { title: '설정' };

export default function Page() {
  return <ComingSoon title="설정" menuId="SET-001" apis={['GET/PUT /institution', '/destinations', '/files/presign']} />;
}
