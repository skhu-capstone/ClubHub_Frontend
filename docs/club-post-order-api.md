# 동아리 게시물 순서 저장 API

대표(PRESIDENT)와 운영진(STAFF)은 동아리 메인 화면의 피드 탭에서 **게시물 순서 편집**을 사용할 수 있습니다. 드래그 핸들 또는 위·아래 버튼으로 이동한 뒤 **순서 저장**을 누릅니다. 취소하면 변경 사항을 버립니다.

## 저장 요청

`PATCH /api/clubs/{clubId}/posts/order`

인증: `Authorization: Bearer <accessToken>`

```json
{ "postIds": [1, 3, 2] }
```

공지사항(NOTICE)과 일반 게시글(GENERAL)을 포함한 해당 동아리의 모든 게시글 ID를 표시 순서대로 전송합니다. 첫 번째 ID가 가장 위에 표시됩니다. 중복, 누락, 다른 동아리의 ID는 허용되지 않습니다.

성공: `200 OK`

```json
{
  "success": true,
  "code": "POST_ORDER_UPDATE_SUCCESS",
  "message": "게시글 순서 변경이 완료되었습니다.",
  "data": null
}
```

| HTTP 상태 | 코드 | 상황 |
| --- | --- | --- |
| 400 | POST_ORDER_INVALID | ID 중복, 누락, 다른 동아리 게시글 포함 |
| 400 | 요청값 검증 오류 | 빈 postIds 또는 null 요소 |
| 403 | POST_ORDER_FORBIDDEN | 대표 또는 운영진 권한 없음 |
| 404 | CLUB_NOT_FOUND | 존재하지 않는 동아리 |

POST_ORDER_INVALID 발생 시 전체 목록을 다시 불러와 정렬할 수 있습니다.

## 목록 조회

`GET /api/clubs/{clubId}/posts?page=0&size=4`

순서를 저장하지 않았다면 최신순, 저장했다면 저장된 순서로 data.content가 반환됩니다. 새 게시글은 최상단에 배치되고 저장한 순서는 새로고침 후에도 유지됩니다.

편집을 시작할 때 size=100으로 모든 페이지를 순회하여 전체 목록을 가져옵니다. 저장 성공 후 동아리 게시글 목록 캐시를 무효화하고 첫 페이지로 돌아가 GET 결과를 표시합니다. 별도의 순서 조회 API는 사용하지 않습니다.

전체 게시글 피드 GET /api/posts의 정렬에는 영향을 주지 않습니다.
