'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { CheckinQr } from '@/lib/types';
import QrImage from '@/components/QrImage';

/**
 * QR-001 인쇄용 화면 — A4 한 장에 QR 하나 (기관명·붙일 곳·사용 안내).
 * 관리자 레이아웃 밖이라 사이드바 없이 인쇄되고, 그려지면 인쇄 창을 자동으로 연다.
 */
export default function PrintQrView() {
  const params = useSearchParams();
  const ids = useMemo(() => (params.get('ids') ?? '').split(',').filter(Boolean), [params]);
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const qrs = useQuery({ queryKey: ['checkin-qrs', instId], queryFn: () => api.get<CheckinQr[]>('checkin-qrs'), enabled: !!instId });
  const list = (qrs.data ?? []).filter((q) => ids.length === 0 || ids.includes(q.id));

  // QR SVG 가 그려질 시간을 조금 준 뒤 인쇄
  useEffect(() => {
    if (!qrs.isSuccess || list.length === 0) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [qrs.isSuccess, list.length]);

  if (qrs.isError) return <p style={{ padding: 24 }}>{errorMessage(qrs.error)}</p>;
  if (!qrs.isSuccess) return <p style={{ padding: 24 }}>불러오는 중…</p>;
  if (list.length === 0) return <p style={{ padding: 24 }}>인쇄할 QR 이 없습니다.</p>;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        body { background: #fff !important; }
        .sheet { width: 210mm; height: 297mm; box-sizing: border-box; padding: 24mm 20mm; display: flex; flex-direction: column;
                 align-items: center; text-align: center; page-break-after: always; break-after: page; color: #1B2559; }
        .sheet:last-child { page-break-after: auto; break-after: auto; }
        .brand { font-size: 14pt; font-weight: 800; letter-spacing: -0.3px; }
        .brand span { color: #FF6B4A; }
        .inst { margin-top: 10mm; font-size: 30pt; font-weight: 800; }
        .place { margin-top: 3mm; font-size: 18pt; color: #5B6385; }
        .qr { margin-top: 12mm; padding: 6mm; border: 1.5mm solid #1B2559; border-radius: 6mm; }
        .title { margin-top: 12mm; font-size: 26pt; font-weight: 800; }
        .steps { margin-top: 6mm; font-size: 14pt; line-height: 1.8; color: #333; }
        .foot { margin-top: auto; font-size: 10pt; color: #9AA0B8; }
        @media screen { body { background: #EEE !important; } .sheet { background: #fff; margin: 12px auto; box-shadow: 0 1px 6px rgba(0,0,0,.15); } }
      `}</style>
      {list.map((q) => (
        <section key={q.id} className="sheet">
          <div className="brand">
            똑똑<span>.</span> 출석
          </div>
          <div className="inst">{session?.institution?.institutionName}</div>
          <div className="place">{q.name}</div>
          <div className="qr">
            <QrImage value={q.content} size={420} />
          </div>
          <div className="title">학생앱으로 찍어 주세요</div>
          <div className="steps">
            똑똑 학생앱 → <b>QR 출석</b> → 이 QR 을 비추면
            <br />
            도착·출발이 부모님께 바로 알림으로 갑니다
          </div>
          <div className="foot">
            휴대폰 기본 카메라로는 출석되지 않습니다 · QR 을 촬영해 공유하면 출석이 막힐 수 있습니다
          </div>
        </section>
      ))}
    </>
  );
}
