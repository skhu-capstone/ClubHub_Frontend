import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { getNotificationUnreadCount } from "../../services/notificationService";
import useNotificationSession from "../../hooks/useNotificationSession";

export default function NotificationBell({ userId, onOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, error } = useQuery({
    queryKey: ["notificationUnreadCount", userId],
    queryFn: getNotificationUnreadCount,
    enabled: !location.pathname.startsWith("/notifications"),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: (count, err) => !err.authExpired && err.status !== 403 && count < 1,
  });
  useNotificationSession(error);
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen ?? (() => navigate("/notifications"))}
      aria-label={`알림${unreadCount > 0 ? `, 읽지 않은 알림 ${unreadCount}개` : ""}`}
      title={error ? "알림 개수를 불러오지 못했습니다. 알림 목록에서 다시 확인해주세요." : "알림"}
      className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/20 text-white transition-colors hover:bg-white/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Bell size={20} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
