import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

const BASE_URL = "https://greenpathindia.in";

// Per-page SEO metadata for server-side injection (social crawlers, Googlebot)
const SEO_META: Record<string, { title: string; description: string; image?: string }> = {
  "/": {
    title: "GreenPath — Waste Collection Management Platform",
    description: "Digital waste management for communities. QR-based household tracking, offline-first collection, real-time analytics, and governance — from doorstep to processing.",
  },
  "/product": {
    title: "Platform — GreenPath",
    description: "Complete waste management operating system: QR-based household tracking, offline-first collector app, vehicle sessions, analytics dashboards, multi-language support.",
  },
  "/solutions": {
    title: "Solutions — GreenPath",
    description: "Tailored waste management for municipalities, panchayats, apartments, campuses, and NGOs. Offline-first, multi-language, QR-based tracking for every community type.",
  },
  "/case-studies": {
    title: "Case Studies — GreenPath",
    description: "Real deployments with measurable outcomes. Billapura panchayat achieved 95% source segregation. 8+ panchayats now replicating across 1.5 lakh people.",
  },
  "/pricing": {
    title: "Pricing — GreenPath",
    description: "₹4/household/month. All features included. No per-user fees. No hidden costs. Transparent pricing for waste management — from panchayats to municipalities.",
  },
  "/about": {
    title: "About — GreenPath",
    description: "Born from the field, not a boardroom. Built through Azim Premji University collaboration with Billapura Panchayat. Technology that serves communities.",
  },
  "/contact": {
    title: "Contact — GreenPath",
    description: "Get in touch with the GreenPath team. Request a demo, discuss partnerships, or ask about deploying waste management technology in your community.",
  },
};

/**
 * Inject page-specific meta tags into HTML for a given URL path.
 * Replaces the default title, description, canonical, og:*, and twitter:* tags.
 */
function injectPageMeta(html: string, urlPath: string): string {
  // Normalize path: strip query string and trailing slash
  const cleanPath = urlPath.split("?")[0].replace(/\/$/, "") || "/";
  const meta = SEO_META[cleanPath];
  if (!meta) return html;

  const pageUrl = `${BASE_URL}${cleanPath === "/" ? "" : cleanPath}`;
  const imageUrl = meta.image
    ? `${BASE_URL}${meta.image}`
    : `${BASE_URL}/images/hero/hero-main.png`;

  // Replace title
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);

  // Replace meta description
  html = html.replace(
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    `$1${meta.description}$2`
  );

  // Replace canonical
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
    `$1${pageUrl}/$2`
  );

  // Replace OG tags
  html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/,`$1${meta.title}$2`);
  html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/,`$1${meta.description}$2`);
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/,`$1${pageUrl}/$2`);
  html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/,`$1${imageUrl}$2`);

  // Replace Twitter tags
  html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,`$1${meta.title}$2`);
  html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,`$1${meta.description}$2`);
  html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/,`$1${imageUrl}$2`);

  return html;
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions as any,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      let page = await vite.transformIndexHtml(url, template);

      // Inject page-specific SEO meta for all requests (dev mode)
      page = injectPageMeta(page, url);

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");

    // Inject page-specific SEO meta (production)
    html = injectPageMeta(html, req.originalUrl);

    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
