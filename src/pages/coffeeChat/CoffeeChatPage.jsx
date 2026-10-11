import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Search, Coffee, Loader2, AlertCircle } from "lucide-react";
import ChatRoom from "./ChatRoom";
import CoffeeChatAvatar from "../../components/common/CoffeeChatAvatar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0)
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
// ─── 채팅방 아이템 ────────────────────────────────────────────────────────────
function RoomItem({ room, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors duration-100 cursor-pointer text-left border-l-2 ${
        isActive
          ? "bg-blue-50 dark:bg-theme-accent border-blue-400 dark:border-theme-focus"
          : "hover:bg-slate-50 dark:hover:bg-theme-hover border-transparent"
      }`}
    >
      {/* 아바타 */}
      <div className="relative shrink-0">
        <CoffeeChatAvatar
          userId={room.targetUserId}
          name={room.targetUserName}
          image={room}
          className="h-11 w-11 text-sm"
        />
        {room.unreadCount > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white dark:border-theme-surface" />
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={`text-sm truncate ${
              room.unreadCount > 0
                ? "font-semibold text-gray-900 dark:text-theme-text"
                : "font-medium text-gray-700 dark:text-theme-secondary"
            }`}
          >
            {room.targetUserName}
          </span>
          <span className="text-xs text-gray-400 dark:text-theme-muted shrink-0 ml-2">
            {formatTime(room.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate ${
              room.unreadCount > 0
                ? "text-gray-700 dark:text-theme-secondary font-medium"
                : "text-gray-400 dark:text-theme-muted"
            }`}
          >
            {room.lastMessage}
          </p>
          {room.unreadCount > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-blue-500 dark:bg-theme-primary text-white text-xs font-semibold flex items-center justify-center px-1">
              {room.unreadCount > 99 ? "99+" : room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function CoffeeChatPage() {
  const location = useLocation();
  const targetRoomId = location.state?.roomId;

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);

  // ── 채팅방 목록 API 로드 ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    fetch(`${API_BASE}/api/chat/rooms`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = data?.data?.content ?? data?.data ?? [];
        const roomList = Array.isArray(list) ? list : [];

        setRooms(roomList);

        if (targetRoomId) {
          const targetRoom = roomList.find(
            (room) => Number(room.chatRoomId) === Number(targetRoomId)
          );

          if (targetRoom) {
            setSelectedRoom(targetRoom);

            setRooms((prev) =>
              prev.map((r) =>
                r.chatRoomId === targetRoom.chatRoomId
                  ? { ...r, unreadCount: 0 }
                  : r
              )
            );
          }
        }
      })
      .catch((e) => {
        console.error("[CoffeeChatPage] 목록 로드 실패", e);
        setError("채팅 목록을 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [targetRoomId]);

  // ── 방 선택 시 unreadCount 0으로 초기화 (로컬) ─────────────────────────
  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setRooms((prev) =>
      prev.map((r) =>
        r.chatRoomId === room.chatRoomId ? { ...r, unreadCount: 0 } : r
      )
    );
  };

  // ── 새 메시지 수신 시 목록 업데이트 ──────────────────────────────────────
  const handleNewMessage = useCallback((msg) => {
    setRooms((prev) => {
      const isExist = prev.some(
        (r) => Number(r.chatRoomId) === Number(msg.chatRoomId)
      );
      if (!isExist) return prev;

      const next = prev.map((r) => {
        if (Number(r.chatRoomId) === Number(msg.chatRoomId)) {
          return {
            ...r,
            lastMessage: msg.content,
            lastMessageAt: msg.createdAt,
          };
        }
        return r;
      });

      // 최신 메시지 순으로 정렬
      return [...next].sort(
        (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      );
    });
  }, []);

  const filtered = rooms.filter(
    (r) => r.targetUserName.includes(search) || r.lastMessage?.includes(search)
  );

  const totalUnread = rooms.reduce((acc, r) => acc + (r.unreadCount ?? 0), 0);

  return (
    // 전체 페이지: 헤더 높이만큼 빼서 꽉 채움
    // 헤더가 64px이라고 가정 — 프로젝트에 맞게 조정하세요
    <div className="flex h-[calc(100dvh-64px)] min-h-0 w-full overflow-hidden">
      {/* ── 좌측 채팅 목록 (30%) ─────────────────────────────────────────── */}
      <div
        className={`${selectedRoom ? "hidden md:flex" : "flex"} min-h-0 w-full flex-col border-r border-gray-100 dark:border-theme-border bg-white dark:bg-theme-surface md:w-80 md:shrink-0 lg:w-[30%]`}
      >
        {/* 헤더 */}
        <div className="px-5 pt-6 pb-3 shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Coffee size={18} strokeWidth={1.8} className="text-amber-500 dark:text-theme-warning" />
            <h1 className="text-base font-bold text-gray-900 dark:text-theme-text">커피챗</h1>
            {totalUnread > 0 && (
              <span className="text-xs font-semibold text-white bg-blue-500 dark:bg-theme-primary rounded-full px-1.5 py-0.5 leading-none">
                {totalUnread}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-theme-muted">대화를 이어가 보세요</p>
          {location.state?.fromNotification && targetRoomId && !loading && !error && !rooms.some((room) => Number(room.chatRoomId) === Number(targetRoomId)) && (
            <p role="alert" className="mt-3 text-sm text-red-500 dark:text-theme-danger">삭제되었거나 접근할 수 없는 채팅방입니다.</p>
          )}
        </div>

        {/* 검색창 */}
        <div className="px-4 pb-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-theme-subtle rounded-xl px-3 py-2">
            <Search
              size={13}
              strokeWidth={2}
              className="text-gray-400 dark:text-theme-muted shrink-0"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 메시지 검색"
              className="min-w-0 flex-1 text-base sm:text-xs text-gray-700 dark:text-theme-secondary placeholder-gray-400 dark:placeholder:text-theme-muted outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-theme-subtle mx-4 shrink-0" />

        {/* 목록 */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="text-gray-300 dark:text-theme-muted animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <AlertCircle size={18} className="text-red-300 dark:text-theme-danger" />
              <p className="text-xs text-gray-400 dark:text-theme-muted">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Coffee size={24} strokeWidth={1.5} className="text-gray-200 dark:text-theme-muted" />
              <p className="text-xs text-gray-400 dark:text-theme-muted">
                {search ? "검색 결과가 없어요" : "아직 대화가 없어요"}
              </p>
            </div>
          )}

          {!loading && !error && (
            <div className="divide-y divide-gray-50 dark:divide-theme-border">
              {filtered.map((room) => (
                <RoomItem
                  key={room.chatRoomId}
                  room={room}
                  isActive={selectedRoom?.chatRoomId === room.chatRoomId}
                  onClick={() => handleSelectRoom(room)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 우측 채팅창 (70%) ────────────────────────────────────────────── */}
      <div className={`${selectedRoom ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-1 flex-col`}>
        <ChatRoom room={selectedRoom} onMessage={handleNewMessage} onBack={() => setSelectedRoom(null)} />
      </div>
    </div>
  );
}
