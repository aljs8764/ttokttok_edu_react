import { NextResponse } from 'next/server';
import { BACKEND_URL, languageOf } from '@/lib/server/session';
import { finishLogin } from '@/lib/server/finishLogin';

/** AUTH-001 관리자 로그인 → httpOnly 쿠키. 2단계 인증(AUTH-007)을 켠 계정은 { otpRequired, challengeId } 만 돌려준다 */
export async function POST(req: Request) {
  const { loginId, password, rememberMe } = (await req.json()) as { loginId: string; password: string; rememberMe?: boolean };

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept-Language': languageOf(req) };
  // 백엔드 로그인 Rate limit 이 사용자 IP 기준으로 동작하도록 전달
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) headers['X-Forwarded-For'] = forwarded;

  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ loginId, password, rememberMe: !!rememberMe }),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ code: 'BACKEND_UNAVAILABLE', message: '서버에 연결할 수 없습니다' }, { status: 502 });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: 'LOGIN_FAILED', message: '로그인에 실패했습니다' }));
    return NextResponse.json(body, { status: res.status });
  }
  if (res.status === 202) {
    const body = (await res.json()) as { challengeId: string; expiresAt: string };
    return NextResponse.json({ otpRequired: true, challengeId: body.challengeId, expiresAt: body.expiresAt });
  }
  return finishLogin(await res.json(), !!rememberMe);
}
