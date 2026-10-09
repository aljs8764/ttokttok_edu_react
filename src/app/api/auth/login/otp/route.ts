import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/server/session';
import { finishLogin } from '@/lib/server/finishLogin';

/** AUTH-007 로그인 2단계 — 인증 앱 6자리 또는 복구 코드 */
export async function POST(req: Request) {
  const { challengeId, code, rememberMe } = (await req.json()) as { challengeId: string; code: string; rememberMe?: boolean };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) headers['X-Forwarded-For'] = forwarded;

  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login/otp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ challengeId, code }),
    cache: 'no-store',
  }).catch(() => null);
  if (!res) return NextResponse.json({ code: 'BACKEND_UNAVAILABLE', message: '서버에 연결할 수 없습니다' }, { status: 502 });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: 'OTP_FAILED', message: '인증에 실패했습니다' }));
    return NextResponse.json(body, { status: res.status });
  }
  return finishLogin(await res.json(), !!rememberMe);
}
