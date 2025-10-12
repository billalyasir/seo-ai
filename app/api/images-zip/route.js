// /app/api/images-zip/route.js

/* eslint-disable no-console */

// Force Node runtime and prevent static optimization
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Simple passthrough for a single image.
 * - GET /api/images-zip?url=<imageUrl>
 */

// -------------------- CORS preflight --------------------
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

// -------------------- GET (single file passthrough) --------------------
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });

  try {
    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok) {
      return new Response("Upstream error", { status: upstream.status });
    }
    const ct =
      upstream.headers.get("content-type") || "application/octet-stream";
    const ab = await upstream.arrayBuffer();
    return new Response(ab, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("GET passthrough error:", e);
    return new Response("Fetch failed", { status: 502 });
  }
}
