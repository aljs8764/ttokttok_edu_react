import NoticeDetailView from './NoticeDetailView';

export const metadata = { title: '알림장 상세' };

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoticeDetailView id={id} />;
}
