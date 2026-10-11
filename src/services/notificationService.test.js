import { test } from "node:test";
import assert from "node:assert/strict";
import { getNotifications, getNotificationUnreadCount, readNotification, readAllNotifications } from "./notificationService.js";

test("notification API uses the four documented authenticated endpoints and accepts empty PATCH responses", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "test-token" } });
  try {
    const controller = new AbortController();
    for (const [path, method, invoke, expected] of [
      ["?page=2&size=20", "GET", () => getNotifications({ page: 2, signal: controller.signal }), { content: [], unreadCount: 7 }],
      ["/unread-count", "GET", () => getNotificationUnreadCount(), { unreadCount: 7 }],
      ["/31/read", "PATCH", () => readNotification(31), undefined],
      ["/read-all", "PATCH", () => readAllNotifications(), undefined],
    ]) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, `/api/notifications${path}`);
        assert.equal(options.method, method);
        assert.equal(options.headers.Authorization, "Bearer test-token");
        assert.equal(options.body, undefined);
        if (path.startsWith("?")) assert.equal(options.signal, controller.signal);
        return { ok: true, status: expected ? 200 : 204, text: async () => expected ? JSON.stringify({ success: true, data: expected }) : "" };
      };
      assert.deepEqual(await invoke(), expected);
    }
    for (const notification of [
      { notificationId: 31, read: true },
      { notificationId: 31, isRead: true },
      { notificationId: 31, read: false },
      { notificationId: 31, isRead: false, read: true },
    ]) {
      globalThis.fetch = async () => ({
        ok: true, status: 200,
        text: async () => JSON.stringify({ success: true, data: { content: [notification], unreadCount: 0 } }),
      });
      const list = await getNotifications();
      assert.equal(list.content[0].isRead, notification.isRead ?? notification.read);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});

test("empty 403 means expired login while structured 403 preserves access denied", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "test-token" } });
  try {
    for (const [status, body, expired, code] of [
      [403, "", true, "AUTH_EXPIRED"],
      [401, "", true, "AUTH_EXPIRED"],
      [403, JSON.stringify({ success: false, code: "NOTIFICATION_ACCESS_DENIED", message: "본인에게 온 알림만 확인할 수 있습니다." }), false, "NOTIFICATION_ACCESS_DENIED"],
      [404, JSON.stringify({ success: false, code: "NOTIFICATION_NOT_FOUND", message: "없는 알림입니다." }), false, "NOTIFICATION_NOT_FOUND"],
      [200, JSON.stringify({ success: false, code: "FAILED", message: "실패" }), false, "FAILED"],
    ]) {
      globalThis.fetch = async () => ({ ok: status < 400, status, text: async () => body });
      await assert.rejects(readNotification(31), (error) => {
        assert.equal(error.authExpired, expired);
        assert.equal(error.code, code);
        assert.equal(error.status, status);
        return true;
      });
    }
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
    globalThis.fetch = () => assert.fail("missing token must not send a request");
    await assert.rejects(getNotifications(), (error) => error.authExpired);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
