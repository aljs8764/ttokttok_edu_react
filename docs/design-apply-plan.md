# 관리자 웹 UI/UX 디자인 적용 — 계획·진행 상황

- 기준: 디자인 캔버스 「똑똑에듀 어드민 UI」(claude.ai artifact WunjbKrMXR92G8t1B1s2kG, 37 아트보드 = 35화면 + 사이드바 2종)
  - 색·간격·크기는 아트보드 inline style 값을 정답으로 삼았다.
  - `admin_ui_design_spec.md`·`ttokttok-admin-ui-final.html` 은 이 세션(클라우드)에서 열 수 없어, 같은 내용인 캔버스 원본 마크업을 기준으로 했다.
- 범위: **디자인만** 바꾼다. API 호출·쿼리 키·권한 로직·실시간 구독·라우트 경로·기존 기능은 그대로 둔다.
- 작업 기준 커밋: `de8f184` (P3-⑦ 익명 커뮤니티까지)

## 1. 화면 ↔ 기존 라우트 매핑

| 디자인 | 메뉴ID | 기존 라우트 (src/app) | 비고 |
|---|---|---|---|
| P1-01 로그인 | AUTH-001 | `/login` | 셸 없음. 2단 레이아웃(남색 소개 + 폼) |
| P1-02 대시보드 | DASH-001~023 | `/dashboard` (원장·실장 = 원장 대시보드, 교사 = 교사 대시보드, `?teacherId=`) | 역할별 구조·위젯 켜기/끄기·순서 유지, 시각만 |
| P1-03 원생 목록·상세 | STU-001·006 | `/students`, `/students/[id]` | |
| P1-04 원생 등록·가입 승인 | STU-002~005·012 | `/students` 등록 다이얼로그, `/students/join-requests`, `/students/import` | |
| P1-05 출결 관리 | ATT-001~004 | `/attendance`, `/attendance/monthly`, `/absence-requests` | |
| P1-06 반·교직원·권한 | CLS-001·002, STF-001~003 | `/classes`, `/staff` | |
| P1-07 알림장·발송 이력 | NTC-001·004~006 | `/notices`, `/notices/new`, `/notices/[id]`, `/notices/[id]/edit` | |
| P1-08 행사 RSVP | EVT-001·003·004 | `/events`, `/events/new`, `/events/[id]` | |
| P1-09 초기 설정 마법사 | ONB-001 | `/onboarding` | 셸 없음(라우트는 그대로, 셸이 경로로 판단) |
| P1-10 설정 | SET-001·002·005 | `/settings?tab=institution·destinations·terms·audit·account` | |
| P1-11 전체 공지 | NTC-009 | (별도 화면 없음) | 알림장 대상 '전체'로 처리 → 디자인 차이 표 |
| P2-01 통계·분석 | STAT-001~008 | `/stats`, `/print/stats` | 인쇄 화면은 인쇄용이라 셸·카드 스타일 미적용 |
| P2-02 수납 관리 | PAY-001~003 | `/invoices` | |
| P2-03 셔틀·자동출결 | ATT-007~009 | `/shuttle` | |
| P2-04 1:1 상담·회신 | NTC-007·008 | `/messages`, `/consults` | |
| P2-05 설문·템플릿 | NTC-010·003 | `/surveys`, `/surveys/new`, `/surveys/[id]`, `/notice-templates` | |
| P2-06 사진·영상 앨범 | NTC-011 | `/albums` | |
| P2-07 원생 상세 확장 | STU-009~011 | `/students/[id]` (StudentExtras) | |
| P2-08 시간표·대기자 | CLS-003·004 | `/timetable`, `/waitlist` | |
| P2-09 교사 근태 | STF-004 | `/staff-attendance` | |
| P2-10 행사 캘린더·템플릿 | EVT-002·006 | `/event-calendar`, `/event-templates` | |
| P2-11 구독·알림·보안 | SET-003·004, AUTH-007·010 | `/settings?tab=subscription·channels·security` | |
| P2-12 [운영사] 경영 지표 | SAAS-007 | `/platform?tab=metrics` | 운영사 사이드바(OpsSidebar) |
| P2-13 [운영사] 기관·구독 결제 | SAAS-001·002 | `/platform?tab=institutions·payments` | |
| P2-14 [운영사] 바우처 | SAAS-003 | `/platform?tab=vouchers` | |
| P2-15 [운영사] CS·공지/점검 | SAAS-004·005 | `/platform?tab=tickets·notices`, 기관 측 `/support` | |
| P3-01 미등원 초과 경고 | ATT-010 | `/settings?tab=missing`, 대시보드 위젯 | |
| P3-02 결제 고도화 | PAY-006·007 | `/invoices` (할인 규칙·환불 다이얼로그) | PAY-004·005(PG) 미구현 → 화면 안 만듦 |
| P3-03 교재·커리큘럼 | CLS-005 | `/classes` 교재·진도 다이얼로그 | |
| P3-04 교사 업무·열람률 | STF-005, STAT-007 | `/stats` 업무 탭 | |
| P3-05 행사 커머스·후기 | EVT-009 | `/events/[id]` 사진·후기 패널 | EVT-007·008(커머스) 미구현 → 화면 안 만듦 |
| P3-06 데이터·언어 | SET-006·007 | `/settings?tab=export`, 언어 전환 | NTC-012(번역 API) 미구현 → 화면 안 만듦 |
| P3-07~09 [운영사] 광고·커머스 | AD-001~005 | 없음 | 외부 결정 대기 → 화면·메뉴 안 만듦 |
| (디자인 없음) 사용량·이상 탐지 | SAAS-006 | `/platform?tab=usage` | 운영사 사이드바에 포함 |
| (디자인 없음) 익명 커뮤니티 | COM-001~009 | `/community`, `/platform?tab=community` | 토큰·공통 컴포넌트로 톤만 맞춤 |
| (디자인 없음) 출석 QR·문의·상담 예약·메시지함 | QR-001·002 등 | `/qr-codes`, `/support`, `/consults`, `/messages` | 사이드바 그룹에 같은 스타일로 넣음 |
| (디자인 없음) 초대 수락 | STF-003 | `/invite/[token]` | 셸 없음. 로그인과 같은 톤 |

## 2. 슬라이스

| # | 내용 | 상태 | 커밋 |
|---|---|---|---|
| ① | 디자인 토큰·MUI 테마·IBM Plex 폰트(next/font) | 완료 | 26ff092 |
| ② | 공통 컴포넌트 `src/components/ui/*` (StatusBadge·MenuIdChip·PageHeader·SectionCard·KpiCard·SegmentTabs·ProgressBar·EmptyState) | 완료 | (이 커밋) |
| ③ | 앱 셸 — 기관 사이드바·운영사 사이드바·모바일 Drawer, 로그인·온보딩·초대 셸 없음 | 대기 | |
| ④ | Phase 1 화면 (P1-01~11) | 대기 | |
| ⑤ | Phase 2 화면 (P2-01~15) | 대기 | |
| ⑥ | Phase 3 화면 + 하드코딩 색·폰트 정리 | 대기 | |

## 3. 위험 요소

- **빌드 미검증**: 이 작업 환경에서는 npm install·build 를 하지 않는다. 테마 override·타입 오류는 사용자 PC 빌드에서 확인해야 한다.
- **next/font/google**: 빌드 때 Google Fonts 에서 폰트를 받아 온다. 빌드 PC 에 인터넷이 필요하다. IBM Plex Sans KR 은 한글 글리프가 많아 `preload: false` 로 둔다.
- **전역 override 의 파급**: Button 높이 44, Tabs 세그먼트형, Chip 색, Paper 테두리를 테마에서 바꾸므로 화면을 직접 고치지 않아도 전 화면 모양이 바뀐다. 좁은 툴바·표 안 버튼은 `size="small"`(32) 을 쓰는 곳만 그대로 들어간다.
- **PageHeader 흰 바**: 본문 패딩을 음수 margin 으로 넘겨 흰 바를 본문 폭 끝까지 붙인다(첫 자식일 때만). 페이지가 PageHeader 앞에 다른 요소를 두면 일반 여백으로 보인다.
- **i18n**: 새 문구는 `src/lib/i18n-en.ts`(화면) 또는 `src/lib/i18n.tsx`(메뉴) 에 넣는다.
- **운영 콘솔 탭 ↔ 사이드바**: 운영사 사이드바 항목이 `/platform?tab=…` 로 이동한다. 화면 안 탭도 그대로 두고 URL 과 맞춘다(경로는 그대로, 쿼리만 추가).

## 4. 디자인 차이 (기능 우선)

| 화면 | 디자인 | 실제 | 이유 |
|---|---|---|---|
| 사이드바 | 메뉴 16개, P2/P3 배지 | 실제 라우트 전부(약 26개), 배지 없음 | 기존 메뉴를 빼지 않음. 배지는 개발 참고용이라 숨김 |
| 사이드바 | '안전 알림'(SafetyAlert) 메뉴 | 없음 → 설정 '미등원 경고' 탭 + 대시보드 위젯 | 별도 라우트가 없음(라우트 추가 안 함) |
| 사이드바 | '전체 공지'(NTC-009) 메뉴 | 없음 | 알림장 대상 '전체'로 보냄. 별도 게시판 API 없음 |
| 상단 헤더 | 통합 검색·알림 종 버튼·현재 시각 | 없음 | 통합 검색·알림 목록 API 가 없음. 계정 메뉴는 사이드바 사용자 카드로 옮김 |
| 운영사 사이드바 | 광고·커머스 그룹 | 없음, 대신 사용량·이상 탐지·커뮤니티 신고 | AD 미구현, 기존 콘솔 탭 유지 |
