// src/features/adminFeedback/feedbackSliceForAdmin.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import server from "@/api";

// ----------------- helpers -----------------
function getAuthHeader() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ----------------- thunks ------------------

// Fetch paginated feedbacks (maps backend pagination.currentPage -> state.page)
export const fetchAdminFeedbacks = createAsyncThunk(
  "adminFeedback/fetchList",
  async ({ page = 1, limit = 12 }, { rejectWithValue, signal }) => {
    try {
      const url = new URL(`${server}/api/feedback`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));

      const res = await fetch(url.toString(), {
        headers: getAuthHeader(),
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = await res.json();
      const feedbacks = Array.isArray(json?.feedbacks) ? json.feedbacks : [];
      const p = json?.pagination || {};

      return {
        feedbacks,
        pagination: {
          page: p.currentPage || page,
          limit: p.limit || limit,
          totalPages: p.totalPages || 1,
          totalFeedbacks: p.totalFeedbacks || feedbacks.length || 0,
          hasNextPage: !!p.hasNextPage,
          hasPrevPage: !!p.hasPrevPage,
        },
      };
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch feedbacks");
    }
  }
);

// Activate (PUT /api/feedback/active/:id)
export const activateFeedbackOnHome = createAsyncThunk(
  "adminFeedback/activateOne",
  async ({ id }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(
        `${server}/api/feedback/active/${id}`,
        {},
        { headers: getAuthHeader() }
      );
      return { id, updated: data?.feedback || null };
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to set active feedback";
      return rejectWithValue({ id, message: msg });
    }
  }
);

// Deactivate (PUT /api/feedback/deactive/:id)
export const deactivateFeedbackFromHome = createAsyncThunk(
  "adminFeedback/deactivateOne",
  async ({ id }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(
        `${server}/api/feedback/deactive/${id}`,
        {},
        { headers: getAuthHeader() }
      );
      return { id, updated: data?.feedback || null };
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to deactivate feedback";
      return rejectWithValue({ id, message: msg });
    }
  }
);

// ----------------- slice -------------------
const initialState = {
  items: [],
  loading: false,
  error: "",

  // server-driven pagination
  page: 1,
  limit: 12,
  totalPages: 1,
  totalFeedbacks: 0,
  hasNextPage: false,
  hasPrevPage: false,

  // per-row UI assist states
  activating: {}, // { [id]: true }
  activated: {}, // success flash
  deactivating: {}, // { [id]: true }
  deactivated: {}, // success flash
};

const adminFeedbackSlice = createSlice({
  name: "adminFeedback",
  initialState,
  reducers: {
    setPage(state, action) {
      state.page = Math.max(1, Number(action.payload) || 1);
    },
    setLimit(state, action) {
      const n = Number(action.payload) || 12;
      state.limit = n;
      state.page = 1;
    },
    clearError(state) {
      state.error = "";
    },
    clearActivatedFlash(state, action) {
      const id = action.payload;
      if (id && state.activated[id]) delete state.activated[id];
    },
    clearDeactivatedFlash(state, action) {
      const id = action.payload;
      if (id && state.deactivated[id]) delete state.deactivated[id];
    },
  },
  extraReducers: (builder) => {
    // fetch list
    builder.addCase(fetchAdminFeedbacks.pending, (state) => {
      state.loading = true;
      state.error = "";
    });
    builder.addCase(fetchAdminFeedbacks.fulfilled, (state, action) => {
      state.loading = false;
      state.error = "";
      state.items = action.payload.feedbacks || [];
      const p = action.payload.pagination || {};
      state.page = p.page || state.page;
      state.limit = p.limit || state.limit;
      state.totalPages = p.totalPages || 1;
      state.totalFeedbacks = p.totalFeedbacks || state.items.length || 0;
      state.hasNextPage = !!p.hasNextPage;
      state.hasPrevPage = !!p.hasPrevPage;
    });
    builder.addCase(fetchAdminFeedbacks.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || "Unknown error";
      state.items = [];
      state.totalPages = 1;
      state.totalFeedbacks = 0;
      state.hasNextPage = false;
      state.hasPrevPage = false;
    });

    // activate
    builder.addCase(activateFeedbackOnHome.pending, (state, action) => {
      const id = action.meta?.arg?.id;
      if (id) state.activating[id] = true;
      state.error = "";
    });
    builder.addCase(activateFeedbackOnHome.fulfilled, (state, action) => {
      const { id, updated } = action.payload || {};
      if (id) {
        delete state.activating[id];
        state.activated[id] = true;
        state.items = state.items.map((f) =>
          f._id === id
            ? {
                ...f,
                isActive: true,
                ...(updated || {}),
              }
            : f
        );
      }
    });
    builder.addCase(activateFeedbackOnHome.rejected, (state, action) => {
      const { id, message } = action.payload || {};
      if (id) delete state.activating[id];
      state.error = message || "Failed to set active feedback";
    });

    // deactivate
    builder.addCase(deactivateFeedbackFromHome.pending, (state, action) => {
      const id = action.meta?.arg?.id;
      if (id) state.deactivating[id] = true;
      state.error = "";
    });
    builder.addCase(deactivateFeedbackFromHome.fulfilled, (state, action) => {
      const { id, updated } = action.payload || {};
      if (id) {
        delete state.deactivating[id];
        state.deactivated[id] = true;
        state.items = state.items.map((f) =>
          f._id === id
            ? {
                ...f,
                isActive: false,
                ...(updated || {}),
              }
            : f
        );
      }
    });
    builder.addCase(deactivateFeedbackFromHome.rejected, (state, action) => {
      const { id, message } = action.payload || {};
      if (id) delete state.deactivating[id];
      state.error = message || "Failed to deactivate feedback";
    });
  },
});

// ----------------- selectors ----------------
// Plain selector (no identity createSelector). No warning, no extra re-renders.
const root = (s) => s.adminFeedback;
export const selectAdminFeedbackState = root;

// ----------------- actions ------------------
export const {
  setPage,
  setLimit,
  clearError,
  clearActivatedFlash,
  clearDeactivatedFlash,
} = adminFeedbackSlice.actions;

export default adminFeedbackSlice.reducer;
