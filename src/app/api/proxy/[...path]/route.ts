import { NextResponse, type NextRequest } from 'next/server';
import { BACKEND_URL, clearSession, readSession, refreshTokens, writeTokens, type Tokens } from '@/lib/server/session';

/**
 * 백엔드 프록시: /api/proxy/<path> → BACKEND_URL/api/v1/<path>
 * - Authorization: 쿠키의 access (없거나 401 이면 refresh 로 갱신 후 1회 재시도)
 * - X-Institution-Id: 선택된 기관
 * - 응답 본문은 그대로 흘려보낸다 (엑셀 다운로드 포함)
 */
const PASS_REQUEST_HEADERS = ['content-type', 'accept', 'idempotency-key'];
const PASS_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'retry-after'];

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const s = await readSession();
  if (!s.refreshToken) return unauthorized();

  const url = `${BACKEND_URL}/api/v1/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();

  const send = (access: string) => {
    const headers = new Headers();
    PASS_REQUEST_HEADERS.forEach((h) => {
      const v = req.headers.get(h);
      if (v) headers.set(h, v);
    });
    headers.set('Authorization', `Bearer ${access}`);
    if (s.institutionId) headers.set('X-Institution-Id', s.institutionId);
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) headers.set('X-Forwarded-For', fwd);
    return fetch(url, { method: req.method, headers, body, cache: 'no-store', redirect: 'manual' });
  };

  let refreshed: Tokens | null = null;
  let access = s.accessToken;
  if (!access) {
    refreshed = await refreshTokens(s.refreshToken);
    if (!refreshed) return unauthorized(true);
    access = refreshed.accessToken;
  }

  let res: Response;
  try {
    res = await send(access);
    if (res.status === 401 && !refreshed) {
      refreshed = await refreshTokens(s.refreshToken);
      if (!refreshed) return unauthorized(true);
      res = await send(refreshed.accessToken);
    }
  } catch {
    return NextResponse.json({ code: 'BACKEND_UNAVAILABLE', message: '서버에 연결할 수 없습니다' }, { status: 502 });
  }

  const headers = new Headers();
  PASS_RESPONSE_HEADERS.forEach((h) => {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  });
  const out = new NextResponse(res.status === 204 ? null : res.body, { status: res.status, headers });
  if (refreshed) writeTokens(out, refreshed, s.rememberMe);
  return out;
}

function unauthorized(clear = false) {
  const res = NextResponse.json({ code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' }, { status: 401 });
  if (clear) clearSession(res);
  return res;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
