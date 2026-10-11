import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Coffee, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useChatSocket } from "../../hooks/useChatSocket";
import CoffeeChatAvatar from "../../components/common/CoffeeChatAvatar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function formatMessageTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateDivider(iso) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}


// ─── 날짜 구분선 ──────────────────────────────────────────────────────────────
function DateDivider({ iso }) {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-gray-100 dark:bg-theme-subtle" />
      <span className="text-xs text-gray-400 dark:text-theme-muted shrink-0">
        {formatDateDivider(iso)}
      </span>
      <div className="flex-1 h-px bg-gray-100 dark:bg-theme-subtle" />
    </div>
  );
}

// ─── 메시지 버블 ──────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showAvatar, senderName, room }) {

  if (isMine) {
    return (
      <div className="flex justify-end items-end gap-1.5 mb-1 px-4">
        <span className="shrink-0 text-xs text-gray-300 dark:text-theme-muted self-end mb-0.5">
          {formatMessageTime(msg.createdAt)}
        </span>
        <div
          className="min-w-0 max-w-[75%] whitespace-pre-wrap [overflow-wrap:anywhere] sm:max-w-[60%] px-3.5 py-2.5 rounded-2xl rounded-br-sm text-sm text-white leading-relaxed"
          style={{ background: "var(--theme-chat-bubble)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-1 px-4">
      {/* 아바타 자리 항상 확보 */}
      <div className="w-8 h-8 shrink-0">
        {showAvatar && (
          <CoffeeChatAvatar
            userId={room.targetUserId}
            name={senderName}
            image={room}
            className="h-8 w-8 text-xs"
          />
        )}
      </div>
      <div className="min-w-0 max-w-[75%] whitespace-pre-wrap [overflow-wrap:anywhere] sm:max-w-[60%]">
        {showAvatar && (
          <p className="text-xs text-gray-400 dark:text-theme-muted mb-1 ml-0.5">{senderName}</p>
        )}
        <div className="bg-gray-100 dark:bg-theme-subtle px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-sm text-gray-800 dark:text-theme-text leading-relaxed">
          {msg.content}
        </div>
      </div>
      <span className="shrink-0 text-xs text-gray-300 dark:text-theme-muted self-end mb-0.5">
        {formatMessageTime(msg.createdAt)}
      </span>
    </div>
  );
}

// ─── 빈 상태 ──────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-theme-warning-bg flex items-center justify-center">
        <Coffee size={28} strokeWidth={1.5} className="text-amber-400 dark:text-theme-warning" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-theme-secondary mb-1">
          대화를 선택해보세요
        </p>
        <p className="text-xs text-gray-400 dark:text-theme-muted">
          왼쪽 목록에서 대화를 클릭하면 <br />
          채팅창이 열립니다
        </p>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function ChatRoom({ room, onMessage, onBack }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const shouldFollowMessagesRef = useRef(true);

  // 현재 로그인 유저 ID
  const myUserId = (() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return -1;
    try {
      const user = JSON.parse(userStr);
      return Number(user.userId ?? user.id ?? -1);
    } catch {
      return -1;
    }
  })();

  // ── REST: 메시지 히스토리 로드 ──────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    shouldFollowMessagesRef.current = true;
    setMessages([]);
    setError(null);
    setLoading(true);

    const token = localStorage.getItem("accessToken");

    fetch(`${API_BASE}/api/chat/rooms/${room.chatRoomId}/messages`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // 백엔드 응답: data.data.content (배열)
        const msgs = data?.data?.content ?? data?.data ?? [];
        setMessages(Array.isArray(msgs) ? msgs : []);
      })
      .catch((e) => {
        console.error("[ChatRoom] 메시지 로드 실패", e);
        setError("메시지를 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [room?.chatRoomId]);

  // ── REST: 읽음 처리 ────────────────────────────────────────────────────
  useEffect(() => {
    if (!room || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => !m.isRead && Number(m.senderId) !== myUserId)
      .map((m) => m.chatMessageId);

    if (unreadIds.length === 0) return;

    const token = localStorage.getItem("accessToken");
    fetch(`${API_BASE}/api/chat/rooms/${room.chatRoomId}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ messageIds: unreadIds }),
    }).catch(console.error);
  }, [messages, room?.chatRoomId, myUserId]);

  // ── WebSocket: 실시간 메시지 수신 ──────────────────────────────────────
  const handleIncoming = useCallback(
    (msg) => {
      setMessages((prev) => {
        // 중복 방지 (이미 같은 ID가 있는 경우)
        if (prev.some((m) => m.chatMessageId === msg.chatMessageId)) {
          return prev;
        }

        // 내가 보낸 메시지인 경우 낙관적 업데이트 메시지를 실제 메시지로 교체
        if (Number(msg.senderId) === myUserId) {
          // 가장 최근의 낙관적 메시지 하나를 찾음 (ID가 opt-로 시작하거나 _optimistic 필드가 있는 것)
          const optimisticIdx = prev.findLastIndex(
            (m) =>
              (m._optimistic || String(m.chatMessageId).startsWith("opt-")) &&
              m.content === msg.content,
          );

          if (optimisticIdx !== -1) {
            const next = [...prev];
            next[optimisticIdx] = msg; // 교체
            return next;
          }
        }

        return [...prev, msg];
      });

      // 부모(CoffeeChatPage)에게 알림 -> 목록 업데이트용
      if (onMessage) onMessage(msg);
    },
    [myUserId, onMessage],
  );

  const { sendMessage } = useChatSocket(
    room?.chatRoomId ?? null,
    handleIncoming,
  );

  // ── 스크롤 하단 고정 ────────────────────────────────────────────────────
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea && shouldFollowMessagesRef.current) {
      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: "instant",
      });
    }
  }, [messages]);

  // ── 방 바뀌면 인풋 포커스 ──────────────────────────────────────────────
  useEffect(() => {
    if (room && window.matchMedia("(min-width: 768px)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [room?.chatRoomId]);

  // ── 메시지 전송 ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    shouldFollowMessagesRef.current = true;

    // 낙관적 업데이트
    const optimistic = {
      chatMessageId: `opt-${Date.now()}`,
      senderId: myUserId,
      senderName: "나",
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setSending(true);

    // STOMP로 전송 시도
    const sent = sendMessage(content);

    if (!sent) {
      // WebSocket 연결 안 됐으면 REST fallback
      const token = localStorage.getItem("accessToken");
      try {
        const res = await fetch(
          `${API_BASE}/api/chat/rooms/${room.chatRoomId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify({ content }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const newMsg = data.data;

        // 낙관적 메시지를 실제 응답으로 교체
        setMessages((prev) =>
          prev.map((m) =>
            m._optimistic && m.chatMessageId === optimistic.chatMessageId
              ? { ...newMsg, _optimistic: false }
              : m,
          ),
        );

        // 부모에게 알림
        if (onMessage) onMessage(newMsg);
      } catch (e) {
        console.error("[ChatRoom] 전송 실패", e);
        // 실패 시 낙관적 메시지 제거
        setMessages((prev) =>
          prev.filter((m) => m.chatMessageId !== optimistic.chatMessageId),
        );
        setInput(content); // 입력값 복원
      }
    }

    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── 렌더 ────────────────────────────────────────────────────────────────
  if (!room) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-theme-subtle">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 flex flex-col bg-white dark:bg-theme-surface min-h-0">
      {/* 채팅방 헤더 */}
      <div className="flex items-center gap-2 px-3 py-3 sm:px-5 sm:py-4 border-b border-gray-100 dark:border-theme-border shrink-0 bg-white dark:bg-theme-surface">
        <button type="button" onClick={onBack} aria-label="채팅 목록으로 돌아가기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-theme-hover md:hidden">
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => navigate(`/coffee-chat/profile/${room.targetUserId}`)}
          className="flex min-w-0 items-center gap-3 rounded-lg text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-theme-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-theme-focus focus-visible:ring-offset-2 dark:ring-offset-theme-surface"
          aria-label={`${room.targetUserName}님의 커피챗 프로필 보기`}
        >
          <CoffeeChatAvatar
            userId={room.targetUserId}
            name={room.targetUserName}
            image={room}
            className="h-9 w-9 text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-theme-text">
              {room.targetUserName}
            </p>
            <p className="text-xs text-gray-400 dark:text-theme-muted">커피챗</p>
          </div>
        </button>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollAreaRef}
        onScroll={(event) => {
          const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
          shouldFollowMessagesRef.current = scrollHeight - scrollTop - clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto py-4"
      >
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-gray-300 dark:text-theme-muted animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center gap-2 py-12">
            <AlertCircle size={16} className="text-red-300 dark:text-theme-danger" />
            <p className="text-sm text-gray-400 dark:text-theme-muted">{error}</p>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-gray-400 dark:text-theme-muted">아직 대화 내용이 없어요</p>
            <p className="text-xs text-gray-300 dark:text-theme-muted">먼저 인사해보세요 👋</p>
          </div>
        )}

        {!loading &&
          messages.map((msg, idx) => {
            const isMine = Number(msg.senderId) === myUserId;
            const prev = messages[idx - 1];
            const showDateDivider =
              !prev || !isSameDay(prev.createdAt, msg.createdAt);
            // 연속 메시지면 아바타 숨기기 (상대방 메시지만)
            const showAvatar =
              !isMine &&
              (!prev ||
                Number(prev.senderId) !== Number(msg.senderId) ||
                showDateDivider);

            return (
              <div key={msg.chatMessageId}>
                {showDateDivider && <DateDivider iso={msg.createdAt} />}
                <MessageBubble
                  msg={msg}
                  isMine={isMine}
                  showAvatar={showAvatar}
                  senderName={msg.senderName ?? room.targetUserName}
                  room={room}
                />
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 border-t border-gray-100 dark:border-theme-border shrink-0 bg-white dark:bg-theme-surface">
        <div className="flex items-end gap-2 bg-gray-50 dark:bg-theme-subtle rounded-2xl px-4 py-2.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // 자동 높이 조절
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(
                e.target.scrollHeight,
                120,
              )}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="min-w-0 flex-1 text-base sm:text-sm text-gray-800 dark:text-theme-text placeholder-gray-400 dark:placeholder:text-theme-muted outline-none bg-transparent resize-none leading-relaxed"
            style={{ minHeight: "24px", maxHeight: "120px" }}
          />
          <button
            aria-label="메시지 보내기"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors duration-150 disabled:opacity-30"
            style={{
              background: input.trim() && !sending ? "var(--theme-chat-bubble)" : "var(--theme-chat-disabled)",
            }}
          >
            {sending ? (
              <Loader2 size={14} className="text-white animate-spin" />
            ) : (
              <Send
                size={14}
                strokeWidth={2}
                className={input.trim() ? "text-white" : "text-gray-400 dark:text-theme-muted"}
              />
            )}
          </button>
        </div>
        <p className="hidden sm:block text-xs text-gray-300 dark:text-theme-muted mt-1.5 ml-1">
          Enter로 전송 · Shift+Enter 줄바꿈
        </p>
      </div>
    </div>
  );
}
