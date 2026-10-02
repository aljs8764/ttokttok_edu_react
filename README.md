# 똑똑(Ttok-Ttok) 관리자 웹

원장·실장·교사가 쓰는 운영 관리자 웹 (IA 관리자 Web 영역). 백엔드는 `ttokttok_edu_backend`.

Next.js 15 (App Router) · React 19 · MUI 7 · TanStack Query 5 · STOMP(@stomp/stompjs)

## 실행

```bash
cp .env.example .env.local      # BACKEND_URL, NEXT_PUBLIC_WS_URL
npm install
npm run dev                     # http://localhost:3000
```

백엔드(`:8080`)와 PostgreSQL 이 떠 있어야 한다. 원장 계정은 백엔드 `POST /api/v1/auth/institutions` 로 만든다.

## 구조

```
src/
  app/
    login/                 AUTH-001 로그인 (아이디 저장·자동 로그인·기관 선택) + AUTH-004 임시 비밀번호
    (admin)/               로그인 후 화면 — AdminShell(사이드바·기관 전환·계정 메뉴)
      dashboard/           DASH-001·002·003·005
      attendance/          ATT-001 데일리 리포트 + ATT-002 수동 변경
      attendance/monthly/  ATT-003 월간 출석부 + ATT-004 출석부 엑셀
      students/            STU-001 원생 목록 (등록 STU-003·초대 STU-005 다이얼로그)
      students/import/     STU-002 엑셀 일괄 등록
      students/join-requests/  STU-004 가입 승인
      students/[id]/       STU-006 상세 · STU-007 보호자 연결 해제 · STU-008 반 이동 · STU-012 휴원·퇴원
      classes|staff|notices|events|settings/   다음 단계 (API 목록만 표시)
    api/
      auth/login|logout|session|ws-token        BFF 인증
      proxy/[...path]      → BACKEND_URL/api/v1/** (인증 필요 API)
      proxy-public/[...path]  공개 API 허용 목록 (임시 비밀번호 등)
  components/              AdminShell, PageHeader, StatusChip, ChangeStatusDialog …
  lib/
    api.ts                 클라이언트 fetch 래퍼 (ApiError, 엑셀 다운로드)
    session.ts             세션·기관 전환·로그아웃 훅
    realtime.ts            STOMP 구독 훅
    server/session.ts      쿠키·refresh 회전 (서버 전용)
  middleware.ts            미로그인 → /login, 기관 미선택 → 기관 선택
```

## 인증 (BFF)

스펙 3장 "웹은 httpOnly·Secure·SameSite=Lax 쿠키"를 따른다.

- 로그인하면 Next 서버가 백엔드 토큰을 받아 httpOnly 쿠키(`ttok_at` access, `ttok_rt` refresh)로 심는다. 브라우저 JS 는 토큰을 모른다.
- 화면의 API 호출은 모두 `/api/proxy/*` → Next 서버가 `Authorization`·`X-Institution-Id` 를 붙여 백엔드로 보낸다.
- access 가 없거나 401 이면 refresh 로 갱신 후 1회 재시도. 백엔드는 refresh 를 회전하고 재사용을 탈취로 보므로,
  같은 refresh 의 동시 갱신은 서버에서 하나로 묶는다(30초 결과 캐시). Next 서버를 여러 대로 늘리면 백엔드에 짧은 재사용 허용 구간이 필요하다.
- 실시간(STOMP)만 브라우저가 백엔드 `/ws` 에 직접 붙으므로 `/api/auth/ws-token` 이 15분짜리 access 를 내준다.
- 학부모 계정은 로그인할 수 없다(교직원 소속만).

## 실시간

원장·실장은 `/topic/inst.{기관}`, 교사는 담당 반 `/topic/class.{반}` 을 구독한다(백엔드 구독 권한과 동일).
메시지는 "바뀌었다"는 신호로만 쓰고 데이터는 REST 로 다시 가져온다.

## 디자인

어드민 기획서 가이드: Primary `#1B2559`, Accent `#FF6B4A`, Surface `#F6F7FB`, 라운드 8px·그림자 최소,
상태 색 고정(등원/성공=그린, 결석=레드, 지각=앰버). 화면 제목 옆에 IA 메뉴ID 를 표시한다. 폰트는 Pretendard(CDN).

## 다음 단계

반·교직원 관리, 알림장 작성·수신확인, 행사 RSVP, 기관 설정.
