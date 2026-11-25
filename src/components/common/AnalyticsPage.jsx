import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../../utils/analytics";

export default function AnalyticsPage({ route, children }) {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    trackPageView(route, pathname);
  }, [route, pathname]);

  return children;
}
