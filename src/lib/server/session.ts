import 'server-only';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { Membership, SessionUser } from '@/lib/types';

/**
 * BFF 세션 (스펙 3장: 웹은 httpOnly·Secure·SameSite=Lax 쿠키).
 * 브라우저 JS 는 토큰을 볼 수 없고, 모든 API 호출은 /api/proxy 를 거쳐 Next 서버가 Authorization 을 붙인다.
 */

export const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:8080').replace(/\/$/, '');

const SECURE = process.env.COOKIE_SECURE === 'true';

export const COOKIE = {
  access: 'ttok_at',
  refresh: 'ttok_rt',
  rememberMe: 'ttok_rm',
  user: 'ttok_user',
  institution: 'ttok_inst',
} as const;

const DAY = 24 * 60 * 60;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  user: SessionUser;
}

/** 관리자 웹은 교직원 소속만 다룬다 (학부모 역할 제외) */
export function staffMemberships(user: SessionUser): Membership[] {
  return user.memberships.filter((m) => m.role !== 'PARENT');
}

function base(maxAge: number) {
  return { httpOnly: true, secure: SECURE, sameSite: 'lax' as const, path: '/', maxAge };
}

/** 로그인·갱신 결과를 쿠키로 심는다. access 는 만료 시각까지만 살아 있어 없으면 곧 갱신 신호가 된다 */
export function writeTokens(res: NextResponse, tokens: Tokens, rememberMe: boolean) {
  const accessAge = Math.max(30, Math.floor((Date.parse(tokens.accessExpiresAt) - Date.now()) / 1000) - 30);
  const refreshAge = (rememberMe ? 30 : 14) * DAY;
  res.cookies.set(COOKIE.access, tokens.accessToken, base(accessAge));
  res.cookies.set(COOKIE.refresh, tokens.refreshToken, base(refreshAge));
  res.cookies.set(COOKIE.rememberMe, rememberMe ? '1' : '0', base(refreshAge));
  const user: SessionUser = { ...tokens.user, memberships: staffMemberships(tokens.user) };
  res.cookies.set(COOKIE.user, Buffer.from(JSON.stringify(user), 'utf8').toString('base64url'), base(refreshAge));
}

export function writeInstitution(res: NextResponse, institutionId: string, rememberMe: boolean) {
  res.cookies.set(COOKIE.institution, institutionId, base((rememberMe ? 30 : 14) * DAY));
}

export function clearSession(res: NextResponse) {
  Object.values(COOKIE).forEach((name) => res.cookies.set(name, '', { ...base(0), maxAge: 0 }));
}

export async function readSession() {
  const jar = await cookies();
  const rawUser = jar.get(COOKIE.user)?.value;
  let user: SessionUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(Buffer.from(rawUser, 'base64url').toString('utf8')) as SessionUser;
    } catch {
      user = null;
    }
  }
  return {
    accessToken: jar.get(COOKIE.access)?.value ?? null,
    refreshToken: jar.get(COOKIE.refresh)?.value ?? null,
    rememberMe: jar.get(COOKIE.rememberMe)?.value === '1',
    institutionId: jar.get(COOKIE.institution)?.value ?? null,
    user,
  };
}

// ───────── refresh 회전 (중복 갱신 방지) ─────────

/**
 * 백엔드는 refresh 를 쓸 때마다 회전하고, 이미 쓴 refresh 가 다시 오면 탈취로 보고 로그인 계열 전체를 폐기한다.
 * 페이지 하나가 API 여러 개를 동시에 부르면 같은 refresh 로 갱신이 겹치므로,
 * 같은 refresh 에 대한 갱신은 하나로 묶고 결과를 잠시 보관해 뒤늦은 요청도 새 토큰을 받게 한다.
 * (Next 서버 프로세스 단위. 여러 대로 늘리면 백엔드에 짧은 재사용 허용 구간을 두는 방식으로 보완)
 */
const inflight = new Map<string, Promise<Tokens | null>>();
const recent = new Map<string, { tokens: Tokens; at: number }>();
const RECENT_TTL_MS = 30_000;

export async function refreshTokens(refreshToken: string): Promise<Tokens | null> {
  const cached = recent.get(refreshToken);
  if (cached && Date.now() - cached.at < RECENT_TTL_MS) return cached.tokens;
  const running = inflight.get(refreshToken);
  if (running) return running;

  const task = (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const tokens = (await res.json()) as Tokens;
      recent.set(refreshToken, { tokens, at: Date.now() });
      return tokens;
    } catch {
      return null;
    } finally {
      inflight.delete(refreshToken);
      for (const [k, v] of recent) if (Date.now() - v.at > RECENT_TTL_MS) recent.delete(k);
    }
  })();
  inflight.set(refreshToken, task);
  return task;
}
