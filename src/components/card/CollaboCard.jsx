import { useNavigate } from "react-router-dom";
import { ArrowUpRight, BriefcaseBusiness, Users } from "lucide-react";

function CollaboCard({
  id, // collabId 또는 projectRecruitmentId 받아옴
  type = "club", // 협업 게시글 관련 props
  title = "제목", // title 받아옴
  author = "작성자", // writerName 받아옴
  content = "내용", // content 받아옴
  dDay = "D-00", // dDay 받아옴
  onClick,
}) {
  const navigate = useNavigate();
  const isProject = type === "project" || type === "PROJECT";
  const TypeIcon = isProject ? BriefcaseBusiness : Users;

  return (
    // 전체 컨테이너
    <button
      type="button"
      // onClick이 따로 없으면 협업 타입에 맞는 상세 페이지로 이동
      onClick={onClick ?? (() => navigate(`/cooperation/${type}/${id}`))}
      aria-label={`${title} 상세 보기`}
      className="group relative flex h-full min-h-40 w-full min-w-0 touch-manipulation cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0px_4px_14px_rgba(15,23,42,0.06)] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-theme-border dark:bg-theme-surface dark:shadow-theme-shadow dark:focus-visible:outline-theme-focus md:min-h-48 md:p-5 md:hover:-translate-y-1 md:hover:border-emerald-300 md:hover:shadow-[0px_12px_26px_rgba(15,23,42,0.1)] md:dark:hover:border-theme-focus"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-theme-accent dark:text-theme-link">
          <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {isProject ? "프로젝트 모집" : "동아리 협업"}
        </span>
        <div className="flex h-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-50 px-2.5 dark:bg-amber-950/30">
          <span className="text-center text-sm font-bold text-amber-700 dark:text-amber-300">{dDay}</span>
        </div>
      </div>

      <div className="flex min-w-0 items-start justify-between gap-3">
        {/* 제목 */}
        <h3 className="line-clamp-2 min-w-0 flex-1 break-words font-pretendard text-base font-semibold leading-6 text-black dark:text-theme-text md:text-2xl md:leading-8">
          {title}
        </h3>

        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-600 dark:text-theme-muted dark:group-hover:text-theme-link" aria-hidden="true" />
      </div>

      {/* 작성자 */}
      <div className="flex min-w-0 justify-start border-b border-slate-100 pb-2 dark:border-theme-border">
        <span className="max-w-full truncate text-left text-xs font-medium text-slate-500 dark:text-theme-muted md:text-sm">
          {author}
        </span>
      </div>

      {/* 내용 */}
      <p className="line-clamp-2 break-words text-sm font-normal leading-5 text-slate-600 dark:text-theme-secondary md:text-base md:leading-6">
        {content}
      </p>
    </button>
  );
}

export default CollaboCard;
