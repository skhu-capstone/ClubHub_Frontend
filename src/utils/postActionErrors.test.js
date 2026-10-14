import { test } from "node:test";
import assert from "node:assert/strict";
import { getPostActionErrorMessage, isPostActionResultUnknown } from "./postActionErrors.js";

test("gateway HTML responses and lost connections require checking the saved result", () => {
  for (const error of [
    { response: { status: 504, data: "<html>Gateway Time-out</html>" } },
    { response: { status: 502 } },
    { response: { status: 503 } },
    { request: {}, message: "Network Error" },
  ]) {
    assert.equal(isPostActionResultUnknown(error), true);
    assert.match(getPostActionErrorMessage(error, "실패"), /반영 여부/);
  }
});

test("authorization, API validation and non-JSON failures have readable feedback", () => {
  assert.match(getPostActionErrorMessage({ response: { status: 401 } }, "실패"), /로그인/);
  assert.match(getPostActionErrorMessage({ response: { status: 403 } }, "실패"), /권한/);
  const validation = { response: { status: 400, data: { message: "목록이 변경되었습니다." } } };
  assert.equal(isPostActionResultUnknown(validation), false);
  assert.equal(getPostActionErrorMessage(validation, "실패"), "목록이 변경되었습니다.");
  assert.equal(getPostActionErrorMessage({ response: { status: 500, data: "<html>Error</html>" } }, "댓글 작성 실패"), "댓글 작성 실패");
});
