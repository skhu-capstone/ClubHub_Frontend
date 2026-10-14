import axios from "axios";
import { getUploadedImageUrl } from "../utils/imageUtils";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
};

// 동아리 목록 및 검색
// GET /api/clubs
export const getClubs = async ({
  keyword = "",
  category = "",
  page = 0,
  size = 100,
} = {}) => {
  const response = await axios.get(`${BASE_URL}/api/clubs`, {
    params: {
      keyword: keyword || undefined,
      category: category || undefined,
      page,
      size,
    },
    headers: getAuthHeaders(),
  });

  return response.data.data;
};

// 동아리 상세 조회
// GET /api/clubs/{clubId}
export const getClubDetail = async (clubId) => {
  const response = await axios.get(`${BASE_URL}/api/clubs/${clubId}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
};

// 동아리 생성
// POST /api/clubs
export const createClub = async (clubData) => {
  const response = await axios.post(`${BASE_URL}/api/clubs`, clubData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
  });

  return response.data.data;
};

// 동아리 대표 이미지 업로드
export const uploadClubImage = async (clubId, file) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await axios.post(
    `${BASE_URL}/api/clubs/${clubId}/image`,
    formData,
    {
      headers: getAuthHeaders(),
    },
  );

  return getUploadedImageUrl(response.data.data);
};

// 동아리 가입 신청
// POST /api/clubs/{clubId}/join
export const requestClubJoin = async (clubId, joinMessage) => {
  const response = await axios.post(
    `${BASE_URL}/api/clubs/${clubId}/join`,
    {
      joinMessage,
    },
    {
      headers: getAuthHeaders(),
    },
  );

  if (response.data?.success === false) {
    throw new Error(response.data.message || "동아리 가입 신청에 실패했습니다.");
  }
  return response.data.data;
};

// 동아리 가입 신청 취소
// DELETE /api/clubs/{clubId}/join/me
export const cancelClubJoin = async (clubId) => {
  const response = await axios.delete(
    `${BASE_URL}/api/clubs/${clubId}/join/me`,
    {
      headers: getAuthHeaders(),
    },
  );

  if (response.data?.success === false) {
    throw new Error(response.data.message || "가입 신청 취소에 실패했습니다.");
  }
  return response.data.data;
};

// 내 동아리 목록
export const getMyClubJoins = async () => {
  const response = await axios.get(`${BASE_URL}/api/users/me/club/join`, {
    headers: getAuthHeaders(),
  });
  if (response.data?.success === false || !Array.isArray(response.data?.data)) {
    throw new Error(response.data?.message || "가입 신청 내역을 불러오지 못했습니다.");
  }
  return response.data.data;
};

// 내 소속 동아리 목록
export const getMyClubs = async () => {
  const response = await axios.get(`${BASE_URL}/api/users/me/clubs`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
};

// 동아리 멤버 목록
export const getClubMembers = async (clubId) => {
  const response = await axios.get(`${BASE_URL}/api/clubs/${clubId}/members`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
};

// 동아리 게시물 목록
export const getClubPosts = async ({ clubId, page = 0, size = 4 }) => {
  const response = await axios.get(`${BASE_URL}/api/clubs/${clubId}/posts`, {
    params: {
      page,
      size,
    },
    headers: getAuthHeaders(),
  });

  return response.data.data;
};

// PATCH /api/clubs/{clubId}/posts/order — 대표 및 운영진, 전체 게시글 ID 필요
export const updateClubPostOrder = async ({ clubId, postIds }) => {
  const response = await axios.patch(
    `${BASE_URL}/api/clubs/${clubId}/posts/order`,
    { postIds },
    { headers: getAuthHeaders() },
  );
  if (response.data?.success === false) {
    throw new Error(response.data.message || "게시물 순서 저장에 실패했습니다.");
  }
  return response.data?.data;
};

// 동아리 게시물 생성
export const createClubPost = async ({
  clubId,
  title,
  content,
  imageUrls = [],
  postType = "GENERAL",
}) => {
  const response = await axios.post(
    `${BASE_URL}/api/clubs/${clubId}/posts`,
    {
      title,
      content,
      imageUrls,
      postType,
    },
    {
      headers: getAuthHeaders(),
    },
  );

  return response.data.data;
};

// 동아리 게시물 상세 조회
export const getClubPostDetail = async (postId) => {
  const response = await axios.get(`${BASE_URL}/api/posts/${postId}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
};

// 게시글 수정 (작성자 권한은 서버에서 확인)
export const updateClubPost = async ({ postId, title, content, imageUrls, postType }) => {
  const response = await axios.patch(
    `${BASE_URL}/api/posts/${postId}`,
    { title, content, imageUrls, postType },
    { headers: getAuthHeaders() },
  );

  if (response.data?.success === false) {
    throw new Error(response.data.message || "게시글 수정에 실패했습니다.");
  }

  return response.data.data;
};

// 게시물 좋아요 토글
export const toggleClubPostLike = async (postId) => {
  const response = await axios.post(
    `${BASE_URL}/api/posts/${postId}/likes`,
    null,
    {
      headers: getAuthHeaders(),
    },
  );

  if (response.data?.success === false) {
    throw Object.assign(new Error(response.data.message || "좋아요 변경에 실패했습니다."), { response });
  }
  return response.data?.data;
};

export const createClubComment = async ({ postId, content }) => {
  const response = await axios.post(
    `${BASE_URL}/api/posts/${postId}/comments`,
    { content },
    { headers: getAuthHeaders() },
  );
  if (response.data?.success === false) {
    throw Object.assign(new Error(response.data.message || "댓글 작성에 실패했습니다."), { response });
  }
  return response.data?.data;
};

// 댓글 삭제 (작성자 권한은 서버에서 확인)
export const deleteClubComment = async (commentId) => {
  const response = await axios.delete(`${BASE_URL}/api/comments/${commentId}`, {
    headers: getAuthHeaders(),
  });

  if (response.data?.success === false) {
    throw new Error(response.data.message || "댓글 삭제에 실패했습니다.");
  }

  return response.data;
};

// 게시물 삭제
export const deleteClubPost = async (postId) => {
  const response = await axios.delete(`${BASE_URL}/api/posts/${postId}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};

// 게시물 이미지 업로드
export const uploadPostImage = async (postId, file) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await axios.post(
    `${BASE_URL}/api/posts/${postId}/image`,
    formData,
    {
      headers: getAuthHeaders(),
    },
  );
  return getUploadedImageUrl(response.data.data);
};
