import { GitFork, Mail, Code2, Server } from "lucide-react";
import ThemeLogo from "./ThemeLogo.jsx";

const NAV_ITEMS = [
  { label: "홈", href: "/" },
  { label: "동아리", href: "/club" },
  { label: "협업/모집", href: "/cooperation" },
  { label: "커피챗", href: "/coffee-chat" },
  { label: "마이페이지", href: "/my-page" },
];

const TEAM = {
  backend: ["정다운", "서연진"],
  frontend: ["윤현승", "최진원"],
};

export default function Footer() {
  return (
    <footer className="w-full" style={{ backgroundColor: "var(--theme-footer)" }}>
      {/* 상단 구분선 */}
      <div className="w-full h-px" style={{ backgroundColor: "var(--theme-footer-border)" }} />

      <div className="mx-auto max-w-[2000px] px-4 py-5 md:px-6 md:py-8">
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[auto_1fr_auto] md:gap-8">
          {/* 왼쪽: 로고 + 슬로건 */}
          <div className="flex min-w-0 items-center gap-3 md:min-w-[140px] md:flex-col md:items-start">
            <a href="/" className="theme-footer-link inline-block">
              <ThemeLogo alt="logo" className="theme-logo h-8 w-auto md:h-10" />
            </a>
            <p
              className="max-w-56 text-[11px] leading-4 md:max-w-[160px] md:text-xs md:leading-relaxed"
              style={{ color: "var(--theme-footer-secondary)" }}
            >
              대학생을 위한 동아리·협업 커뮤니티 플랫폼
            </p>
          </div>

          {/* 가운데: 네비게이션 + 팀 정보 */}
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 md:flex md:flex-wrap md:justify-center md:gap-8">
            {/* 네비게이션 */}
            <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-widest md:mb-1 md:text-[11px]"
                style={{ color: "var(--theme-footer-muted)" }}
              >
                Navigation
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 md:flex-col md:gap-2">
                {NAV_ITEMS.map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="theme-footer-link text-xs transition-colors duration-150 hover:opacity-100 md:text-sm"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* 팀 */}
            <div className="flex flex-col gap-2">
              <p
                className="text-[10px] font-semibold uppercase tracking-widest md:mb-1 md:text-[11px]"
                style={{ color: "var(--theme-footer-muted)" }}
              >
                Team
              </p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Server
                    size={13}
                    className="shrink-0"
                    style={{ color: "var(--theme-footer-secondary)" }}
                  />
                  <span className="text-[11px] md:text-xs" style={{ color: "var(--theme-footer-muted)" }}>
                    Backend
                  </span>
                  <span className="truncate text-[11px] md:text-xs" style={{ color: "var(--theme-footer-text)" }}>
                    {TEAM.backend.join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Code2
                    size={13}
                    className="shrink-0"
                    style={{ color: "var(--theme-footer-secondary)" }}
                  />
                  <span className="text-[11px] md:text-xs" style={{ color: "var(--theme-footer-muted)" }}>
                    Frontend
                  </span>
                  <span className="truncate text-[11px] md:text-xs" style={{ color: "var(--theme-footer-text)" }}>
                    {TEAM.frontend.join(", ")}
                  </span>
                </div>
              </div>
            </div>

            {/* 링크 */}
            <div className="flex min-w-0 flex-col gap-2">
              <p
                className="text-[10px] font-semibold uppercase tracking-widest md:mb-1 md:text-[11px]"
                style={{ color: "var(--theme-footer-muted)" }}
              >
                Contact
              </p>
              <a
                href="https://github.com/skhu-capstone"
                target="_blank"
                rel="noopener noreferrer"
                className="theme-footer-link flex items-center gap-2 text-xs transition-colors duration-150 md:text-sm"
              >
                <GitFork size={14} className="shrink-0" />
                GitHub
              </a>
              <a
                href="mailto:hyun136000@gmail.com"
                className="theme-footer-link flex min-w-0 items-center gap-2 text-xs transition-colors duration-150 md:text-sm"
              >
                <Mail size={14} className="shrink-0" />
                <span className="truncate">hyun136000@gmail.com</span>
              </a>
            </div>
          </div>

          {/* 오른쪽: 법적 정보 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-left md:flex-col md:items-end md:gap-2 md:text-right">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest md:mb-1 md:text-[11px]"
              style={{ color: "var(--theme-footer-muted)" }}
            >
              Legal
            </p>
            <a
              href="/terms"
              className="theme-footer-link theme-footer-legal text-xs transition-colors duration-150"
            >
              이용약관
            </a>
            <a
              href="/privacy"
              className="theme-footer-link theme-footer-legal text-xs transition-colors duration-150"
            >
              개인정보처리방침
            </a>
          </div>
        </div>

        {/* 하단 카피라이트 바 */}
        <div
          className="mt-4 flex flex-col items-start justify-between gap-1.5 pt-3 sm:flex-row sm:items-center md:mt-8 md:gap-2 md:pt-4"
          style={{ borderTop: "1px solid var(--theme-footer-divider)" }}
        >
          <p className="text-[10px] md:text-ls" style={{ color: "var(--theme-footer-muted)" }}>
            © 2026 SKHU Capstone. All rights reserved.
          </p>
          <p className="text-[10px] md:text-ls" style={{ color: "var(--theme-footer-caption)" }}>
            성공회대학교 캡스톤디자인 프로젝트
          </p>
        </div>
      </div>
    </footer>
  );
}
