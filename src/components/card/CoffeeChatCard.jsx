import { useNavigate } from "react-router-dom";
import { getProfileImageUrl } from "../../utils/imageUtils";
import { MEETING_TYPE_LABELS } from "../../utils/meetingType";
import SafeImage from "../common/SafeImage";
import { ArrowUpRight, Laptop, MapPin, Sparkles } from "lucide-react";

const DEFAULT_PROFILE_IMAGE = "https://placehold.co/206x206";

function CoffeeChatCard({
  id, // userId 받아옴
  name = "", // name 받아옴
  interestTopics = "", // interestTopics 받아옴
  meetingType = "", // meetingType 받아옴. online/offline 으로 받는다고 해서 한글로 바꾸는 작업 추가 예정
  profileImage = DEFAULT_PROFILE_IMAGE, // profileImage 받아옴
}) {
  const navigate = useNavigate();
  const normalizedMeetingType = String(meetingType).toUpperCase();
  const meetingTypeText = MEETING_TYPE_LABELS[normalizedMeetingType] || meetingType || "협의 가능";
  const MeetingIcon = normalizedMeetingType === "OFFLINE" ? MapPin : Laptop;

  return (
    <article className="relative flex h-full min-h-48 w-full min-w-0 items-center overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-6 shadow-[0px_6px_18px_rgba(15,23,42,0.07)] transition-all duration-200 dark:border-theme-border dark:bg-theme-surface dark:shadow-theme-shadow md:min-h-105 md:flex-col md:justify-center md:px-6 md:py-10 md:hover:-translate-y-1 md:hover:border-sky-300 md:hover:shadow-[0px_12px_30px_rgba(15,23,42,0.12)] md:dark:hover:border-theme-focus"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-sky-600 dark:bg-theme-primary" aria-hidden="true" />
      <div className="flex w-full min-w-0 items-center gap-4 md:flex-col md:gap-7">
        <SafeImage
          className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-sky-50 dark:ring-theme-border md:h-44 md:w-44"
          src={profileImage}
          fallbackSrc={DEFAULT_PROFILE_IMAGE}
          getSrc={getProfileImageUrl}
          alt={`${name} 프로필 이미지`}
          referrerPolicy="no-referrer"
          fallback={
            <div className="h-24 w-24 shrink-0 rounded-full bg-zinc-300 ring-4 ring-sky-50 dark:bg-theme-disabled-bg dark:ring-theme-border md:h-44 md:w-44" />
          }
        />

        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 md:w-full md:flex-none md:gap-5">
          <div className="max-w-full truncate text-center text-lg font-bold leading-6 text-gray-900 dark:text-theme-text md:text-2xl md:leading-8">
            {name}
          </div>

          <div className="flex w-full min-w-0 flex-col items-center gap-2.5 md:gap-4">
            <div className="flex max-w-full items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 dark:bg-theme-accent dark:text-theme-link md:text-sm">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{interestTopics || "관심 분야 미설정"}</span>
            </div>

            <div className="flex max-w-full items-center gap-1.5 text-center text-xs font-medium text-slate-500 dark:text-theme-muted md:text-sm">
              <MeetingIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {meetingTypeText}
            </div>

            <button
              type="button"
              onClick={() => navigate(`/coffee-chat/profile/${id}`)}
              className="flex h-11 w-full touch-manipulation cursor-pointer items-center justify-center gap-2 rounded-lg bg-sky-700 px-3 text-sm font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-theme-primary dark:hover:bg-theme-primary-hover dark:focus-visible:outline-theme-focus md:max-w-52"
            >
              프로필 보기 <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default CoffeeChatCard;
