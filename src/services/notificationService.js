const BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "";

export class NotificationError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "NotificationError";
    this.status = status;
    this.code = code;
    this.authExpired = status === 401 || (status === 403 && code === "AUTH_EXPIRED");
  }
}

async function request(path, { method = "GET", signal } = {}) {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new NotificationError("로그인이 필요합니다.", 403, "AUTH_EXPIRED");
  const response = await fetch(`${BASE_URL}/api/notifications${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const text = await response.text();
  let body;
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new NotificationError("알림 서버 응답을 확인할 수 없습니다.", response.status);
    }
  }
  if (!response.ok || body?.success === false) {
    const expired = response.status === 401 || (response.status === 403 && !text.trim());
    throw new NotificationError(
      expired ? "로그인이 만료되었습니다. 다시 로그인해주세요." : body?.message || "알림 요청에 실패했습니다.",
      response.status,
      expired ? "AUTH_EXPIRED" : body?.code,
    );
  }
  return body?.data;
}

export async function getNotifications({ page = 0, size = 20, signal } = {}) {
  const data = await request(`?${new URLSearchParams({ page, size })}`, { signal });
  return data && {
    ...data,
    content: (data.content ?? []).map((notification) => ({
      ...notification,
      isRead: notification.isRead ?? notification.read ?? false,
    })),
  };
}

export function getNotificationUnreadCount({ signal } = {}) {
  return request("/unread-count", { signal });
}

export function readNotification(notificationId) {
  return request(`/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" });
}

export function readAllNotifications() {
  return request("/read-all", { method: "PATCH" });
}
