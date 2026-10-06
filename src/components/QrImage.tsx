'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QR 이미지 (SVG). 인쇄해도 깨지지 않도록 벡터로 그리고, 오류 정정은 M(15%) —
 * 코팅·테이프 자국 정도는 견딘다.
 */
export default function QrImage({ value, size = 200 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: 'svg', width: size, errorCorrectionLevel: 'M', margin: 1, color: { dark: '#1B2559', light: '#FFFFFF' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [value, size]);

  return <div style={{ width: size, height: size, lineHeight: 0 }} aria-label="출석 QR 코드" dangerouslySetInnerHTML={{ __html: svg }} />;
}
