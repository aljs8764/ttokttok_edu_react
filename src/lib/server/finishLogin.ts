import 'server-only';
import { NextResponse } from 'next/server';
import { staffMemberships, writeInstitution, writeTokens, type Tokens } from '@/lib/server/session';

/** 로그인(비밀번호 또는 OTP 2단계) 성공 후 공통: 교직원 확인 → 쿠키 → 기관 선택 여부 */
export function finishLogin(tokens: Tokens, rememberMe: boolean) {
  const staff = staffMemberships(tokens.user);
  if (staff.length === 0) {
    return NextResponse.json({ code: 'NOT_STAFF', message: '관리자·교직원 계정이 아닙니다. 학부모는 앱을 이용해 주세요' }, { status: 403 });
  }
  const out = NextResponse.json({
    user: { ...tokens.user, memberships: staff },
    // 소속이 하나면 바로 선택, 여럿이면 화면에서 고른다
    needsInstitution: staff.length > 1,
  });
  writeTokens(out, tokens, rememberMe);
  if (staff.length === 1) writeInstitution(out, staff[0].institutionId, rememberMe);
  return out;
}
