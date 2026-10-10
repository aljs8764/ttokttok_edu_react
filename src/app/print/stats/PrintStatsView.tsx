'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { ratioText, type ClassroomComparison, type EnrollmentStatusReport, type EnrollmentTrendReport, type KpiReport } from '@/lib/stats';
import { BarChart, Donut, LineChart } from '@/components/charts';

const BLUE = '#1b2559';
const GREEN = '#2e9e6b';
const ORANGE = '#e8913a';
const RED = '#d6453d';
const GRAY = '#9aa0b4';

/**
 * STAT-001·008 PDF 리포트 — 관리자 레이아웃 밖의 A4 인쇄용 화면.
 * 데이터가 다 그려지면 인쇄 창을 열고, 사용자는 "PDF로 저장"을 고른다(브라우저가 한글 글꼴을 그대로 쓴다).
 */
export default function PrintStatsView() {
  const params = useSearchParams();
  const from = params.get('from') ?? dayjs().subtract(29, 'day').format('YYYY-MM-DD');
  const to = params.get('to') ?? dayjs().format('YYYY-MM-DD');
  const sections = new Set((params.get('sections') ?? 'KPI,CLASSROOMS,ENROLLMENT').split(','));
  const { session, manager } = useSession();
  const instId = session?.institution?.institutionId;
  const enabled = !!instId && manager;
  const range = { from, to };

  const kpi = useQuery({ queryKey: ['print', 'kpi', instId, range], queryFn: () => api.get<KpiReport>('stats/kpi', range), enabled: enabled && sections.has('KPI') });
  const cls = useQuery({ queryKey: ['print', 'classrooms', instId, range], queryFn: () => api.get<ClassroomComparison>('stats/classrooms', range), enabled: enabled && sections.has('CLASSROOMS') });
  const status = useQuery({ queryKey: ['print', 'enrollment', instId], queryFn: () => api.get<EnrollmentStatusReport>('stats/enrollment'), enabled: enabled && sections.has('ENROLLMENT') });
  const trend = useQuery({ queryKey: ['print', 'enrollment-trend', instId], queryFn: () => api.get<EnrollmentTrendReport>('stats/enrollment/trend'), enabled: enabled && sections.has('ENROLLMENT') });

  const queries = [sections.has('KPI') && kpi, sections.has('CLASSROOMS') && cls, sections.has('ENROLLMENT') && status, sections.has('ENROLLMENT') && trend].filter(Boolean) as { isSuccess: boolean; isError: boolean; error: unknown }[];
  const ready = enabled && queries.length > 0 && queries.every((q) => q.isSuccess);
  const failed = queries.find((q) => q.isError);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [ready]);

  if (session && !manager) return <p style={{ padding: 24 }}>통계 리포트는 원장·실장만 볼 수 있습니다.</p>;
  if (failed) return <p style={{ padding: 24 }}>{errorMessage(failed.error)}</p>;
  if (!ready) return <p style={{ padding: 24 }}>리포트를 만드는 중…</p>;

  const k = kpi.data;
  const days = k?.days ?? [];
  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        body { background: #fff !important; color: #1B2559; }
        .doc { max-width: 186mm; margin: 0 auto; font-size: 10pt; }
        .head { display: flex; align-items: flex-end; border-bottom: 2px solid #1B2559; padding-bottom: 4mm; margin-bottom: 6mm; }
        .head h1 { font-size: 18pt; margin: 0; }
        .head .meta { margin-left: auto; text-align: right; color: #5B6385; font-size: 9pt; }
        .brand span { color: #FF6B4A; }
        h2 { font-size: 12.5pt; margin: 7mm 0 3mm; border-left: 4px solid #FF6B4A; padding-left: 2.5mm; break-after: avoid; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
        .kpi { border: 1px solid #DDE1EE; border-radius: 2mm; padding: 3mm; }
        .kpi .l { font-size: 8.5pt; color: #5B6385; } .kpi .v { font-size: 15pt; font-weight: 800; margin-top: 1mm; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        th, td { border-bottom: 1px solid #E6E9F2; padding: 1.6mm 2mm; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        th { background: #F4F6FB; font-weight: 700; }
        .block { break-inside: avoid; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
        .note { color: #5B6385; font-size: 8.5pt; margin-top: 2mm; }
        .foot { margin-top: 8mm; color: #9AA0B8; font-size: 8pt; text-align: center; }
        @media screen { body { background: #EEE !important; } .doc { background: #fff; padding: 12mm; margin: 12px auto; box-shadow: 0 1px 6px rgba(0,0,0,.15); } .noprint { display: block; } }
        @media print { .noprint { display: none; } }
      `}</style>
      <div className="doc">
        <div className="noprint" style={{ marginBottom: 12, textAlign: 'right' }}>
          <button onClick={() => window.print()} style={{ padding: '6px 14px', fontSize: 14 }}>인쇄 / PDF로 저장</button>
        </div>
        <div className="head">
          <div>
            <div className="brand" style={{ fontWeight: 800 }}>똑똑<span>.</span> 운영 리포트</div>
            <h1>{session?.institution?.institutionName}</h1>
          </div>
          <div className="meta">
            기간 {dayjs(from).format('YYYY.MM.DD')} ~ {dayjs(to).format('YYYY.MM.DD')}
            <br />
            작성 {dayjs().format('YYYY.MM.DD HH:mm')} · {session?.user.name}
          </div>
        </div>

        {k && (
          <>
            <h2>기간 KPI</h2>
            <div className="kpis block">
              <div className="kpi"><div className="l">등원율</div><div className="v">{ratioText(k.summary.attendanceRate)}</div></div>
              <div className="kpi"><div className="l">지각률</div><div className="v">{ratioText(k.summary.lateRate)}</div></div>
              <div className="kpi"><div className="l">결석률</div><div className="v">{ratioText(k.summary.absentRate)}</div></div>
              <div className="kpi"><div className="l">알림장 열람률</div><div className="v">{ratioText(k.summary.noticeReadRate)}</div><div className="l">{k.summary.noticeCount}건 발송</div></div>
            </div>
            {days.length > 1 && (
              <div className="block" style={{ marginTop: '4mm' }}>
                <LineChart
                  labels={days.map((d) => dayjs(d.date).format('M/D'))}
                  series={[{ name: '등원율', color: BLUE, values: days.map((d) => d.attendanceRate) }]}
                  yMax={1}
                  percent
                  height={180}
                />
              </div>
            )}
            <p className="note">예정 {k.summary.scheduled}건 중 등원 {k.summary.present} · 지각 {k.summary.late} · 결석 {k.summary.absent}</p>
          </>
        )}

        {cls.data && (
          <>
            <h2>반별 비교</h2>
            <table className="block">
              <thead>
                <tr><th>반</th><th>원생</th><th>예정</th><th>등원</th><th>지각</th><th>결석</th><th>등원율</th><th>열람률</th></tr>
              </thead>
              <tbody>
                {cls.data.classrooms.map((c) => (
                  <tr key={c.classroomId}>
                    <td>{c.name}</td><td>{c.students}</td><td>{c.scheduled}</td><td>{c.present}</td><td>{c.late}</td><td>{c.absent}</td>
                    <td>{ratioText(c.attendanceRate)}</td><td>{ratioText(c.noticeReadRate)}</td>
                  </tr>
                ))}
                {cls.data.classrooms.length === 0 && <tr><td colSpan={8}>반이 없습니다</td></tr>}
              </tbody>
            </table>
          </>
        )}

        {status.data && trend.data && (
          <>
            <h2>재원 현황</h2>
            <div className="two block">
              <div>
                <Donut size={140} slices={[
                  { label: '재원', value: status.data.active, color: GREEN },
                  { label: '휴원', value: status.data.paused, color: ORANGE },
                  { label: '퇴원', value: status.data.withdrawn, color: GRAY },
                ]} />
              </div>
              <table>
                <thead><tr><th>학년</th><th>재원생</th></tr></thead>
                <tbody>
                  {status.data.byGrade.map((g) => <tr key={g.grade}><td>{g.grade}</td><td>{g.count}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="block" style={{ marginTop: '4mm' }}>
              <BarChart
                labels={trend.data.months.map((m) => dayjs(`${m.month}-01`).format('YY.M'))}
                series={[
                  { name: '신규', color: GREEN, values: trend.data.months.map((m) => m.joined) },
                  { name: '퇴원', color: RED, values: trend.data.months.map((m) => m.withdrawn) },
                ]}
                height={170}
              />
            </div>
            {trend.data.reasons.length > 0 && (
              <p className="note">퇴원 사유: {trend.data.reasons.map((r) => `${r.reason} ${r.count}명`).join(', ')}</p>
            )}
          </>
        )}

        <div className="foot">똑똑에듀 · 이 리포트는 출결·알림장 기록을 바탕으로 자동 작성되었습니다</div>
      </div>
    </>
  );
}
