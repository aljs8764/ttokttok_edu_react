'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

/** 외부 차트 라이브러리 없이 쓰는 가벼운 SVG 차트 모음 (통계 화면·대시보드 위젯 공용) */

export interface Series {
  name: string;
  color: string;
  values: (number | null)[];
}

const W = 640;
const H = 220;
const PAD = { l: 40, r: 12, t: 12, b: 28 };

/** 꺾은선 — labels 는 x축, values 는 같은 길이. yMax 를 주면 고정 (비율 차트는 1) */
export function LineChart({ labels, series, yMax, percent, height = H }: { labels: string[]; series: Series[]; yMax?: number; percent?: boolean; height?: number }) {
  const theme = useTheme();
  const [hover, setHover] = useState<number | null>(null);
  const max = yMax ?? Math.max(1, ...series.flatMap((s) => s.values.map((v) => v ?? 0)));
  const n = labels.length;
  const x = (i: number) => PAD.l + (n <= 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (n - 1));
  const y = (v: number) => PAD.t + (1 - v / max) * (height - PAD.t - PAD.b);
  const fmt = (v: number) => (percent ? `${Math.round(v * 100)}%` : String(Math.round(v)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const step = Math.max(1, Math.ceil(n / 8));

  return (
    <Box sx={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={theme.palette.divider} />
            <text x={PAD.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={theme.palette.text.secondary}>
              {fmt(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % step === 0 ? (
            <text key={i} x={x(i)} y={height - 8} fontSize="11" textAnchor="middle" fill={theme.palette.text.secondary}>
              {l}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          // null 은 선을 끊는다
          const segs: string[] = [];
          let cur = '';
          s.values.forEach((v, i) => {
            if (v === null) {
              if (cur) segs.push(cur);
              cur = '';
            } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
          });
          if (cur) segs.push(cur);
          return (
            <g key={s.name}>
              {segs.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              ))}
              {n <= 40 && s.values.map((v, i) => (v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={s.color} />))}
            </g>
          );
        })}
        {labels.map((_, i) => (
          <rect key={i} x={x(i) - (W - PAD.l - PAD.r) / Math.max(1, n - 1) / 2} y={PAD.t} width={(W - PAD.l - PAD.r) / Math.max(1, n - 1)} height={height - PAD.t - PAD.b} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={height - PAD.b} stroke={theme.palette.text.disabled} strokeDasharray="3 3" />}
      </svg>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', minHeight: 22, alignItems: 'center' }}>
        {series.map((s) => (
          <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: s.color }} />
            <Typography variant="caption" color="text.secondary">
              {s.name}
              {hover !== null && s.values[hover] !== null && s.values[hover] !== undefined ? ` ${fmt(s.values[hover] as number)}` : ''}
            </Typography>
          </Box>
        ))}
        {hover !== null && (
          <Typography variant="caption" sx={{ ml: 'auto' }}>
            {labels[hover]}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/** 묶음 막대 — 월별 신규/퇴원, 시간대별 등·하원 */
export function BarChart({ labels, series, height = H }: { labels: string[]; series: Series[]; height?: number }) {
  const theme = useTheme();
  const max = Math.max(1, ...series.flatMap((s) => s.values.map((v) => v ?? 0)));
  const n = labels.length;
  const group = (W - PAD.l - PAD.r) / Math.max(1, n);
  const bw = Math.min(22, (group * 0.8) / series.length);
  const y = (v: number) => PAD.t + (1 - v / max) * (height - PAD.t - PAD.b);
  const step = Math.max(1, Math.ceil(n / 12));
  return (
    <Box sx={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t * max)} y2={y(t * max)} stroke={theme.palette.divider} />
            <text x={PAD.l - 6} y={y(t * max) + 4} fontSize="11" textAnchor="end" fill={theme.palette.text.secondary}>
              {Math.round(t * max)}
            </text>
          </g>
        ))}
        {labels.map((l, i) => {
          const cx = PAD.l + group * i + group / 2;
          return (
            <g key={i}>
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                const bx = cx - (bw * series.length) / 2 + si * bw;
                return (
                  <rect key={s.name} x={bx} y={y(v)} width={bw - 1} height={Math.max(0, height - PAD.b - y(v))} fill={s.color} rx="2">
                    <title>{`${l} ${s.name} ${v}`}</title>
                  </rect>
                );
              })}
              {i % step === 0 && (
                <text x={cx} y={height - 8} fontSize="11" textAnchor="middle" fill={theme.palette.text.secondary}>
                  {l}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {series.map((s) => (
          <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: s.color }} />
            <Typography variant="caption" color="text.secondary">
              {s.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** 도넛 — 재원 상태 비율, 학년 분포 */
export function Donut({ slices, size = 160 }: { slices: { label: string; value: number; color: string }[]; size?: number }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 160 160" width={size} height={size} role="img">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#eef0f6" strokeWidth="22" />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle key={s.label} cx="80" cy="80" r={r} fill="none" stroke={s.color} strokeWidth="22" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)">
                <title>{`${s.label} ${s.value}명`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        <text x="80" y="86" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">
          {total}
        </text>
      </svg>
      <Box>
        {slices.map((s) => (
          <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: s.color }} />
            <Typography variant="body2">
              {s.label} {s.value}명{total > 0 ? ` (${Math.round((s.value / total) * 100)}%)` : ''}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** 요일×시간 히트맵. value(weekday, hour) → 0 이상 숫자 */
export function Heatmap({ weekdays, hours, value, color = '27,37,89' }: { weekdays: string[]; hours: number[]; value: (weekday: number, hour: number) => number; color?: string }) {
  let max = 0;
  weekdays.forEach((_, wi) => hours.forEach((h) => (max = Math.max(max, value(wi + 1, h)))));
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: `36px repeat(${hours.length}, minmax(28px, 1fr))`, gap: '2px', minWidth: 36 + hours.length * 30 }}>
        <Box />
        {hours.map((h) => (
          <Typography key={h} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            {h}
          </Typography>
        ))}
        {weekdays.map((w, wi) => (
          <Box key={w} sx={{ display: 'contents' }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: '28px' }}>
              {w}
            </Typography>
            {hours.map((h) => {
              const v = value(wi + 1, h);
              const a = max > 0 ? v / max : 0;
              return (
                <Box
                  key={h}
                  title={`${w} ${h}시 ${v}`}
                  sx={{ height: 28, borderRadius: '3px', bgcolor: a === 0 ? 'action.hover' : `rgba(${color},${0.12 + a * 0.88})`, color: a > 0.55 ? '#fff' : 'text.secondary', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {v > 0 ? Math.round(v * 10) / 10 : ''}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
