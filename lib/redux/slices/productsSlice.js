// src/lib/redux/slices/productsSlice.js

import server from "@/api";
import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import { fetchUserToken } from "./userTokenSlice";

/* ----------------------------- utils ----------------------------- */

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getUniqueUrls(urls = []) {
  const seen = new Set();
  const unique = [];
  for (const url of urls || []) {
    if (!url) continue;
    if (String(url).startsWith("x-raw-image")) continue;
    let base = String(url).split("?")[0];
    base = base.replace(/(\.jpg|\.jpeg|\.png|\.gif|\.bmp|\.svg)\.webp$/i, "");
    base = base.replace(/(\.webp|\.jpg|\.jpeg|\.png|\.gif|\.bmp|\.svg)$/i, "");
    if (!seen.has(base)) {
      seen.add(base);
      unique.push(url);
    }
  }
  return unique;
}

export function sanitizeSegment(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .replace(/[^a-zA-Z0-9\-_ ]/gi, "")
    .replace(/\s/g, "_");
}

export function makeBaseName(rec, baseField = "itemCode") {
  const val = rec?.[baseField] || "";
  const cleaned = sanitizeSegment(val);
  return cleaned || String(rec?.id ?? "item");
}

/** 1-based suffix AFTER the first image: base, base_1, base_2, ... */
export function makeIndexedNameFromSelection(
  rec,
  baseField,
  sep,
  selectionIndex
) {
  const base = makeBaseName(rec, baseField);
  // first selected image => no suffix; subsequent => _1, _2, ...
  return selectionIndex === 0 ? base : `${base}${sep}${selectionIndex}`;
}

/* ----------------------------- thunks ---------------------------- */

/** Fetch images for a record using the specified query field. */
export const fetchImagesForRecord = createAsyncThunk(
  "products/fetchImagesForRecord",
  async ({ record, num, queryField }, { rejectWithValue }) => {
    try {
      const q = String(record?.[queryField] || "").trim();
      if (!q) throw new Error(`No value for query field: ${queryField}`);

      const token = localStorage.getItem("token");
      const url = `${server}/api/images?q=${encodeURIComponent(
        q
      )}&num=${encodeURIComponent(num || 5)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const json = await res.json();
      const urls = getUniqueUrls(Array.isArray(json?.data) ? json.data : []);
      return { id: record?.id, query: q, urls };
    } catch (err) {
      return rejectWithValue({
        id: record?.id,
        message: err?.message || "Unknown error",
      });
    }
  }
);

/** Update images for a list of IDs and preselect the first N (order preserved). */
export const updateImagesForIds = createAsyncThunk(
  "products/updateImagesForIds",
  async ({ ids, queryField }, { getState, dispatch }) => {
    const state = getState().products;
    const byId = new Map(state.rows.map((r) => [r.id, deepCopy(r)]));
    const N = state.imagesPerProduct || 3;

    dispatch(
      productsSlice.actions.setProgress({ total: ids.length, completed: 0 })
    );
    dispatch(productsSlice.actions.setIsProcessing(true));

    for (const id of ids) {
      const r = byId.get(id);
      if (!r) {
        dispatch(productsSlice.actions.incrementCompleted());
        continue;
      }

      const result = await dispatch(
        fetchImagesForRecord({ record: r, num: Math.max(N, 1), queryField })
      );

      if (fetchImagesForRecord.fulfilled.match(result)) {
        const urls = result.payload.urls;
        dispatch(productsSlice.actions.setImagesForId({ id, urls }));
        dispatch(
          productsSlice.actions.selectImagesForId({
            id,
            urls: urls.slice(0, N),
          })
        );
      } else {
        dispatch(productsSlice.actions.setImagesForId({ id, urls: [] }));
      }

      dispatch(productsSlice.actions.incrementCompleted());
      await new Promise((r) => setTimeout(r, 300));
    }

    dispatch(productsSlice.actions.setIsProcessing(false));
  }
);

/** Small SSE parser for fetch() streams (server-sent events). */
function createSSEParser(onEvent) {
  let buffer = "";
  return function feed(chunk) {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = rawEvent.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data += (data ? "\n" : "") + line.slice(5).trim();
        }
      }
      if (data) {
        try {
          onEvent(event, JSON.parse(data));
        } catch {
          // non-JSON payloads ignored
        }
      }
    }
  };
}

/** Generate SEO text for selected IDs — streaming batches as they complete. */
export const generateSEOForIds = createAsyncThunk(
  "products/generateSEOForIds",
  async (ids, { getState, dispatch, rejectWithValue }) => {
    const state = getState().products;
    const byId = new Map(state.rows.map((r) => [r.id, deepCopy(r)]));

    try {
      const products = ids.map((id) => {
        const r = byId.get(id);
        const p = { id: r.id };
        Object.keys(r).forEach((k) => {
          if (!["id", "seoTitle", "seoShort", "seoLong"].includes(k))
            p[k] = r[k] || "";
        });
        return deepCopy(p);
      });

      const lang = /greek/i.test(state.lang || "") ? "Greek" : "English";
      const token = localStorage.getItem("token");

      // streaming UI state
      dispatch(productsSlice.actions.setIsProcessing(true));
      dispatch(
        productsSlice.actions.setProgress({ total: ids.length, completed: 0 })
      );

      const resp = await fetch(`${server}/api/seo/generate/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          products,
          seoTargets: deepCopy(state.seoTargets),
          lang,
        }),
      });

      // If server doesn't support stream (e.g., proxy closed), fallback to one-shot
      if (!resp.ok || !resp.body) {
        // fallback
        const alt = await fetch(`${server}/api/seo/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            products,
            seoTargets: deepCopy(state.seoTargets),
            lang,
          }),
        });

        if (!alt.ok) throw new Error(`HTTP ${alt.status}: ${await alt.text()}`);
        const json = await alt.json();
        dispatch(fetchUserToken());
        const updates = Array.isArray(json?.data) ? json.data : [];
        for (const u of updates) {
          const cur = byId.get(u.id);
          if (!cur) continue;
          const patch = { ...cur };
          if (u.seoTitle != null) patch.seoTitle = String(u.seoTitle);
          if (u.seoShort != null) patch.seoShort = String(u.seoShort);
          if (u.seoLong != null) patch.seoLong = String(u.seoLong);
          dispatch(productsSlice.actions.upsertRow(patch));
          dispatch(productsSlice.actions.incrementCompleted());
        }
        dispatch(productsSlice.actions.setIsProcessing(false));

        return;
      }

      // Parse SSE with fetch reader
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      const feed = createSSEParser((event, data) => {
        if (event === "batch" && data && Array.isArray(data.rows)) {
          for (const u of data.rows) {
            const cur = byId.get(u.id);
            if (!cur) continue;
            const patch = { ...cur };
            if (u.seoTitle != null) patch.seoTitle = String(u.seoTitle);
            if (u.seoShort != null) patch.seoShort = String(u.seoShort);
            if (u.seoLong != null) patch.seoLong = String(u.seoLong);
            dispatch(productsSlice.actions.upsertRow(patch));
          }
          // increment progress by the batch size (capped to total)
          const inc = Math.min(data.size || data.rows.length || 0, ids.length);
          for (let i = 0; i < inc; i++) {
            dispatch(productsSlice.actions.incrementCompleted());
          }
        } else if (event === "done") {
          // could use data.token_deduction, data.openai_cost if you want to surface it
        }
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        feed(chunk);
      }

      dispatch(productsSlice.actions.setIsProcessing(false));
    } catch (err) {
      dispatch(productsSlice.actions.setIsProcessing(false));
      return rejectWithValue(err?.message || "Failed to generate SEO");
    }
  }
);

/* -------------------------- initial state ------------------------- */

const initialState = {
  rows: [],
  nextId: 1,
  selected: [],
  acceptedInfo: null,

  mode: "images",
  showChoice: false,
  choice: "seo",

  seoSourceCols: [],
  seoTargets: ["title", "short description", "long description"],
  lang: "English",

  isProcessing: false,
  progress: { total: 0, completed: 0 },

  imagesById: {}, // { [productId]: string[] }
  selectedImagesById: {}, // { [productId]: string[] } (ORDER matters)
  imagesPerProduct: 3,

  filenameBaseField: "",
  filenameSeparator: "_",
  imageQueryField: "",
};

/* ---------------------------- slice ---------------------------- */

export const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setRows(state, action) {
      state.rows = deepCopy(action.payload || []);
      state.selected = [];
      state.imagesById = {};
      state.selectedImagesById = {};
      state.filenameBaseField = "";
      state.imageQueryField = "";
    },
    setNextId(state, action) {
      state.nextId = Number(action.payload) || state.nextId;
    },
    upsertRow(state, action) {
      const rec = deepCopy(action.payload);
      const idx = state.rows.findIndex((r) => r.id === rec.id);
      if (idx >= 0) state.rows[idx] = { ...state.rows[idx], ...rec };
      else state.rows.unshift(rec);
    },
    removeRow(state, action) {
      const id = action.payload;
      state.rows = state.rows.filter((r) => r.id !== id);
      delete state.imagesById[id];
      delete state.selectedImagesById[id];
      state.selected = state.selected.filter((sid) => sid !== id);
    },

    /* selection for grid */
    setSelected(state, action) {
      state.selected = deepCopy(action.payload || []);
    },

    setAcceptedInfo(state, action) {
      state.acceptedInfo = deepCopy(action.payload);
    },
    setMode(state, action) {
      state.mode = action.payload;
    },
    setShowChoice(state, action) {
      state.showChoice = action.payload;
    },
    setChoice(state, action) {
      state.choice = action.payload;
    },
    setSeoSourceCols(state, action) {
      state.seoSourceCols = deepCopy(action.payload);
    },
    setSeoTargets(state, action) {
      state.seoTargets = deepCopy(action.payload);
    },
    setLang(state, action) {
      state.lang = action.payload;
    },
    setProgress(state, action) {
      state.progress = deepCopy(action.payload);
    },
    incrementCompleted(state) {
      state.progress.completed += 1;
      if (state.progress.completed > state.progress.total) {
        state.progress.completed = state.progress.total;
      }
    },
    setIsProcessing(state, action) {
      state.isProcessing = action.payload;
    },

    /* images per product */
    setImagesForId(state, action) {
      const { id, urls } = action.payload || {};
      state.imagesById[id] = Array.isArray(urls) ? urls : [];
      if (!Array.isArray(state.selectedImagesById[id])) {
        state.selectedImagesById[id] = [];
      }
    },
    selectImagesForId(state, action) {
      const { id, urls } = action.payload || {};
      const existing = state.selectedImagesById[id] || [];
      const next = existing.slice();
      for (const u of urls || []) if (!next.includes(u)) next.push(u);
      state.selectedImagesById[id] = next;
    },
    clearSelectedImagesForId(state, action) {
      const pid =
        typeof action?.payload === "number"
          ? action.payload
          : action?.payload?.id;
      if (pid != null) state.selectedImagesById[pid] = [];
    },
    selectAllImagesForId(state, action) {
      const { id, urls } = action.payload || {};
      state.selectedImagesById[id] = Array.isArray(urls) ? urls.slice() : [];
    },

    /**
     * IMPORTANT: Selection behavior for the modal:
     * - If checked === true and url not present -> insert at FRONT (unshift).
     *   This makes it the new #1 => filename becomes _1.
     * - If checked === false -> remove from array, keeping the order of others.
     */
    toggleSelectImage(state, action) {
      const { id, url, checked } = action.payload || {};
      const arr = Array.isArray(state.selectedImagesById[id])
        ? state.selectedImagesById[id].slice()
        : [];
      const idx = arr.indexOf(url);
      if (checked) {
        if (idx === -1) arr.unshift(url);
      } else {
        if (idx !== -1) arr.splice(idx, 1);
      }
      state.selectedImagesById[id] = arr;
    },

    setImagesPerProduct(state, action) {
      const n = Math.max(1, Math.min(parseInt(action.payload, 10) || 1, 10));
      state.imagesPerProduct = n;
    },

    setFilenameBaseField(state, action) {
      state.filenameBaseField = String(action.payload || "");
    },
    setFilenameSeparator(state, action) {
      state.filenameSeparator = String(action.payload ?? "_").slice(0, 3);
    },
    setImageQueryField(state, action) {
      state.imageQueryField = String(action.payload || "");
    },

    clearAll() {
      return { ...initialState };
    },
  },
});

export default productsSlice.reducer;

/* -------------------------- selectors --------------------------- */

export const selectProducts = (s) => s.products;
export const selectRows = (s) => s.products.rows;

export const selectDisplayedRows = createSelector([selectRows], (rows) =>
  deepCopy(
    rows.filter(
      (r) =>
        String(r.description || "").trim().length > 0 ||
        String(r.itemCode || "").trim().length > 0 ||
        String(r.barcode || "").trim().length > 0
    )
  )
);

/**
 * Build final download list [{ id, url, filename }] using per-product SELECTION ORDER:
 * ALWAYS 1-based suffixes: base_1, base_2, ...
 */
export const computeDownloadSelections = createSelector(
  [
    (s) => s.products?.imagesById,
    (s) => s.products?.selectedImagesById,
    (s) => s.products?.rows,
    (s) => s.products?.filenameBaseField,
    (s) => s.products?.filenameSeparator,
  ],
  (imagesById, selectedImagesById, rows, baseField, sep) => {
    const byId = new Map(rows?.map((r) => [r.id, r]));
    const out = [];
    for (const [idStr, selectedUrls] of Object.entries(
      selectedImagesById || {}
    )) {
      const id = Number(idStr);
      const rec = byId.get(id);
      if (!rec || !Array.isArray(selectedUrls) || selectedUrls.length === 0)
        continue;

      selectedUrls.forEach((url, selectionIdx) => {
        const nameNoExt = makeIndexedNameFromSelection(
          rec,
          baseField || "itemCode",
          sep,
          selectionIdx
        );
        const extMatch = String(url)
          .split("?")[0]
          .match(/\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i);
        const ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";
        out.push({ id, url, filename: `${nameNoExt}${ext}` });
      });
    }
    return out;
  }
);
