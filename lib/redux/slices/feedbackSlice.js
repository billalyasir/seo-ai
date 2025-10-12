// features/feedbackActiveSlice.js
// Simple slice that JUST fetches the active feedback list — no IDs, no entity adapter.

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import server from "@/api";

// --- Initial state ---
const initialState = {
  loading: false,
  error: null,
  lastFetchedAt: null,
  feedback: [], // <-- plain array of feedback objects
};

// --- Async thunk: fetch active feedbacks ---
export const fetchActiveFeedbacks = createAsyncThunk(
  "feedbackActive/fetchActive",
  async (_, { signal, rejectWithValue }) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return null;
      const res = await fetch(`${server}/api/feedback/active`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();

      const list = Array.isArray(data?.feedback) ? data.feedback : [];
      return list; // return just the array
    } catch (err) {
      return rejectWithValue(
        err?.message || "Failed to fetch active feedbacks"
      );
    }
  }
);

// --- Slice ---
const feedbackActiveSlice = createSlice({
  name: "feedbackActive",
  initialState,
  reducers: {
    // Clear everything
    clearActiveFeedbacks(state) {
      state.loading = false;
      state.error = null;
      state.lastFetchedAt = null;
      state.feedback = [];
    },
    // Optional helpers if you want to mutate the array locally
    replaceActiveFeedbacks(state, action) {
      state.feedback = Array.isArray(action.payload) ? action.payload : [];
    },
    appendActiveFeedback(state, action) {
      state.feedback.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveFeedbacks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveFeedbacks.fulfilled, (state, action) => {
        state.loading = false;
        state.feedback = action.payload || [];
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchActiveFeedbacks.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || action.error?.message || "Unknown error";
      });
  },
});

// --- Actions ---
export const {
  clearActiveFeedbacks,
  replaceActiveFeedbacks,
  appendActiveFeedback,
} = feedbackActiveSlice.actions;

// --- Selectors ---
export const selectActiveFeedbackLoading = (state) =>
  state.feedbackActive.loading;
export const selectActiveFeedbackError = (state) => state.feedbackActive.error;
export const selectActiveFeedbackList = (state) =>
  state.feedbackActive.feedback;
export const selectActiveFeedbackLastFetchedAt = (state) =>
  state.feedbackActive.lastFetchedAt;

// --- Reducer export ---
export default feedbackActiveSlice.reducer;
