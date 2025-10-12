/* app/api/images-zip/route.js */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/* ───────────────────────── small utils ───────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => Math.floor(ms * (0.6 + Math.random() * 0.8));

const sanitize = (s) =>
  String(s || "file")
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "file";

const inferExt = (contentType = "", url = "") => {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return ".png";
  if (/(jpe?g)/.test(ct)) return ".jpg";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("bmp")) return ".bmp";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("svg")) return ".svg";
  if (ct.includes("avif")) return ".avif";
  if (ct.includes("tiff")) return ".tiff";
  try {
    const clean = String(url).split("?")[0];
    const m = clean.match(/\.(png|jpg|jpeg|gif|bmp|webp|svg|avif|tiff)$/i);
    if (m) return m[0].toLowerCase();
  } catch {}
  return ".jpg";
};

const ensureUnique = (name, usedLowerSet) => {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = `${base}${ext}`;
  let i = 2;
  while (usedLowerSet.has(candidate.toLowerCase())) {
    candidate = `${base}_${i}${ext}`;
    i += 1;
  }
  usedLowerSet.add(candidate.toLowerCase());
  return candidate;
};

function buildProxyUrls(rawUrl) {
  const u = String(rawUrl);
  const hostPath = u.replace(/^https?:\/\//i, "").replace(/^\/+/, "");
  return [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(hostPath)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    `https://cors.isomorphic-git.org/${u}`,
    `https://thingproxy.freeboard.io/fetch/${u}`,
  ];
}

async function fetchOnce(url, signal) {
  const res = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      Accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.google.com/",
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${t ? ` - ${t.slice(0, 120)}` : ""}`
    );
  }
  const ab = await res.arrayBuffer();
  return {
    bytes: new Uint8Array(ab),
    contentType: res.headers.get("content-type") || "",
  };
}

async function fetchWithRetries(url, { attempts = 6, timeoutMs = 20000 } = {}) {
  const proxies = buildProxyUrls(url);
  let delay = 600;

  for (let i = 0; i < attempts; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetchOnce(url, ctl.signal);
    } catch (e1) {
      // try proxies within the same attempt
      for (const p of proxies) {
        try {
          await sleep(30);
          const r = await fetchOnce(p, ctl.signal);
          clearTimeout(timer);
          return r;
        } catch {}
      }
      clearTimeout(timer);
      if (i < attempts - 1) {
        await sleep(jitter(delay));
        delay *= 1.8;
      }
    }
  }
  throw new Error("Exhausted retries");
}

/* transparent 1x1 PNG fallback (doesn't break image viewers) */
const FALLBACK_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgG2m8uQAAAAASUVORK5CYII=",
    "base64"
  )
);

/* simple limiters to stay polite */
function createLimiter(limit) {
  let active = 0;
  const q = [];
  const pump = () => {
    if (active >= limit || q.length === 0) return;
    active++;
    const { fn, resolve, reject } = q.shift();
    Promise.resolve()
      .then(fn)
      .then((v) => {
        active--;
        resolve(v);
        pump();
      })
      .catch((e) => {
        active--;
        reject(e);
        pump();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      q.push({ fn, resolve, reject });
      pump();
    });
}

function createPerHostLimiter(maxPerHost = 3) {
  const active = new Map();
  const queue = [];
  const next = () => {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      const cur = active.get(job.host) || 0;
      if (cur < maxPerHost) {
        queue.splice(i, 1);
        active.set(job.host, cur + 1);
        Promise.resolve()
          .then(job.fn)
          .then((v) => {
            active.set(job.host, (active.get(job.host) || 1) - 1);
            job.resolve(v);
            next();
          })
          .catch((e) => {
            active.set(job.host, (active.get(job.host) || 1) - 1);
            job.reject(e);
            next();
          });
        break;
      }
    }
  };
  return (host, fn) =>
    new Promise((resolve, reject) => {
      queue.push({ host, fn, resolve, reject });
      next();
    });
}

const cors = (extra = {}) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  ...extra,
});

/* ───────────────────────── GET: single proxy ───────────────────────── */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url)
    return new Response("Missing url", { status: 400, headers: cors() });

  try {
    const out = await fetchWithRetries(url, { attempts: 6, timeoutMs: 20000 });
    return new Response(out.bytes, {
      headers: {
        "Content-Type": out.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
        ...cors(),
      },
    });
  } catch (err) {
    // still hand back a valid tiny PNG so the user always gets *something*
    return new Response(FALLBACK_PNG, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        ...cors(),
      },
    });
  }
}

/* ───────────────────────── POST: ZIP many ─────────────────────────
Body:
  { files: [{ url, filename? }], concurrency?, perHostConcurrency? }
Returns:
  A ZIP stream; never omits entries — failed fetches get a 1×1 PNG with same filename.
-------------------------------------------------------------------- */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const files = Array.isArray(body?.files) ? body.files : [];
    if (!files.length) {
      return new Response("No files", { status: 400, headers: cors() });
    }

    const globalLimiter = createLimiter(
      Math.min(48, Math.max(2, Number(body?.concurrency ?? 12) | 0))
    );
    const hostLimiter = createPerHostLimiter(
      Math.min(8, Math.max(1, Number(body?.perHostConcurrency ?? 3) | 0))
    );

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();

    const used = new Set();
    const failures = [];

    await Promise.all(
      files.map((item, idx) =>
        globalLimiter(async () => {
          const rawUrl = item?.url;
          if (!rawUrl) {
            // no url — still include a placeholder so nothing is skipped
            const baseName = sanitize(item?.filename || `image_${idx + 1}`);
            const name = /\.[^.]+$/.test(baseName)
              ? baseName
              : `${baseName}.png`;
            const finalName = ensureUnique(name, used);
            zip.file(finalName, FALLBACK_PNG);
            failures.push({ index: idx, url: "(missing)" });
            return;
          }

          let host = "unknown";
          try {
            host = new URL(rawUrl).host || "unknown";
          } catch {}

          try {
            await hostLimiter(host, async () => {
              const { bytes, contentType } = await fetchWithRetries(rawUrl, {
                attempts: 6,
                timeoutMs: 20000,
              });
              const provided = sanitize(item?.filename || `image_${idx + 1}`);
              const hasExt = /\.[^.]+$/.test(provided);
              const withExt = hasExt
                ? provided
                : provided + inferExt(contentType, rawUrl);
              const finalName = ensureUnique(withExt, used);
              zip.file(finalName, bytes);
            });
          } catch (err) {
            // last-resort: place a 1×1 PNG under the intended filename so count & names match
            const provided = sanitize(item?.filename || `image_${idx + 1}`);
            const hasExt = /\.[^.]+$/.test(provided);
            const withExt = hasExt ? provided : provided + ".png";
            const finalName = ensureUnique(withExt, used);
            zip.file(finalName, FALLBACK_PNG);
            failures.push({
              index: idx,
              url: rawUrl,
              error: String(err?.message || err),
            });
          }
        })
      )
    );

    if (failures.length) {
      const lines = [
        "Some images could not be fetched after multiple retries.",
        "Placeholders (1x1 transparent PNG) were added so nothing is missing.",
        "",
        "Failed entries:",
        ...failures.map(
          (f) => `#${f.index + 1}  ${f.url}${f.error ? `  —  ${f.error}` : ""}`
        ),
      ].join("\n");
      zip.file("FAILED.txt", lines);
    }

    // Stream the ZIP
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    zip
      .generateInternalStream({
        type: "uint8array",
        streamFiles: true,
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      })
      .on("data", (chunk) => writer.write(chunk))
      .on("error", (err) => {
        console.error("ZIP stream error:", err);
        writer.close();
      })
      .on("end", () => writer.close())
      .resume();

    const today = new Date().toISOString().slice(0, 10);
    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=product-images-${today}.zip`,
        "Cache-Control": "no-store",
        ...cors(),
      },
    });
  } catch (err) {
    console.error("images-zip POST fatal error:", err);
    // Always return a valid ZIP so the browser saves a file
    const { default: JSZip } = await import("jszip");
    const z = new JSZip();
    z.file("ERROR.txt", `Server error: ${String(err?.message || err)}`);
    const bytes = await z.generateAsync({ type: "uint8array" });
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=images-error-wrapper.zip",
        ...cors(),
      },
    });
  }
}

/* ───────────────────────── OPTIONS (CORS) ───────────────────────── */
export async function OPTIONS() {
  return new Response(null, {
    headers: cors({
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    }),
  });
}
