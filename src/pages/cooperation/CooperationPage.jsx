import { useState, useEffect, useCallback, useRef } from "react";
import ImageFilePicker from "../../components/common/ImageFilePicker";
import { uploadProjectRecruitmentImage, uploadClubCollaborationImage } from "../../services/recruitmentService";
import {
  Search,
  Plus,
  X,
  AlertCircle,
  CalendarDays,
  Users,
  FileText,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import useMyClubs from "../../hooks/useMyClubs";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function authHeader() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getDdayClass(dday) {
  const n = parseInt((dday ?? "D-99").replace("D-", ""));
  if (n <= 7) return "bg-yellow-100 dark:bg-theme-warning-bg text-yellow-700 dark:text-theme-warning";
  if (n <= 14) return "bg-cyan-100 dark:bg-theme-accent text-cyan-700 dark:text-theme-link";
  return "bg-green-100 dark:bg-theme-success-bg text-green-700 dark:text-theme-success";
}

// ─── 카드 컴포넌트 ────────────────────────────────────────────────────────────
function ClubPostCard({ post, onClick }) {
  const dday = post.dDayText ?? "D-?";
  const tags = post.contestName ? [post.contestName] : [];
  const club = post.clubName ?? "";
  const deadline = post.deadline ? `마감: ${post.deadline}` : "";

  return (
    <div
      className="bg-white dark:bg-theme-surface rounded-2xl px-4 py-4 sm:px-6 sm:py-5 shadow-sm dark:shadow-theme-shadow flex flex-col gap-2 cursor-pointer hover:shadow-md dark:hover:shadow-theme-shadow transition-shadow duration-150"
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-3">
        <span className="font-semibold text-sm text-gray-900 dark:text-theme-text leading-snug min-w-0 flex-1 [overflow-wrap:anywhere]">
          {post.title}
        </span>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getDdayClass(
              dday
            )}`}
          >
            {dday}
          </span>
          <span className="max-w-28 break-words text-right text-xs text-gray-400 dark:text-theme-muted">{club}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-indigo-50 dark:bg-theme-accent text-indigo-600 dark:text-theme-link text-xs font-medium px-2.5 py-0.5 rounded-full"
          >
            {tag}
          </span>
        ))}
        <span className="text-xs text-gray-400 dark:text-theme-muted">{deadline}</span>
      </div>
      <p className="line-clamp-3 [overflow-wrap:anywhere] text-xs text-gray-500 dark:text-theme-muted">{post.content}</p>
    </div>
  );
}

function ProjectPostCard({ post, onClick }) {
  const dday = post.dDay ?? "D-?";
  return (
    <div
      className="bg-white dark:bg-theme-surface rounded-2xl p-5 shadow-sm dark:shadow-theme-shadow flex flex-col gap-2.5 cursor-pointer hover:shadow-md dark:hover:shadow-theme-shadow transition-shadow duration-150"
      onClick={onClick}
    >
      <span
        className={`text-xs font-bold px-2.5 py-0.5 rounded-full self-start ${getDdayClass(
          dday
        )}`}
      >
        {dday}
      </span>
      <p className="[overflow-wrap:anywhere] font-bold text-sm text-gray-900 dark:text-theme-text leading-snug">
        {post.title}
      </p>
      <p className="line-clamp-3 [overflow-wrap:anywhere] text-xs text-gray-500 dark:text-theme-muted flex-1">{post.content}</p>
      <p className="text-xs text-gray-400 dark:text-theme-muted">
        {post.deadline ? `~ ${post.deadline}` : ""}
      </p>
      <button
        className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors duration-150 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        지원하기
      </button>
    </div>
  );
}

// ─── 협업 모집 모달 ───────────────────────────────────────────────────────────
function CreateClubCollabModal({ onClose: closeModal, onSuccess }) {
  const [imageFile, setImageFile] = useState(null);
  const [createdPost, setCreatedPost] = useState(null);
  const submitting = useRef(false);
  const onClose = () => {
    if (submitting.current) return;
    if (createdPost) onSuccess(createdPost);
    else closeModal();
  };
  const { clubs, isAuthenticated, isChecking, hasError, refetch } = useMyClubs();
  const [form, setForm] = useState({
    clubId: "",
    title: "",
    contestName: "",
    contestDate: "",
    content: "",
    deadline: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const selectedClubId = form.clubId || (clubs.length === 1 ? String(clubs[0].clubId) : "");
  const selectedClub = clubs.find((club) => String(club.clubId) === selectedClubId);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setApiError("");
  }

  function validate() {
    const e = {};
    if (!selectedClub) e.clubId = "소속 동아리를 선택해주세요.";
    if (!form.title.trim()) e.title = "제목을 입력해주세요.";
    if (!form.contestName.trim()) e.contestName = "대회명을 입력해주세요.";
    if (!form.contestDate) e.contestDate = "대회 날짜를 선택해주세요.";
    if (!form.content.trim()) e.content = "내용을 입력해주세요.";
    if (!form.deadline) e.deadline = "마감일을 선택해주세요.";
    return e;
  }

  async function handleSubmit() {
    if (submitting.current || !isAuthenticated || (!createdPost && (isChecking || hasError))) return;
    const e = createdPost ? {} : validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    const payload = {
      clubId: selectedClub?.clubId,
      title: form.title.trim(),
      contestName: form.contestName.trim(),
      contestDate: form.contestDate,
      content: form.content.trim(),
      deadline: form.deadline,
    };

    submitting.current = true;
    setLoading(true);
    setApiError("");
    let savedPost = createdPost;
    try {
      if (!savedPost) {
        const res = await fetch(`${API_BASE_URL}/api/club-collaborations`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "등록에 실패했습니다.");
        savedPost = data.data;
        setCreatedPost(savedPost);
      }
      if (imageFile) {
        if (!savedPost?.collabId) throw new Error("모집글 번호를 확인할 수 없습니다. 목록에서 확인해주세요.");
        await uploadClubCollaborationImage(savedPost.collabId, imageFile);
      }
      onSuccess(savedPost);
    } catch (error) {
      setApiError(savedPost
        ? `모집글은 등록되었지만 사진 업로드를 완료하지 못했습니다. ${error.message} 사진 업로드를 다시 시도하거나 목록으로 이동해주세요.`
        : error.message || "네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-theme-surface rounded-t-2xl sm:rounded-2xl shadow-xl dark:shadow-theme-shadow w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col">
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-theme-border">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-theme-text">
              새 협업 모집하기
            </h2>
            <p className="text-xs text-gray-400 dark:text-theme-muted mt-0.5">
              동아리 협업 팀원을 모집해보세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-theme-hover transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={2} className="text-gray-500 dark:text-theme-muted" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain flex-1 px-4 sm:px-5 py-4 space-y-4">
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-theme-danger-bg border border-red-100 dark:border-theme-danger-border rounded-lg px-3 py-2.5">
              <AlertCircle
                size={14}
                className="text-red-500 dark:text-theme-danger mt-0.5 shrink-0"
                strokeWidth={2}
              />
              <p className="text-sm text-red-600 dark:text-theme-danger">{apiError}</p>
            </div>
          )}

          {/* 소속 동아리 */}
          <fieldset disabled={loading || !!createdPost} className="space-y-4">
          <div>
            <label htmlFor="collab-club" className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <Users size={12} strokeWidth={2} />
              소속 동아리 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <select
              id="collab-club"
              value={selectedClubId}
              onChange={(e) => setField("clubId", e.target.value)}
              disabled={loading || isChecking || hasError || clubs.length === 0}
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
                errors.clubId
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-green-400 dark:focus:border-theme-success"
              }`}
            >
              <option value="">{isChecking ? "소속 동아리 불러오는 중..." : "동아리를 선택해주세요"}</option>
              {clubs.map((club) => <option key={club.clubId} value={String(club.clubId)}>{club.clubName}</option>)}
            </select>
            {!isAuthenticated && <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">로그인 후 모집글을 등록해주세요.</p>}
            {isAuthenticated && !isChecking && !hasError && clubs.length === 0 && <p className="mt-1 text-xs text-gray-500 dark:text-theme-muted">소속된 동아리가 있어야 협업 모집을 등록할 수 있습니다.</p>}
            {hasError && <p role="alert" className="mt-1 text-xs text-red-500 dark:text-theme-danger">소속 동아리를 불러오지 못했습니다. <button type="button" onClick={() => refetch()} className="underline">다시 시도</button></p>}
            {errors.clubId && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.clubId}</p>
            )}
          </div>

          {/* 제목 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <FileText size={12} strokeWidth={2} />
              제목 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="예) 간지톤 같이 나갈 기획자 구해요"
              maxLength={100}
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
                errors.title
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-green-400 dark:focus:border-theme-success"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.title}</p>
            )}
          </div>

          {/* 대회명 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <FileText size={12} strokeWidth={2} />
              대회명 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <input
              type="text"
              value={form.contestName}
              onChange={(e) => setField("contestName", e.target.value)}
              placeholder="예) 간지톤"
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
                errors.contestName
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-green-400 dark:focus:border-theme-success"
              }`}
            />
            {errors.contestName && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.contestName}</p>
            )}
          </div>

          {/* 대회 날짜 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <CalendarDays size={12} strokeWidth={2} />
              대회 날짜 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <input
              type="date"
              value={form.contestDate}
              min={today}
              onChange={(e) => setField("contestDate", e.target.value)}
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
                errors.contestDate
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-green-400 dark:focus:border-theme-success"
              }`}
            />
            {errors.contestDate && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.contestDate}</p>
            )}
          </div>

          {/* 모집 마감일 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <CalendarDays size={12} strokeWidth={2} />
              모집 마감일 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <input
              type="date"
              value={form.deadline}
              min={today}
              onChange={(e) => setField("deadline", e.target.value)}
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
                errors.deadline
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-green-400 dark:focus:border-theme-success"
              }`}
            />
            {errors.deadline && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.deadline}</p>
            )}
          </div>

          {/* 내용 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <FileText size={12} strokeWidth={2} />
              내용 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setField("content", e.target.value)}
              placeholder="모집 내용, 우대 조건 등을 자유롭게 작성해주세요"
              rows={4}
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors resize-none ${
                errors.content
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-green-400 dark:focus:border-theme-success"
              }`}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.content}</p>
            )}
          </div>

          </fieldset>
          <ImageFilePicker file={imageFile} onChange={setImageFile} disabled={loading} />
          {createdPost && <p className="text-xs text-gray-500 dark:text-theme-muted">모집글은 이미 등록되었습니다. 사진 업로드를 재시도하거나 목록으로 이동할 수 있습니다.</p>}
        </div>

        <div className="shrink-0 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 px-4 sm:px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-theme-border">
          <button
            onClick={onClose}
            className="min-h-11 px-4 py-2 text-sm text-gray-500 dark:text-theme-muted bg-white dark:bg-theme-surface border border-gray-200 dark:border-theme-border rounded-lg hover:bg-gray-50 dark:hover:bg-theme-hover transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isAuthenticated || (!createdPost && (isChecking || hasError || !selectedClub))}
            className="min-h-11 px-4 py-2 text-sm text-white bg-green-500 dark:bg-theme-success-action rounded-lg hover:bg-green-600 dark:hover:bg-theme-success-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
          >
            {loading ? "등록 중..." : createdPost ? (imageFile ? "사진 업로드 재시도" : "완료") : "모집 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 프로젝트 모집 모달 ───────────────────────────────────────────────────────
function CreateProjectModal({ onClose: closeModal, onSuccess }) {
  const [imageFile, setImageFile] = useState(null);
  const [createdPost, setCreatedPost] = useState(null);
  const submitting = useRef(false);
  const onClose = () => {
    if (submitting.current) return;
    if (createdPost) onSuccess(createdPost);
    else closeModal();
  };
  const [form, setForm] = useState({
    title: "",
    writerStack: "",
    positions: "",
    content: "",
    deadline: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setApiError("");
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "제목을 입력해주세요.";
    if (!form.content.trim()) e.content = "내용을 입력해주세요.";
    if (!form.deadline) e.deadline = "마감일을 선택해주세요.";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    if (submitting.current) return;
    submitting.current = true;
    const payload = {
      title: form.title.trim(),
      writerStack: form.writerStack.trim() || undefined,
      positions: form.positions.trim() || undefined,
      content: form.content.trim(),
      deadline: form.deadline,
    };

    setLoading(true);
    setApiError("");
    let savedPost = createdPost;
    try {
      if (!savedPost) {
        const res = await fetch(`${API_BASE_URL}/api/project-recruitments`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "등록에 실패했습니다.");
        savedPost = data.data;
        setCreatedPost(savedPost);
      }
      if (imageFile) {
        if (!savedPost?.projectRecruitmentId) throw new Error("모집글 번호를 확인할 수 없습니다. 목록에서 확인해주세요.");
        await uploadProjectRecruitmentImage(savedPost.projectRecruitmentId, imageFile);
      }
      onSuccess(savedPost);
    } catch (error) {
      setApiError(savedPost
        ? `모집글은 등록되었지만 사진 업로드를 완료하지 못했습니다. ${error.message} 사진 업로드를 다시 시도하거나 목록으로 이동해주세요.`
        : error.message || "네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-theme-surface rounded-t-2xl sm:rounded-2xl shadow-xl dark:shadow-theme-shadow w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col">
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-theme-border">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-theme-text">
              새 팀원 모집하기
            </h2>
            <p className="text-xs text-gray-400 dark:text-theme-muted mt-0.5">
              프로젝트 팀원을 모집해보세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-theme-hover transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={2} className="text-gray-500 dark:text-theme-muted" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain flex-1 px-4 sm:px-5 py-4 space-y-4">
          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-theme-danger-bg border border-red-100 dark:border-theme-danger-border rounded-lg px-3 py-2.5">
              <AlertCircle
                size={14}
                className="text-red-500 dark:text-theme-danger mt-0.5 shrink-0"
                strokeWidth={2}
              />
              <p className="text-sm text-red-600 dark:text-theme-danger">{apiError}</p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <FileText size={12} strokeWidth={2} />
              제목 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              disabled={loading || !!createdPost}
              placeholder="예) 포폴용 앱 프로젝트 같이하실분"
              maxLength={100}
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
                errors.title
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-indigo-400 dark:focus:border-theme-focus"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <FileText size={12} strokeWidth={2} />내 스택/분야
              <span className="text-gray-400 dark:text-theme-muted font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={form.writerStack}
              disabled={loading || !!createdPost}
              onChange={(e) => setField("writerStack", e.target.value)}
              placeholder="예) 백엔드, 프론트엔드, 디자인"
              className="min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-theme-border focus:border-indigo-400 dark:focus:border-theme-focus outline-none transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <Users size={12} strokeWidth={2} />
              모집 포지션
              <span className="text-gray-400 dark:text-theme-muted font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={form.positions}
              disabled={loading || !!createdPost}
              onChange={(e) => setField("positions", e.target.value)}
              placeholder="예) 프론트 2명, 백엔드 1명"
              className="min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-theme-border focus:border-indigo-400 dark:focus:border-theme-focus outline-none transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <CalendarDays size={12} strokeWidth={2} />
              마감일 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <input
              type="date"
              value={form.deadline}
              min={today}
              onChange={(e) => setField("deadline", e.target.value)}
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
                errors.deadline
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-indigo-400 dark:focus:border-theme-focus"
              }`}
              disabled={loading || !!createdPost}
            />
            {errors.deadline && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.deadline}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-theme-muted mb-1.5">
              <FileText size={12} strokeWidth={2} />
              내용 <span className="text-red-400 dark:text-theme-danger">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setField("content", e.target.value)}
              disabled={loading || !!createdPost}
              placeholder="프로젝트 소개, 기술 스택, 우대 조건 등을 자유롭게 작성해주세요"
              rows={5}
              className={`min-w-0 min-h-11 w-full text-base sm:text-sm px-3 py-2 rounded-lg border outline-none transition-colors resize-none ${
                errors.content
                  ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                  : "border-gray-200 dark:border-theme-border focus:border-indigo-400 dark:focus:border-theme-focus"
              }`}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-500 dark:text-theme-danger">{errors.content}</p>
            )}
          </div>

          <ImageFilePicker file={imageFile} onChange={setImageFile} disabled={loading} />
          {createdPost && <p className="text-xs text-gray-500 dark:text-theme-muted">모집글은 이미 등록되었습니다. 사진 업로드를 재시도하거나 목록으로 이동할 수 있습니다.</p>}
        </div>

        <div className="shrink-0 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 px-4 sm:px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-theme-border">
          <button
            onClick={onClose}
            className="min-h-11 px-4 py-2 text-sm text-gray-500 dark:text-theme-muted bg-white dark:bg-theme-surface border border-gray-200 dark:border-theme-border rounded-lg hover:bg-gray-50 dark:hover:bg-theme-hover transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="min-h-11 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
          >
            {loading ? "등록 중..." : createdPost ? (imageFile ? "사진 업로드 재시도" : "완료") : "모집 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────
function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-theme-surface rounded-2xl px-6 py-5 h-24 animate-pulse"
        />
      ))}
    </div>
  );
}
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-theme-surface rounded-2xl p-5 h-44 animate-pulse" />
      ))}
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function CooperationPage() {
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab === "project" ? "project" : "club");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showClubModal, setShowClubModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isAuthenticated = !!authUser && !!localStorage.getItem("accessToken");

  const [clubPosts, setClubPosts] = useState([]);
  const [clubLoading, setClubLoading] = useState(false);
  const [clubError, setClubError] = useState("");

  const [projectPosts, setProjectPosts] = useState([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState("");

  const isClub = tab === "club";

  const fetchClubPosts = useCallback(async (keyword = "") => {
    setClubLoading(true);
    setClubError("");
    try {
      const params = new URLSearchParams({ page: 0, size: 20 });
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(
        `${API_BASE_URL}/api/club-collaborations?${params}`,
        {
          headers: { ...authHeader() },
        }
      );
      const data = await res.json();
      if (data.success) setClubPosts(data.data.content ?? []);
      else setClubError(data.message || "목록을 불러오지 못했습니다.");
    } catch {
      setClubError("네트워크 오류가 발생했습니다.");
    } finally {
      setClubLoading(false);
    }
  }, []);

  const fetchProjectPosts = useCallback(async (keyword = "") => {
    setProjectLoading(true);
    setProjectError("");
    try {
      const params = new URLSearchParams({ page: 0, size: 20 });
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(
        `${API_BASE_URL}/api/project-recruitments?${params}`,
        {
          headers: { ...authHeader() },
        }
      );
      const data = await res.json();
      if (data.success) setProjectPosts(data.data.content ?? []);
      else setProjectError(data.message || "목록을 불러오지 못했습니다.");
    } catch {
      setProjectError("네트워크 오류가 발생했습니다.");
    } finally {
      setProjectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isClub) fetchClubPosts("");
    else fetchProjectPosts("");
  }, [tab]);

  function handleSearch() {
    setSearch(searchInput);
    if (isClub) fetchClubPosts(searchInput);
    else fetchProjectPosts(searchInput);
  }

  function handleTabChange(newTab) {
    setTab(newTab);
    setSearchInput("");
    setSearch("");
  }

  function handleCreateClick() {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/cooperation" } });
      return;
    }

    if (isClub) setShowClubModal(true);
    else setShowProjectModal(true);
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-theme-page flex flex-col">
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8 flex flex-col gap-4 sm:gap-5">
        {/* 탭 */}
        <div className="grid grid-cols-2 bg-slate-200 dark:bg-theme-raised rounded-full p-1 gap-1">
          <button
            onClick={() => handleTabChange("club")}
            className={[
              "min-h-11 rounded-full px-2 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer",
              isClub
                ? "bg-green-500 dark:bg-theme-success-action text-white shadow"
                : "text-gray-500 dark:text-theme-muted hover:text-gray-700 dark:hover:text-theme-secondary",
            ].join(" ")}
          >
            동아리 협업모집
          </button>
          <button
            onClick={() => handleTabChange("project")}
            className={[
              "min-h-11 rounded-full px-2 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer",
              !isClub
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-500 dark:text-theme-muted hover:text-gray-700 dark:hover:text-theme-secondary",
            ].join(" ")}
          >
            프로젝트 팀원 모집
          </button>
        </div>

        {/* 검색창 */}
        <div className="flex items-center bg-white dark:bg-theme-surface rounded-xl px-4 py-2.5 gap-2.5 shadow-sm dark:shadow-theme-shadow">
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="min-w-0 flex-1 text-base sm:text-sm text-gray-700 dark:text-theme-secondary placeholder-gray-400 dark:placeholder:text-theme-muted outline-none bg-transparent"
          />
          <button onClick={handleSearch} aria-label="모집글 검색" className="flex h-11 w-11 shrink-0 items-center justify-center cursor-pointer">
            <Search size={17} className="text-gray-400 dark:text-theme-muted shrink-0" />
          </button>
        </div>

        {/* 카드 목록 */}
        {isClub ? (
          clubLoading ? (
            <SkeletonList />
          ) : clubError ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <AlertCircle size={20} className="text-red-300 dark:text-theme-danger" />
              <p className="text-sm text-gray-400 dark:text-theme-muted">{clubError}</p>
            </div>
          ) : clubPosts.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <p className="text-sm text-gray-400 dark:text-theme-muted">모집글이 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {clubPosts.map((post) => (
                <ClubPostCard
                  key={post.collabId}
                  post={post}
                  onClick={() => navigate(`/cooperation/club/${post.collabId}`)}
                />
              ))}
            </div>
          )
        ) : projectLoading ? (
          <SkeletonGrid />
        ) : projectError ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <AlertCircle size={20} className="text-red-300 dark:text-theme-danger" />
            <p className="text-sm text-gray-400 dark:text-theme-muted">{projectError}</p>
          </div>
        ) : projectPosts.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <p className="text-sm text-gray-400 dark:text-theme-muted">모집글이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {projectPosts.map((post) => (
              <ProjectPostCard
                key={post.projectRecruitmentId}
                post={post}
                onClick={() =>
                  navigate(`/cooperation/project/${post.projectRecruitmentId}`)
                }
              />
            ))}
          </div>
        )}

        {/* CTA 버튼 */}
        <div className="flex justify-center mt-2">
          <button
            onClick={handleCreateClick}
            className={[
              "flex w-full sm:w-auto justify-center items-center gap-2 px-6 sm:px-12 py-3.5 rounded-full text-white font-bold text-sm shadow-lg dark:shadow-theme-shadow hover:opacity-90 transition-opacity duration-150 cursor-pointer",
              isClub ? "bg-green-500 dark:bg-theme-success-action" : "bg-indigo-600",
            ].join(" ")}
          >
            <Plus size={18} strokeWidth={2.5} />
            {isClub ? "새 협업 모집하기" : "새 팀원 모집하기"}
          </button>
        </div>
      </main>

      {showClubModal && (
        <CreateClubCollabModal
          onClose={() => setShowClubModal(false)}
          onSuccess={() => {
            setShowClubModal(false);
            fetchClubPosts(search);
          }}
        />
      )}
      {showProjectModal && (
        <CreateProjectModal
          onClose={() => setShowProjectModal(false)}
          onSuccess={() => {
            setShowProjectModal(false);
            fetchProjectPosts(search);
          }}
        />
      )}
    </div>
  );
}
