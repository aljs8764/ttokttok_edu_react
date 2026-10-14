'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useT } from '@/lib/i18n';
import { color } from '@/theme/tokens';

/**
 * QR 이미지 (SVG). 인쇄해도 깨지지 않도록 벡터로 그리고, 오류 정정은 M(15%) —
 * 코팅·테이프 자국 정도는 견딘다.
 */
export default function QrImage({ value, size = 200 }: { value: string; size?: number }) {
  const t = useT();
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: 'svg', width: size, errorCorrectionLevel: 'M', margin: 1, color: { dark: color.primary, light: '#FFFFFF' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [value, size]);

  return <div style={{ width: size, height: size, lineHeight: 0 }} aria-label={t('출석 QR 코드')} dangerouslySetInnerHTML={{ __html: svg }} />;
}
