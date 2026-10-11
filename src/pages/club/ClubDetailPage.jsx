import { createElement, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import {
  getClubDetail,
  requestClubJoin,
  cancelClubJoin,
} from "../../services/clubService";
import useMyClubs from "../../hooks/useMyClubs";
import usePendingClubJoins from "../../hooks/usePendingClubJoins";
import { DEFAULT_FEED_IMAGE } from "../../utils/imageUtils";

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 rounded-xl bg-slate-50 dark:bg-theme-subtle p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-theme-surface text-blue-600 dark:text-theme-link shadow-sm dark:shadow-theme-shadow">
        {createElement(Icon, {
          size: 18,
          strokeWidth: 2,
        })}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 dark:text-theme-muted">{label}</p>

        <p className="mt-1 break-words text-sm font-medium text-gray-700 dark:text-theme-secondary">
          {value || "정보 없음"}
        </p>
      </div>
    </div>
  );
}

export default function ClubDetailPage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinMessage, setJoinMessage] = useState("");
  const [hasImageError, setHasImageError] = useState(false);
  const numericClubId = Number(clubId);
  const {
    clubs: myClubs,
    isAuthenticated,
    isChecking: checkingMembership,
    hasError: membershipError,
    refetch: refetchMyClubs,
  } = useMyClubs();
  const {
    getJoinState,
    recordResult,
    isChecking: checkingJoins,
    hasError: joinsError,
    refetch: refetchJoins,
  } = usePendingClubJoins();
  const isChecking = checkingMembership || checkingJoins;
  const hasError = membershipError || joinsError;
  const joinState = getJoinState(
    numericClubId,
    myClubs.some((club) => Number(club.clubId) === numericClubId),
  );
  const isMember = joinState.joined;
  const isApplied = joinState.pending;
  const cannotJoin = joinState.blocked || isChecking || hasError;

  const {
    data: club,
    isLoading,
    isError,
    error: clubError,
    refetch,
  } = useQuery({
    queryKey: ["clubDetail", numericClubId],
    queryFn: () => getClubDetail(numericClubId),
    enabled: Number.isInteger(numericClubId) && numericClubId > 0,
  });

  const joinMutation = useMutation({
    mutationFn: () => requestClubJoin(numericClubId, joinMessage.trim()),

    onSuccess: async (result) => {
      await recordResult(numericClubId, result.clubJoinStatus);
      queryClient.invalidateQueries({ queryKey: ["myClubs"] });
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({
        queryKey: ["clubDetail", numericClubId],
      });
      alert("동아리 가입 신청이 완료되었습니다.");

      setJoinMessage("");

      navigate("/club/apply");
    },

    onError: (error) => {
      console.error(error);

      alert(
        error.response?.data?.message ||
          error.message ||
          "동아리 가입 신청에 실패했습니다.",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelClubJoin(numericClubId),
    onSuccess: async () => {
      // DELETE 응답의 PENDING은 취소 대상 상태일 수 있어 대기 상태로 다시 저장하지 않는다.
      await recordResult(numericClubId, null);
      queryClient.invalidateQueries({ queryKey: ["myClubs"] });
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({
        queryKey: ["clubDetail", numericClubId],
      });
      alert("가입 신청이 취소되었습니다.");
    },
    onError: (error) => {
      alert(
        error.response?.data?.message ||
          error.message ||
          "가입 신청 취소에 실패했습니다.",
      );
    },
  });

  const handleJoin = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (cannotJoin || joinMutation.isPending || cancelMutation.isPending)
      return;
    if (!Number.isInteger(numericClubId) || numericClubId <= 0) {
      alert("잘못된 동아리 주소입니다.");
      return;
    }

    if (!joinMessage.trim()) {
      alert("가입 신청 메시지를 입력해주세요.");
      return;
    }

    joinMutation.mutate();
  };

  if (isLoading) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 dark:bg-theme-subtle">
        <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-theme-muted">
          <Loader2 size={30} className="animate-spin text-blue-500 dark:text-theme-link" />

          <p className="text-sm">동아리 정보를 불러오는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (isError || !club) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 dark:bg-theme-subtle px-5">
        <div className="flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border border-red-100 dark:border-theme-danger-border bg-white dark:bg-theme-surface p-10 text-center shadow-sm dark:shadow-theme-shadow">
          <AlertCircle size={32} className="text-red-400 dark:text-theme-danger" />

          <p className="font-medium text-gray-700 dark:text-theme-secondary">
            {clubError?.response?.status === 404 ? "삭제된 동아리입니다." : "동아리 정보를 불러오지 못했습니다."}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cursor-pointer rounded-lg border border-gray-200 dark:border-theme-border px-4 py-2 text-sm text-gray-600 dark:text-theme-secondary hover:bg-gray-50 dark:hover:bg-theme-hover"
            >
              돌아가기
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              className="cursor-pointer rounded-lg bg-blue-600 dark:bg-theme-primary px-4 py-2 text-sm text-white hover:bg-blue-700 dark:hover:bg-theme-primary-hover"
            >
              다시 시도
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-theme-subtle px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 dark:text-theme-muted transition-colors hover:bg-white dark:hover:bg-theme-hover hover:text-gray-800 dark:hover:text-theme-text"
        >
          <ArrowLeft size={17} />
          동아리 목록으로
        </button>

        <article className="overflow-hidden rounded-3xl border border-gray-100 dark:border-theme-border bg-white dark:bg-theme-surface shadow-sm dark:shadow-theme-shadow">
          <div className="relative aspect-[21/8] min-h-56 overflow-hidden bg-gradient-to-br from-blue-50 dark:from-theme-page to-indigo-100 dark:to-theme-accent">
            {club.imageUrl && !hasImageError ? (
              <img
                src={club.imageUrl}
                alt={`${club.clubName} 대표 이미지`}
                className="h-full w-full object-cover"
                onError={() => setHasImageError(true)}
              />
            ) : (
              <img src={DEFAULT_FEED_IMAGE} alt="동아리 기본 이미지" className="h-full w-full object-cover" />
            )}
          </div>

          <div className="p-6 sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                {club.category && (
                  <span className="inline-flex rounded-full bg-blue-50 dark:bg-theme-accent px-3 py-1 text-xs font-semibold text-blue-700 dark:text-theme-link">
                    {club.category}
                  </span>
                )}

                <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-theme-text sm:text-3xl">
                  {club.clubName}
                </h1>

                <p className="mt-3 text-base leading-7 text-gray-500 dark:text-theme-muted">
                  {club.shortDescription ||
                    "동아리 소개가 아직 등록되지 않았습니다."}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-theme-accent px-4 py-2 text-sm font-medium text-blue-700 dark:text-theme-link">
                <Users size={17} />
                <span>{club.memberCount ?? 0}명</span>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="text-base font-bold text-gray-900 dark:text-theme-text">동아리 소개</h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-theme-secondary">
                {club.detailDescription ||
                  "상세 소개가 아직 등록되지 않았습니다."}
              </p>
            </section>

            <section className="mt-8 grid gap-3 sm:grid-cols-3">
              <InfoItem
                icon={CalendarDays}
                label="정기 모임"
                value={club.regularMeetingTime}
              />

              <InfoItem
                icon={MapPin}
                label="활동 장소"
                value={club.activityLocation}
              />

              <InfoItem icon={Mail} label="연락처" value={club.contact} />
            </section>

            <section className="mt-10 border-t border-gray-100 dark:border-theme-border pt-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-theme-text">
                동아리 가입 신청
              </h2>

              <p className="mt-2 text-sm text-gray-500 dark:text-theme-muted">
                가입하고 싶은 이유나 간단한 자기소개를 작성해주세요.
              </p>

              <textarea
                value={joinMessage}
                onChange={(event) => setJoinMessage(event.target.value)}
                placeholder="예) 웹 개발에 관심이 많고 동아리 프로젝트에 적극적으로 참여하고 싶습니다."
                rows={5}
                disabled={cannotJoin || joinMutation.isPending}
                className="mt-5 w-full resize-none rounded-xl border border-gray-200 dark:border-theme-border px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-blue-400 dark:focus:border-theme-focus disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-theme-subtle disabled:text-gray-400 dark:disabled:text-theme-disabled"
              />

              {hasError && (
                <p role="alert" className="mt-2 text-sm text-red-500 dark:text-theme-danger">
                  소속 또는 가입 신청 상태를 확인하지 못했습니다.
                  <button
                    type="button"
                    onClick={() => {
                      refetchMyClubs();
                      refetchJoins();
                    }}
                    className="ml-2 underline"
                  >
                    다시 시도
                  </button>
                </p>
              )}
              <div className="mt-4 flex justify-end gap-3">
                {isApplied && !isMember && (
                  <button
                    type="button"
                    disabled={
                      isChecking ||
                      hasError ||
                      cancelMutation.isPending ||
                      joinMutation.isPending
                    }
                    onClick={() => {
                      if (
                        isAuthenticated &&
                        !isChecking &&
                        !hasError &&
                        !cancelMutation.isPending &&
                        !joinMutation.isPending &&
                        window.confirm("가입 신청을 취소하시겠습니까?")
                      )
                        cancelMutation.mutate();
                    }}
                    className="rounded-lg border border-red-200 dark:border-theme-danger-border px-5 py-3 text-sm text-red-600 dark:text-theme-danger disabled:opacity-50 cursor-pointer"
                  >
                    {cancelMutation.isPending ? "취소 중..." : "가입 신청 취소"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={
                    cannotJoin ||
                    !joinMessage.trim() ||
                    joinMutation.isPending ||
                    cancelMutation.isPending
                  }
                  className="flex min-w-36 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 dark:bg-theme-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-theme-disabled-bg"
                >
                  {joinMutation.isPending && (
                    <Loader2 size={16} className="animate-spin" />
                  )}

                  {isMember
                    ? "이미 소속된 동아리 입니다."
                    : isApplied
                      ? "신청 완료 · 승인 대기"
                      : isChecking || hasError
                        ? "소속 확인 중"
                        : joinState.blocked
                          ? "신청 불가"
                          : joinMutation.isPending
                            ? "신청 중..."
                            : joinState.canReapply
                              ? "다시 가입 신청하기"
                              : "가입 신청하기"}
                </button>
              </div>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
