// lib/productsUtils.js

/* -------------------- local utils -------------------- */
export const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

export function humanSize(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export const ALL_SEO_TARGETS = [
  { key: "title", field: "seoTitle", label: "Title" },
  { key: "short description", field: "seoShort", label: "Short Description" },
  { key: "long description", field: "seoLong", label: "Long Description" },
];

export function inferExt(url) {
  const m = String(url)
    .split("?")[0]
    .match(/\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i);
  return m ? m[0].toLowerCase() : ".jpg";
}

export function prettyCaption(key) {
  if (!key || typeof key !== "string") return "Select";
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export const pickRandom = (arr = []) =>
  Array.isArray(arr) && arr.length
    ? arr[Math.floor(Math.random() * arr.length)]
    : "";
