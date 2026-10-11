import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteClubPost,
  deleteClubComment,
  getClubPostDetail,
  toggleClubPostLike,
  updateClubPost,
  uploadPostImage,
} from "../../services/clubService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { canEditClubPost, canDeletePost } from "../../utils/postPermissions";
import {
  DEFAULT_FEED_IMAGE,
  getContentImageUrl,
  isValidImageUrl,
} from "../../utils/imageUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MAX_POST_IMAGE_COUNT = 5;
const MAX_POST_IMAGE_SIZE = 20 * 1024 * 1024;

function SelectedImagePreview({ file, index }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return <img src={url} alt={`새로 선택한 이미지 ${index + 1}`} className="h-full w-full object-cover" />;
}

function PostEditor({ post, postId, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState(post.title ?? "");
  const [content, setContent] = useState(post.content ?? "");
  const [imageUrls, setImageUrls] = useState(() => [...(post.imageUrls ?? [])]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageError, setImageError] = useState("");
  const [hasUploadedImage, setHasUploadedImage] = useState(false);
  const uploadedImages = useRef(new Map());
  const fileInputRef = useRef(null);
  const updateMutation = useMutation({
    mutationFn: async (values) => {
      const uploadedImageUrls = [];

      for (const imageFile of values.imageFiles) {
        let url = uploadedImages.current.get(imageFile);

        if (!url) {
          url = await uploadPostImage(postId, imageFile);
          if (!url) throw new Error("업로드한 이미지 주소를 확인할 수 없습니다. 게시글을 새로고침해 확인해주세요.");
          uploadedImages.current.set(imageFile, url);
          setHasUploadedImage(true);
        }

        uploadedImageUrls.push(url);
      }

      return updateClubPost({
        ...values,
        imageUrls: [...values.imageUrls, ...uploadedImageUrls],
      });
    },
    onError: () => {
      // 이미지 업로드 API가 게시글에 이미지를 연결했을 수 있으므로 서버 상태를 다시 조회한다.
      queryClient.invalidateQueries({ queryKey: ["clubPostDetail", postId] });
      queryClient.invalidateQueries({ queryKey: ["clubPosts"] });
    },
    onSuccess: async (updatedPost) => {
      await queryClient.cancelQueries({ queryKey: ["clubPostDetail", postId] });
      if (updatedPost) {
        queryClient.setQueryData(["clubPostDetail", postId], (old) => ({ ...old, ...updatedPost }));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clubPostDetail", postId] }),
        queryClient.invalidateQueries({ queryKey: ["clubPosts"] }),
      ]);
      onClose();
    },
  });
  const isValid = title.trim().length > 0 && title.trim().length <= 50
    && content.trim().length > 0 && content.trim().length <= 1000;
  const error = updateMutation.error;
  const errorMessage = error?.response?.status === 403
    ? "게시글 작성자만 수정할 수 있습니다."
    : error?.response?.status === 401
      ? "로그인이 만료되었습니다. 다시 로그인해주세요."
      : error?.response?.data?.message || error?.message || "게시글 수정에 실패했습니다. 다시 시도해주세요.";
  const selectedImageCount = imageUrls.length + imageFiles.length;
  const canAddImage = selectedImageCount < MAX_POST_IMAGE_COUNT;

  const handleImageChange = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    if (selectedFiles.some((file) => !["image/png", "image/jpeg"].includes(file.type))) {
      setImageError("PNG 또는 JPG 이미지만 선택해주세요.");
      return;
    }

    if (selectedFiles.some((file) => file.size > MAX_POST_IMAGE_SIZE)) {
      setImageError("각 이미지는 20MB 이하만 선택해주세요.");
      return;
    }

    const uniqueFiles = selectedFiles.filter(
      (selectedFile) =>
        !imageFiles.some(
          (currentFile) =>
            currentFile.name === selectedFile.name &&
            currentFile.size === selectedFile.size &&
            currentFile.lastModified === selectedFile.lastModified
        )
    );
    const availableCount = MAX_POST_IMAGE_COUNT - selectedImageCount;

    if (uniqueFiles.length > availableCount) {
      setImageError(`이미지는 기존 사진과 합쳐 최대 ${MAX_POST_IMAGE_COUNT}장까지 추가할 수 있습니다.`);
    } else {
      setImageError("");
    }

    setImageFiles((currentFiles) => [
      ...currentFiles,
      ...uniqueFiles.slice(0, availableCount),
    ]);
  };

  const removeSelectedImage = (targetIndex) => {
    setImageFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== targetIndex)
    );
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => {
      event.preventDefault();
      if (!isValid || updateMutation.isPending
        || !canEditClubPost(post, user, localStorage.getItem("accessToken"))) return;
      updateMutation.mutate({
        postId,
        title: title.trim(),
        content: content.trim(),
        imageUrls,
        imageFiles,
        postType: post.postType ?? "NOTICE",
      });
    }}>
      <h2 className="text-base font-semibold text-gray-900 dark:text-theme-text">게시글 수정</h2>
      <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-theme-secondary">
        제목
        <input autoFocus required maxLength={50} value={title}
          onChange={(event) => setTitle(event.target.value)} disabled={updateMutation.isPending}
          className="w-full rounded-lg border border-gray-300 dark:border-theme-border-strong p-3 outline-none focus:border-blue-500 dark:focus:border-theme-focus" />
        <span className="text-right text-xs text-gray-400 dark:text-theme-muted">{title.length}/50</span>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-theme-secondary">
        내용
        <textarea required maxLength={1000} rows={8} value={content}
          onChange={(event) => setContent(event.target.value)} disabled={updateMutation.isPending}
          className="w-full resize-y rounded-lg border border-gray-300 dark:border-theme-border-strong p-3 outline-none focus:border-blue-500 dark:focus:border-theme-focus" />
        <span className="text-right text-xs text-gray-400 dark:text-theme-muted">{content.length}/1000</span>
      </label>
      <fieldset
        disabled={updateMutation.isPending}
        className="rounded-xl border border-slate-200 dark:border-theme-border bg-slate-50 dark:bg-theme-subtle p-4 disabled:opacity-60"
      >
        <legend className="sr-only">첨부 이미지</legend>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-theme-text">첨부 이미지</h3>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-theme-muted">
              PNG, JPG · 각 20MB 이하 · 최대 {MAX_POST_IMAGE_COUNT}장
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white dark:bg-theme-surface px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-theme-secondary shadow-sm dark:shadow-theme-shadow ring-1 ring-slate-200 dark:ring-theme-border">
            {selectedImageCount}/{MAX_POST_IMAGE_COUNT}장
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {imageUrls.map((url, index) => (
            <div
              key={`${index}-${url}`}
              className="group relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-theme-surface ring-1 ring-slate-200 dark:ring-theme-border"
            >
              <img
                src={getContentImageUrl(url)}
                alt={`기존 이미지 ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => setImageUrls((urls) => urls.filter((_, i) => i !== index))}
                aria-label={`기존 이미지 ${index + 1} 삭제`}
                title="이미지 삭제"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          {imageFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-theme-surface ring-2 ring-blue-500 dark:ring-theme-focus ring-offset-2 dark:ring-offset-theme-surface ring-offset-slate-50"
            >
              <SelectedImagePreview file={file} index={index} />
              <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-blue-600 dark:bg-theme-primary px-2 py-1 text-[11px] font-medium text-white">
                새 이미지 {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeSelectedImage(index)}
                aria-label={`새 이미지 ${index + 1} 선택 취소`}
                title="선택 취소"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          {canAddImage && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-theme-border-strong bg-white dark:bg-theme-surface text-slate-500 dark:text-theme-muted transition-colors hover:border-blue-500 dark:hover:border-theme-focus hover:bg-blue-50 dark:hover:bg-theme-accent-hover hover:text-blue-600 dark:hover:text-theme-link">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-theme-subtle">
                <ImagePlus size={20} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold">
                사진 추가
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>
        {imageError && <p role="alert" className="mt-3 text-sm text-red-500 dark:text-theme-danger">{imageError}</p>}
      </fieldset>
      {updateMutation.isError && <p role="alert" className="text-sm text-red-500 dark:text-theme-danger">{errorMessage}</p>}
      {updateMutation.isError && hasUploadedImage && (
        <p role="alert" className="text-xs text-amber-700 dark:text-theme-warning">사진은 업로드되었지만 수정 저장에 실패했습니다. 저장을 다시 눌러 완료해주세요. 취소해도 업로드된 사진은 남아 있을 수 있습니다.</p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button type="button" onClick={onClose} disabled={updateMutation.isPending}
          className="rounded-lg border border-gray-300 dark:border-theme-border-strong min-h-11 px-4 py-2 text-sm disabled:opacity-50">취소</button>
        <button type="submit" disabled={!isValid || updateMutation.isPending}
          className="rounded-lg bg-[#0B72B9] dark:bg-theme-primary min-h-11 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-theme-disabled-bg">
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}

// ─── 이미지 캐러셀 ────────────────────────────────────────────────────────────
function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  const [brokenImageIndexes, setBrokenImageIndexes] = useState([]);
  const validImages = Array.isArray(images)
    ? images.filter(isValidImageUrl)
    : [];

  if (validImages.length === 0) {
    return <img src={DEFAULT_FEED_IMAGE} alt="동아리 게시물 기본 이미지"
      className="w-full rounded-2xl object-cover" style={{ maxHeight: 420 }} />;
  }

  const imageUrl = brokenImageIndexes.includes(idx)
    ? DEFAULT_FEED_IMAGE
    : getContentImageUrl(validImages[idx], DEFAULT_FEED_IMAGE);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-200 dark:bg-theme-raised">
      <img
        src={imageUrl}
        alt={`이미지 ${idx + 1}`}
        className="w-full object-cover"
        style={{ maxHeight: 420 }}
        onError={() =>
          setBrokenImageIndexes((prev) =>
            prev.includes(idx) ? prev : [...prev, idx]
          )
        }
      />
      {idx > 0 && (
        <button
          onClick={() => setIdx((i) => i - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
        >
          <ChevronLeft size={18} strokeWidth={2} className="text-white" />
        </button>
      )}
      {idx < validImages.length - 1 && (
        <button
          onClick={() => setIdx((i) => i + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
        >
          <ChevronRight size={18} strokeWidth={2} className="text-white" />
        </button>
      )}
      {validImages.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 cursor-pointer ${i === idx ? "bg-white scale-125" : "bg-white/50"}`}
              />
            ))}
          </div>
          <span className="absolute top-3 right-3 text-xs text-white bg-black/40 rounded-full px-2 py-0.5">
            {idx + 1} / {validImages.length}
          </span>
        </>
      )}
    </div>
  );
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8 flex flex-col gap-3 animate-pulse">
      <div
        className="w-full rounded-2xl bg-slate-200 dark:bg-theme-raised"
        style={{ aspectRatio: "3 / 2" }}
      />
      <div className="bg-white dark:bg-theme-surface rounded-2xl px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-3">
        <div className="h-4 w-1/3 bg-slate-200 dark:bg-theme-raised rounded" />
        <div className="h-3 w-full bg-slate-100 dark:bg-theme-subtle rounded" />
        <div className="h-3 w-5/6 bg-slate-100 dark:bg-theme-subtle rounded" />
      </div>
    </div>
  );
}

// ─── 댓글 아이템 ─────────────────────────────────────────────────────────────
function CommentItem({ comment, canDelete, onDelete, isDeleting, isDeletePending, deleteError }) {
  function formatDate(iso) {
    if (!iso) return "";
    return iso.slice(0, 10).replace(/-/g, ".");
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-theme-accent flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-theme-link shrink-0">
        {comment.writerName?.[0] ?? "?"}
      </div>
      <div className="min-w-0 flex flex-col gap-0.5 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-words [overflow-wrap:anywhere] text-xs font-medium text-gray-700 dark:text-theme-secondary">
            {comment.writerName}
          </span>
          <span className="text-xs text-gray-400 dark:text-theme-muted">
            {formatDate(comment.createdAt)}
          </span>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeletePending}
              aria-label={`${comment.writerName ?? "사용자"}님의 댓글 삭제`}
              className="ml-auto shrink-0 cursor-pointer text-xs text-red-500 dark:text-theme-danger hover:text-red-700 dark:hover:text-theme-danger disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-theme-disabled"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          )}
        </div>
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-gray-700 dark:text-theme-secondary leading-relaxed">
          {comment.content}
        </p>
        {deleteError && <p role="alert" className="text-xs text-red-500 dark:text-theme-danger">{deleteError}</p>}
      </div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function ClubPostDetail() {
  const { clubId, postId, id } = useParams();
  const currentPostId = postId ?? id;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const commentInputRef = useRef(null);
  const [commentText, setCommentText] = useState("");
  const [editingPostId, setEditingPostId] = useState(null);

  const deleteCommentMutation = useMutation({
    mutationFn: deleteClubComment,
    onSuccess: async (_, commentId) => {
      await queryClient.cancelQueries({ queryKey: ["clubPostDetail", currentPostId] });
      queryClient.setQueryData(["clubPostDetail", currentPostId], (old) => {
        if (!old) return old;
        const comments = (old.comments || old.postComments || []).filter(
          (comment) => String(comment.commentId) !== String(commentId),
        );
        return { ...old, comments, ...(old.postComments ? { postComments: comments } : {}) };
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clubPostDetail", currentPostId] }),
        queryClient.invalidateQueries({ queryKey: ["clubPosts"] }),
      ]);
    },
  });

  const handleDeleteComment = (commentId) => {
    const comment = (post?.comments || post?.postComments || []).find(
      (item) => String(item.commentId) === String(commentId),
    );
    if (commentId == null || deleteCommentMutation.isPending
      || !canDeletePost(comment, user, localStorage.getItem("accessToken"))) return;
    if (window.confirm("이 댓글을 삭제하시겠습니까?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const deleteCommentError = deleteCommentMutation.isError
    ? deleteCommentMutation.error.response?.status === 403
      ? "본인이 작성한 댓글만 삭제할 수 있습니다."
      : deleteCommentMutation.error.response?.status === 401
        ? "로그인이 만료되었습니다. 다시 로그인해주세요."
        : deleteCommentMutation.error.response?.data?.message || "댓글 삭제에 실패했습니다. 다시 시도해주세요."
    : "";

  // ── 게시글 조회 (React Query) ──────────────────────────────────────────
  const {
    data: post,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clubPostDetail", currentPostId],
    queryFn: () => getClubPostDetail(currentPostId),
    enabled: !!currentPostId,
    refetchOnWindowFocus: true,
  });

  // ── 좋아요 토글 (React Query) ──────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: () => toggleClubPostLike(currentPostId),
    onSuccess: (data) => {
      // 서버 응답으로 캐시 즉시 업데이트
      queryClient.setQueryData(["clubPostDetail", currentPostId], (old) => {
        if (!old) return old;
        return {
          ...old,
          liked: data.liked ?? data.isLiked ?? !old.liked,
          likeCount: data.likeCount ?? data.likes ?? old.likeCount,
        };
      });
      // 혹시 모르니 서버에서 다시 불러오기 예약
      queryClient.invalidateQueries({
        queryKey: ["clubPostDetail", currentPostId],
      });
    },
    onError: (err) => {
      console.error("[ClubPostDetail] Like mutation error:", err);
    },
  });

  // ── 댓글 작성 (React Query) ────────────────────────────────────────────
  const commentMutation = useMutation({
    mutationFn: async (content) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${API_BASE_URL}/api/posts/${currentPostId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "댓글 작성에 실패했습니다.");
      }
      return data.data;
    },
    onSuccess: (newComment) => {
      setCommentText("");
      // 캐시 즉시 업데이트
      queryClient.setQueryData(["clubPostDetail", currentPostId], (old) => {
        if (!old) return old;
        const currentComments = old.comments || old.postComments || [];
        return {
          ...old,
          comments: [...currentComments, newComment],
        };
      });
      // 서버에서 다시 불러오기 예약
      queryClient.invalidateQueries({
        queryKey: ["clubPostDetail", currentPostId],
      });
      commentInputRef.current?.focus();
    },
    onError: (err) => {
      console.error("[ClubPostDetail] Comment mutation error:", err);
    },
  });

  // ── 게시글 삭제 (React Query) ──────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteClubPost,
    onSuccess: () => {
      alert("게시글이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["clubPosts"] });
      navigate(clubId ? `/club/main/${clubId}` : "/club/main");
    },
    onError: (err) => {
      console.error(err);
      if (err.response?.status === 403) {
        alert("게시글을 삭제할 권한이 없습니다.");
      } else {
        alert("게시글 삭제에 실패했습니다.");
      }
    },
  });

  const handleDeletePost = () => {
    if (deleteMutation.isPending || !canDeletePost(post, user, localStorage.getItem("accessToken"))) return;
    if (window.confirm("정말 게시글을 삭제하시겠습니까?")) {
      deleteMutation.mutate(currentPostId);
    }
  };

  const handleLike = () => {
    if (!likeMutation.isPending) {
      likeMutation.mutate();
    }
  };

  // ── 댓글 작성 ────────────────────────────────────────────────────────────
  async function handleCommentSubmit() {
    const trimmed = commentText.trim();
    if (!trimmed || commentMutation.isPending) return;
    commentMutation.mutate(trimmed);
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  function formatDate(iso) {
    if (!iso) return "";
    return iso.slice(0, 10).replace(/-/g, ".");
  }

  const handleBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate(clubId ? `/club/main/${clubId}` : "/club/main");
  };

  if (isLoading) return <Skeleton />;

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-theme-page flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-gray-400 dark:text-theme-muted text-sm">
          {error?.response?.status === 404 ? "삭제된 게시글입니다." : error?.message || "게시글을 찾을 수 없어요."}
        </p>
        <button
          onClick={handleBack}
          className="text-sm text-indigo-500 dark:text-theme-link hover:text-indigo-700 dark:hover:text-theme-link transition-colors cursor-pointer"
        >
          돌아가기
        </button>
      </div>
    );
  }

  // 필드명 유연하게 대응
  const comments = post.comments || post.postComments || [];
  const liked = post.liked ?? post.isLiked ?? false;
  const likeCount = post.likeCount ?? post.likes ?? 0;
  const canEdit = canEditClubPost(post, user, localStorage.getItem("accessToken"));
  const canDelete = canDeletePost(post, user, localStorage.getItem("accessToken"));
  const isEditing = canEdit && editingPostId === currentPostId;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-theme-page">
      <main className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8 flex flex-col gap-0">
        <ImageCarousel key={JSON.stringify(post.imageUrls)} images={post.imageUrls} />

        <div className="bg-white dark:bg-theme-surface rounded-2xl shadow-sm dark:shadow-theme-shadow px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-4 mt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-theme-accent text-xs font-semibold text-indigo-600 dark:text-theme-link">
                {post.writerName?.[0] ?? "?"}
              </div>
              <span className="max-w-40 truncate text-sm font-medium text-gray-700 dark:text-theme-secondary">
                {post.writerName}
              </span>
              <span className="shrink-0 text-xs text-gray-400 dark:text-theme-muted">
                {formatDate(post.createdAt)}
              </span>
              {post.postType === "NOTICE" && (
                <span className="shrink-0 rounded-full border border-amber-200 dark:border-theme-warning-border bg-amber-50 dark:bg-theme-warning-bg px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-theme-warning">
                  공지
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {canEdit && !isEditing && (
                <button
                  type="button"
                  onClick={() => setEditingPostId(currentPostId)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex h-11 sm:h-8 items-center gap-1.5 rounded-lg border border-blue-200 dark:border-theme-border bg-white dark:bg-theme-surface px-3 text-xs font-semibold text-blue-600 dark:text-theme-link transition-colors hover:border-blue-300 dark:hover:border-theme-focus hover:bg-blue-50 dark:hover:bg-theme-accent-hover disabled:cursor-not-allowed disabled:border-gray-200 dark:disabled:border-theme-border disabled:text-gray-400 dark:disabled:text-theme-disabled"
                >
                  <Pencil size={14} aria-hidden="true" />
                  수정
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDeletePost}
                  disabled={deleteMutation.isPending || isEditing}
                  className="inline-flex h-11 sm:h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 dark:border-theme-danger-border bg-white dark:bg-theme-surface px-3 text-xs font-semibold text-red-500 dark:text-theme-danger transition-colors hover:border-red-300 dark:hover:border-theme-danger-border hover:bg-red-50 dark:hover:bg-theme-danger-bg disabled:cursor-not-allowed disabled:border-gray-200 dark:disabled:border-theme-border disabled:text-gray-400 dark:disabled:text-theme-disabled"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  {deleteMutation.isPending ? "삭제 중" : "삭제"}
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <PostEditor key={currentPostId} post={post} postId={currentPostId} onClose={() => setEditingPostId(null)} />
          ) : (
            <>
          {post.title && (
            <h2 className="break-words [overflow-wrap:anywhere] text-base font-semibold text-gray-900 dark:text-theme-text">
              {post.title}
            </h2>
          )}

          <p className="max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-gray-800 dark:text-theme-text">
            {post.content}
          </p>
            </>
          )}

          <div className="flex items-center gap-4 pt-1 border-t border-gray-100 dark:border-theme-border">
            <button
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={`flex items-center gap-1.5 text-sm transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed ${liked ? "text-rose-500 dark:text-theme-danger" : "text-gray-400 dark:text-theme-muted hover:text-rose-400 dark:hover:text-theme-danger"}`}
            >
              <Heart
                size={16}
                strokeWidth={1.8}
                fill={liked ? "currentColor" : "none"}
                className={`transition-transform duration-150 ${likeMutation.isPending ? "scale-90 opacity-60" : liked ? "scale-110" : "scale-100"}`}
              />
              {likeCount}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-theme-muted">
              <MessageCircle size={16} strokeWidth={1.8} />
              {comments.length}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-theme-surface rounded-2xl shadow-sm dark:shadow-theme-shadow px-4 py-4 sm:px-6 sm:py-5 mt-2 flex flex-col gap-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-theme-secondary">
            댓글
            {comments.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-theme-muted">
                {comments.length}
              </span>
            )}
          </p>

          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-theme-muted">
              아직 댓글이 없어요. 첫 댓글을 남겨보세요!
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map((c, idx) => (
                <CommentItem
                  key={`${currentPostId}-${c.commentId ?? idx}`}
                  comment={c}
                  canDelete={canDeletePost(c, user, localStorage.getItem("accessToken")) && c.commentId != null}
                  onDelete={() => handleDeleteComment(c.commentId)}
                  isDeletePending={deleteCommentMutation.isPending}
                  isDeleting={deleteCommentMutation.isPending && deleteCommentMutation.variables === c.commentId}
                  deleteError={deleteCommentMutation.variables === c.commentId ? deleteCommentError : ""}
                />
              ))}
            </div>
          )}

          {commentMutation.isError && (
            <p className="text-xs text-red-500 dark:text-theme-danger">댓글 작성에 실패했습니다.</p>
          )}

          <div
            className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 transition-colors ${commentMutation.isPending ? "border-gray-100 dark:border-theme-border bg-gray-50 dark:bg-theme-subtle" : "border-gray-200 dark:border-theme-border focus-within:border-indigo-300 dark:focus-within:border-theme-focus"}`}
          >
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="댓글을 입력하세요..."
              disabled={commentMutation.isPending}
              className="min-w-0 flex-1 text-base sm:text-sm text-gray-700 dark:text-theme-secondary placeholder-gray-400 dark:placeholder:text-theme-muted outline-none bg-transparent disabled:opacity-50"
            />
            <button
              onClick={handleCommentSubmit}
              disabled={!commentText.trim() || commentMutation.isPending}
              aria-label="댓글 등록"
              className={`flex h-11 w-11 shrink-0 items-center justify-center transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed ${commentText.trim() && !commentMutation.isPending ? "text-indigo-600 dark:text-theme-link hover:text-indigo-800 dark:hover:text-theme-link" : "text-gray-300 dark:text-theme-muted"}`}
            >
              {commentMutation.isPending ? (
                <span className="text-xs text-gray-400 dark:text-theme-muted">등록 중...</span>
              ) : (
                <Send size={15} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
