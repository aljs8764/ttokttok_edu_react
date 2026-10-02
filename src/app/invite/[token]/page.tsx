import InviteAcceptForm from './InviteAcceptForm';

export const metadata = { title: '교직원 초대' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteAcceptForm token={token} />;
}
