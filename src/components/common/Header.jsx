import { createElement, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ClipboardCheck,
  Coffee,
  Globe,
  Home,
  LogOut,
  Menu,
  Plus,
  User,
  Users,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { getMyPage } from "../../services/myPageService";
import { getProfileImageUrl } from "../../utils/imageUtils";
import logo from "../../assets/logo.png";
import ThemeSwitcher from "./ThemeSwitcher.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { isUsableAccessToken } from "../../utils/authUtils";

const NAV_ITEMS = [
  { label: "홈", icon: Home, href: "/" },
  {
    label: "동아리",
    icon: Users,
    children: [
      { label: "내 동아리", icon: Users, href: "/club/main" },
      { label: "동아리 신청", icon: ClipboardCheck, href: "/club/apply" },
      { label: "동아리 생성", icon: Plus, href: "/club/create" },
    ],
  },
  { label: "협업/모집", icon: Globe, href: "/cooperation" },
  {
    label: "커피챗",
    icon: Coffee,
    children: [
      { label: "커피챗", icon: Coffee, href: "/coffee-chat" },
      { label: "유저 리스트", icon: Users, href: "/coffee-chat/user-list" },
    ],
  },
  { label: "마이페이지", icon: User, href: "/my-page" },
];

export default function Header() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [openMenuLabel, setOpenMenuLabel] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [failedProfileImageUrl, setFailedProfileImageUrl] = useState("");
  const profileRef = useRef(null);
  const navMenuRef = useRef(null);
  const mobileNavMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { user, loading: authLoading, logout } = useAuth();
  const accessToken = localStorage.getItem("accessToken");
  const hasUsableToken = isUsableAccessToken(accessToken);
  const isLoggedIn = !authLoading && !!user && hasUsableToken;

  const { data: myPageData } = useQuery({
    queryKey: ["myPage"],
    queryFn: getMyPage,
    enabled: isLoggedIn,
  });

  const profileImageUrl = isLoggedIn
    ? getProfileImageUrl(
        {
          coffeeChatProfileImageUrl: myPageData?.coffeeChatProfile?.profileImageUrl,
          coffeeChatProfileImage: myPageData?.coffeeChatProfile?.profileImage,
          profileImageUrl: myPageData?.profileImageUrl ?? user?.profileImageUrl,
          profileImage: myPageData?.profileImage ?? user?.profileImage,
        },
        ""
      )
    : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (
        !navMenuRef.current?.contains(event.target) &&
        !mobileNavMenuRef.current?.contains(event.target)
      ) {
        setOpenMenuLabel(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const latestToken = localStorage.getItem("accessToken");

    if (!authLoading && user && !isUsableAccessToken(latestToken)) {
      logout();
      queryClient.clear();
    }
  }, [location.pathname, authLoading, user, logout, queryClient]);

  const handleAddAccount = () => {
    setProfileOpen(false);
    navigate("/login");
  };

  const handleLogout = () => {
    logout();
    queryClient.clear();
    alert("로그아웃 완료");
    navigate("/");
  };

  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    setOpenMenuLabel(null);

    const isPublicPage = href === "/" || href === "/cooperation";

    if (!isLoggedIn && !isPublicPage) {
      navigate("/login", { state: { from: href } });
      return;
    }

    if (isLoggedIn && user?.isVerified !== true) {
      navigate("/email-verify", { state: { from: href } });
      return;
    }

    navigate(href);
  };

  const isNavItemActive = ({ href, children }) => {
    if (children) {
      return children.some(
        (item) =>
          location.pathname === item.href ||
          location.pathname.startsWith(`${item.href}/`)
      );
    }

    return location.pathname === href;
  };

  return (
    <header className="w-full" style={{ backgroundColor: "var(--theme-header)" }}>
      <div className="mx-auto grid h-16 max-w-500 grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
        <button
          type="button"
          className="flex cursor-pointer items-center"
          onClick={() => handleNavClick("/")}
          aria-label="홈으로 이동"
        >
          <img src={logo} alt="logo" className="theme-logo h-10 w-auto" />
        </button>

        <div className="hidden justify-end pr-2 lg:flex" ref={navMenuRef}>
          <div className="rounded-2xl bg-white dark:bg-theme-surface px-2 py-1.5">
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const { label, icon: Icon, href, children } = item;
                const isActive = isNavItemActive(item);

                if (children) {
                  return (
                    <div key={label} className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuLabel((openLabel) =>
                            openLabel === label ? null : label
                          )
                        }
                        aria-expanded={openMenuLabel === label}
                        aria-haspopup="menu"
                        style={{ color: isActive ? "var(--theme-nav-active)" : "var(--theme-nav-text)" }}
                        className={[
                          "flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
                          isActive
                            ? "font-medium"
                            : "font-normal hover:bg-gray-100 dark:hover:bg-theme-hover",
                        ].join(" ")}
                      >
                        {createElement(Icon, {
                          size: 18,
                          strokeWidth: 2,
                          className: "shrink-0 opacity-90",
                        })}
                        {label}
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${
                            openMenuLabel === label ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {openMenuLabel === label && (
                        <div
                          className="absolute left-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-gray-100 dark:border-theme-border bg-white dark:bg-theme-surface py-1 shadow-lg dark:shadow-theme-shadow"
                          role="menu"
                        >
                          {children.map(
                            ({
                              label: childLabel,
                              icon: ChildIcon,
                              href: childHref,
                            }) => (
                              <button
                                key={childLabel}
                                type="button"
                                role="menuitem"
                                onClick={() => handleNavClick(childHref)}
                                className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-700 dark:text-theme-secondary hover:bg-gray-50 dark:hover:bg-theme-hover"
                              >
                                {createElement(ChildIcon ?? Icon, {
                                  size: 16,
                                  strokeWidth: 2,
                                })}
                                {childLabel}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleNavClick(href)}
                    style={{ color: isActive ? "var(--theme-nav-active)" : "var(--theme-nav-text)" }}
                    className={[
                      "flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
                      isActive
                        ? "font-medium"
                        : "font-normal hover:bg-gray-100 dark:hover:bg-theme-hover",
                    ].join(" ")}
                  >
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className="shrink-0 opacity-90"
                    />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="col-start-3 flex items-center justify-self-end gap-2">
          {isLoggedIn && user.isVerified && <NotificationBell key={user.userId ?? user.id} userId={user.userId ?? user.id} onOpen={() => handleNavClick("/notifications")} />}
          <div className="hidden lg:block">
            <ThemeSwitcher />
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/20 transition-colors duration-150 hover:bg-white/35 lg:hidden"
            aria-label="메뉴"
          >
            {mobileMenuOpen ? (
              <X size={20} strokeWidth={2} color="white" />
            ) : (
              <Menu size={20} strokeWidth={2} color="white" />
            )}
          </button>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/20 transition-colors duration-150 hover:bg-white/35"
              aria-label="프로필"
            >
              {isLoggedIn &&
              profileImageUrl &&
              profileImageUrl !== failedProfileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="프로필"
                  className="h-full w-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setFailedProfileImageUrl(profileImageUrl)}
                />
              ) : (
                <User size={20} strokeWidth={2} color="white" />
              )}
            </button>

            {profileOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-100 dark:border-theme-border bg-white dark:bg-theme-surface shadow-lg dark:shadow-theme-shadow">
                {isLoggedIn ? (
                  <>
                    <div className="border-b border-gray-100 dark:border-theme-border px-4 py-3">
                      {user.name && (
                        <p className="mb-0.5 text-xs text-gray-500 dark:text-theme-muted">
                          {user.name}
                        </p>
                      )}
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-theme-text">
                        {user.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddAccount}
                      className="flex w-full cursor-pointer items-center gap-2.5 border-b border-gray-100 dark:border-theme-border px-4 py-3 text-sm text-gray-700 dark:text-theme-secondary transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-theme-hover"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-400 dark:border-theme-border-strong">
                        <Plus
                          size={12}
                          strokeWidth={2.5}
                          className="text-gray-500 dark:text-theme-muted"
                        />
                      </span>
                      다른 계정으로 로그인
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-theme-hover"
                      style={{ color: "var(--theme-nav-active)" }}
                    >
                      <LogOut size={15} strokeWidth={2} />
                      로그아웃
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddAccount}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 dark:text-theme-secondary transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-theme-hover"
                  >
                    <User size={15} strokeWidth={2} />
                    로그인
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          ref={mobileNavMenuRef}
          className="border-t border-white/20 bg-white/10 backdrop-blur-sm lg:hidden"
        >
          <nav className="flex flex-col px-4 py-2">
            {NAV_ITEMS.map((item) => {
              const { label, icon: Icon, href, children } = item;
              const isActive = isNavItemActive(item);

              if (children) {
                return (
                  <div key={label}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuLabel((openLabel) =>
                          openLabel === label ? null : label
                        )
                      }
                      aria-expanded={openMenuLabel === label}
                      className={[
                        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-sm",
                        isActive
                          ? "bg-white/30 font-semibold text-white"
                          : "text-white/90 hover:bg-white/20",
                      ].join(" ")}
                    >
                      {createElement(Icon, { size: 18, strokeWidth: 2 })}
                      <span className="flex-1">{label}</span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${
                          openMenuLabel === label ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openMenuLabel === label && (
                      <div className="ml-7 flex flex-col border-l border-white/30 pl-2">
                        {children.map(
                          ({
                            label: childLabel,
                            icon: ChildIcon,
                            href: childHref,
                          }) => (
                            <button
                              key={childLabel}
                              type="button"
                              onClick={() => handleNavClick(childHref)}
                              className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/20"
                            >
                              {createElement(ChildIcon ?? Icon, {
                                size: 16,
                                strokeWidth: 2,
                              })}
                              {childLabel}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleNavClick(href)}
                  className={[
                    "flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors duration-150",
                    isActive
                      ? "bg-white/30 font-semibold text-white"
                      : "font-normal text-white/90 hover:bg-white/20",
                  ].join(" ")}
                >
                  <Icon size={18} strokeWidth={2} className="shrink-0" />
                  {label}
                </button>
              );
            })}
            <div className="mt-2 flex min-h-12 items-center justify-between border-t border-white/20 px-4 pt-3">
              <span className="text-sm font-medium text-white/90">화면 테마</span>
              <ThemeSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
