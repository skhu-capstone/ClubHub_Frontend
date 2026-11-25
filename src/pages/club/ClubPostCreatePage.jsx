import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import {
  createClubPost,
  getClubDetail,
  getClubMembers,
  uploadPostImage,
} from "../../services/clubService";
import { useAuth } from "../../context/AuthContext";
import PostNoticeCheckbox from "../../components/common/PostNoticeCheckbox";
import { trackEvent } from "../../utils/analytics";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_COUNT = 5;
const MAX_TITLE_LENGTH = 50;
const MAX_CONTENT_LENGTH = 1000;

function ImagePreview({ file, index, onRemove, disabled }) {
  const [previewUrl] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-theme-border dark:bg-theme-subtle">
      {previewUrl && (
        <img
          src={previewUrl}
          alt={`첨부 이미지 ${index + 1}`}
          className="h-full w-full object-cover"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`첨부 이미지 ${index + 1} 삭제`}
        title="이미지 삭제"
        className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50 sm:right-2 sm:top-2 sm:h-8 sm:w-8"
      >
        <X size={17} aria-hidden="true" />
      </button>
      {index === 0 && (
        <span className="absolute bottom-2 left-2 rounded-md bg-sky-700 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
          대표 이미지
        </span>
      )}
    </div>
  );
}

export default function ClubPostCreatePage() {
  const navigate = useNavigate();
  const { clubId } = useParams();
  const targetClubId = Number(clubId);
  const isValidClubId = Number.isInteger(targetClubId) && targetClubId > 0;
  const { user: authUser, loading: authLoading } = useAuth();
  const accessToken = localStorage.getItem("accessToken");
  const isAuthenticated = !!authUser && !!accessToken;
  const currentUserId = Number(authUser?.userId ?? authUser?.id);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isNotice, setIsNotice] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [formError, setFormError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);

  const {
    data: members = [],
    isLoading: isMembersLoading,
    isError: isMembersError,
  } = useQuery({
    queryKey: ["clubMembers", targetClubId],
    queryFn: () => getClubMembers(targetClubId),
    enabled: isAuthenticated && isValidClubId,
  });

  const {
    data: clubDetail,
    isLoading: isClubDetailLoading,
    isError: isClubDetailError,
  } = useQuery({
    queryKey: ["clubDetail", targetClubId],
    queryFn: () => getClubDetail(targetClubId),
    enabled: isAuthenticated && isValidClubId,
  });

  const myRole = members
    .find((member) => Number(member.userId ?? member.id) === currentUserId)
    ?.role?.trim()
    .toUpperCase();
  const canCreatePost = ["PRESIDENT", "STAFF"].includes(myRole);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isValidClubId) {
      alert("잘못된 동아리 주소입니다.");
      navigate("/club/main", { replace: true });
    }
  }, [isValidClubId, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !isValidClubId || isMembersLoading) return;

    if (isMembersError || isClubDetailError || !canCreatePost) {
      alert("게시물 작성 권한이 없습니다.");
      navigate(`/club/main/${targetClubId}`, { replace: true });
    }
  }, [
    canCreatePost,
    isAuthenticated,
    isClubDetailError,
    isValidClubId,
    isMembersError,
    isMembersLoading,
    navigate,
    targetClubId,
  ]);

  const handleCreatePost = (event) => {
    event?.preventDefault();
    setFormError("");

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!isValidClubId) {
      alert("잘못된 동아리 주소입니다.");
      navigate("/club/main", { replace: true });
      return;
    }

    if (!canCreatePost) {
      alert("게시물 작성 권한이 없습니다.");
      navigate(`/club/main/${targetClubId}`, { replace: true });
      return;
    }

    if (!title.trim() || !content.trim()) {
      setFormError("제목과 내용을 입력해주세요.");
      return;
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      setFormError(`제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해주세요.`);
      return;
    }

    if (content.trim().length > MAX_CONTENT_LENGTH) {
      setFormError(`내용은 ${MAX_CONTENT_LENGTH}자 이하로 입력해주세요.`);
      return;
    }
    
    createPostMutation.mutate({
      clubId: targetClubId,
      title: title.trim(),
      content: content.trim(),
      imageUrls: [],
      postType: isNotice ? "NOTICE" : "GENERAL",
    });
  };

  const handleImageChange = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    setFormError("");

    const invalidTypeFile = selectedFiles.find(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.type)
    );
    if (invalidTypeFile) {
      setFormError("PNG 또는 JPG 이미지만 업로드할 수 있습니다.");
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_IMAGE_SIZE
    );
    if (oversizedFile) {
      setFormError("각 이미지는 20MB 이하만 업로드할 수 있습니다.");
      return;
    }

    setImageFiles((currentFiles) => {
      const uniqueFiles = selectedFiles.filter(
        (selectedFile) =>
          !currentFiles.some(
            (currentFile) =>
              currentFile.name === selectedFile.name &&
              currentFile.size === selectedFile.size &&
              currentFile.lastModified === selectedFile.lastModified
          )
      );
      const availableCount = MAX_IMAGE_COUNT - currentFiles.length;

      if (uniqueFiles.length > availableCount) {
        setFormError(`이미지는 최대 ${MAX_IMAGE_COUNT}장까지 첨부할 수 있습니다.`);
      }

      return [...currentFiles, ...uniqueFiles.slice(0, availableCount)];
    });
  };

  const removeImage = (targetIndex) => {
    setImageFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== targetIndex)
    );
  };

  const createPostMutation = useMutation({
    mutationFn: createClubPost,

    onSuccess: async (createdPost) => {
      trackEvent("club_post_created");
      if (imageFiles.length > 0) {
        let uploadedCount = 0;
        setUploadProgress({ uploaded: 0, total: imageFiles.length });

        for (const imageFile of imageFiles) {
          try {
            await uploadPostImage(createdPost.postId, imageFile);
            uploadedCount += 1;
            setUploadProgress({ uploaded: uploadedCount, total: imageFiles.length });
          } catch (error) {
            console.error(error);
            alert(`게시물은 등록되었지만 이미지 ${uploadedCount}/${imageFiles.length}장만 업로드됐습니다. 게시물 상세에서 이미지를 다시 추가해주세요.`);
            navigate(`/club/main/${targetClubId}`);
            return;
          }
        }
      }

      alert("게시물이 등록되었습니다.");
      navigate(`/club/main/${targetClubId}`);
    },

    onError: (error) => {
      console.error(error);
      setUploadProgress(null);
      setFormError(error.response?.data?.message || "게시물 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  const isSubmitting = createPostMutation.isPending;

  if (
    authLoading ||
    (isValidClubId && (isMembersLoading || isClubDetailLoading))
  ) {
    return (
      <main className="min-h-[70vh] bg-[#F7F8FA] px-4 py-6 dark:bg-theme-page sm:px-6 sm:py-8 lg:px-16 lg:py-14">
        <section className="mx-auto max-w-295 text-sm text-gray-500 dark:text-theme-muted sm:text-base">
          게시물 작성 권한을 확인하는 중입니다...
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-6 dark:bg-theme-page sm:px-6 sm:py-8 lg:px-16 lg:py-14">
      <section className="mx-auto max-w-295">
        <div className="mb-6 sm:mb-10">
          <button type="button" onClick={() => navigate(`/club/main/${targetClubId}`)} className="mb-4 flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-slate-600 hover:text-sky-700 dark:text-theme-muted dark:hover:text-theme-link" aria-label="동아리 메인으로 돌아가기">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            동아리로 돌아가기
          </button>
          <h1 className="break-words text-2xl font-bold leading-8 text-[#1F2937] dark:text-theme-text sm:text-3xl sm:leading-10">
            {clubDetail?.clubName ?? "동아리"}
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-theme-muted">
            동아리 피드에 공유할 게시물을 작성해주세요.
          </p>
        </div>

        <form onSubmit={handleCreatePost} className="rounded-xl bg-white p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.08)] dark:bg-theme-surface dark:shadow-theme-shadow sm:p-6 lg:p-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-theme-text sm:mb-8 sm:text-2xl">게시물 작성</h2>

          <div className="mb-6 sm:mb-7">
            <PostNoticeCheckbox checked={isNotice} onChange={setIsNotice} disabled={isSubmitting} />
          </div>

          <div className="mb-6 sm:mb-7">
            <label htmlFor="club-post-title" className="mb-2 block text-sm font-semibold sm:mb-3">
              제목
            </label>
              <input
                id="club-post-title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFormError(""); }}
                disabled={isSubmitting}
                maxLength={MAX_TITLE_LENGTH}
                placeholder="게시물 제목을 입력해주세요"
                className="h-12 w-full rounded-lg border border-gray-300 px-4 text-base outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-theme-border-strong dark:disabled:bg-theme-subtle dark:focus:border-theme-focus"
              />
              <p className="mt-2 text-right text-xs text-gray-400 dark:text-theme-muted">
                {title.length}/{MAX_TITLE_LENGTH}
              </p>
            </div>

          <div className="mb-6 sm:mb-7">
            <label htmlFor="club-post-content" className="mb-2 block text-sm font-semibold sm:mb-3">
              내용
            </label>
              <textarea
                id="club-post-content"
                value={content}
                onChange={(e) => { setContent(e.target.value); setFormError(""); }}
                disabled={isSubmitting}
                maxLength={MAX_CONTENT_LENGTH}
                placeholder="동아리원들에게 공유할 내용을 작성해주세요"
                className="min-h-48 w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-base leading-6 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-theme-border-strong dark:disabled:bg-theme-subtle dark:focus:border-theme-focus sm:min-h-64 sm:py-4"
              />
              <p className="mt-2 text-right text-xs text-gray-400 dark:text-theme-muted">
                {content.length}/{MAX_CONTENT_LENGTH}
              </p>
            </div>

          <div className="mb-7 sm:mb-10">
            <div className="mb-3 flex items-center justify-between gap-3">
            <label htmlFor="club-post-images" className="block text-sm font-semibold">
              이미지 첨부
            </label>
              <span className="text-xs font-semibold text-blue-600 dark:text-theme-link">
                {imageFiles.length}/{MAX_IMAGE_COUNT}장
              </span>
            </div>

            <label className={`flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors sm:min-h-40 sm:px-5 sm:py-8 ${
              isSubmitting || imageFiles.length >= MAX_IMAGE_COUNT
                ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-theme-border dark:bg-theme-subtle"
                : "cursor-pointer border-gray-300 hover:border-blue-500 hover:bg-blue-50/40 dark:border-theme-border-strong dark:hover:border-theme-focus dark:hover:bg-theme-accent-hover"
            }`}>
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-theme-accent dark:text-theme-link sm:h-11 sm:w-11">
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-gray-700 dark:text-theme-secondary">
                {imageFiles.length >= MAX_IMAGE_COUNT ? "이미지 5장을 모두 선택했습니다" : "첨부 파일 선택"}
              </span>
              <span className="mt-1.5 max-w-full text-xs leading-5 text-gray-400 dark:text-theme-muted">
                PNG, JPG 파일 지원 · 각 20MB 이하 · 최대 {MAX_IMAGE_COUNT}장
              </span>
              <input
                id="club-post-images"
                type="file"
                accept="image/png, image/jpeg"
                multiple
                disabled={isSubmitting || imageFiles.length >= MAX_IMAGE_COUNT}
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            {imageFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {imageFiles.map((file, index) => (
                  <ImagePreview
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    file={file}
                    index={index}
                    onRemove={() => removeImage(index)}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            )}
          </div>

          {formError && (
            <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-600 dark:bg-theme-danger-bg dark:text-theme-danger">
              {formError}
            </p>
          )}

          {uploadProgress && (
            <div className="mb-5 rounded-lg bg-sky-50 px-4 py-3 dark:bg-theme-accent" role="status">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold text-sky-800 dark:text-theme-link">
                <span>이미지를 업로드하는 중입니다</span>
                <span>{uploadProgress.uploaded}/{uploadProgress.total}장</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100 dark:bg-theme-border">
                <div className="h-full rounded-full bg-sky-700 transition-[width] dark:bg-theme-primary" style={{ width: `${(uploadProgress.uploaded / uploadProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="h-12 w-full rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-theme-border-strong dark:text-theme-secondary dark:hover:bg-theme-hover sm:h-11 sm:w-24"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={
                !isAuthenticated ||
                !canCreatePost ||
                isSubmitting
              }
              className="h-12 w-full rounded-lg bg-[#0B72B9] text-sm font-semibold text-white hover:bg-[#095f9b] disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-theme-primary dark:hover:bg-theme-primary-hover dark:disabled:bg-theme-disabled-bg sm:h-11 sm:w-24"
            >
              {isSubmitting ? "등록 중" : "등록"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
