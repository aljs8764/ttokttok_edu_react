import { NextResponse } from 'next/server';
import { BACKEND_URL, languageOf } from '@/lib/server/session';
import { finishLogin } from '@/lib/server/finishLogin';

/** SAAS-001 원장 가입 (공개): 기관 + 원장 계정을 만들고, 백엔드가 준 토큰으로 로그인과 똑같이 httpOnly 쿠키를 심는다 */
export async function POST(req: Request) {
  const { institutionName, type, ownerName, email, password } = (await req.json()) as {
    institutionName: string; type: string; ownerName: string; email: string; password: string;
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept-Language': languageOf(req) };
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) headers['X-Forwarded-For'] = forwarded;

  const res = await fetch(`${BACKEND_URL}/api/v1/auth/institutions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ institutionName, type, ownerName, email, password }),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ code: 'BACKEND_UNAVAILABLE', message: '서버에 연결할 수 없습니다' }, { status: 502 });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: 'SIGNUP_FAILED', message: '가입하지 못했습니다' }));
    return NextResponse.json(body, { status: res.status });
  }
  return finishLogin(await res.json(), false);
}
