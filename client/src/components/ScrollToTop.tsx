import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Component that automatically scrolls the window to the top
 * whenever the route (location) changes.
 */
export function ScrollToTop() {
  const [pathname] = useLocation();

  useEffect(() => {
    // Scroll to top immediately on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
