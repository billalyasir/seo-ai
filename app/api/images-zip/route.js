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
    // Fetch the image from the remote server
    const upstream = await fetch(url, { cache: "no-store" });

    // If the upstream server returns an error, return it to the client
    if (!upstream.ok) {
      console.warn(`Upstream error for ${url}: ${upstream.status}`);
      return new Response("Upstream error", { status: upstream.status });
    }

    // Get the content type from the upstream response
    const ct =
      upstream.headers.get("content-type") || "application/octet-stream";

    // Read the image data as an ArrayBuffer
    const ab = await upstream.arrayBuffer();

    // Return the image to the client with CORS headers
    return new Response(ab, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*", // ✅ This is the key line to fix CORS
      },
    });
  } catch (e) {
    console.error("GET passthrough error:", e);
    return new Response("Fetch failed", { status: 502 });
  }
}
