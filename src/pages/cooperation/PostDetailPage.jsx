import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import RecruitmentActions from "./RecruitmentActions";
import SafeImage from "../../components/common/SafeImage";
import { getContentImageUrl } from "../../utils/imageUtils";
import { useAuth } from "../../context/AuthContext";
import { isOwnRecruitment } from "../../utils/recruitmentOwnership";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function authHeader() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getDdayClass(dday) {
  const n = parseInt((dday ?? "D-99").replace("D-", ""));
  if (n <= 7) return "bg-green-100 dark:bg-theme-success-bg text-green-700 dark:text-theme-success";
  if (n <= 14) return "bg-cyan-100 dark:bg-theme-accent text-cyan-700 dark:text-theme-link";
  return "bg-blue-100 dark:bg-theme-accent text-blue-700 dark:text-theme-link";
}

// ─── 공통 상세 레이아웃 (UI 동일) ────────────────────────────────────────────
function DetailLayout({
  dday,
  clubLabel,
  buttonColor,
  fields,
  title,
  imageUrl,
  onBack,
  onContact,
  contactDisabled,
  isOwnPost,
  actions,
}) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-theme-page flex flex-col">
      <div className="w-full bg-slate-200 dark:bg-theme-raised flex items-center justify-between gap-3 px-3 sm:px-4 min-h-14 py-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-slate-300 dark:hover:bg-theme-hover transition-colors duration-150 cursor-pointer"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={18} strokeWidth={2} className="text-gray-600 dark:text-theme-secondary" />
          </button>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${getDdayClass(
              dday
            )}`}
          >
            {dday}
          </span>
        </div>
        <span className="min-w-0 truncate text-sm font-medium text-gray-600 dark:text-theme-secondary pr-1">
          {clubLabel}
        </span>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-6 sm:px-6 sm:pt-12 sm:pb-8 lg:pt-16">
        <div className="w-full max-w-xl bg-white dark:bg-theme-surface rounded-2xl shadow-sm dark:shadow-theme-shadow overflow-hidden">
          <SafeImage src={imageUrl} getSrc={getContentImageUrl}
            fallbackSrc="" alt="모집 이미지" className="w-full h-48 sm:h-75 object-cover" />

          <div className="px-4 py-5 sm:px-6 sm:py-6 flex flex-col gap-4">
            <h1 className="[overflow-wrap:anywhere] text-lg sm:text-xl font-bold text-gray-900 dark:text-theme-text leading-snug">
              {title}
            </h1>

            <div className="flex flex-col gap-2">
              {fields.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <span className="text-sm text-gray-400 dark:text-theme-muted w-20 shrink-0">
                    {label}
                  </span>
                  <span className="min-w-0 text-sm text-gray-800 dark:text-theme-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value}</span>
                </div>
              ))}
            </div>

            {actions}
            <button
              onClick={onContact}
              disabled={contactDisabled}
              className={`w-full mt-2 py-3 rounded-xl text-white text-sm font-semibold transition-opacity duration-150 hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${buttonColor}`}
            >
              문의하기
            </button>
            {isOwnPost && <p className="text-center text-xs text-gray-500 dark:text-theme-muted">본인이 작성한 게시물에는 문의할 수 없습니다.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── 로딩 / 에러 공통 ─────────────────────────────────────────────────────────
function LoadingView() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-theme-page flex items-center justify-center">
      <Loader2 size={24} className="text-gray-300 dark:text-theme-muted animate-spin" />
    </div>
  );
}

function ErrorView({ message, onBack }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-theme-page flex flex-col items-center justify-center gap-3 px-4 text-center">
      <AlertCircle size={24} className="text-red-300 dark:text-theme-danger" strokeWidth={1.5} />
      <p className="text-sm text-gray-400 dark:text-theme-muted">{message}</p>
      <button
        onClick={onBack}
        className="text-sm text-indigo-500 dark:text-theme-link hover:text-indigo-700 dark:hover:text-theme-link transition-colors cursor-pointer"
      >
        돌아가기
      </button>
    </div>
  );
}

// ─── 동아리 협업모집 상세 ─────────────────────────────────────────────────────
// GET /api/club-collaborations/:collabId
function ClubPostDetail({ id, onBack }) {
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/club-collaborations/${id}`,
          {
            headers: { ...authHeader() },
          }
        );
        if (res.status === 404) {
          setError("삭제된 게시글입니다.");
          return;
        }
        const data = await res.json();
        if (data.success) {
          setPost(data.data);
        } else {
          setError(data.message || "게시글을 찾을 수 없어요.");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onBack={onBack} />;

  const fields = [
    { label: "동아리:", value: post.clubName ?? "-" },
    { label: "대회명:", value: post.contestName ?? "-" },
    { label: "대회날짜:", value: post.contestDate ?? "미정" },
    { label: "내용:", value: post.content ?? "-" },
    { label: "마감일:", value: post.deadline ?? "-" },
    { label: "작성자:", value: post.writerName ?? "-" },
  ];

  const isOwnPost = isOwnRecruitment(post, user);

  // 문의하기 → 커피챗으로 연결
  async function handleContact() {
    if (authLoading || isOwnPost) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/club-collaborations/${id}/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
        }
      );

      const data = await res.json();

      console.log("채팅방 생성 응답", data);

      if (data.success) {
        navigate("/coffee-chat", {
          state: {
            roomId: data.data.chatRoomId,
          },
        });
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("채팅방 생성에 실패했습니다.");
    }
  }

  return (
    <DetailLayout
      dday={post.ddayText ?? post.dDayText ?? "D-?"}
      clubLabel={post.clubName ?? ""}
      buttonColor="bg-green-500 dark:bg-theme-success-action hover:bg-green-600 dark:hover:bg-theme-success-hover"
      fields={fields}
      title={post.title}
      imageUrl={post.imageUrl}
      onBack={onBack}
      onContact={handleContact}
      contactDisabled={authLoading || isOwnPost}
      isOwnPost={isOwnPost}
      actions={<RecruitmentActions type="club" id={id} post={post} onUpdated={setPost} />}
    />
  );
}

// ─── 프로젝트 팀원모집 상세 ───────────────────────────────────────────────────
// GET /api/project-recruitments/:projectRecruitmentId
function ProjectPostDetail({ id, onBack }) {
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/project-recruitments/${id}`,
          {
            headers: { ...authHeader() },
          }
        );
        if (res.status === 404) {
          setError("삭제된 게시글입니다.");
          return;
        }
        const data = await res.json();
        if (data.success) {
          setPost(data.data);
        } else {
          setError(data.message || "게시글을 찾을 수 없어요.");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onBack={onBack} />;

  const fields = [
    { label: "작성자:", value: post.writerName ?? "-" },
    { label: "작성자 분야:", value: post.writerStack ?? "-" },
    { label: "모집 구성:", value: post.positions ?? "-" },
    { label: "내용:", value: post.content ?? "-" },
    { label: "마감일:", value: post.deadline ?? "-" },
  ];

  const isOwnPost = isOwnRecruitment(post, user);

  // 문의하기 → writerId로 커피챗 생성 후 이동
  async function handleContact() {
    if (authLoading || isOwnPost) return;
    if (!post.writerId) {
      navigate("/coffee-chat");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ targetUserId: post.writerId, source: "PROJECT_RECRUITMENT", sourceId: Number(id) }),
      });
      const data = await res.json();
      if (data.success) {
        navigate("/coffee-chat", {
          state: {
            roomId: data.data.chatRoomId,
          },
        });
      } else {
        navigate("/coffee-chat");
      }
    } catch {
      navigate("/coffee-chat");
    }
  }

  return (
    <DetailLayout
      dday={post.dDay ?? "D-?"}
      clubLabel={post.writerStack ?? ""}
      buttonColor="bg-indigo-600 hover:bg-indigo-700"
      fields={fields}
      title={post.title}
      imageUrl={post.imageUrl}
      onBack={onBack}
      onContact={handleContact}
      contactDisabled={authLoading || isOwnPost}
      isOwnPost={isOwnPost}
      actions={<RecruitmentActions type="project" id={id} post={post} onUpdated={setPost} />}
    />
  );
}

// ─── 메인 export ──────────────────────────────────────────────────────────────
// 라우터: /cooperation/club/:id  /  /cooperation/project/:id
export default function PostDetailPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/cooperation");
  };

  if (type === "club") return <ClubPostDetail key={id} id={id} onBack={handleBack} />;
  if (type === "project")
    return <ProjectPostDetail key={id} id={id} onBack={handleBack} />;

  return (
    <div className="p-8 text-center text-gray-400 dark:text-theme-muted">잘못된 접근입니다.</div>
  );
}
