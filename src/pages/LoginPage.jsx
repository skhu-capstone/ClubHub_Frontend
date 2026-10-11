import { useGoogleLogin } from "@react-oauth/google";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import logo from "../assets/logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, googleLogin } = useAuth();
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

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    navigate(user.isVerified ? returnPath : "/email-verify", {
      replace: true,
      state: user.isVerified ? undefined : { from: returnPath },
    });
  }, [authLoading, isAuthenticated, navigate, returnPath, user?.isVerified]);

  const loginMutation = useMutation({
    mutationFn: async (googleAccessToken) => {
      const result = await googleLogin(googleAccessToken);
      if (!result.success) {
        throw new Error(result.message || "로그인에 실패했습니다.");
      }

      return result.data;
    },

    onSuccess: (userData) => {
      if (userData.isVerified) {
        navigate(returnPath, { replace: true });
      } else {
        navigate("/email-verify", { replace: true, state: { from: returnPath } });
      }
    },

    onError: (error) => {
      console.error(error);
      alert("로그인에 실패했습니다.");
    },
  });

  const startGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      loginMutation.mutate(tokenResponse.access_token);
    },

    onError: () => {
      alert("구글 로그인에 실패했습니다.");
    },
  });

  return (
    <main className="flex w-full flex-col items-center overflow-x-clip bg-linear-to-br from-slate-50 via-slate-50 to-slate-300 px-4 pt-6 pb-8 dark:from-theme-page dark:via-theme-page dark:to-theme-accent md:px-6 md:pt-12 md:pb-14">
      {location.state?.message && <p role="alert" className="mb-5 w-full max-w-md rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800 dark:bg-theme-warning-bg dark:text-theme-warning">{location.state.message}</p>}
      <section className="mb-8 w-full max-w-7xl text-center md:mb-10">
        <h1 className="mx-auto max-w-4xl text-balance text-3xl font-bold leading-10 text-neutral-800 dark:text-theme-text md:text-5xl md:leading-tight lg:text-7xl">
          같은 학교, 더 가까운 연결
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-balance text-base font-medium leading-7 text-zinc-500 dark:text-theme-muted md:mt-5 md:text-2xl md:font-semibold md:leading-9 lg:text-3xl">
          동아리 관리와 커피챗을 통한 협업 제안을 더 쉽게 해보세요
        </p>
      </section>

      <section className="flex w-full max-w-md min-w-0 flex-col items-center rounded-2xl border border-slate-600/20 bg-slate-50 px-5 py-7 dark:border-theme-border-strong dark:bg-theme-subtle md:max-w-127.5 md:rounded-[44px] md:px-10 md:py-14">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-6 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:focus-visible:outline-theme-focus md:mb-9"
          aria-label="홈으로 이동"
        >
          <img
            src={logo}
            alt="클럽허브"
            className="theme-logo h-20 w-auto sm:h-24 md:h-32"
          />
        </button>

        <div className="mb-7 w-full text-center md:mb-10">
          <h2 className="mb-2 text-2xl font-bold text-neutral-800 dark:text-theme-text md:mb-3 md:text-3xl">
            로그인
          </h2>
          <p className="mx-auto max-w-sm break-keep text-xs leading-5 text-neutral-600 dark:text-theme-muted md:text-sm md:leading-6">
            로그인 시 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다
          </p>
        </div>

        <button
          type="button"
          className="grid min-h-12 w-full touch-manipulation cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 rounded-xl border border-zinc-900 px-4 py-2.5 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-theme-border-strong dark:hover:bg-theme-hover dark:focus-visible:outline-theme-focus sm:grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] sm:rounded-full"
          disabled={loginMutation.isPending}
          onClick={() => startGoogleLogin()}
          aria-busy={loginMutation.isPending}
        >
          <img
            className="h-6 w-6 shrink-0 sm:h-7 sm:w-7"
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt=""
            aria-hidden="true"
          />
          <span className="min-w-0 truncate text-center text-sm font-semibold text-black dark:text-theme-text md:text-base">
            {loginMutation.isPending ? "로그인 중..." : "Google로 로그인"}
          </span>
          <span aria-hidden="true" />
        </button>

        <div className="mt-10 text-center md:mt-14">
          <h2 className="text-3xl font-extrabold text-sky-950 dark:text-theme-link md:text-5xl">
            CoffeeChat
          </h2>
          <p className="mx-auto mt-2 max-w-sm break-keep text-sm leading-6 text-neutral-800/80 dark:text-theme-text md:mt-4 md:text-base">
            쉽게 접근할 수 있는 커피챗을 활용해보세요!
          </p>
        </div>

        <div className="mt-4 flex w-full flex-col gap-3 rounded-2xl bg-slate-50 p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.15)] dark:bg-theme-subtle dark:shadow-theme-shadow md:mt-6 md:gap-4 md:rounded-[20px] md:p-5">
          <ChatBubble align="left">
            안녕하세요~ 프로필 보고 연락드렸습니다~
          </ChatBubble>

          <ChatBubble align="right">
            안녕하세요! 어떤 부분이 궁금하신가요?
          </ChatBubble>

          <ChatBubble align="left">
            혹시 웹 서비스 프로젝트에 관심 있으신가요??
          </ChatBubble>
        </div>
      </section>
    </main>
  );
}

function ChatBubble({ children, align = "left" }) {
  const isRight = align === "right";

  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[90%] break-keep rounded-2xl bg-neutral-800/20 px-3 py-2.5 text-sm leading-5 text-black dark:bg-theme-disabled-bg dark:text-theme-text md:max-w-[85%] md:px-4 md:py-3 md:text-base md:leading-6">
        {children}
      </div>
    </div>
  );
}
