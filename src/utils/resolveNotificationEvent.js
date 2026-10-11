export async function resolveNotificationEvent(eventId, { clubId, getClubEventDetail }) {
  if (!Number.isSafeInteger(Number(clubId)) || Number(clubId) <= 0) {
    throw new Error("알림의 동아리 정보를 확인할 수 없습니다. 알림 목록에서 다시 열어주세요.");
  }
  try {
    const event = await getClubEventDetail({ clubId: Number(clubId), eventId });
    if (Number(event?.eventId) !== Number(eventId)) throw new Error("일정 정보를 확인할 수 없습니다.");
    return { ...event, clubId: Number(clubId) };
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    const deletedError = new Error("삭제된 일정입니다.");
    deletedError.status = 404;
    throw deletedError;
  }
}
