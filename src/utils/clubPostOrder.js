export function movePost(posts, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 ||
      to < 0 || from >= posts.length || to >= posts.length || from === to) return posts;
  const next = [...posts];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export async function collectClubPosts(fetchPage) {
  const posts = [];
  let page = 0;
  let totalPages = 1;
  let totalElements;
  do {
    const result = await fetchPage(page);
    const content = Array.isArray(result) ? result : result?.content;
    if (!Array.isArray(content)) throw new Error("게시물 목록을 불러오지 못했습니다.");
    posts.push(...content);
    totalPages = Array.isArray(result) ? 1 : (result.totalPages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw new Error("게시물 목록을 불러오지 못했습니다.");
    }
    if (!Array.isArray(result) && result.totalElements != null) {
      if (totalElements !== undefined && totalElements !== result.totalElements) {
        throw new Error("게시물 목록이 변경되었습니다. 다시 불러와주세요.");
      }
      totalElements = result.totalElements;
    }
    page += 1;
  } while (page < totalPages);
  const ids = posts.map((post) => String(post.postId));
  if (posts.some((post) => post.postId == null) || new Set(ids).size !== ids.length ||
      (totalElements !== undefined && totalElements !== posts.length)) {
    throw new Error("게시물 목록이 변경되었습니다. 다시 불러와주세요.");
  }
  return posts;
}
