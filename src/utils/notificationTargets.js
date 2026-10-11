export function getNotificationTarget({ type, targetType, targetId, clubId }) {
  const id = Number(targetId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  switch (targetType) {
    case "POST":
      return { pathname: `/club/posts/${id}` };
    case "CLUB":
      if (type === "CLUB_JOIN_REQUEST") return { pathname: `/club/president/${id}`, search: "?tab=applicants" };
      return { pathname: `/club/apply/${id}` };
    case "CHAT_ROOM":
      return { pathname: "/coffee-chat", state: { roomId: id, fromNotification: true } };
    case "CLUB_COLLABORATION":
      return { pathname: `/cooperation/club/${id}` };
    case "PROJECT_RECRUITMENT":
      return { pathname: `/cooperation/project/${id}` };
    case "CLUB_EVENT":
      if (!Number.isSafeInteger(Number(clubId)) || Number(clubId) <= 0) return null;
      return {
        pathname: `/notifications/events/${id}`,
        search: `?clubId=${Number(clubId)}`,
      };
    default:
      return null;
  }
}
