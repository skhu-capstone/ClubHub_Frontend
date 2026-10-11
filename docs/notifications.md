# 알림 연동

기준: `프엔 연동 가이드.pdf` (백엔드 이슈 #91).

- 알림 목록: `GET /api/notifications?page=0&size=20`
- 배지: `GET /api/notifications/unread-count`, 30초 폴링. 알림 화면에서는 중지하고 목록의 `unreadCount`를 사용한다.
- 개별 읽음: `PATCH /api/notifications/{notificationId}/read`
- 전체 읽음: `PATCH /api/notifications/read-all`
- 모두 Bearer 토큰을 사용한다. 빈 본문의 403은 로그인 만료로 처리한다. JSON 오류 응답의 `NOTIFICATION_ACCESS_DENIED`는 로그아웃하지 않는다.
- 알림 문구는 서버의 `message`를 그대로 표시한다.
- 읽음 상태는 `isRead` 또는 `read` 필드를 받아 `isRead`로 통일한다. 읽은 카드는 회색, 읽지 않은 카드는 파란색으로 표시한다.
- `CLUB_JOIN_REQUEST`는 `/club/president/{targetId}?tab=applicants`로 이동하여 대표 관리의 가입 신청자 탭을 연다. 다른 `CLUB` 알림은 동아리 상세로 이동한다.

| targetType | 프론트 이동 |
| --- | --- |
| POST | `/club/posts/{targetId}` |
| CLUB | `/club/apply/{targetId}` |
| CHAT_ROOM | `/coffee-chat`, state의 `roomId`로 선택 |
| CLUB_COLLABORATION | `/cooperation/club/{targetId}` |
| PROJECT_RECRUITMENT | `/cooperation/project/{targetId}` |
| CLUB_EVENT | `/notifications/events/{targetId}?clubId={clubId}` |

## 일정 상세의 동아리 ID

사용자 확인에 따라 일정 알림 응답에 `clubId`도 함께 내려온다. `clubId`와 `targetId`(일정 ID)로 `GET /api/clubs/{clubId}/events/{eventId}`를 바로 조회한다. 동아리 ID는 URL 쿼리에 유지하여 새로고침 및 재로그인 후에도 같은 일정을 열 수 있다. `clubId`가 누락되면 이동 대상 오류로 안내한다.

## 채팅 신청 출처

- 커피챗 프로필: `POST /api/chat/rooms`에 `source: "COFFEE_CHAT"`를 추가한다.
- 프로젝트 모집 문의: 동일 API에 `source: "PROJECT_RECRUITMENT"`, `sourceId: 모집글 ID`를 추가한다.
- 동아리 협업 문의는 기존 `/api/club-collaborations/{collabId}/apply`를 사용한다.
- 채팅 목록 및 알림에서 기존 채팅방을 열 때는 생성 API를 호출하지 않는다.

테스트: `node --test src/services/notificationService.test.js src/utils/notificationTargets.test.js`.
