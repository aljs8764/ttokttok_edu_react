'use client';

import type { ReactNode } from 'react';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

/**
 * 세그먼트 탭 — 회색 트랙(#F1F3F9) 안의 흰 pill. 모양은 테마(MuiTabs·MuiTab)가 정하고,
 * 이 컴포넌트는 항목 배열로 간단히 쓰기 위한 래퍼다.
 */
export default function SegmentTabs<T extends string | number>({ value, onChange, items, ariaLabel, sx }: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode; disabled?: boolean }[];
  ariaLabel?: string;
  sx?: object;
}) {
  return (
    <Tabs
      value={value}
      onChange={(_, v: T) => onChange(v)}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      aria-label={ariaLabel}
      sx={sx}
    >
      {items.map((i) => (
        <Tab key={String(i.value)} value={i.value} label={i.label} disabled={i.disabled} />
      ))}
    </Tabs>
  );
}
