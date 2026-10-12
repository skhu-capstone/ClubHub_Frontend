import { useNavigate } from "react-router-dom";
import { DEFAULT_FEED_IMAGE, getContentImageUrl } from "../../utils/imageUtils";
import SafeImage from "../common/SafeImage";
import { ArrowUpRight } from "lucide-react";

function FeedCard({
  id, // postId 받아옴
  clubId,
  author = "", // writer.userName 받아옴
  date = "", // createdAt 받아옴
  image = DEFAULT_FEED_IMAGE,// imageUrl 받아옴
  content = "", // content 받아옴
  profileImage, // writer.profileImage 받아옴
  postType = "GENERAL",
}) {
  const navigate = useNavigate();
  const hasClubId =
    clubId !== undefined && clubId !== null && String(clubId).trim() !== "";
  const detailPath = hasClubId
    ? `/clubs/${clubId}/posts/${id}`
    : `/club/posts/${id}`;
  
  return (
    <button
      type="button"
      onClick={() => navigate(detailPath)}
      aria-label={`${author || "동아리"} 게시글 상세 보기`}
      className="group relative grid h-full min-h-40 w-full min-w-0 touch-manipulation cursor-pointer grid-cols-[6.5rem_minmax(0,1fr)] grid-rows-[auto_1fr] gap-x-3 gap-y-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0px_4px_14px_rgba(15,23,42,0.07)] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-theme-border dark:bg-theme-surface dark:shadow-theme-shadow dark:focus-visible:outline-theme-focus sm:grid-cols-[8rem_minmax(0,1fr)] md:flex md:min-h-100 md:flex-col md:items-start md:justify-start md:gap-4 md:p-5 md:hover:-translate-y-1 md:hover:border-indigo-300 md:hover:shadow-[0px_12px_28px_rgba(15,23,42,0.12)] md:dark:hover:border-theme-focus xl:h-113.75 xl:min-h-0"
    >
      <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2 md:order-1 md:col-auto md:row-auto md:w-full md:gap-3">
        {/* 프로필 이미지 */}
        <SafeImage
          src={profileImage}
          alt={`${author} 프로필 이미지`}
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-indigo-50 dark:ring-theme-border md:h-11 md:w-11"
          referrerPolicy="no-referrer"
          fallback={<div className="h-8 w-8 shrink-0 rounded-full bg-zinc-300 ring-2 ring-indigo-50 dark:bg-theme-disabled-bg dark:ring-theme-border md:h-11 md:w-11" />}
        />

        <div className="flex h-8 min-w-0 flex-1 flex-col items-start justify-center md:h-11">
          {/* 작성자 */}
          <div className="max-w-full truncate text-xs font-bold leading-4 text-gray-900 dark:text-theme-text md:text-sm md:leading-5">
            {author}
          </div>
          {/* 작성한 날짜 */}
          <div className="text-[11px] font-normal leading-4 text-slate-500 dark:text-theme-muted md:text-xs md:leading-5">
            {date?.slice(0, 10).replace(/-/g, ".")}
          </div>
        </div>
        {postType === "NOTICE" && <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-theme-warning-border dark:bg-theme-warning-bg dark:text-theme-warning">공지</span>}
        <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-600 dark:text-theme-muted dark:group-hover:text-theme-link md:block" aria-hidden="true" />
      </div>

      {/* 피드 이미지 -> 여기서 이미지 없으면 어떻게 할지 생각해야 할듯. 필수요소 설정? */}
      <SafeImage
        className="col-start-1 row-span-2 row-start-1 h-full min-h-28 w-full self-stretch rounded-lg object-cover md:order-2 md:h-64 md:min-h-0 md:w-full md:rounded-lg"
        src={image}
        fallbackSrc={DEFAULT_FEED_IMAGE}
        getSrc={getContentImageUrl}
        alt="피드 이미지"
      />

      {/* 내용 */}
      <div
        className="col-start-2 row-start-2 w-full min-w-0 max-w-full self-start overflow-hidden [overflow-wrap:anywhere] text-sm font-normal leading-5 text-slate-600 dark:text-theme-secondary md:order-3 md:col-auto md:row-auto md:text-base md:leading-6 md:text-slate-700 md:dark:text-theme-secondary"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 4,
        }}
      >
        {content}
      </div>
    </button>
  );
}

export default FeedCard;
