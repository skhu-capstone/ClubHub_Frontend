import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  resendSchoolEmailCode,
  sendSchoolEmailCode,
  verifySchoolEmailCode,
} from "../services/authService";
import { useAuth } from "../context/AuthContext";

const CODE_LENGTH = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_VALIDITY_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 10;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export default function EmailVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, setAuthenticatedUser } = useAuth();
  const accessToken = localStorage.getItem("accessToken");
  const isAuthenticated = !!user && !!accessToken;
  const requestedPath = location.state?.from;
  const returnPath =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    !["/login", "/email-verify"].includes(requestedPath.split(/[?#]/)[0])
      ? requestedPath
      : "/";

  const [schoolEmail, setSchoolEmail] = useState("");
  const [code, setCode] = useState(() => Array(CODE_LENGTH).fill(""));
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [verification, setVerification] = useState({ sends: [], retryAt: 0, expiresAt: 0, attempts: 0 });
  const [now, setNow] = useState(Date.now);
  const [restoredKey, setRestoredKey] = useState(null);
  const storageKey = user ? `school-email-verification:${user.userId ?? user.id ?? user.email}` : null;
  const cooldown = Math.max(0, Math.ceil((verification.retryAt - now) / 1000));
  const remainingSeconds = Math.max(0, Math.ceil((verification.expiresAt - now) / 1000));
  const activeSends = verification.sends.filter((time) => time > now - DAY_MS);
  const sendLimitReached = activeSends.length >= MAX_SENDS;
  const codeBlocked = verification.attempts >= MAX_ATTEMPTS || remainingSeconds === 0;
  const [notice, setNotice] = useState(null);
  const inputRefs = useRef([]);

  const isCodeComplete = code.every((digit) => digit !== "");
  const normalizedSchoolEmail = schoolEmail.trim().toLowerCase();
  const isValidSchoolEmail = /^[a-z0-9._%+-]+@office\.skhu\.ac\.kr$/.test(
    normalizedSchoolEmail,
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: returnPath } });
      return;
    }

    if (!authLoading && user?.isVerified) {
      navigate(returnPath, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, returnPath, user?.isVerified]);

  useEffect(() => {
    if (!storageKey) return;
    let saved;
    try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* Ignore unavailable storage. */ }
    const frame = window.requestAnimationFrame(() => {
    if (saved && Array.isArray(saved.sends)) {
      setVerification({ ...saved, sends: saved.sends.filter(Number.isFinite) });
      if (saved.email) {
        setSchoolEmail(saved.email);
        setIsCodeSent(true);
      }
    }
    setRestoredKey(storageKey);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || restoredKey !== storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(verification)); } catch { /* Server limits still apply. */ }
  }, [storageKey, restoredKey, verification]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const recordSend = () => {
    const sentAt = Date.now();
    setNow(sentAt);
    setVerification((prev) => ({
      email: normalizedSchoolEmail,
      sends: [...prev.sends.filter((time) => time > sentAt - DAY_MS), sentAt],
      retryAt: sentAt + RESEND_COOLDOWN_SECONDS * 1000,
      expiresAt: sentAt + CODE_VALIDITY_MS,
      attempts: 0,
    }));
    setCode(Array(CODE_LENGTH).fill(""));
  };

  const handleSendError = (error, fallback) => {
    const message = getErrorMessage(error, fallback);
    const dailyLimit = /24시간|10회|daily|day.*limit/i.test(message);
    const retryAfter = Number(error.response?.headers?.["retry-after"]);
    if (dailyLimit || error.response?.status === 429 || /1분|60초/.test(message)) {
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000 : RESEND_COOLDOWN_SECONDS * 1000;
      setVerification((prev) => ({ ...prev, retryAt: Date.now() + delay }));
    }
    setNotice({ type: "error", text: dailyLimit
      ? "24시간 내 발송 한도 10회를 모두 사용했습니다. 발송 한도가 복구된 후 다시 시도해주세요."
      : message });
  };

  const sendCodeMutation = useMutation({
    mutationFn: sendSchoolEmailCode,
    onMutate: () => setNotice(null),
    onSuccess: () => {
      setIsCodeSent(true);
      recordSend();
      setNotice({ type: "success", text: "인증번호를 전송했습니다. 이메일을 확인해주세요." });
      window.requestAnimationFrame(() => inputRefs.current[0]?.focus());
    },
    onError: (error) => {
      console.error(error);
      handleSendError(error, "인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: verifySchoolEmailCode,
    onMutate: () => setNotice(null),
    onSuccess: () => {
      if (storageKey) {
        try { localStorage.removeItem(storageKey); } catch { /* Ignore unavailable storage. */ }
      }
      if (user) {
        setAuthenticatedUser({
          ...user,
          schoolEmail: normalizedSchoolEmail,
          isVerified: true,
        });
      }

      navigate(returnPath, { replace: true });
    },
    onError: (error) => {
      console.error(error);
      const message = String(error.response?.data?.message ?? "");
      const errorCode = String(error.response?.data?.code ?? "");
      const exhausted = /attempt.*(limit|exceed)|too_many_attempt/i.test(errorCode) || /횟수.*(초과|소진)|5회/.test(message);
      const expired = /expir/i.test(errorCode) || /만료/.test(message);
      const mismatch = /mismatch|invalid.*code|incorrect/i.test(errorCode) || /일치하지|올바르지|틀렸|불일치/.test(message);
      if (exhausted || expired || mismatch) {
        setVerification((prev) => ({ ...prev,
          attempts: exhausted ? MAX_ATTEMPTS : prev.attempts + (mismatch ? 1 : 0),
          expiresAt: expired ? 0 : prev.expiresAt,
        }));
      }
      setNotice({
        type: "error",
        text: getErrorMessage(error, "인증번호가 올바르지 않거나 만료되었습니다."),
      });
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: resendSchoolEmailCode,
    onMutate: () => setNotice(null),
    onSuccess: () => {
      setCode(Array(CODE_LENGTH).fill(""));
      recordSend();
      setNotice({ type: "success", text: "인증번호를 다시 전송했습니다." });
      window.requestAnimationFrame(() => inputRefs.current[0]?.focus());
    },
    onError: (error) => {
      console.error(error);
      handleSendError(error, "인증번호 재전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  const handleCodeChange = (index, value) => {
    if (!isCodeSent || !/^\d?$/.test(value)) return;

    const nextCode = [...code];
    nextCode[index] = value;
    setCode(nextCode);
    setNotice(null);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, event) => {
    if (!isCodeSent) return;

    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (event) => {
    if (!isCodeSent) return;

    const pastedCode = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!pastedCode) return;

    event.preventDefault();
    const nextCode = Array(CODE_LENGTH).fill("");
    pastedCode.split("").forEach((digit, index) => {
      nextCode[index] = digit;
    });
    setCode(nextCode);
    setNotice(null);
    inputRefs.current[Math.min(pastedCode.length, CODE_LENGTH) - 1]?.focus();
  };

  const handleSendCode = (event) => {
    event.preventDefault();
    if (!isAuthenticated || !isValidSchoolEmail || sendCodeMutation.isPending || isCodeSent || cooldown > 0 || sendLimitReached || restoredKey !== storageKey) return;
    sendCodeMutation.mutate(normalizedSchoolEmail);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isAuthenticated || !isCodeSent || !isCodeComplete || codeBlocked || verifyCodeMutation.isPending || resendCodeMutation.isPending) return;

    verifyCodeMutation.mutate({
      schoolEmail: normalizedSchoolEmail,
      code: code.join(""),
    });
  };

  const handleResendCode = () => {
    if (!isAuthenticated || cooldown > 0 || sendLimitReached || resendCodeMutation.isPending || verifyCodeMutation.isPending) return;
    resendCodeMutation.mutate(normalizedSchoolEmail);
  };

  const handleChangeEmail = () => {
    setIsCodeSent(false);
    setCode(Array(CODE_LENGTH).fill(""));
    setVerification((prev) => ({ ...prev, email: null, expiresAt: 0, attempts: 0 }));
    setNotice(null);
    sendCodeMutation.reset();
    resendCodeMutation.reset();
    verifyCodeMutation.reset();
  };

  if (authLoading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4 py-12 dark:bg-theme-page">
        <div className="text-center" role="status" aria-live="polite">
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-3 border-blue-600/25 border-t-blue-600 dark:border-theme-primary/25 dark:border-t-theme-primary" />
          <p className="mt-4 text-sm font-medium text-slate-600 dark:text-theme-muted">
            인증 정보를 확인하는 중입니다...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex w-full justify-center bg-slate-50 px-4 pt-6 pb-8 dark:bg-theme-page sm:px-6 sm:pt-10 sm:pb-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm dark:border-theme-border dark:bg-theme-subtle sm:rounded-3xl sm:px-8 sm:py-10">
        <header className="text-center">
          <p className="text-sm font-semibold text-blue-600 dark:text-theme-link">SKHU EMAIL</p>
          <h1 className="mt-2 break-keep text-2xl font-bold leading-8 text-gray-900 dark:text-theme-text sm:text-3xl sm:leading-10">
            학교 이메일 인증
          </h1>
          <p className="mx-auto mt-2 max-w-sm break-keep text-sm leading-6 text-slate-600 dark:text-theme-muted sm:text-base">
            학생 인증을 위해 성공회대학교 이메일을 입력해주세요.
          </p>
        </header>

        <form className="mt-8" onSubmit={handleSendCode} noValidate>
          <label htmlFor="school-email" className="text-sm font-semibold text-gray-900 dark:text-theme-text">
            학교 이메일
          </label>
          <input
            id="school-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={schoolEmail}
            onChange={(event) => {
              setSchoolEmail(event.target.value);
              setNotice(null);
            }}
            placeholder="student@office.skhu.ac.kr"
            disabled={isCodeSent || sendCodeMutation.isPending}
            aria-describedby="school-email-help"
            aria-invalid={schoolEmail.length > 0 && !isValidSchoolEmail}
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-blue-900/5 px-4 text-base text-slate-900 outline-none transition focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15 disabled:cursor-not-allowed disabled:opacity-65 dark:border-theme-border dark:bg-theme-accent dark:text-theme-text dark:placeholder:text-theme-muted dark:focus:border-theme-focus dark:focus:ring-theme-focus/20"
          />
          <p id="school-email-help" className="mt-2 break-keep text-xs leading-5 text-slate-500 dark:text-theme-muted">
            `@office.skhu.ac.kr`로 끝나는 학교 이메일만 사용할 수 있습니다.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={!isValidSchoolEmail || isCodeSent || sendCodeMutation.isPending || cooldown > 0 || sendLimitReached || restoredKey !== storageKey}
              className="h-12 min-w-0 flex-1 touch-manipulation rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors enabled:cursor-pointer enabled:hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-theme-primary dark:enabled:hover:bg-theme-primary-hover dark:focus-visible:outline-theme-focus sm:text-base"
            >
              {sendCodeMutation.isPending
                ? "전송 중..."
                : isCodeSent
                  ? "전송 완료"
                  : cooldown > 0 ? `발송 가능까지 ${cooldown}초` : "인증번호 발송"}
            </button>
            {isCodeSent && (
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={verifyCodeMutation.isPending || resendCodeMutation.isPending}
                className="h-12 shrink-0 touch-manipulation rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-theme-border-strong dark:text-theme-text dark:hover:bg-theme-hover dark:focus-visible:outline-theme-focus"
              >
                이메일 변경
              </button>
            )}
          </div>
        </form>

        <div className="my-8 h-px w-full bg-slate-200 dark:bg-theme-border" />

        <form onSubmit={handleSubmit}>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-theme-text sm:text-2xl">인증번호</h2>
            <p className="mt-2 break-keep text-sm leading-6 text-slate-600 dark:text-theme-muted">
              이메일로 전송된 {CODE_LENGTH}자리 숫자를 입력해주세요. 유효시간은 10분입니다.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-theme-muted">
              재발송은 1분 후 가능하며, 인증번호당 최대 5회 확인할 수 있습니다.<br />
              24시간 내 발송은 최대 10회입니다.
            </p>
            {isCodeSent && <p className="mt-3 text-sm font-medium text-slate-600 dark:text-theme-muted" role="status">
              {verification.attempts >= MAX_ATTEMPTS
                ? "입력 가능 횟수를 모두 사용했습니다. 인증번호를 다시 발송해주세요."
                : remainingSeconds === 0
                  ? "인증번호가 만료되었습니다. 다시 발송해주세요."
                  : `남은 시간 ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")} · 남은 확인 횟수 ${MAX_ATTEMPTS - verification.attempts}회`}
            </p>}
            {sendLimitReached && <p className="mt-3 text-sm text-red-600 dark:text-theme-danger" role="alert">
              24시간 내 발송 한도 10회를 모두 사용했습니다. {new Date(activeSends[0] + DAY_MS).toLocaleString("ko-KR")} 이후 다시 시도해주세요.
            </p>}
          </div>

          <fieldset className="mt-6" disabled={!isCodeSent || codeBlocked || verifyCodeMutation.isPending || resendCodeMutation.isPending}>
            <legend className="sr-only">{CODE_LENGTH}자리 인증번호</legend>
            <div
              className="mx-auto grid w-full max-w-sm grid-cols-5 gap-2 sm:gap-3"
              onPaste={handleCodePaste}
            >
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) => handleCodeChange(index, event.target.value)}
                  onKeyDown={(event) => handleCodeKeyDown(index, event)}
                  maxLength={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`인증번호 ${index + 1}번째 숫자`}
                  className="aspect-[4/5] min-w-0 w-full rounded-xl border border-transparent bg-blue-900/10 text-center text-xl font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-theme-accent dark:text-theme-text dark:focus:border-theme-focus dark:focus:ring-theme-focus/20 sm:text-2xl"
                />
              ))}
            </div>
          </fieldset>

          <div className="min-h-14 pt-4" aria-live="polite">
            {notice && (
              <p
                role={notice.type === "error" ? "alert" : "status"}
                className={`rounded-xl px-4 py-3 text-sm leading-5 ${
                  notice.type === "error"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-theme-danger"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                }`}
              >
                {notice.text}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isCodeSent || !isCodeComplete || codeBlocked || verifyCodeMutation.isPending || resendCodeMutation.isPending}
            className="mt-2 h-12 w-full touch-manipulation rounded-xl bg-blue-600 px-4 text-base font-semibold text-white transition-colors enabled:cursor-pointer enabled:hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-theme-primary dark:enabled:hover:bg-theme-primary-hover dark:focus-visible:outline-theme-focus"
          >
            {verifyCodeMutation.isPending ? "인증 중..." : "인증 완료"}
          </button>
        </form>

        {isCodeSent && (
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-theme-muted">메일을 받지 못하셨나요?</p>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={cooldown > 0 || sendLimitReached || resendCodeMutation.isPending || verifyCodeMutation.isPending}
              className="mt-1 min-h-11 touch-manipulation px-2 text-sm font-semibold text-blue-600 underline-offset-4 enabled:cursor-pointer enabled:hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-theme-link dark:focus-visible:outline-theme-focus dark:disabled:text-theme-muted"
            >
              {resendCodeMutation.isPending
                ? "재전송 중..."
                : cooldown > 0
                  ? `인증번호 재전송 (${cooldown}초)`
                  : "인증번호 재전송"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
