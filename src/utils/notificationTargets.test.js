import { test } from "node:test";
import assert from "node:assert/strict";
import { getNotificationTarget } from "./notificationTargets.js";
import { resolveNotificationEvent } from "./resolveNotificationEvent.js";

test("all six notification targets resolve to existing routes and chat selection state", () => {
  for (const [targetType, pathname] of [
    ["POST", "/club/posts/30"], ["CLUB", "/club/apply/30"],
    ["CHAT_ROOM", "/coffee-chat"], ["CLUB_EVENT", "/notifications/events/30"],
    ["CLUB_COLLABORATION", "/cooperation/club/30"], ["PROJECT_RECRUITMENT", "/cooperation/project/30"],
  ]) assert.equal(getNotificationTarget({ targetType, targetId: 30, clubId: 2 }).pathname, pathname);
  assert.deepEqual(getNotificationTarget({ targetType: "CLUB_EVENT", targetId: 30, clubId: 2 }), { pathname: "/notifications/events/30", search: "?clubId=2" });
  assert.equal(getNotificationTarget({ targetType: "CLUB_EVENT", targetId: 30 }), null);
  assert.deepEqual(getNotificationTarget({ targetType: "CHAT_ROOM", targetId: 30 }).state, { roomId: 30, fromNotification: true });
  for (const targetId of [null, 0, -1, "bad", "//outside", 1.2]) assert.equal(getNotificationTarget({ targetType: "POST", targetId }), null);
  assert.equal(getNotificationTarget({ targetType: "UNKNOWN", targetId: 30 }), null);
  assert.deepEqual(getNotificationTarget({ type: "CLUB_JOIN_REQUEST", targetType: "CLUB", targetId: 30 }), { pathname: "/club/president/30", search: "?tab=applicants" });
  assert.equal(getNotificationTarget({ type: "CLUB_JOIN_APPROVED", targetType: "CLUB", targetId: 30 }).pathname, "/club/apply/30");
});

test("event notifications directly query their supplied clubId", async () => {
  const calls = [];
  const event = await resolveNotificationEvent(9, {
    clubId: 2,
    getClubEventDetail: async ({ clubId, eventId }) => {
      calls.push([clubId, eventId]);
      return { eventId: 9, title: "일정" };
    },
  });
  assert.equal(event.clubId, 2);
  assert.deepEqual(calls, [[2, 9]]);
  await assert.rejects(resolveNotificationEvent(9, {
    getClubEventDetail: () => assert.fail("missing clubId must not query an unrelated club"),
  }), /동아리 정보/);
});

test("event deletion is distinguished from permission and network errors", async () => {
  for (const status of [404, 403, 500]) {
    await assert.rejects(resolveNotificationEvent(9, {
      clubId: 1,
      getClubEventDetail: async () => { throw { response: { status } }; },
    }), (error) => status === 404 ? error.status === 404 : error.response.status === status);
  }
});
