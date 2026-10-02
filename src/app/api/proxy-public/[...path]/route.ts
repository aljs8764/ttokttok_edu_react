import { NextResponse, type NextRequest } from 'next/server';
import { BACKEND_URL } from '@/lib/server/session';

/**
 * 로그인 없이 부르는 공개 API 만 통과 (임시 비밀번호·교직원 초대 수락 등).
 * 허용 목록 밖은 404 — 인증이 필요한 API 는 /api/proxy 로만.
 */
const ALLOWED: { method: string; pattern: RegExp }[] = [
  { method: 'POST', pattern: /^auth\/password\/temp$/ },
  { method: 'GET', pattern: /^staff-invitations\/[^/]+$/ },
  { method: 'GET', pattern: /^terms$/ },
];

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const joined = path.join('/');
  if (!ALLOWED.some((a) => a.method === req.method && a.pattern.test(joined))) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '없는 경로입니다' }, { status: 404 });
  }
  const headers = new Headers({ 'Content-Type': req.headers.get('content-type') ?? 'application/json' });
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) headers.set('X-Forwarded-For', fwd);
  const res = await fetch(`${BACKEND_URL}/api/v1/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`, {
    method: req.method,
    headers,
    body: req.method === 'GET' ? undefined : await req.arrayBuffer(),
    cache: 'no-store',
  }).catch(() => null);
  if (!res) return NextResponse.json({ code: 'BACKEND_UNAVAILABLE', message: '서버에 연결할 수 없습니다' }, { status: 502 });
  return new NextResponse(res.status === 204 || res.status === 202 ? null : res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export const GET = handle;
export const POST = handle;
