// ==============================
// lib/csv.js (JavaScript)
// ==============================
// CHANGES
// - Robust, schema-agnostic mapping for IA–Powersoft and others.
// - Case-insensitive, whitespace/punctuation-insensitive header matching.
// - Greek synonyms supported (Κωδικός, Περιγραφή, κ.λπ.).
// - Never “drops” the dataset just because description is missing.
// - Map synonyms to canonical fields, keep extra fields as-is.

export function normalizeKey(k) {
  return String(k || "")
    .toLowerCase()
    .replace(/^[\ufeff]+/, "") // BOM
    .replace(/\s+/g, "")
    .replace(/[_\-./|]+/g, "")
    .replace(/[()\[\]:;,'"`]/g, "");
}

export const FIELD_SYNONYMS = {
  itemCode: [
    "itemcode",
    "code",
    "sku",
    "productcode",
    "κωδικος",
    "κωδικοςειδους",
    "κωδικοςειδουςitem",
    "item code",
    "Item Code",
  ],
  barcode: [
    "barcode",
    "ean",
    "gtin",
    "upc",
    "κωδικοςγραμμωτουκωδικα",
    "γραμμωτοσ",
    "γραμμωτος",
    "Barcode",
  ],
  description: [
    "description",
    "itemdescription",
    "name",
    "title",
    "περιγραφη",
    "περιγραφή",
    "ονoμα",
    "ονόμα",
    "Item Description",
    "Description",
  ],
  weight: ["weight", "netweight", "grossweight", "βαρος", "βάρος", "Weight"],
  imageUrl: [
    "image",
    "imageurl",
    "images",
    "photourl",
    "εικονα",
    "εικόνα",
    "Image",
    "Image URL",
  ],
  seoTitle: ["seotitle", "SEO Title"],
  seoShort: ["seoshort", "SEO Short"],
  seoLong: ["seolong", "SEO Long"],
};

export function parseCsvResultsToRows(results) {
  const raw = Array.isArray(results?.data) ? results.data : [];
  const data = raw.filter((r) => r && Object.keys(r).length > 0);

  if (!data.length) return { rows: [], nextId: 1 };

  // Build key map: original -> canonical (if synonym match) or original
  const headers = Object.keys(data[0]);
  const keyMap = {};
  for (const orig of headers) {
    const norm = normalizeKey(orig);
    let mapped = orig;
    for (const [canonical, syns] of Object.entries(FIELD_SYNONYMS)) {
      if (syns.some((s) => normalizeKey(s) === norm)) {
        mapped = canonical;
        break;
      }
    }
    keyMap[orig] = mapped;
  }

  let nid = 1;
  const rows = data.map((row) => {
    const newRow = {};
    for (const [k, v] of Object.entries(row)) {
      const mappedKey = keyMap[k];
      // Last one wins if collision (unlikely)
      newRow[mappedKey] = v;
    }
    // Ensure known fields exist (default empty)
    Object.keys(FIELD_SYNONYMS).forEach((field) => {
      if (!(field in newRow)) newRow[field] = "";
    });
    // Weight to number
    if ("weight" in newRow) newRow.weight = Number(newRow.weight) || 0;
    return newRow;
  });

  // Assign ids
  const maxId = Math.max(0, ...rows.map((r) => Number(r.id) || 0));
  nid = maxId + 1;
  rows.forEach((r) => {
    if (!r.id) r.id = nid++;
  });

  return { rows, nextId: nid };
}
