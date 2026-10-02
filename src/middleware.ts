import { NextResponse, type NextRequest } from 'next/server';

/** 로그인 안 된 상태로 관리자 화면에 들어오면 /login 으로 (API·정적 파일 제외) */
export function middleware(req: NextRequest) {
  const hasSession = !!req.cookies.get('ttok_rt')?.value;
  const { pathname, search } = req.nextUrl;

  if (pathname === '/login') {
    // 이미 로그인했고 기관도 골랐으면 대시보드로
    if (hasSession && req.cookies.get('ttok_inst')?.value) return NextResponse.redirect(new URL('/dashboard', req.url));
    return NextResponse.next();
  }
  if (!hasSession) {
    const url = new URL('/login', req.url);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (!req.cookies.get('ttok_inst')?.value) return NextResponse.redirect(new URL('/login?step=institution', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg)$).*)'],
};
