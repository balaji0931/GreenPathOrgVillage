import { useEffect } from "react";

const BASE_URL = "https://greenpathindia.in";
const DEFAULT_TITLE = "GreenPath — Waste Collection Management Platform";
const DEFAULT_DESCRIPTION =
  "Digital waste management for communities. QR-based household tracking, offline-first collection, analytics, and governance — from doorstep to processing.";

interface SEOOptions {
  title: string;
  description: string;
  path?: string;
  /** Override OG image (defaults to hero-main) */
  image?: string;
}

/**
 * Sets document.title, meta description, canonical URL, and OG/Twitter meta.
 * Cleans up on unmount by restoring defaults.
 */
export function useSEO({ title, description, path, image }: SEOOptions) {
  useEffect(() => {
    // Title
    const prevTitle = document.title;
    document.title = title;

    // Meta description
    const descMeta = document.querySelector('meta[name="description"]');
    const prevDesc = descMeta?.getAttribute("content") || "";
    if (descMeta) descMeta.setAttribute("content", description);

    // Canonical
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = canonical?.href || "";
    if (canonical && path) {
      canonical.href = `${BASE_URL}${path}`;
    }

    // OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    const twImage = document.querySelector('meta[name="twitter:image"]');

    const prevOgTitle = ogTitle?.getAttribute("content") || "";
    const prevOgDesc = ogDesc?.getAttribute("content") || "";
    const prevOgUrl = ogUrl?.getAttribute("content") || "";
    const prevOgImage = ogImage?.getAttribute("content") || "";
    const prevTwTitle = twTitle?.getAttribute("content") || "";
    const prevTwDesc = twDesc?.getAttribute("content") || "";
    const prevTwImage = twImage?.getAttribute("content") || "";

    if (ogTitle) ogTitle.setAttribute("content", title);
    if (ogDesc) ogDesc.setAttribute("content", description);
    if (ogUrl && path) ogUrl.setAttribute("content", `${BASE_URL}${path}`);
    if (ogImage && image) ogImage.setAttribute("content", `${BASE_URL}${image}`);
    if (twTitle) twTitle.setAttribute("content", title);
    if (twDesc) twDesc.setAttribute("content", description);
    if (twImage && image) twImage.setAttribute("content", `${BASE_URL}${image}`);

    // Cleanup — restore defaults on unmount
    return () => {
      document.title = prevTitle || DEFAULT_TITLE;
      if (descMeta) descMeta.setAttribute("content", prevDesc || DEFAULT_DESCRIPTION);
      if (canonical) canonical.href = prevCanonical || `${BASE_URL}/`;
      if (ogTitle) ogTitle.setAttribute("content", prevOgTitle || DEFAULT_TITLE);
      if (ogDesc) ogDesc.setAttribute("content", prevOgDesc || DEFAULT_DESCRIPTION);
      if (ogUrl) ogUrl.setAttribute("content", prevOgUrl || `${BASE_URL}/`);
      if (ogImage) ogImage.setAttribute("content", prevOgImage);
      if (twTitle) twTitle.setAttribute("content", prevTwTitle || DEFAULT_TITLE);
      if (twDesc) twDesc.setAttribute("content", prevTwDesc || DEFAULT_DESCRIPTION);
      if (twImage) twImage.setAttribute("content", prevTwImage);
    };
  }, [title, description, path, image]);
}
