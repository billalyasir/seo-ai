// /app/api/images-zip/route.js

/* eslint-disable no-console */

// Force Node runtime and prevent static optimization
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/images-zip?url=<imageUrl>
 * A resilient image proxy that:
 *   - Sends realistic browser headers (User-Agent, Accept, Referer)
 *   - Follows redirects
 *   - Retries with header variants if the origin blocks hotlinking
 *   - Streams bytes back with permissive CORS
 */

// --- CORS preflight ---
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
  });
}

// Small allowlist to avoid proxy abuse (add more hostnames if you need)
const ALLOWLIST = new Set([
  "www.supermarketcy.com.cy",
  "supermarketcy.com.cy",
  // add other image hosts you plan to support…
]);

function isAllowed(urlStr) {
  try {
    const u = new URL(urlStr);
    return ALLOWLIST.has(u.hostname);
  } catch {
    return false;
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function buildHeaders(targetUrl, variant = 0) {
  const origin = new URL(targetUrl).origin + "/";
  // Variant 0: Full browser-like with Referer
  // Variant 1: Same but without Referer
  const common = {
    "User-Agent": UA,
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
  if (variant === 0) {
    return { ...common, Referer: origin };
  }
  return common;
}

async function tryFetch(urlStr, variant = 0) {
  return fetch(urlStr, {
    // Don’t cache on the server
    cache: "no-store",
    // Follow 30x chains (some CDNs issue them)
    redirect: "follow",
    // Send our header variant
    headers: buildHeaders(urlStr, variant),
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing url", { status: 400 });
  }
  if (!isAllowed(url)) {
    return new Response("Host not allowed", { status: 403 });
  }

  try {
    // 1) First attempt with Referer spoofed to the image origin
    let upstream = await tryFetch(url, 0);

    // 2) If blocked (403/401/400/406), retry without Referer
    if (!upstream.ok && [400, 401, 403, 406].includes(upstream.status)) {
      upstream = await tryFetch(url, 1);
    }

    // 3) If still not ok, bubble the upstream status (helps debugging)
    if (!upstream.ok) {
      console.warn(`Upstream error for ${url}: ${upstream.status}`);
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Stream bytes back to the browser
    const ct =
      upstream.headers.get("content-type") || "application/octet-stream";
    const ab = await upstream.arrayBuffer();

    return new Response(ab, {
      status: 200,
      headers: {
        "Content-Type": ct,
        // cache a bit on the client (tune as you wish)
        "Cache-Control": "public, max-age=86400",
        // allow your web app to read the bytes
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Image proxy error:", e);
    return new Response("Fetch failed", {
      status: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
