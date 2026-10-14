import { useLayoutEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { getClubPosts, updateClubPostOrder } from "../../services/clubService";
import { collectClubPosts, movePost } from "../../utils/clubPostOrder";
import { DEFAULT_FEED_IMAGE, getContentImageUrl } from "../../utils/imageUtils";
import SafeImage from "../common/SafeImage";

export default function ClubPostOrderEditor({ clubId, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const rowRefs = useRef(new Map());
  const previousPositions = useRef(null);
  const rowAnimations = useRef(new Map());
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["clubPostOrder", clubId],
    queryFn: () => collectClubPosts((page) => getClubPosts({ clubId, page, size: 100 })),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const posts = draft ?? data ?? [];
  const changed = draft !== null && draft.some((post, index) => post.postId !== data?.[index]?.postId);

  useLayoutEffect(() => {
    const positions = previousPositions.current;
    previousPositions.current = null;
    rowAnimations.current.forEach((animation) => animation.cancel());
    rowAnimations.current.clear();
    if (!positions || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    rowRefs.current.forEach((row, id) => {
      const previousTop = positions.get(id);
      if (previousTop === undefined) return;
      const distance = previousTop - row.getBoundingClientRect().top;
      if (Math.abs(distance) < 1) return;
      const animation = row.animate(
        [{ transform: `translateY(${distance}px)` }, { transform: "translateY(0)" }],
        { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
      rowAnimations.current.set(id, animation);
    });
  }, [posts]);

  useLayoutEffect(() => {
    const animations = rowAnimations.current;
    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  function move(from, to) {
    if (saving || from < 0 || to < 0 || from === to) return;
    previousPositions.current = new Map(
      Array.from(rowRefs.current, ([id, row]) => [id, row.getBoundingClientRect().top]),
    );
    setDraft(movePost(posts, from, to));
    setError("");
  }

  async function save() {
    if (saving || !changed || needsReload || isPending || isError) return;
    setSaving(true);
    setError("");
    try {
      await updateClubPostOrder({ clubId, postIds: posts.map((post) => post.postId) });
    } catch (error) {
      const code = error.response?.data?.code;
      const messages = {
        POST_ORDER_INVALID: "게시물 목록이 변경되었거나 순서가 올바르지 않습니다. 전체 목록을 다시 불러와 정렬해주세요.",
        POST_ORDER_FORBIDDEN: "동아리 대표 또는 운영진만 게시물 순서를 변경할 수 있습니다.",
        CLUB_NOT_FOUND: "동아리를 찾을 수 없습니다.",
      };
      setNeedsReload(code === "POST_ORDER_INVALID");
      setError(messages[code] || error.response?.data?.message || error.message || "순서를 저장하지 못했습니다. 다시 시도해주세요.");
      setSaving(false);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["clubPosts", clubId] });
    onSaved();
  }

  return (
    <section className="my-7 rounded-2xl border border-slate-200 dark:border-theme-border bg-white dark:bg-theme-surface p-5" aria-label="게시물 순서 편집" aria-busy={saving}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-theme-text">게시물 순서 편집</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-theme-muted">드래그하거나 위·아래 버튼으로 이동하세요. 맨 위 게시물이 먼저 표시됩니다.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-slate-300 dark:border-theme-border-strong px-4 py-2 text-sm disabled:opacity-40">취소</button>
          <button type="button" disabled={saving || isPending || isError || needsReload || !changed} onClick={save} className="rounded-lg bg-sky-700 dark:bg-theme-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{saving ? "저장 중…" : "순서 저장"}</button>
        </div>
      </div>
      {isPending && <p className="mt-5" role="status">전체 게시물을 불러오는 중입니다…</p>}
      {isError && <div className="mt-5" role="alert">게시물을 불러오지 못했습니다. <button type="button" onClick={() => refetch()} className="text-sky-700 dark:text-theme-link underline">다시 시도</button></div>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-theme-danger">{error}</p>}
      {needsReload && <button type="button" onClick={() => {
        setDraft(null);
        setDraggedId(null);
        setError("");
        setNeedsReload(false);
        refetch();
      }} className="mt-2 text-sm text-sky-700 dark:text-theme-link underline">전체 목록 다시 불러오기</button>}
      {!isPending && !isError && (
        <ol className="mt-5 flex flex-col gap-3">
          {posts.map((post, index) => (
            <li key={post.postId}
              ref={(row) => {
                if (row) rowRefs.current.set(post.postId, row);
                else rowRefs.current.delete(post.postId);
              }}
              onDragOver={(event) => {
                if (saving || draggedId === null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const from = posts.findIndex((item) => item.postId === draggedId);
                if (from < 0 || from === index) return;
                // Use the final layout position so animated rows do not trigger repeated swaps.
                const row = event.currentTarget;
                const animation = rowAnimations.current.get(post.postId);
                if (animation?.playState === "running") return;
                const bounds = row.getBoundingClientRect();
                const midpoint = bounds.top + bounds.height / 2;
                if ((from < index && event.clientY < midpoint) || (from > index && event.clientY > midpoint)) return;
                move(from, index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                move(posts.findIndex((item) => item.postId === draggedId), index);
                setDraggedId(null);
              }}
              className={`flex items-center gap-3 rounded-xl border p-3 ${draggedId === post.postId ? "border-sky-500 dark:border-theme-focus bg-sky-50 dark:bg-theme-accent" : "border-slate-200 dark:border-theme-border"}`}>
              <span draggable={!saving} title="드래그하여 순서 변경"
                onDragStart={(event) => {
                  setDraggedId(post.postId);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(post.postId));
                }}
                onDragEnd={() => setDraggedId(null)}
                className="shrink-0 cursor-grab p-1 text-slate-400 dark:text-theme-muted active:cursor-grabbing">
                <GripVertical size={18} aria-hidden="true" />
              </span>
              <span className="w-7 shrink-0 text-center text-sm text-slate-500 dark:text-theme-muted">{index + 1}</span>
              <SafeImage src={post.imageUrls?.[0]} fallbackSrc={DEFAULT_FEED_IMAGE} getSrc={getContentImageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" draggable={false} />
              <div className="min-w-0 flex-1">
                {post.postType === "NOTICE" && <span className="text-xs font-medium text-amber-700 dark:text-theme-warning">공지사항</span>}
                <p className="truncate text-sm font-semibold">{post.title || post.content || "제목 없는 게시물"}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-theme-muted">{post.writerName} · {post.createdAt?.slice(0, 10)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" aria-label={`${index + 1}번째 게시물 위로 이동`} disabled={saving || index === 0} onClick={() => move(index, index - 1)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-theme-hover disabled:opacity-30"><ArrowUp size={18} /></button>
                <button type="button" aria-label={`${index + 1}번째 게시물 아래로 이동`} disabled={saving || index === posts.length - 1} onClick={() => move(index, index + 1)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-theme-hover disabled:opacity-30"><ArrowDown size={18} /></button>
              </div>
            </li>
          ))}
          {posts.length === 0 && <li className="py-8 text-center text-slate-500 dark:text-theme-muted">정렬할 게시물이 없습니다.</li>}
        </ol>
      )}
    </section>
  );
}
