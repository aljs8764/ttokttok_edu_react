import StudentDetailView from './StudentDetailView';

export const metadata = { title: '원생 상세' };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetailView id={id} />;
}
