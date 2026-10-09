'use client';

import { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { logout, useSession } from '@/lib/session';

const KEY = 'ttok.lastActivity';
const WARN_SECONDS = 60;
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

function readLast(): number {
  try {
    return Number(localStorage.getItem(KEY)) || Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * AUTH-010 관리자 웹 장시간 미사용 자동 로그아웃.
 * 화면의 자동 갱신(폴링)은 활동으로 치지 않고, 마우스·키보드·스크롤만 센다.
 * 같은 브라우저의 다른 탭과 마지막 활동 시각을 localStorage 로 공유한다(한 탭이라도 쓰고 있으면 유지).
 */
export default function IdleLogout() {
  const { session } = useSession();
  const instId = session?.institution?.institutionId;
  const policy = useQuery({
    queryKey: ['session-policy', instId],
    queryFn: () => api.get<{ idleMinutes: number }>('institution/session-policy'),
    enabled: !!instId,
    staleTime: 10 * 60_000,
  });
  const minutes = policy.data?.idleMinutes ?? 0;
  const [remaining, setRemaining] = useState<number | null>(null);
  const lastWrite = useRef(0);

  useEffect(() => {
    if (!minutes) return;
    const latest = { current: Date.now() };
    const touch = () => {
      const now = Date.now();
      if (now - lastWrite.current < 5000) return; // 5초에 한 번만 기록
      lastWrite.current = now;
      try {
        localStorage.setItem(KEY, String(now));
      } catch {
        /* 저장소를 못 쓰면 탭 단위로만 */
      }
      latest.current = now;
    };
    touch();
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      const last = Math.max(latest.current, readLast());
      const left = Math.round((last + minutes * 60_000 - Date.now()) / 1000);
      if (left <= 0) {
        window.clearInterval(timer);
        void logout();
      } else {
        setRemaining(left <= WARN_SECONDS ? left : null);
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [minutes]);

  if (remaining == null) return null;
  return (
    <Dialog open maxWidth="xs" fullWidth>
      <DialogTitle>곧 자동 로그아웃됩니다</DialogTitle>
      <DialogContent>
        <Typography>{minutes}분 동안 사용하지 않아 {remaining}초 뒤 로그아웃합니다. 계속 쓰시려면 아래 버튼을 누르세요.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void logout()}>지금 로그아웃</Button>
        <Button
          variant="contained"
          onClick={() => {
            try {
              localStorage.setItem(KEY, String(Date.now()));
            } catch {
              /* 무시 */
            }
            setRemaining(null);
          }}
        >
          계속 사용
        </Button>
      </DialogActions>
    </Dialog>
  );
}
