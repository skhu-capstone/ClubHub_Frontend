# ClubHub GA4 운영 가이드

ClubHub는 Vite, React, React Router를 사용하는 SPA다. 화면은 `src/pages`에, 공용 컴포넌트는 `src/components`에, API 관련 코드는 `src/services`에 있다. GA 계측은 라우트와 주요 기능의 기존 성공 처리 지점에 연결한다.

## 배포 설정

| 변수 | 설정 |
| --- | --- |
| `VITE_GA_MEASUREMENT_ID` | 운영 웹 스트림의 GA4 측정 ID |
| `VITE_GA_PRODUCTION_ORIGIN` | 운영 사이트의 정확한 origin. 현재 `https://www.clubhubb.co.kr`이며 마지막 슬래시는 생략한다. |
| `VITE_GA_REQUIRE_CONSENT` | 기본값은 동의 필요. `false`는 운영 정책상 방문 시 분석 시작이 허용되는 경우에 사용한다. |
| `VITE_GA_DEBUG_MEASUREMENT_ID` | 별도의 테스트 GA4 속성에 속한 웹 스트림 ID. `analytics-debug` 모드에서 사용한다. |

Vite는 빌드 시 이 값을 읽으므로 운영 배포 환경에 값을 추가한 뒤 다시 빌드하고 배포한다. 운영 태그는 프로덕션 빌드가 지정된 origin에서 열릴 때만 실행된다. 일반 개발 서버와 다른 origin의 프리뷰에서는 수집이 꺼진다.

동의가 필요한 경우 현재 서비스의 UI를 유지하기 위해 동의 화면은 추가하지 않았다. 동의 관리 도구 연동 시 선택을 읽고 변경될 때마다 `setAnalyticsConsent(granted)`를 호출한다. 동의 전에는 태그를 로드하지 않는다. 동의 시 현재 페이지부터 계측하며, 철회 시 해당 측정 ID에 대한 전송을 중지한다. 동의 선택의 저장 및 복원은 동의 관리 도구가 담당한다.

## GA4 관리자 설정

1. 운영과 테스트 양쪽에서 **관리 → 데이터 스트림 → 웹 스트림 → 향상된 측정**을 끈다. 코드의 `send_page_view: false`는 최초 자동 페이지뷰를 끈다. 스트림 설정에서 기록 변경에 따른 페이지뷰와 사이트 검색, 양식, 외부 링크 자동 계측도 끄면 이중 집계와 입력값·원본 URL 수집을 방지할 수 있다. [Google 페이지뷰 설정](https://developers.google.com/analytics/devguides/collection/ga4/views) · [향상된 측정 이벤트](https://support.google.com/analytics/answer/9216061)
2. 웹 스트림의 데이터 수정(Data redaction)에서 이메일 데이터 삭제 설정을 확인한다. [Google 데이터 삭제 안내](https://support.google.com/analytics/answer/13544947)
3. **관리 → 맞춤 정의**에서 `recruitment_type`과 `entry_point`가 보고서에 필요하면 이벤트 범위 맞춤 측정기준으로 등록한다. [이벤트 범위 맞춤 측정기준](https://support.google.com/analytics/answer/14239695)

## 수집 이벤트

모든 이벤트에 정규화한 `page_location`, 고정 `page_title`, 직전 계측 화면의 `page_referrer`가 포함된다. 최초 조회에서는 리퍼러를 비운다. URL에는 등록된 라우트 패턴을 사용한다. 예를 들어 커피챗 프로필은 `/coffee-chat/profile/:userId`로 집계한다. 쿼리, 해시, 실제 ID, 검색어, 인증정보, 게시글과 메시지 내용은 전송하지 않는다.

| 이벤트 | 기록 시점 | 추가 파라미터 |
| --- | --- | --- |
| `page_view` | 첫 화면과 경로 전환. 뒤로·앞으로 이동 포함 | — |
| `login` | Google 로그인 API 성공 | `method=google` |
| `school_email_verified` | 학교 이메일 인증 성공 | — |
| `club_join_requested` | 동아리 가입 신청 성공 | — |
| `club_created` | 동아리 생성 성공 | — |
| `club_post_created` | 동아리 게시글 생성 성공 | — |
| `recruitment_created` | 협업 또는 팀원 모집글 생성 성공 | `recruitment_type=club\|project` |
| `recruitment_form_opened` | 권한이 있는 사용자가 모집 등록 폼을 열 때 | `recruitment_type=club\|project` |
| `recruitment_search` | 비어 있지 않은 모집 검색을 제출할 때 | `recruitment_type=club\|project` |
| `coffee_chat_opened` | 프로필 또는 모집 상세에서 채팅방을 확보해 진입할 때 | `entry_point=profile\|club_collaboration\|project_recruitment` |

글 생성 이벤트는 API가 본문을 저장한 시점에 기록된다. 후속 이미지 업로드 재시도로 생성 이벤트가 다시 발생하지 않는다. 검색어는 임의 입력값이어서 `search_term`이 필요한 추천 이벤트 대신 검색 실행 횟수만 기록한다. [GA4 추천 이벤트](https://support.google.com/analytics/answer/9267735)

## DebugView와 Realtime 검증

1. `.env.analytics-debug.local`에 별도 테스트 속성의 `VITE_GA_DEBUG_MEASUREMENT_ID`와 테스트에 한해 `VITE_GA_REQUIRE_CONSENT=false`를 설정한다. `npm run dev -- --mode analytics-debug`로 시작하면 테스트 이벤트에 디버그 모드가 적용된다.
2. 테스트 속성의 **관리 → DebugView**를 열고 첫 화면, 링크 이동, 뒤로·앞으로 이동을 실행한다. 화면 전환마다 `page_view` 1건, 동일 경로에서 쿼리·해시 변경 시 0건인지 확인한다. 상세 화면에서는 실제 ID 대신 라우트 패턴이 표시되는지, 첫 화면의 리퍼러가 비어 있고 다음 화면의 리퍼러는 직전 라우트인지 확인한다. 브라우저 개발자 도구에서도 GA 수집 요청의 URL·이벤트 파라미터에 원본 값이 빠졌는지 확인한다. [DebugView 안내](https://support.google.com/analytics/answer/7201382)
3. 로그인·가입 신청·모집 등록·검색·커피챗 경로를 테스트해 이벤트와 허용값을 확인한다. 특히 API가 실패한 작업에는 성공 이벤트가 없어야 한다. `gtag/js` 요청을 차단한 상태에서도 화면 이동과 기존 기능이 정상 동작하는지 확인한다.
4. 운영 배포 후 **보고서 → 실시간(Realtime)** 에서 실제 방문으로 발생한 이벤트 이름과 건수를 확인한다. 디버그 테스트는 테스트 속성에서 수행한다. [GA4 이벤트 확인](https://support.google.com/analytics/answer/9322688)

## 이벤트 추가

`src/utils/analytics.js`의 `eventParameters`에 추천 이벤트 또는 snake_case 맞춤 이벤트를 등록한다. 허용할 파라미터와 고정값을 정의하고 실제 성공 처리나 명시적인 사용자 동작에서 `trackEvent`를 호출한다. API 응답 객체, 입력 문자열, URL을 인자로 전달하지 않는다. DebugView에서 발생 횟수와 파라미터를 확인한 뒤 이 가이드의 이벤트 표를 갱신한다.

운영 분석에서는 모집 폼 열기 → 등록 성공 흐름을 모집 유형별로 비교하고, 커피챗 진입은 `entry_point`별로 비교할 수 있다.
