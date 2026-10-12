import { useEffect, useRef, useState } from "react";
import FeedCard from "../../components/card/FeedCard";
import ClubPostOrderEditor from "../../components/card/ClubPostOrderEditor";
import ClubCalendar from "../../components/card/ClubCalendar";
import SafeImage from "../../components/common/SafeImage";
import { useQuery } from "@tanstack/react-query";
import { getMyClubs, getClubMembers, getClubPosts } from "../../services/clubService";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DEFAULT_FEED_IMAGE,
  getContentImageUrl,
  getProfileImageUrl,
} from "../../utils/imageUtils";
import { useAuth } from "../../context/AuthContext";
import { ChevronDown, FilePenLine, Settings } from "lucide-react";

const VALID_TABS = ["feeds", "members", "calendar"];

export default function ClubMainPage() {
  const [currentFeedPage, setCurrentFeedPage] = useState(1); // 피드 페이지 번호
  const [currentMemberPage, setCurrentMemberPage] = useState(1); // 멤버 페이지 번호
  const [isClubMenuOpen, setIsClubMenuOpen] = useState(false);
  const [orderingClubId, setOrderingClubId] = useState(null);
  const clubMenuRef = useRef(null);
  const navigate = useNavigate();
  const { clubId } = useParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const accessToken = localStorage.getItem("accessToken");
  const isAuthenticated = !!authUser && !!accessToken;
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : "feeds";

  const getImageUrl = (url) => {
    return getContentImageUrl(url, DEFAULT_FEED_IMAGE);
  };

  const getMemberProfileImage = (member) => {
    return getProfileImageUrl(
      {
        coffeeChatProfileImageUrl: member.coffeeChatProfileImageUrl,
        profileImage: member.profileImage,
      },
      ""
    );
  };

  const getWriterProfileImage = (feed) => {
    return getProfileImageUrl(
      {
        coffeeChatProfileImageUrl:
          feed.writerCoffeeChatProfileImageUrl ??
          feed.writer?.coffeeChatProfileImageUrl,
        googleProfileImageUrl:
          feed.writerGoogleProfileImageUrl ?? feed.writer?.googleProfileImageUrl,
        profileImageUrl:
          feed.writerProfileImageUrl ??
          feed.profileImageUrl ??
          feed.writer?.profileImageUrl,
        profileImage:
          feed.writerProfileImage ?? feed.profileImage ?? feed.writer?.profileImage,
      },
      ""
    );
  };

  const getMemberInitial = (name = "") => name.trim().slice(0, 1) || "?";

  const getFeedWriterId = (feed) =>
    [
      feed.writerId,
      feed.writerUserId,
      feed.userId,
      feed.writer?.userId,
      feed.writer?.id,
    ].find((id) => id !== undefined && id !== null && String(id).trim() !== "");

  const {
    data: clubs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["myClubs"],
    queryFn: getMyClubs,
    enabled: isAuthenticated,
  });

  const hasClub = clubs.length > 0;
  const routeClubId = Number(clubId);
  const hasRouteClubId = Number.isInteger(routeClubId) && routeClubId > 0;

  const selectedClub = hasRouteClubId
    ? clubs.find((club) => Number(club.clubId) === routeClubId)
    : clubs[0];

  const selectedClubId = selectedClub?.clubId;
  const loginUser = authUser ?? parseStoredUser();

  useEffect(() => {
    if (isLoading || !hasClub) return;

    if (!hasRouteClubId) {
      navigate(`/club/main/${clubs[0].clubId}?tab=${activeTab}`, { replace: true });
      return;
    }

  }, [activeTab, clubs, hasClub, hasRouteClubId, isLoading, navigate]);

  useEffect(() => {
    if (tabParam && !VALID_TABS.includes(tabParam)) {
      setSearchParams({ tab: "feeds" }, { replace: true });
    }
  }, [setSearchParams, tabParam]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clubMenuRef.current && !clubMenuRef.current.contains(event.target)) {
        setIsClubMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    data: members = [],
    isLoading: isMembersLoading,
    isError: isMembersError,
  } = useQuery({
    queryKey: ["clubMembers", selectedClubId],
    queryFn: () => getClubMembers(selectedClubId),
    enabled: isAuthenticated && !!selectedClubId,
  });

  const roleMap = {
    PRESIDENT: "대표",
    STAFF: "운영진",
    MEMBER: "부원",
  };

  const loginUserId = Number(loginUser?.userId ?? loginUser?.id);
  const myRole = members
    .find((member) => Number(member.userId ?? member.id) === loginUserId)
    ?.role?.trim()
    .toUpperCase();

  const isRoleResolved = !isMembersLoading && !isMembersError;
  const isPresident = isRoleResolved && myRole === "PRESIDENT";
  const canManageClub = isRoleResolved && ["PRESIDENT", "STAFF"].includes(myRole);
  const isOrderingPosts = canManageClub && orderingClubId === selectedClubId && activeTab === "feeds";

  const {
    data: postsData,
    isLoading: isPostsLoading,
    isError: isPostsError,
  } = useQuery({
    queryKey: ["clubPosts", selectedClubId, currentFeedPage],
    queryFn: () =>
      getClubPosts({
        clubId: selectedClubId,
        page: currentFeedPage - 1,
        size: 4,
      }),
    enabled: isAuthenticated && !!selectedClubId,
  });

  const feeds = Array.isArray(postsData)
    ? postsData
    : Array.isArray(postsData?.content)
      ? postsData.content
      : postsData
        ? [postsData]
        : [];

  const membersById = Object.fromEntries(
    members
      .map((member) => [member.userId ?? member.id, member])
      .filter(([id]) => id !== undefined && id !== null)
      .map(([id, member]) => [String(id), member])
  );
  const membersByName = Object.fromEntries(
    members.map((member) => [member.name, member])
  );

  const totalFeedPages = postsData?.totalPages ?? 0;
  const clubListErrorStatus = error?.response?.status;
  const isAuthError =
    clubListErrorStatus === 401 || clubListErrorStatus === 403;

  if (authLoading || isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 dark:bg-theme-page">
        <p className="text-sm font-medium text-slate-500 dark:text-theme-muted sm:text-base">동아리 정보를 불러오는 중입니다...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 dark:bg-theme-page sm:px-6">
        <section className="flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl bg-white px-5 py-10 text-center shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)] dark:bg-theme-surface dark:shadow-theme-shadow sm:gap-8 sm:px-12 sm:py-14">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-theme-text sm:text-3xl">
              로그인이 필요합니다.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-900/60 dark:text-theme-muted">
              내 동아리 정보를 확인하려면 먼저 로그인해주세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="h-12 rounded-xl bg-sky-700 dark:bg-theme-primary px-5 text-sm font-semibold text-white hover:bg-sky-800 dark:hover:bg-theme-primary-hover"
          >
            로그인하기
          </button>
        </section>
      </main>
    );
  }

  if (isError) {
    if (isAuthError) {
      return (
        <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 dark:bg-theme-page sm:px-6">
          <section className="flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl bg-white px-5 py-10 text-center shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)] dark:bg-theme-surface dark:shadow-theme-shadow sm:gap-8 sm:px-12 sm:py-14">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-theme-text sm:text-3xl">
                로그인이 만료되었습니다.
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-900/60 dark:text-theme-muted">
                다시 로그인한 뒤 내 동아리 정보를 확인해주세요.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="h-12 rounded-xl bg-sky-700 dark:bg-theme-primary px-5 text-sm font-semibold text-white hover:bg-sky-800 dark:hover:bg-theme-primary-hover"
            >
              로그인하기
            </button>
          </section>
        </main>
      );
    }

    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 dark:bg-theme-page sm:px-6">
        <section className="flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl bg-white px-5 py-10 text-center shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)] dark:bg-theme-surface dark:shadow-theme-shadow sm:px-12 sm:py-14">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-theme-text sm:text-3xl">
            동아리 정보를 불러오지 못했습니다.
          </h1>
          <p className="text-base leading-7 text-slate-900/60 dark:text-theme-muted">
            잠시 후 다시 시도해주세요.
          </p>
        </section>
      </main>
    );
  }

  if (!hasClub) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 dark:bg-theme-page sm:px-6">
        <section className="flex w-full max-w-2xl flex-col items-center gap-7 sm:gap-10">
          <h1 className="text-center text-2xl font-bold leading-9 text-black dark:text-theme-text sm:text-4xl sm:leading-tight">
            소속된 동아리가 없습니다. 동아리에 참여하거나 만들어보세요!
          </h1>
          <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:items-center sm:gap-8">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="h-12 w-full rounded-xl bg-zinc-400 text-base font-bold text-white dark:bg-theme-disabled-bg sm:h-18 sm:w-62.5 sm:rounded-[20px] sm:text-2xl"
            >
              메인으로 돌아가기
            </button>
            <button
              type="button"
              onClick={() => navigate("/club/create")}
              className="h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white dark:bg-theme-primary sm:h-18 sm:w-62.5 sm:rounded-[20px] sm:text-2xl"
            >
              동아리 생성하기
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!selectedClub) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 dark:bg-theme-page sm:px-6">
        <section className="flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl bg-white px-5 py-10 text-center shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)] dark:bg-theme-surface dark:shadow-theme-shadow sm:gap-8 sm:px-12 sm:py-14">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-theme-text sm:text-3xl">
              접근할 수 없는 동아리입니다.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-900/60 dark:text-theme-muted">
              존재하지 않는 동아리이거나, 현재 계정으로 가입되어 있지 않은
              동아리입니다.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:items-center">
            <button
              type="button"
              onClick={() => navigate(`/club/main/${clubs[0].clubId}`, { replace: true })}
              className="h-12 rounded-xl bg-sky-700 dark:bg-theme-primary px-5 text-sm font-semibold text-white hover:bg-sky-800 dark:hover:bg-theme-primary-hover"
            >
              내 동아리로 이동
            </button>
            <button
              type="button"
              onClick={() => navigate("/club/apply")}
              className="h-12 rounded-xl border border-slate-300 dark:border-theme-border-strong bg-white dark:bg-theme-surface px-5 text-sm font-semibold text-slate-700 dark:text-theme-secondary hover:bg-slate-50 dark:hover:bg-theme-hover"
            >
              동아리 신청하기
            </button>
          </div>
        </section>
      </main>
    );
  }

  // 한 페이지의 최대 요소 개수
  const memberPerPage = 10;

  // 위에 있는 멤버 프리뷰
  const previewMembers = members.slice(0, 4);
  const previewMemberNames = members.slice(0, 2).map((member) => member.name).filter(Boolean);
  const hiddenMemberCount = members.length - previewMemberNames.length;

  // 전체 페이지 수 계산한 거
  const totalMemberPages = Math.ceil(members.length / memberPerPage);
  const safeTotalMemberPages = Math.max(totalMemberPages, 1);
  const safeCurrentMemberPage = Math.min(
    Math.max(currentMemberPage, 1),
    safeTotalMemberPages
  );

  const currentMembers = members.slice(
    (safeCurrentMemberPage - 1) * memberPerPage,
    safeCurrentMemberPage * memberPerPage,
  );

  // 현재 탭 기준으로 페이지 정보 결정 (피드랑 멤버)
  const safeTotalFeedPages = Math.max(totalFeedPages, 1);
  const safeCurrentFeedPage = Math.min(
    Math.max(currentFeedPage, 1),
    safeTotalFeedPages
  );
  const currentPage =
    activeTab === "feeds" ? safeCurrentFeedPage : safeCurrentMemberPage;
  const totalPages =
    activeTab === "feeds" ? safeTotalFeedPages : safeTotalMemberPages;
  const paginationPages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => {
      const firstPage = Math.min(
        Math.max(currentPage - 2, 1),
        Math.max(totalPages - 4, 1)
      );
      return firstPage + index;
    }
  );

  const handlePrevPage = () => {
    if (activeTab === "feeds") {
      setCurrentFeedPage((prev) => Math.max(prev - 1, 1));
    } else {
      setCurrentMemberPage((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleNextPage = () => {
    if (activeTab === "feeds") {
      setCurrentFeedPage((prev) => Math.min(prev + 1, safeTotalFeedPages));
    } else {
      setCurrentMemberPage((prev) => Math.min(prev + 1, safeTotalMemberPages));
    }
  };

  const handleSelectClub = (nextClubId) => {
    setOrderingClubId(null);
    setIsClubMenuOpen(false);
    setCurrentFeedPage(1);
    setCurrentMemberPage(1);
    navigate(`/club/main/${nextClubId}?tab=${activeTab}`);
  };

  const handlePresidentManageClick = () => {
    if (!isPresident) {
      alert("대표만 접근할 수 있습니다.");
      return;
    }

    navigate(`/club/president/${selectedClubId}`);
  };

  const handlePostCreateClick = () => {
    if (!canManageClub) {
      alert("대표 또는 운영진만 게시물을 작성할 수 있습니다.");
      return;
    }

    navigate(`/clubs/${selectedClubId}/posts/create`);
  };

  const handleTabChange = (nextTab) => {
    setOrderingClubId(null);
    setSearchParams({ tab: nextTab });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-theme-page sm:px-6 sm:py-8 lg:px-12 lg:py-12">
      <section className="mx-auto flex w-full max-w-330 flex-col">
        <header className="flex flex-col gap-5 border-b border-slate-300 pb-0 dark:border-theme-border-strong sm:gap-7">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0" ref={clubMenuRef}>
              <button
                type="button"
                onClick={() => setIsClubMenuOpen((prev) => !prev)}
                className="flex max-w-full items-center gap-1 rounded-lg py-1 pr-2 text-left hover:bg-slate-100 dark:hover:bg-theme-hover"
                aria-expanded={isClubMenuOpen}
                aria-haspopup="menu"
              >
                <h1 className="truncate text-2xl font-bold leading-8 text-gray-900 dark:text-theme-text sm:text-3xl sm:leading-9 lg:text-4xl lg:leading-10">
                  {selectedClub.clubName}
                </h1>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform dark:text-theme-muted ${isClubMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isClubMenuOpen && (
                <div
                  className="absolute left-0 top-full z-40 mt-2 max-h-80 w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-theme-border dark:bg-theme-surface dark:shadow-theme-shadow"
                  role="menu"
                >
                  {clubs.map((club) => {
                    const isSelected = Number(club.clubId) === Number(selectedClubId);

                    return (
                      <button
                        key={club.clubId}
                        type="button"
                        role="menuitem"
                        onClick={() => handleSelectClub(club.clubId)}
                        className={`flex w-full flex-col px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-theme-hover ${
                          isSelected ? "bg-sky-50 dark:bg-theme-accent" : ""
                        }`}
                      >
                        <span
                          className={`text-sm font-bold ${
                            isSelected ? "text-sky-700 dark:text-theme-link" : "text-gray-900 dark:text-theme-text"
                          }`}
                        >
                          {club.clubName}
                        </span>
                        {club.category && (
                          <span className="mt-1 text-xs text-slate-900/50 dark:text-theme-muted">
                            {club.category}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
              {isPresident && (
                <button
                  onClick={handlePresidentManageClick}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-700/30 bg-white px-4 text-sm font-semibold text-sky-700 hover:border-sky-700 hover:bg-sky-50 dark:border-theme-focus dark:bg-theme-surface dark:text-theme-link dark:hover:border-theme-focus dark:hover:bg-theme-accent-hover sm:h-12 sm:px-5"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  대표 관리
                </button>
              )}

              {canManageClub && (
                <button
                  onClick={handlePostCreateClick}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 dark:bg-theme-primary dark:hover:bg-theme-primary-hover sm:h-12 sm:px-5"
                >
                  <FilePenLine className="h-4 w-4" aria-hidden="true" />
                  게시물 작성
                </button>
              )}
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center">
              {previewMembers.map((member, index) => {
                const profileImage = getMemberProfileImage(member);

                return (
                  <SafeImage
                    key={member.userId}
                    src={profileImage}
                    alt="멤버 프로필"
                    className={`h-8 w-8 rounded-full border-2 border-slate-50 dark:border-theme-border object-cover ${
                      index !== 0 ? "-ml-2" : ""
                    }`}
                    referrerPolicy="no-referrer"
                    fallback={
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-50 dark:border-theme-border bg-slate-300 dark:bg-theme-disabled-bg text-xs font-bold text-slate-600 dark:text-theme-secondary ${
                          index !== 0 ? "-ml-2" : ""
                        }`}
                      >
                        {getMemberInitial(member.name)}
                      </div>
                    }
                  />
                );
              })}
            </div>

            <p className="min-w-0 truncate text-sm text-slate-900/60 dark:text-theme-muted sm:text-base">
              {previewMemberNames.join(", ")}
              {hiddenMemberCount > 0 && (
                <span> 외 {hiddenMemberCount}명</span>
              )}
            </p>
          </div>

          <nav className="grid grid-cols-3" aria-label="동아리 페이지 메뉴">
            <button
              onClick={() => handleTabChange("feeds")}
              className={`min-h-12 px-2 py-3 text-sm font-semibold sm:px-7 sm:text-base ${
                activeTab === "feeds"
                  ? "border-b-2 border-blue-600 dark:border-theme-focus text-blue-600 dark:text-theme-link"
                  : "text-slate-900/60 dark:text-theme-muted"
              }`}
            >
              피드
            </button>

            <button
              onClick={() => handleTabChange("members")}
              className={`min-h-12 px-2 py-3 text-sm font-semibold sm:px-7 sm:text-base ${
                activeTab === "members"
                  ? "border-b-2 border-blue-600 dark:border-theme-focus text-blue-600 dark:text-theme-link"
                  : "text-slate-900/60 dark:text-theme-muted"
              }`}
            >
              멤버
            </button>

            <button
              onClick={() => handleTabChange("calendar")}
              className={`min-h-12 px-2 py-3 text-sm font-semibold sm:px-7 sm:text-base ${
                activeTab === "calendar"
                  ? "border-b-2 border-blue-600 dark:border-theme-focus text-blue-600 dark:text-theme-link"
                  : "text-slate-900/60 dark:text-theme-muted"
              }`}
            >
              캘린더
            </button>
          </nav>
        </header>

        {/* 조건부로 렌더링 -> 피드 or 멤버 or 캘린더 */}
        {activeTab === "feeds" && canManageClub && !isOrderingPosts && (
          <div className="mt-4 flex justify-end sm:mt-5">
            <button type="button" onClick={() => setOrderingClubId(selectedClubId)}
              className="w-full rounded-xl border border-sky-700/30 bg-white px-5 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 dark:border-theme-focus dark:bg-theme-surface dark:text-theme-link dark:hover:bg-theme-accent-hover sm:w-auto">
              게시물 순서 편집
            </button>
          </div>
        )}
        {isOrderingPosts ? (
          <ClubPostOrderEditor key={selectedClubId} clubId={selectedClubId}
            onClose={() => setOrderingClubId(null)}
            onSaved={() => { setCurrentFeedPage(1); setOrderingClubId(null); }} />
        ) : activeTab === "feeds" ? (
          <section className="grid grid-cols-1 gap-4 py-5 md:grid-cols-2 md:gap-6 lg:gap-10 lg:py-7">
            {isPostsLoading ? (
              <p>게시글을 불러오는 중입니다...</p>
            ) : isPostsError ? (
              <p>게시글을 불러오지 못했습니다.</p>
            ) : feeds.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-center text-sm font-medium text-slate-900/50 dark:border-theme-border-strong dark:bg-theme-surface dark:text-theme-muted md:col-span-2 md:min-h-80 md:text-base">
                아직 작성된 게시글이 없습니다.
              </div>
            ) : (
              feeds.map((feed) => {
                const writerId = getFeedWriterId(feed);
                const matchedMember =
                  writerId !== undefined && writerId !== null
                    ? membersById[String(writerId)]
                    : membersByName[feed.writerName];

                return (
                  <FeedCard
                    key={feed.postId}
                    id={feed.postId}
                    clubId={selectedClubId}
                    author={feed.writerName}
                    date={feed.createdAt}
                    profileImage={
                      getWriterProfileImage(feed) ??
                      getMemberProfileImage(matchedMember ?? {})
                    }
                    image={getImageUrl(feed.imageUrls?.[0])}
                    content={feed.content}
                    postType={feed.postType}
                  />
                );
              })
            )}
          </section>
        ) : activeTab === "members" ? (
          <section className="py-5 sm:py-7">
            {isMembersLoading ? (
              <p>멤버 정보를 불러오는 중입니다...</p>
            ) : isMembersError ? (
              <p>멤버 정보를 불러오지 못했습니다.</p>
            ) : members.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-center text-sm font-medium text-slate-900/50 dark:border-theme-border-strong dark:bg-theme-surface dark:text-theme-muted sm:min-h-80 sm:text-base">
                아직 표시할 멤버가 없습니다.
              </div>
            ) : (
              currentMembers.map((member) => {
                const profileImage = getMemberProfileImage(member);

                return (
                  <div
                    key={member.userId}
                    className="mb-2 flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-theme-border dark:bg-theme-surface sm:mb-0 sm:h-16 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:shadow-none sm:dark:bg-transparent"
                  >
                    <SafeImage
                      src={profileImage}
                      alt={`${member.name} 프로필`}
                      className="h-10 w-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      fallback={
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 dark:bg-theme-disabled-bg text-sm font-bold text-slate-600 dark:text-theme-secondary">
                          {getMemberInitial(member.name)}
                        </div>
                      }
                    />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 sm:block">
                      <div className="min-w-0">
                      <span className="text-sm font-bold text-gray-900 dark:text-theme-text">
                        {member.name}
                      </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-theme-accent dark:text-theme-link sm:mt-0.5 sm:inline-block sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:font-normal sm:text-slate-900/60 sm:dark:bg-transparent sm:dark:text-theme-muted">
                        {roleMap[member.role] ?? member.role}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        ) : (
          <ClubCalendar clubId={selectedClubId} canManage={canManageClub} />
        )}

        {/* 페이지 이동 섹션 */}
        {activeTab !== "calendar" && !isOrderingPosts && totalPages > 1 && (
          <div className="flex justify-center overflow-x-auto pb-7 pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-neutral-800 dark:text-theme-text hover:bg-slate-200 dark:hover:bg-theme-hover disabled:cursor-not-allowed
              disabled:text-gray-300 dark:disabled:text-theme-disabled disabled:hover:bg-transparent"
            >
              ‹
            </button>

            {paginationPages.map((page) => {
              return (
                <button
                  key={page}
                  onClick={() =>
                    activeTab === "feeds"
                      ? setCurrentFeedPage(page)
                      : setCurrentMemberPage(page)
                  }
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl text-base font-medium 
                    ${currentPage === page ? "bg-sky-700 dark:bg-theme-primary text-slate-50" : "text-gray-900/60 dark:text-theme-muted hover:bg-slate-200 dark:hover:bg-theme-hover"}`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-neutral-800 dark:text-theme-text hover:bg-slate-200 dark:hover:bg-theme-hover disabled:cursor-not-allowed
              disabled:text-gray-300 dark:disabled:text-theme-disabled disabled:hover:bg-transparent"
            >
              ›
            </button>
          </div>
          </div>
        )}
      </section>
    </main>
  );
}

const parseStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};
