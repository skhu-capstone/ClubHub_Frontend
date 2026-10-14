export function isPostActionResultUnknown(error) {
  return [502, 503, 504].includes(error?.response?.status) ||
    (!error?.response && !!error?.request);
}

export function getPostActionErrorMessage(error, fallback) {
  if (isPostActionResultUnknown(error)) {
    return "서버 응답을 받지 못해 처리 결과를 확인할 수 없습니다. 다시 요청하기 전에 새로고침하여 반영 여부를 확인해주세요.";
  }
  if (error?.response?.status === 401) return "로그인이 만료되었습니다. 다시 로그인해주세요.";
  if (error?.response?.status === 403) return "이 작업을 수행할 권한이 없습니다.";
  const message = error?.response?.data?.message;
  return (typeof message === "string" && message) ||
    (!error?.response && error?.message) || fallback;
}
