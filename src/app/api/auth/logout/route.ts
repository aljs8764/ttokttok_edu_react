import { NextResponse } from 'next/server';
import { BACKEND_URL, clearSession, readSession } from '@/lib/server/session';

/** 이 기기 로그아웃 — 백엔드 refresh 폐기 후 쿠키 삭제 */
export async function POST() {
  const { refreshToken } = await readSession();
  if (refreshToken) {
    await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined);
  }
  const res = new NextResponse(null, { status: 204 });
  clearSession(res);
  return res;
}
