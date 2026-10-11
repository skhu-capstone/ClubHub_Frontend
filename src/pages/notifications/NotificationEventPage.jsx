import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Loader2, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getClubEventDetail } from "../../services/calendarService";
import { resolveNotificationEvent } from "../../utils/resolveNotificationEvent";

function formatDate(value) {
  if (!value) return "미정";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

export default function NotificationEventPage() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const numericEventId = Number(eventId);
  const clubId = Number(searchParams.get("clubId"));
  const isValidId = Number.isSafeInteger(numericEventId) && numericEventId > 0 && Number.isSafeInteger(clubId) && clubId > 0;
  const query = useQuery({
    queryKey: ["notificationEvent", user?.userId ?? user?.id, numericEventId, clubId],
    queryFn: () => resolveNotificationEvent(numericEventId, { clubId, getClubEventDetail }),
    enabled: isValidId,
    retry: false,
  });
  const event = query.data;
  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-6 dark:bg-theme-page sm:px-6 sm:py-8 lg:py-12">
      <section className="mx-auto max-w-2xl">
        <button type="button" onClick={() => navigate("/notifications")} className="mb-5 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-theme-secondary dark:hover:bg-theme-hover"><ArrowLeft size={18} />알림 목록으로</button>
        {isValidId && query.isPending ? (
          <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-slate-500 dark:text-theme-muted"><Loader2 size={20} className="animate-spin" />일정을 불러오는 중입니다...</div>
        ) : query.isError || !event ? (
          <div role="alert" className="rounded-2xl bg-white p-6 text-center dark:bg-theme-surface">
            <p className="text-sm text-slate-600 dark:text-theme-secondary">{!isValidId ? "잘못된 일정 주소입니다." : query.error?.response?.data?.message || query.error?.message || "일정을 찾을 수 없습니다."}</p>
            {isValidId && query.error?.status !== 404 && <button type="button" onClick={() => query.refetch()} className="mt-3 min-h-11 px-4 text-sm font-semibold text-blue-600 dark:text-theme-link">다시 시도</button>}
          </div>
        ) : (
          <article className="rounded-2xl bg-white p-4 shadow-sm dark:bg-theme-surface dark:shadow-theme-shadow sm:p-6">
            <p className="mb-2 text-xs font-semibold text-blue-600 dark:text-theme-link">{event.clubName || "동아리"} 일정</p>
            <h1 className="text-2xl font-bold text-gray-900 [overflow-wrap:anywhere] dark:text-theme-text">{event.title}</h1>
            <dl className="mt-6 space-y-4 text-sm text-slate-600 dark:text-theme-secondary">
              <div className="flex gap-3"><CalendarDays size={20} className="shrink-0" /><div className="min-w-0"><dt className="mb-1 font-semibold">일시</dt><dd className="[overflow-wrap:anywhere]">{formatDate(event.startAt)} ~ {formatDate(event.endAt)}</dd></div></div>
              <div className="flex gap-3"><MapPin size={20} className="shrink-0" /><div className="min-w-0"><dt className="mb-1 font-semibold">장소</dt><dd className="[overflow-wrap:anywhere]">{event.location || "미정"}</dd></div></div>
            </dl>
            {event.description && <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-gray-800 [overflow-wrap:anywhere] dark:text-theme-text">{event.description}</p>}
            <button type="button" onClick={() => navigate(`/club/main/${event.clubId}?tab=calendar`)} className="mt-6 min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-theme-primary dark:hover:bg-theme-primary-hover">동아리 일정 보기</button>
          </article>
        )}
      </section>
    </main>
  );
}
