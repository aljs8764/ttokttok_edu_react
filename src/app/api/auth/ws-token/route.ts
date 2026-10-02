import { NextResponse } from 'next/server';
import { clearSession, readSession, refreshTokens, writeTokens } from '@/lib/server/session';

/**
 * STOMP CONNECT 용 access 토큰. 브라우저가 백엔드 /ws 에 직접 붙어야 해서 이 경우만 토큰을 JS 에 준다.
 * access 는 15분짜리라 노출 범위가 좁고, 재연결 때마다 새로 받는다.
 */
export async function GET() {
  const s = await readSession();
  if (s.accessToken) return NextResponse.json({ token: s.accessToken });
  if (!s.refreshToken) return NextResponse.json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' }, { status: 401 });

  const tokens = await refreshTokens(s.refreshToken);
  if (!tokens) {
    const res = NextResponse.json({ code: 'UNAUTHENTICATED', message: '세션이 만료되었습니다' }, { status: 401 });
    clearSession(res);
    return res;
  }
  const res = NextResponse.json({ token: tokens.accessToken });
  writeTokens(res, tokens, s.rememberMe);
  return res;
}
