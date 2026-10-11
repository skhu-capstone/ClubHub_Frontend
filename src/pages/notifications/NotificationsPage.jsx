import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Bell, CalendarDays, CheckCheck, ChevronLeft, ChevronRight, Coffee, Heart, Loader2, MessageCircle, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useNotificationSession from "../../hooks/useNotificationSession";
import { getNotifications, readAllNotifications, readNotification } from "../../services/notificationService";
import { getNotificationTarget } from "../../utils/notificationTargets";

const TYPES = {
  COFFEE_CHAT_REQUEST: [Coffee, "커피챗"],
  CLUB_COLLABORATION_APPLY: [MessageCircle, "협업 문의"],
  PROJECT_RECRUITMENT_APPLY: [MessageCircle, "프로젝트 지원"],
  CLUB_NOTICE_CREATED: [Bell, "동아리 공지"],
  CLUB_EVENT_CREATED: [CalendarDays, "동아리 일정"],
  CLUB_JOIN_REQUEST: [Users, "가입 신청"],
  CLUB_JOIN_APPROVED: [Users, "가입 승인"],
  CLUB_JOIN_REJECTED: [Users, "가입 결과"],
  CLUB_MEMBER_EXPELLED: [Users, "동아리 회원"],
  CLUB_ROLE_CHANGED: [Users, "역할 변경"],
  POST_COMMENT: [MessageCircle, "댓글"],
  POST_LIKE: [Heart, "좋아요"],
};

function NotificationItem({ notification, pending, onClick }) {
  const [Icon, label] = TYPES[notification.type] ?? [Bell, "알림"];
  const date = new Date(notification.createdAt);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`flex w-full min-w-0 items-start gap-3 rounded-xl border border-l-4 p-4 text-left transition-colors disabled:cursor-wait sm:gap-4 sm:p-5 ${notification.isRead ? "border-slate-200 border-l-slate-300 bg-slate-100 hover:bg-slate-200/70 dark:border-theme-border dark:bg-theme-subtle dark:hover:bg-theme-hover" : "border-blue-200 border-l-blue-500 bg-blue-100 hover:bg-blue-200/70 dark:border-theme-focus dark:bg-theme-accent dark:hover:bg-theme-accent-hover"}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-theme-surface ${notification.isRead ? "text-slate-400 dark:text-theme-muted" : "text-blue-600 dark:text-theme-link"}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-theme-muted">
          <span>{label}</span>
          <span className={notification.isRead ? "text-slate-500 dark:text-theme-muted" : "font-semibold text-blue-600 dark:text-theme-link"}>{notification.isRead ? "읽음" : "안 읽음"}</span>
        </span>
        <span className={`block whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere] ${notification.isRead ? "font-normal text-slate-600 dark:text-theme-secondary" : "font-semibold text-gray-900 dark:text-theme-text"}`}>
          {notification.message}
        </span>
        {!Number.isNaN(date.getTime()) && (
          <time dateTime={notification.createdAt} className="mt-2 block text-xs text-slate-500 dark:text-theme-muted">
            {date.toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </time>
        )}
      </span>
      {pending && <Loader2 size={18} className="shrink-0 animate-spin text-blue-600 dark:text-theme-link" aria-label="읽음 처리 중" />}
    </button>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.userId ?? user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [actionError, setActionError] = useState("");
  const inFlightRef = useRef(false);
  const listTopRef = useRef(null);
  const query = useQuery({
    queryKey: ["notifications", userId, page],
    queryFn: ({ signal }) => getNotifications({ page, size: 20, signal }),
    enabled: userId != null,
    retry: (count, error) => !error.authExpired && error.status !== 403 && count < 1,
  });

  useEffect(() => {
    if (query.data) {
      queryClient.cancelQueries({ queryKey: ["notificationUnreadCount", userId] });
      queryClient.setQueryData(["notificationUnreadCount", userId], { unreadCount: query.data.unreadCount });
    }
  }, [query.data, queryClient, userId]);

  function updateReadCache(notification) {
    queryClient.setQueriesData({ queryKey: ["notifications", userId] }, (old) => {
      if (!old) return old;
      return {
        ...old,
        unreadCount: notification ? Math.max(0, (old.unreadCount ?? 0) - (notification.isRead ? 0 : 1)) : 0,
        content: old.content.map((item) => !notification || String(item.notificationId) === String(notification.notificationId) ? { ...item, isRead: true, read: true } : item),
      };
    });
    queryClient.setQueryData(["notificationUnreadCount", userId], (old) => ({
      unreadCount: notification ? Math.max(0, (old?.unreadCount ?? query.data?.unreadCount ?? 0) - (notification.isRead ? 0 : 1)) : 0,
    }));
  }

  async function cancelPendingReads() {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: ["notifications", userId] }),
      queryClient.cancelQueries({ queryKey: ["notificationUnreadCount", userId] }),
    ]);
  }

  const readMutation = useMutation({
    mutationFn: (notification) => readNotification(notification.notificationId),
    onMutate: cancelPendingReads,
    onSuccess: (_, notification) => updateReadCache(notification),
  });
  const readAllMutation = useMutation({
    mutationFn: readAllNotifications,
    onMutate: cancelPendingReads,
    onSuccess: () => updateReadCache(null),
  });
  useNotificationSession([query.error, readMutation.error, readAllMutation.error].find((error) => error?.authExpired));

  async function handleNotification(notification) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setActionError("");
    try {
      if (!notification.isRead) await readMutation.mutateAsync(notification);
      const target = getNotificationTarget(notification);
      if (target) navigate({ pathname: target.pathname, search: target.search }, { state: target.state });
      else setActionError("이 알림의 이동 대상을 확인할 수 없습니다.");
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount", userId] });
    } catch (error) {
      setActionError(error.message || "알림을 읽음 처리하지 못했습니다. 다시 시도해주세요.");
    } finally {
      inFlightRef.current = false;
    }
  }

  async function handleReadAll() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setActionError("");
    try {
      await readAllMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount", userId] });
    } catch (error) {
      setActionError(error.message || "전체 읽음 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      inFlightRef.current = false;
    }
  }

  function changePage(nextPage) {
    setPage(nextPage);
    setActionError("");
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const pending = readMutation.isPending || readAllMutation.isPending;
  const unreadCount = query.data?.unreadCount ?? 0;
  const notifications = query.data?.content ?? [];
  const totalPages = query.data?.totalPages ?? 0;

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-6 dark:bg-theme-page sm:px-6 sm:py-8 lg:py-12">
      <section className="mx-auto max-w-3xl" ref={listTopRef}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-theme-text sm:text-3xl">알림</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-theme-muted" aria-live="polite">
              {query.data ? `읽지 않은 알림 ${unreadCount}개` : "새로운 소식을 확인해보세요."}
            </p>
          </div>
          <button type="button" onClick={handleReadAll} disabled={pending || !query.data || unreadCount === 0}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-theme-border-strong dark:bg-theme-surface dark:text-theme-secondary dark:hover:bg-theme-hover">
            <CheckCheck size={18} aria-hidden="true" />
            {readAllMutation.isPending ? "처리 중..." : "모두 읽음"}
          </button>
        </div>
        {actionError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-theme-danger-bg dark:text-theme-danger">{actionError}</p>}
        {query.isPending ? (
          <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-slate-500 dark:text-theme-muted"><Loader2 className="animate-spin" size={20} />알림을 불러오는 중입니다...</div>
        ) : query.isError ? (
          <div role="alert" className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl bg-white p-5 text-center dark:bg-theme-surface">
            <AlertCircle size={24} className="text-red-500 dark:text-theme-danger" />
            <p className="text-sm text-slate-600 dark:text-theme-secondary">{query.error.message || "알림을 불러오지 못했습니다."}</p>
            <button type="button" onClick={() => query.refetch()} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-blue-600 dark:text-theme-link">다시 시도</button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl bg-white p-5 text-center dark:bg-theme-surface">
            <Bell size={28} className="text-slate-400 dark:text-theme-muted" />
            <p className="text-sm text-slate-500 dark:text-theme-muted">아직 알림이 없습니다.</p>
            {page > 0 && <button type="button" onClick={() => changePage(0)} className="min-h-11 px-4 text-sm text-blue-600 dark:text-theme-link">첫 페이지로</button>}
          </div>
        ) : (
          <ul className="flex flex-col gap-3" aria-busy={query.isFetching}>
            {notifications.map((notification) => <li key={notification.notificationId}>
              <NotificationItem notification={notification} pending={pending} onClick={() => handleNotification(notification)} />
            </li>)}
          </ul>
        )}
        {!query.isError && totalPages > 1 && (
          <nav aria-label="알림 페이지" className="mt-6 flex items-center justify-center gap-4">
            <button type="button" aria-label="이전 페이지" onClick={() => changePage(page - 1)} disabled={page === 0 || pending || query.isFetching} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-200 disabled:opacity-30 dark:text-theme-secondary dark:hover:bg-theme-hover"><ChevronLeft size={20} /></button>
            <span className="text-sm text-slate-600 dark:text-theme-secondary">{page + 1} / {totalPages}</span>
            <button type="button" aria-label="다음 페이지" onClick={() => changePage(page + 1)} disabled={page >= totalPages - 1 || pending || query.isFetching} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-200 disabled:opacity-30 dark:text-theme-secondary dark:hover:bg-theme-hover"><ChevronRight size={20} /></button>
          </nav>
        )}
      </section>
    </main>
  );
}
