import { NextResponse } from 'next/server';
import { BACKEND_URL, staffMemberships, writeInstitution, writeTokens, type Tokens } from '@/lib/server/session';

/**
 * STF-002 교직원 초대 수락 (공개). 백엔드가 바로 로그인 토큰을 주므로 로그인과 똑같이 httpOnly 쿠키로 심는다.
 * 기관은 초대한 기관으로 선택해 둔다 (기존 계정이 다른 기관에도 소속된 경우 포함).
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { password, institutionName } = (await req.json()) as { password: string; institutionName?: string };

  const res = await fetch(`${BACKEND_URL}/api/v1/staff-invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  }).catch(() => null);

  if (!res) return NextResponse.json({ code: 'BACKEND_UNAVAILABLE', message: '서버에 연결할 수 없습니다' }, { status: 502 });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: 'ACCEPT_FAILED', message: '초대를 수락하지 못했습니다' }));
    return NextResponse.json(body, { status: res.status });
  }

  const tokens = (await res.json()) as Tokens;
  const staff = staffMemberships(tokens.user);
  const invited = staff.find((m) => m.institutionName === institutionName) ?? (staff.length === 1 ? staff[0] : undefined);

  const out = NextResponse.json({ needsInstitution: !invited });
  writeTokens(out, tokens, false);
  if (invited) writeInstitution(out, invited.institutionId, false);
  return out;
}
