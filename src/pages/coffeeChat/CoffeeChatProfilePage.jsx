import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, LoaderCircle, MessageCircle, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import MyPageCard from "../../components/card/MyPageCard";
import InputLabel from "../../components/card/InputLabel";
import { getCoffeeChatProfile } from "../../services/coffeeChatProfileService";
import { useAuth } from "../../context/AuthContext";
import { getProfileImageUrl } from "../../utils/imageUtils";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const MEETING_TYPE_LABELS = {
  ONLINE: "온라인",
  OFFLINE: "오프라인",
  BOTH: "온라인·오프라인",
};

const getHttpUrl = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export default function CoffeeChatProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const targetUserId = Number(userId);
  const isValidUserId = Number.isInteger(targetUserId) && targetUserId > 0;
  const { user: authUser, loading: authLoading } = useAuth();
  const accessToken = localStorage.getItem("accessToken");
  const isAuthenticated = !!authUser && !!accessToken;
  const currentUserId = Number(authUser?.userId ?? authUser?.id);
  const isMyProfile = isValidUserId && currentUserId === targetUserId;
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["coffeeChatProfile", targetUserId],
    queryFn: () => getCoffeeChatProfile(targetUserId),
    enabled: isAuthenticated && isValidUserId,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleChatClick = async () => {
    if (chatLoading) return;

    if (!isValidUserId || isMyProfile) {
      navigate("/coffee-chat");
      return;
    }

    setChatLoading(true);
    setChatError("");

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE}/api/chat/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ targetUserId, source: "COFFEE_CHAT" }),
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.success && result.data?.chatRoomId) {
        navigate("/coffee-chat", { state: { roomId: result.data.chatRoomId } });
        return;
      }

      setChatError(result?.message || "채팅방을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
    } catch (requestError) {
      console.error("[CoffeeChatProfilePage] 채팅방 생성 실패", requestError);
      setChatError("네트워크 오류로 채팅방을 만들지 못했습니다.");
    } finally {
      setChatLoading(false);
    }
  };

  if (authLoading || (isAuthenticated && isValidUserId && isLoading)) {
    return (
      <StatusView
        icon={<LoaderCircle aria-hidden="true" className="h-8 w-8 animate-spin text-blue-600 dark:text-theme-link" />}
        message="프로필을 불러오는 중입니다..."
      />
    );
  }

  if (!isAuthenticated) {
    return <StatusView message="로그인 페이지로 이동하는 중입니다..." />;
  }

  if (!isValidUserId) {
    return (
      <StatusView
        title="잘못된 프로필 주소입니다."
        message="커피챗 사용자 목록에서 프로필을 다시 선택해주세요."
        actionLabel="목록으로 돌아가기"
        onAction={() => navigate("/coffee-chat/user-list")}
      />
    );
  }

  if (isError) {
    const status = error?.response?.status;
    const message =
      status === 401
        ? "로그인이 만료되었습니다. 다시 로그인해주세요."
        : status === 403
          ? "비공개 커피챗 프로필입니다."
          : status === 404
            ? "존재하지 않는 커피챗 프로필입니다."
            : "프로필을 불러오지 못했습니다.";

    return (
      <StatusView
        title={message}
        message={status === 403 || status === 404 ? "다른 사용자의 프로필을 확인해보세요." : "잠시 후 다시 시도해주세요."}
        actionLabel={status === 403 || status === 404 ? "목록으로 돌아가기" : "다시 시도"}
        onAction={status === 403 || status === 404 ? () => navigate("/coffee-chat/user-list") : () => refetch()}
      />
    );
  }

  const coffeeChatProfile = data?.coffeeChatProfile;
  const user = {
    name: data?.name ?? "이름 미설정",
    clubs: data?.clubs ?? [],
    image: getProfileImageUrl({
      coffeeChatProfileImageUrl: coffeeChatProfile?.profileImageUrl,
      coffeeChatProfileImage: coffeeChatProfile?.profileImage,
      profileImageUrl: data?.profileImageUrl,
      profileImage: data?.profileImage,
    }),
  };

  const profile = {
    studentId: coffeeChatProfile?.studentId ?? "",
    interest: coffeeChatProfile?.interestTopics ?? "",
    preferredMethod: MEETING_TYPE_LABELS[coffeeChatProfile?.meetingType] ?? coffeeChatProfile?.meetingType ?? "",
    link: coffeeChatProfile?.contactLink ?? "",
    shortIntro: coffeeChatProfile?.headline ?? "",
    intro: coffeeChatProfile?.introduction ?? "",
  };
  const contactUrl = getHttpUrl(profile.link);

  return (
    <main className="bg-gray-50 px-4 pt-5 pb-8 dark:bg-theme-page sm:px-6 sm:pt-10 sm:pb-12 lg:pt-14">
      <section className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => navigate("/coffee-chat/user-list")}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-theme-secondary dark:hover:bg-theme-hover dark:focus-visible:outline-theme-focus sm:mb-7"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          사용자 목록
        </button>

        <div className="mb-6 flex items-start justify-between gap-3 sm:mb-8 sm:items-center sm:gap-5">
          <h1 className="min-w-0 break-keep text-2xl font-bold leading-9 text-gray-900 [overflow-wrap:anywhere] dark:text-theme-text sm:text-3xl lg:text-4xl">
            {user.name} 님의 프로필
          </h1>

          {!isMyProfile && (
            <button
              type="button"
              onClick={handleChatClick}
              disabled={chatLoading}
              className="flex min-h-11 w-auto shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-theme-primary dark:hover:bg-theme-primary-hover dark:focus-visible:outline-theme-focus sm:min-h-12 sm:gap-2 sm:px-5 sm:text-base"
            >
              {chatLoading ? (
                <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
              ) : (
                <MessageCircle aria-hidden="true" className="h-5 w-5" />
              )}
              {chatLoading ? "채팅방 생성 중..." : "채팅 보내기"}
            </button>
          )}
        </div>

        {chatError && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 dark:bg-red-950/30 dark:text-theme-danger">
            {chatError}
          </p>
        )}

        <MyPageCard compact name={user.name} clubName={user.clubs} image={user.image} />

        <section className="mt-8 sm:mt-10">
          <h2 className="border-b border-gray-300 pb-3 text-2xl font-bold text-gray-900 dark:border-theme-border-strong dark:text-theme-text sm:text-3xl">
            Profile Details
          </h2>

          <div className="mt-6 sm:mt-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-4">
              <InputLabel label="학번" value={profile.studentId || "미설정"} />
              <InputLabel label="관심분야" value={profile.interest || "미설정"} />
              <InputLabel label="선호 진행방식" value={profile.preferredMethod || "미설정"} />
              {contactUrl ? (
                <div className="flex w-full min-w-0 flex-col gap-1">
                  <span className="text-xs font-medium leading-4 text-gray-900 dark:text-theme-text">연락링크</span>
                  <a
                    href={contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 min-w-0 items-center gap-2 rounded-[10px] bg-blue-900/10 px-3.5 py-2.5 text-sm text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 dark:bg-theme-accent dark:text-theme-link dark:focus-visible:outline-theme-focus sm:text-base"
                  >
                    <span className="min-w-0 flex-1 break-all">{profile.link}</span>
                    <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
                  </a>
                </div>
              ) : (
                <InputLabel label="연락링크" value={profile.link || "미설정"} />
              )}
            </div>

            <div className="mt-5">
              <InputLabel label="한 줄 자기소개" value={profile.shortIntro || "미설정"} />
            </div>

            <div className="mt-5">
              <InputLabel label="자기소개" value={profile.intro || "미설정"} multiline />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusView({ icon, title, message, actionLabel, onAction }) {
  return (
    <main className="flex min-h-[50vh] items-center justify-center bg-gray-50 px-4 py-12 dark:bg-theme-page">
      <div className="max-w-sm text-center" role={title ? "alert" : "status"} aria-live="polite">
        {icon && <div className="flex justify-center">{icon}</div>}
        {title && <h1 className="text-lg font-bold text-gray-900 dark:text-theme-text">{title}</h1>}
        <p className={`${title || icon ? "mt-3" : ""} break-keep text-sm leading-6 text-gray-600 dark:text-theme-muted`}>
          {message}
        </p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-theme-primary dark:hover:bg-theme-primary-hover dark:focus-visible:outline-theme-focus"
          >
            {actionLabel === "다시 시도" && <RefreshCw aria-hidden="true" className="h-4 w-4" />}
            {actionLabel}
          </button>
        )}
      </div>
    </main>
  );
}
