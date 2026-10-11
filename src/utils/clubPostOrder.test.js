import { test } from "node:test";
import assert from "node:assert/strict";
import { collectClubPosts, movePost } from "./clubPostOrder.js";

test("moves across page boundaries without mutating or losing posts", () => {
  const posts = Array.from({ length: 7 }, (_, postId) => ({ postId }));
  const next = movePost(posts, 6, 0);
  assert.deepEqual(next.map((post) => post.postId), [6, 0, 1, 2, 3, 4, 5]);
  assert.deepEqual(movePost(next, 0, 6), posts);
  assert.deepEqual(posts.map((post) => post.postId), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(movePost(posts, -1, 0), posts);
  assert.equal(movePost(posts, 0, 7), posts);
});

test("collects every page in server order and handles empty lists", async () => {
  const pages = [];
  const posts = await collectClubPosts(async (page) => {
    pages.push(page);
    return { content: [{ postId: 10 - page }], totalPages: 3 };
  });
  assert.deepEqual(pages, [0, 1, 2]);
  assert.deepEqual(posts.map((post) => post.postId), [10, 9, 8]);
  assert.deepEqual(await collectClubPosts(async () => ({ content: [], totalPages: 0 })), []);
  assert.deepEqual(await collectClubPosts(async () => [{ postId: 1 }]), [{ postId: 1 }]);
});

test("rejects incomplete or inconsistent results rather than saving partial order", async () => {
  await assert.rejects(collectClubPosts(async () => ({})));
  await assert.rejects(collectClubPosts(async () => [{ postId: 1 }, { postId: 1 } ]));
  await assert.rejects(collectClubPosts(async () => [{}]));
  await assert.rejects(collectClubPosts(async (page) => {
    if (page === 1) throw new Error("Network error");
    return { content: [{ postId: 1 }], totalPages: 2 };
  }), /Network error/);
});

test("rejects missing posts and membership changes while collecting pages", async () => {
  await assert.rejects(collectClubPosts(async () => ({
    content: [{ postId: 1 }], totalPages: 1, totalElements: 2,
  })));
  await assert.rejects(collectClubPosts(async (page) => ({
    content: [{ postId: page + 1 }], totalPages: 2, totalElements: page === 0 ? 2 : 3,
  })));
  await assert.rejects(collectClubPosts(async () => ({ content: [], totalPages: "2" })));
});
