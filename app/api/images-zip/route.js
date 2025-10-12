// app/api/images-zip/route.js

/* eslint-disable no-console */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Universal image proxy to bypass 403/404/CORS blocks.
 * Usage:
 *   GET /api/images-zip?url=https://example.com/image.jpg
 */

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("Missing 'url' parameter", { status: 400 });
  }

  try {
    // Validate URL format
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch {
      return new Response("Invalid URL", { status: 400 });
    }

    // Fetch with browser-like headers to bypass anti-bot checks
    const response = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        // Critical: Remove Referer to avoid origin-based blocking
        // 'Referer': '', // optional: you can also set it to targetUrl.origin if needed

        // Mimic a real Chrome browser
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",

        // Optional: add more realistic headers
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
      },
      redirect: "follow", // Follow redirects (e.g., 301/302)
      next: { revalidate: 0 }, // Skip Next.js cache
    });

    if (!response.ok) {
      console.warn(`Image fetch failed (${response.status}) for:`, url);
      return new Response(`Upstream error: ${response.status}`, {
        status: response.status,
      });
    }

    // Stream the image back to the client
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400", // Cache for 1 day
      "Access-Control-Allow-Origin": "*", // Enable cross-origin access
    });

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    // Return the image as a stream (memory efficient)
    return new Response(response.body, { headers });
  } catch (error) {
    console.error("Proxy fetch error:", url, error.message);
    return new Response("Failed to fetch image", { status: 502 });
  }
}
