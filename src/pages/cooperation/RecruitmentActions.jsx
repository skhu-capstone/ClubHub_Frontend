import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canEditClubPost, canDeletePost } from "../../utils/postPermissions";
import { mutateRecruitment } from "../../services/recruitmentService";

const commonFields = [
  { key: "title", label: "제목", required: true, maxLength: 100 },
  { key: "imageUrl", label: "이미지 URL (선택)", type: "url" },
];
const specificFields = {
  club: [
    { key: "contestName", label: "대회명", required: true },
    { key: "contestDate", label: "대회 날짜", type: "date", required: true },
  ],
  project: [
    { key: "writerStack", label: "작성자 분야 (선택)" },
    { key: "positions", label: "모집 구성 (선택)" },
  ],
};

export default function RecruitmentActions({ type, id, post, onUpdated }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const requestInFlight = useRef(false);
  const fields = [...commonFields, ...specificFields[type],
    { key: "content", label: "내용", required: true, multiline: true },
    { key: "deadline", label: "마감일", type: "date", required: true }];
  const canUpdate = canEditClubPost(post, user, localStorage.getItem("accessToken"));
  const canDelete = canDeletePost(post, user, localStorage.getItem("accessToken"));

  if (!canUpdate && !canDelete) return null;

  function startEditing() {
    if (!canUpdate || requestInFlight.current) return;
    setForm(Object.fromEntries(fields.map(({ key }) => [key, post[key] ?? ""])));
    setError("");
    setEditing(true);
  }

  async function submit(method) {
    const allowed = method === "PATCH"
      ? canEditClubPost(post, user, localStorage.getItem("accessToken"))
      : canDeletePost(post, user, localStorage.getItem("accessToken"));
    if (requestInFlight.current || !allowed) return;
    const payload = Object.fromEntries(fields.map(({ key }) => [key, (form[key] ?? "").trim()]));
    if (method === "PATCH" && fields.some(({ key, required }) => required && !payload[key])) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    if (method === "DELETE" && !window.confirm("이 모집글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.")) return;
    requestInFlight.current = true;
    setPending(method);
    setError("");
    try {
      const updated = await mutateRecruitment(type, id, method, payload);
      if (method === "DELETE") {
        navigate("/cooperation", { replace: true, state: { tab: type } });
      } else {
        // 프로젝트 PATCH 응답에는 작성자 등 일부 상세 필드가 생략된다.
        onUpdated((old) => ({ ...old, ...payload, ...updated }));
        setEditing(false);
      }
    } catch (err) {
      setError(err.message || "네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      requestInFlight.current = false;
      setPending("");
    }
  }

  return (
    <section className="border-t border-gray-100 dark:border-theme-border pt-4">
      {editing && canUpdate ? (
        <form onSubmit={(event) => { event.preventDefault(); submit("PATCH"); }}>
          <h2 className="mb-4 text-base font-semibold">{type === "club" ? "협업 모집글 수정" : "프로젝트 팀원 모집글 수정"}</h2>
          <fieldset disabled={!!pending} className="flex flex-col gap-3">
            {fields.map(({ key, label, type: inputType, required, maxLength, multiline }) => (
              <label key={key} className="flex flex-col gap-1.5 text-sm text-gray-700 dark:text-theme-secondary">
                {label}{required ? " *" : ""}
                {multiline ? (
                  <textarea rows={6} required={required} value={form[key]}
                    onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))}
                    className="min-w-0 w-full rounded-lg border border-gray-300 dark:border-theme-border-strong p-3 text-base sm:text-sm outline-none focus:border-indigo-500 dark:focus:border-theme-focus" />
                ) : (
                  <input type={inputType ?? "text"} required={required} maxLength={maxLength} value={form[key]}
                    onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))}
                    className="min-w-0 w-full rounded-lg border border-gray-300 dark:border-theme-border-strong p-3 text-base sm:text-sm outline-none focus:border-indigo-500 dark:focus:border-theme-focus" />
                )}
              </label>
            ))}
            <p className="text-xs text-gray-500 dark:text-theme-muted">이미지 URL을 비우면 첨부 이미지를 삭제합니다.</p>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button type="button" onClick={() => { setEditing(false); setError(""); }} className="min-h-11 rounded-lg border px-4 py-2 text-sm">취소</button>
              <button type="submit" className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "저장 중..." : "저장"}</button>
            </div>
          </fieldset>
        </form>
      ) : (
        <div className="flex justify-end gap-4 text-sm [&>button]:min-h-11 [&>button]:px-2">
          {canUpdate && <button type="button" disabled={!!pending} onClick={startEditing} className="text-indigo-600 dark:text-theme-link disabled:opacity-50">수정</button>}
          {canDelete && <button type="button" disabled={!!pending} onClick={() => submit("DELETE")} className="text-red-500 dark:text-theme-danger disabled:opacity-50">{pending ? "삭제 중..." : "삭제"}</button>}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-500 dark:text-theme-danger">{error}</p>}
    </section>
  );
}
