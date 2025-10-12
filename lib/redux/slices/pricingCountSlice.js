// src/features/adminFeedback/pricingCountSlice.js
import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import server from "@/api";

// attach auth header if a token exists
function getAuthHeader() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// thunk: fetch total pricing count
export const fetchPricingCount = createAsyncThunk(
  "pricingCount/fetch",
  async (_, { rejectWithValue, signal }) => {
    try {
      const res = await fetch(`${server}/api/pricing-count`, {
        headers: getAuthHeader(),
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = await res.json();
      // expect { success: true, count: number }
      return typeof json.count === "number" ? json.count : 0;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch pricing count");
    }
  }
);

const initialState = {
  count: 0,
  loading: false,
  error: "",
};

const pricingCountSlice = createSlice({
  name: "pricingCount",
  initialState,
  reducers: {
    clearPricingCountError(state) {
      state.error = "";
    },
    // optional: allow manual set (useful in tests)
    setPricingCount(state, action) {
      const n = Number(action.payload);
      state.count = Number.isFinite(n) ? n : 0;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchPricingCount.pending, (state) => {
      state.loading = true;
      state.error = "";
    });
    builder.addCase(fetchPricingCount.fulfilled, (state, action) => {
      state.loading = false;
      state.error = "";
      state.count = action.payload;
    });
    builder.addCase(fetchPricingCount.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || "Unknown error";
      state.count = 0;
    });
  },
});

// selectors
const root = (s) => s.pricingCount; // ⬅️ make sure your store key matches this
export const selectPricingCount = createSelector([root], (s) => s);

// actions + reducer
export const { clearPricingCountError, setPricingCount } =
  pricingCountSlice.actions;
export default pricingCountSlice.reducer;
