// app/store/userCountSlice.js
// A tiny Redux slice that fetches and stores the global user count.
// Plain JavaScript, using @reduxjs/toolkit. It fetches from /api/users/stats
// and reads the token from localStorage (client-side).

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import server from "@/api";

// Build Authorization header from localStorage token (client-only)
function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Async thunk to fetch user count from your API
// Expects the API to return: { success: true, data: { totalUsers: number, ... } }
export const fetchUserCount = createAsyncThunk(
  "userCount/fetchUserCount",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${server}/api/users/stats`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...authHeaders(),
        },
        cache: "no-store",
      });

      // Network/HTTP level errors
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return rejectWithValue(
          `HTTP ${res.status}${text ? `: ${text.slice(0, 180)}` : ""}`
        );
      }

      const json = await res.json();
      if (!json || json.success !== true) {
        return rejectWithValue("Invalid response from server");
      }

      const totalUsers =
        json?.data?.totalUsers != null ? Number(json.data.totalUsers) : 0;

      // Always return a number
      return Number.isFinite(totalUsers) ? totalUsers : 0;
    } catch (err) {
      return rejectWithValue(
        err && err.message ? err.message : "Failed to fetch user count"
      );
    }
  }
);

const initialState = {
  count: 0,
  loading: false,
  error: null,
  lastFetched: null, // epoch ms
};

const userCountSlice = createSlice({
  name: "userCount",
  initialState,
  reducers: {
    // Optional manual overrides
    setUserCount(state, action) {
      state.count = Number.isFinite(action.payload) ? action.payload : 0;
      state.error = null;
    },
    resetUserCount(state) {
      state.count = 0;
      state.error = null;
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserCount.fulfilled, (state, action) => {
        state.loading = false;
        state.count = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchUserCount.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : "Unable to load user count";
      });
  },
});

export const { setUserCount, resetUserCount } = userCountSlice.actions;

// Simple selectors
export const selectUserCount = (state) => state.userCount.count;
export const selectUserCountLoading = (state) => state.userCount.loading;
export const selectUserCountError = (state) => state.userCount.error;
export const selectUserCountLastFetched = (state) =>
  state.userCount.lastFetched;

export default userCountSlice.reducer;
