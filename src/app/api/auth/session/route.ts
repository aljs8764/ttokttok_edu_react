import { NextResponse } from 'next/server';
import { readSession, writeInstitution } from '@/lib/server/session';

/** 현재 사용자·선택된 기관 */
export async function GET() {
  const s = await readSession();
  if (!s.refreshToken || !s.user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' }, { status: 401 });
  const institution = s.user.memberships.find((m) => m.institutionId === s.institutionId) ?? null;
  return NextResponse.json({ user: s.user, institution });
}

/** 기관 전환 (여러 기관 소속 교직원) */
export async function PUT(req: Request) {
  const s = await readSession();
  if (!s.refreshToken || !s.user) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' }, { status: 401 });
  const { institutionId } = (await req.json()) as { institutionId: string };
  const membership = s.user.memberships.find((m) => m.institutionId === institutionId);
  if (!membership) return NextResponse.json({ code: 'FORBIDDEN', message: '소속되지 않은 기관입니다' }, { status: 403 });
  const res = NextResponse.json({ user: s.user, institution: membership });
  writeInstitution(res, institutionId, s.rememberMe);
  return res;
}
