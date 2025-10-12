import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import server from "@/api";

// ---- PUBLIC ONLY thunk (GET /api/token-costing) ----
export const fetchTokenDedux = createAsyncThunk(
  "tokenDedux/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${server}/api/token-costing`, {
        validateStatus: () => true,
      });
      if (res.status === 404) return null; // no singleton yet
      if (res.status < 200 || res.status >= 300) {
        const msg =
          typeof res.data === "object" && res.data?.message
            ? res.data.message
            : "Request failed";
        return rejectWithValue(msg);
      }
      // controller returns ok(res, doc) -> doc is the payload
      return res.data ?? null;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || err?.message || "Network error"
      );
    }
  }
);

const initialState = {
  data: null, // token costing doc or null
  loading: false, // boolean
  error: null,
};

const tokenDeduxSlice = createSlice({
  name: "tokenDedux",
  initialState,
  reducers: {
    resetTokenDeduxState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTokenDedux.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTokenDedux.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload; // can be null (no singleton yet)
      })
      .addCase(fetchTokenDedux.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

// ---- selectors ----
export const selectTokenDedux = (state) => state.tokenDedux.data;
export const selectTokenDeduxLoading = (state) => state.tokenDedux.loading;
export const selectTokenDeduxError = (state) => state.tokenDedux.error;

// Optional derived totals (from public data)
export const selectTotalSEO = (state) => {
  const d = state.tokenDedux.data || {};
  return (
    Number(d.per_seo_title || 0) +
    Number(d.per_seo_short_description || 0) +
    Number(d.per_seo_long_description || 0)
  );
};
export const selectTotalImage = (state) => {
  const d = state.tokenDedux.data || {};
  return Number(d.per_image_request || 0) + Number(d.per_image || 0);
};

export const { resetTokenDeduxState } = tokenDeduxSlice.actions;
export default tokenDeduxSlice.reducer;
