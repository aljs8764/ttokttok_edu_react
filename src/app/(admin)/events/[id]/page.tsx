import EventDetailView from './EventDetailView';

export const metadata = { title: '행사 상세' };

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailView id={id} />;
}
