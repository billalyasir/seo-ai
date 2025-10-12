// src/features/adminFeedback/feedbackCountSlice.js
import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import server from "@/api";

// 🔹 helper to attach auth header
function getAuthHeader() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 🔹 thunk: fetch total feedback count
export const fetchFeedbackCount = createAsyncThunk(
  "feedbackCount/fetch",
  async (_, { rejectWithValue, signal }) => {
    try {
      const res = await fetch(`${server}/api/feedback/count`, {
        headers: getAuthHeader(),
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = await res.json();
      return json.count || 0;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch feedback count");
    }
  }
);

// 🔹 initial state
const initialState = {
  count: 0,
  loading: false,
  error: "",
};

// 🔹 slice
const feedbackCountSlice = createSlice({
  name: "feedbackCount",
  initialState,
  reducers: {
    clearError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchFeedbackCount.pending, (state) => {
      state.loading = true;
      state.error = "";
    });
    builder.addCase(fetchFeedbackCount.fulfilled, (state, action) => {
      state.loading = false;
      state.error = "";
      state.count = action.payload;
    });
    builder.addCase(fetchFeedbackCount.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || "Unknown error";
      state.count = 0;
    });
  },
});

// 🔹 selectors
const root = (s) => s.feedbackCount;
export const selectFeedbackCount = createSelector([root], (s) => s);

export const { clearError } = feedbackCountSlice.actions;

export default feedbackCountSlice.reducer;
