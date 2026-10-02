import { NextResponse } from 'next/server';
import { BACKEND_URL, staffMemberships, writeInstitution, writeTokens, type Tokens } from '@/lib/server/session';

/** AUTH-001 관리자 로그인 → httpOnly 쿠키 */
export async function POST(req: Request) {
  const { loginId, password, rememberMe } = (await req.json()) as { loginId: string; password: string; rememberMe?: boolean };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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

  const tokens = (await res.json()) as Tokens;
  const staff = staffMemberships(tokens.user);
  if (staff.length === 0) {
    return NextResponse.json({ code: 'NOT_STAFF', message: '관리자·교직원 계정이 아닙니다. 학부모는 앱을 이용해 주세요' }, { status: 403 });
  }

  const out = NextResponse.json({
    user: { ...tokens.user, memberships: staff },
    // 소속이 하나면 바로 선택, 여럿이면 화면에서 고른다
    needsInstitution: staff.length > 1,
  });
  writeTokens(out, tokens, !!rememberMe);
  if (staff.length === 1) writeInstitution(out, staff[0].institutionId, !!rememberMe);
  return out;
}
