# 똑똑(Ttok-Ttok) 관리자 웹

원장·실장·교사가 쓰는 운영 관리자 웹 (IA 관리자 Web 영역). 백엔드는 `ttokttok_edu_backend`.

Next.js 15 (App Router) · React 19 · MUI 7 · TanStack Query 5 · STOMP(@stomp/stompjs)

## 실행

```bash
cp .env.example .env.local      # BACKEND_URL, NEXT_PUBLIC_WS_URL
npm install
npm run dev                     # http://localhost:3000
```

백엔드(`:8080`)와 PostgreSQL 이 떠 있어야 한다. 교직원 초대 메일 링크가 이 웹으로 오도록 백엔드에 `STAFF_INVITE_BASE_URL=http://localhost:3000/invite/` 를 준다. 원장 계정은 백엔드 `POST /api/v1/auth/institutions` 로 만든다.

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
      classes/             CLS-001 반 목록·생성·수정 · CLS-002 삭제 · STF-003 담당 교사 배정
      staff/               STF-001 교직원 목록·직접 등록 · STF-002 이메일 초대·초대 내역
      notices/             NTC-004 발송 이력 · new/ NTC-001 작성(예약·첨부) · [id]/ NTC-005 수신 확인·NTC-006 미열람 재발송 · [id]/edit 예약 수정
      events/              EVT-001 행사 목록·만들기(RSVP) · [id]/ EVT-003 응답 집계·명단 엑셀 · EVT-004 독촉
      qr-codes/            QR-001 출석 QR 만들기·재발급·삭제·인쇄 · QR-002 기관 위치(지오펜스) · 최근 스캔 실패
      settings/            ?tab= 기관 정보 SET-001(로고·직인) · 하원 목적지 SET-002 · 약관 SET-005 · 감사 로그 SEC-002(원장) · 내 계정
    invite/[token]         STF-002 초대 수락 (로그인 전 공개 화면)
    print/qr?ids=          출석 QR A4 인쇄 화면 (사이드바 없이, 열리면 인쇄 창)
    api/
      auth/login|logout|session|ws-token        BFF 인증
      auth/staff-invitations/[token]/accept     초대 수락 → 로그인 쿠키
      proxy/[...path]      → BACKEND_URL/api/v1/** (인증 필요 API)
      proxy-public/[...path]  공개 API 허용 목록 (임시 비밀번호 등)
  components/              AdminShell, PageHeader, StatusChip, TargetPicker(발송 대상), AttachmentField(S3 직접 업로드), TermsGate(약관 재동의) …
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
알림장·행사 화면의 교사는 개인 큐 `/user/queue/events`(본인이 쓴 알림장·행사의 notice.read·notice.sent·event.responded)를 구독하고, 30초 폴링은 2분 안전망으로만 남긴다. 원장·실장은 기관 토픽만 구독한다(개인 큐도 받으므로 둘 다 구독하면 중복).

## 디자인

어드민 기획서 가이드: Primary `#1B2559`, Accent `#FF6B4A`, Surface `#F6F7FB`, 라운드 8px·그림자 최소,
상태 색 고정(등원/성공=그린, 결석=레드, 지각=앰버). 화면 제목 옆에 IA 메뉴ID 를 표시한다. 폰트는 Pretendard(CDN).

## 학생 QR 출석 (스펙 7-7)

`qrcode` 패키지로 QR 을 SVG 로 그린다 (인쇄해도 선명). 새 의존성이므로 `npm install` 을 다시 한 번 실행한다.
학생은 학생앱으로 찍고, 대시보드 타임라인에는 출처가 "학생 QR" 로 보인다.

## 다음 단계

관리자 웹 IA 화면은 모두 들어갔다. 남은 일: `npm run build` 로 타입·빌드 검증, 실제 백엔드와 연동 점검(응답 필드명·권한), 통계(STAT) 화면은 Phase 2.
