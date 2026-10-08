import SurveyResultView from './SurveyResultView';

export const metadata = { title: '설문 결과' };

export default async function SurveyResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SurveyResultView id={id} />;
}
