import { NextResponse } from 'next/server';
import { readSession, refreshTokens, writeInstitution, writeTokens } from '@/lib/server/session';

/** 현재 사용자·선택된 기관 */
export async function GET() {
  const s = await readSession();
  if (!s.refreshToken || !s.user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' }, { status: 401 });
  const institution = s.user.memberships.find((m) => m.institutionId === s.institutionId) ?? null;
  return NextResponse.json({ user: s.user, institution });
}

/** 기관 전환 (여러 기관 소속 교직원). 방금 생긴 소속(체험 기관 ONB-003 등)은 토큰을 갱신해 다시 확인한다 */
export async function PUT(req: Request) {
  const s = await readSession();
  if (!s.refreshToken || !s.user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' }, { status: 401 });
  const { institutionId, refresh } = (await req.json()) as { institutionId: string; refresh?: boolean };
  let user = s.user;
  let refreshed: Awaited<ReturnType<typeof refreshTokens>> = null;
  if (refresh || !user.memberships.some((m) => m.institutionId === institutionId)) {
    refreshed = await refreshTokens(s.refreshToken);
    if (refreshed) user = { ...refreshed.user, memberships: refreshed.user.memberships.filter((m) => m.role !== 'PARENT') };
  }
  const membership = user.memberships.find((m) => m.institutionId === institutionId);
  if (!membership) return NextResponse.json({ code: 'FORBIDDEN', message: '소속되지 않은 기관입니다' }, { status: 403 });
  const res = NextResponse.json({ user, institution: membership });
  if (refreshed) writeTokens(res, refreshed, s.rememberMe);
  writeInstitution(res, institutionId, s.rememberMe);
  return res;
}
