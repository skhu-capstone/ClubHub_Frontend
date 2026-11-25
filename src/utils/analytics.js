const env = import.meta.env;
const debug = env.MODE === "analytics-debug";
const productionId = env.VITE_GA_MEASUREMENT_ID?.trim();
const debugId = env.VITE_GA_DEBUG_MEASUREMENT_ID?.trim();

const eventParameters = {
  login: { method: ["google"] },
  school_email_verified: {},
  club_join_requested: {},
  club_created: {},
  club_post_created: {},
  recruitment_created: { recruitment_type: ["club", "project"] },
  recruitment_form_opened: { recruitment_type: ["club", "project"] },
  recruitment_search: { recruitment_type: ["club", "project"] },
  coffee_chat_opened: { entry_point: ["profile", "club_collaboration", "project_recruitment"] },
};

let hasConsent = debug && env.VITE_GA_REQUIRE_CONSENT === "false";
let currentPage;
let lastPage;
let tag;
let disabled = false;

function getMeasurementId() {
  const productionOrigin = env.VITE_GA_PRODUCTION_ORIGIN?.trim();
  if (debug) {
    return debugId !== productionId && window.location.origin !== productionOrigin
      ? debugId
      : undefined;
  }

  if (env.PROD && productionOrigin === window.location.origin) return productionId;
}

function initializeTag(id, page) {
  if (tag) return tag;

  const queue = window.dataLayer ??= [];
  function enqueue() {
    queue.push(arguments);
  }
  window.gtag = enqueue;
  enqueue("js", new Date());
  enqueue("set", page);
  enqueue("config", id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ...(debug ? { debug_mode: true } : {}),
  });

  const script = document.createElement("script");
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  script.addEventListener("error", () => {
    disabled = true;
  }, { once: true });
  document.head.appendChild(script);
  tag = enqueue;
  return tag;
}

function sendEvent(name, parameters, page) {
  if (!hasConsent || disabled || !page) return false;

  try {
    const id = getMeasurementId();
    if (!/^G-[A-Z0-9]+$/.test(id ?? "")) return false;

    const initialized = Boolean(tag);
    const gtag = initializeTag(id, page);
    if (initialized && name === "page_view") gtag("set", page);
    gtag("event", name, { ...page, ...parameters, send_to: id });
    return true;
  } catch {
    // Analytics must never interrupt routing or a successful action.
    disabled = true;
    return false;
  }
}

function flushPageView() {
  if (!currentPage || currentPage.pathname === lastPage?.pathname) return;

  const page = {
    page_location: currentPage.location,
    page_title: currentPage.title,
    page_referrer: lastPage?.location ?? "",
  };
  if (sendEvent("page_view", {}, page)) lastPage = { ...currentPage, page };
}

export function trackPageView(route, pathname) {
  // The registered route pattern supplies the URL. The actual path only deduplicates in memory.
  currentPage = {
    pathname,
    location: window.location.origin + route,
    title: route === "/" ? "ClubHub" : `ClubHub | ${route}`,
  };
  flushPageView();
}

export function trackEvent(name, parameters = {}) {
  if (!Object.hasOwn(eventParameters, name)) return;

  const safeParameters = {};
  for (const [key, allowedValues] of Object.entries(eventParameters[name])) {
    if (!allowedValues.includes(parameters[key])) return;
    safeParameters[key] = parameters[key];
  }

  // Only send actions in a page context that has already been measured.
  if (currentPage && lastPage?.pathname === currentPage.pathname) {
    sendEvent(name, safeParameters, lastPage.page);
  }
}

export function setAnalyticsConsent(granted) {
  hasConsent = granted === true;
  if (!hasConsent) lastPage = undefined;

  try {
    const id = getMeasurementId();
    if (!/^G-[A-Z0-9]+$/.test(id ?? "")) return;
    window[`ga-disable-${id}`] = !hasConsent;
    if (hasConsent) flushPageView();
  } catch {
    disabled = true;
  }
}
