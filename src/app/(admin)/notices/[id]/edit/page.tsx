import NoticeForm from '../../NoticeForm';

export const metadata = { title: '예약 알림장 수정' };

export default async function EditNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoticeForm id={id} />;
}
