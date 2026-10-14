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
| ② | 공통 컴포넌트 `src/components/ui/*` (StatusBadge·MenuIdChip·PageHeader·SectionCard·KpiCard·SegmentTabs·ProgressBar·EmptyState) | 완료 | 81bd41e |
| ③ | 앱 셸 — 기관 사이드바·운영사 사이드바·모바일 Drawer, 로그인·온보딩·초대 셸 없음 | 완료 | 33ac150 |
| ④ | Phase 1 화면 (P1-01~11) | 완료 | cd895b6, 3a6c466 |
| ⑤ | Phase 2 화면 (P2-01~15) | 완료 | 9f83f0d |
| ⑥ | Phase 3 화면 + 하드코딩 색·폰트 정리 | 완료 | 2c5f7fe, 3058e96 |
| ⑦ | P2 화면별 배치 — 앨범·시간표·교사 근태·행사 달력·설문 목록/결과, 카드 제목 크기 통일 | 완료 | f85d3ef |

## 2-1. 남은 것 (다음 작업 후보)

- ⑦ 에서 앨범·시간표·교사 근태·행사 달력·설문은 화면별 배치까지 맞췄다. 셔틀·구독/알림/보안 설정·교재·환불/할인 다이얼로그는 아직 테마(카드·버튼·탭·스위치·배지)와 카드 제목 크기만 맞춘 상태다.
- 빌드 확인 후 화면별로 어긋나는 부분(입력 높이·탭 폭·표 여백)을 사진으로 알려 주면 맞춘다.

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
| 로그인 (AUTH-001) | '기관 가입하고 14일 무료 체험' 버튼, 약관·개인정보 링크 | 없음. 'ID/PW 찾기' 자리는 기존 '비밀번호를 잊으셨나요?'(임시 비밀번호) | 웹 기관 가입·공개 약관 화면이 없음(라우트 추가 안 함) |
| 로그인 | 입력 예시 값 | 빈 입력 + 아이디 저장 값 | 예시 데이터 하드코딩 금지 |
| 온보딩 (ONB-001) | 4단계 기관 정보·로고 직인·운영 시간·반 만들기, 기관 유형 칩 4종, 사업자번호 | 기존 4단계(기관 정보·하원 목적지·반 만들기·시작) 그대로, 단계 막대·카드·미리보기만 디자인 | 기존 API·단계 유지. 로고·직인은 설정에서 |
| 온보딩 | 반 템플릿 카드(ONB-002) | 없음 | 반 템플릿은 반 관리 화면 다이얼로그에 있음 |
| 운영 콘솔 | 탭 없음(사이드바만) | 넓은 화면은 사이드바, 좁은 화면은 머리 아래 탭 | 모바일 Drawer 를 열지 않고도 전환 |
| 원생 목록·상세 (STU-001·006) | 목록 오른쪽 상세 패널, 체크박스 선택·태그 필터 버튼 | 상세는 기존처럼 `/students/[id]` 별도 화면, 일괄 선택 없음 | 상세 라우트 유지(라우트 변경 금지), 일괄 작업 API 없음. 태그 필터는 상세의 태그(STU-011) |
| 대시보드 (DASH) | 상단 통합 검색·알림 종 | 없음 | 위 '상단 헤더' 와 같음 |
| 대시보드 | 타임라인 '탑승' 배지 | 출결 이벤트(등원·하원·지각·결석)만 | 셔틀 탑승은 타임라인 API 에 없음 |
| 데일리 리포트 (ATT-001) | 반별 카드 + 원터치 버튼 | 반별 카드 + [변경] (수동 변경 ATT-002) | 관리자 웹은 수동 변경만, 원터치는 교사앱 |
| 설정 (SET) | 왼쪽 세로 탭 | 화면 머리 아래 세그먼트 탭(?tab=) | 탭 10개라 가로 스크롤형이 좁은 화면에서 낫다 |
| 통계 (STAT) | 기간 선택·KPI 카드·차트 카드 | 같은 구성, 차트는 기존 SVG 차트(새 의존성 없음) | 차트 라이브러리 추가 안 함 |
| 수납 (PAY) | 원생별 청구 카드 그리드 | 기존 표(청구서 목록) + KPI 카드 | 기존 기능(일괄 발행·수납 처리·할인·환불) 유지 |
| [운영사] 4종 (SAAS) | 화면별 전용 대시보드 레이아웃 | 기존 콘솔 탭 내용 + KPI 카드·필터 카드 | 데이터 구조 그대로 |
| 익명 커뮤니티 (COM) | 디자인 없음 | 게시판 목록 카드(선택 pill), 정렬 세그먼트 탭, 빈 상태 컴포넌트 | 토큰·공통 컴포넌트로 같은 톤 |
| 셔틀 지도 | 버스 아이콘 | 차량 라벨(이모지 제거, 텍스트만) | 이모지 대신 글자 — 대비·스크린리더 |

| 앨범 (NTC-011) | 왼쪽 앨범 목록 + 오른쪽 사진 그리드, 끌어 놓기 업로드 영역, 공개 범위 버튼 | 목록 + 그리드(배치는 같음). 업로드는 기존 '앨범 올리기' 다이얼로그, 공개 범위는 올릴 때 대상 선택 | 업로드·대상 API 흐름 유지 |
| 시간표 (CLS-003) | 30분 칸 그리드, 보강·특강 블록, 오른쪽 대기자 명단 | 30분 칸 그리드(반별 색, 오늘 요일 강조). 보강·특강 블록 없음, 대기자는 별도 메뉴(`/waitlist`) | 일회성 수업 데이터 없음 |
| 교사 근태 (STF-004) | 교직원별 오늘 출퇴근 카드(지각 표시), 월간 표에 지각·조퇴·미체크 색 칸 | 내 오늘 출퇴근 카드 + 월간 표에 근무한 날 칸(퇴근까지 초록 / 퇴근 미체크 노랑) | 근태 API 에 지각·예정 근무 정보 없음 |
| 설문 (NTC-010) | 목록 카드 + 같은 화면 결과 | 목록 카드 → 결과는 기존 `/surveys/[id]` 화면(응답률 타일·막대) | 라우트 유지 |

## 5. 확인 방법

```
npm install
npm run build
npm run dev
```

| 확인할 화면 | 경로 |
|---|---|
| 로그인 (AUTH-001) · 초대 수락 | `/login`, `/invite/<토큰>` |
| 온보딩 (셸 없음) | `/onboarding` (원장) |
| 사이드바·좁은 화면 Drawer | 아무 화면에서 창 폭 900px 미만 |
| 대시보드 (원장·교사, 교사 화면 보기) | `/dashboard`, `/dashboard?teacherId=<교직원>` |
| 원생 목록·상세·가입 승인·엑셀 | `/students`, `/students/<id>`, `/students/join-requests`, `/students/import` |
| 출결 | `/attendance`, `/attendance/monthly`, `/absence-requests` |
| 반·교직원·시간표·대기자 | `/classes`, `/staff`, `/timetable`, `/waitlist` |
| 알림장·템플릿 | `/notices`, `/notices/new`, `/notices/<id>`, `/notice-templates` |
| 행사 | `/events`, `/events/<id>`, `/event-calendar`, `/event-templates` |
| 소통 | `/messages`, `/consults`, `/surveys`, `/albums`, `/community` |
| 경영 | `/invoices`, `/stats`, `/staff-attendance` |
| 설정 (탭 10개) | `/settings?tab=institution` … `account` |
| 운영사 콘솔 (OpsSidebar) | `/platform?tab=metrics` … `community` (운영사 계정) |
| 인쇄 | `/print/stats`, `/print/qr?ids=` |
| 메뉴ID 숨김 | `.env.local` 에 `NEXT_PUBLIC_SHOW_MENU_IDS=false` 후 재시작 |
