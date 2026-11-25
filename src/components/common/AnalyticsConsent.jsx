import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { setAnalyticsConsent } from "../../utils/analytics";
import { isUsableAccessToken } from "../../utils/authUtils";

const STORAGE_KEY = "clubhub-analytics-consent";

function readChoice() {
  try {
    const choice = localStorage.getItem(STORAGE_KEY);
    if (choice === "granted" || choice === "denied") return choice;
  } catch {
    // The current tab can still honor a choice when storage is unavailable.
  }
  return null;
}

export default function AnalyticsConsent() {
  const { user, loading } = useAuth();
  const [choice, setChoice] = useState(readChoice);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButton = useRef(null);
  const denyButton = useRef(null);
  const signedIn = !loading && !!user && isUsableAccessToken(localStorage.getItem("accessToken"));
  const visible = settingsOpen || (signedIn && choice === null);

  useEffect(() => {
    const savedChoice = readChoice();
    if (savedChoice !== null) setAnalyticsConsent(savedChoice === "granted");

    function syncChoice(event) {
      if (event.storageArea !== localStorage || (event.key !== STORAGE_KEY && event.key !== null)) return;
      const nextChoice = readChoice();
      setChoice(nextChoice);
      setAnalyticsConsent(nextChoice === "granted");
    }

    window.addEventListener("storage", syncChoice);
    return () => window.removeEventListener("storage", syncChoice);
  }, []);

  useEffect(() => {
    if (settingsOpen) denyButton.current?.focus();
  }, [settingsOpen]);

  function closeSettings() {
    setSettingsOpen(false);
    settingsButton.current?.focus();
  }

  function saveChoice(nextChoice) {
    try {
      localStorage.setItem(STORAGE_KEY, nextChoice);
    } catch {
      // Apply the choice in memory when storage is unavailable.
    }
    setChoice(nextChoice);
    setAnalyticsConsent(nextChoice === "granted");
    if (settingsOpen) closeSettings();
  }

  if (!signedIn && choice === null && !settingsOpen) return null;

  return (
    <>
      <button
        ref={settingsButton}
        type="button"
        aria-expanded={visible}
        aria-controls={visible ? "analytics-consent" : undefined}
        onClick={() => {
          setSettingsOpen(true);
          denyButton.current?.focus();
        }}
        className="theme-footer-link theme-footer-legal cursor-pointer text-xs transition-colors duration-150"
      >
        분석 설정
      </button>
      {visible && (
        <section
          id="analytics-consent"
          aria-labelledby="analytics-consent-title"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-900 shadow-xl dark:border-theme-border-strong dark:bg-theme-surface dark:text-theme-text sm:p-5"
        >
          <h2 id="analytics-consent-title" className="text-base font-bold">
            이용 통계 수집 동의
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-theme-muted">
            서비스 개선을 위해 Google Analytics로 페이지 조회와 기능 사용 통계를 수집합니다.
            동의는 선택 사항이며, 거부해도 서비스를 이용할 수 있습니다. 선택은 푸터의 분석 설정에서 언제든 바꿀 수 있습니다.
          </p>
          {choice !== null && (
            <p className="mt-2 text-sm text-slate-600 dark:text-theme-muted">
              현재 설정 {choice === "granted" ? "동의" : "거부"}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {settingsOpen && choice !== null && (
              <button
                type="button"
                onClick={closeSettings}
                className="min-h-11 cursor-pointer rounded-lg px-4 text-sm hover:bg-slate-100 dark:hover:bg-theme-raised"
              >
                닫기
              </button>
            )}
            <button
              ref={denyButton}
              type="button"
              onClick={() => saveChoice("denied")}
              className="min-h-11 cursor-pointer rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-100 dark:border-theme-border-strong dark:hover:bg-theme-raised"
            >
              거부
            </button>
            <button
              type="button"
              onClick={() => saveChoice("granted")}
              className="min-h-11 cursor-pointer rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-100 dark:border-theme-border-strong dark:hover:bg-theme-raised"
            >
              동의
            </button>
          </div>
        </section>
      )}
    </>
  );
}
