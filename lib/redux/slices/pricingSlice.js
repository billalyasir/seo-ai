// features/pricing/pricingSlice.js
import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Reuse the token resolution approach from your profile slice
const resolveToken = (getState) => {
  const state = getState();
  return (
    state?.login?.token ||
    (typeof window !== "undefined" ? localStorage.getItem("token") : null)
  );
};

// GET /api/pricings
export const fetchPricings = createAsyncThunk(
  "pricing/fetchPricings",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${server}/api/pricing`);
      return data; // array of pricing objects
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Failed to load pricings.";
      return rejectWithValue({ message, code: status });
    }
  }
);

// POST /api/pricings
export const createPricing = createAsyncThunk(
  "pricing/createPricing",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = resolveToken(getState);
      const { data } = await axios.post(`${server}/api/pricing`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return data; // created pricing
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Failed to create pricing.";
      return rejectWithValue({ message, code: status });
    }
  }
);

// PATCH /api/pricings/:id
export const updatePricing = createAsyncThunk(
  "pricing/updatePricing",
  async ({ id, updates }, { getState, rejectWithValue }) => {
    try {
      const token = resolveToken(getState);
      const { data } = await axios.patch(
        `${server}/api/pricing/${id}`,
        updates,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return data; // updated pricing
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Failed to update pricing.";
      return rejectWithValue({ message, code: status, id });
    }
  }
);

// DELETE /api/pricings/:id
export const deletePricing = createAsyncThunk(
  "pricing/deletePricing",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = resolveToken(getState);
      await axios.delete(`${server}/api/pricing/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return id; // return deleted id
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Failed to delete pricing.";
      return rejectWithValue({ message, code: status, id });
    }
  }
);

const initialState = {
  items: [], // array of pricings
  loading: false, // list-level loading
  error: null,

  creating: false,
  updatingById: {}, // { [id]: boolean }
  deletingById: {}, // { [id]: boolean }
};

const pricingSlice = createSlice({
  name: "pricing",
  initialState,
  reducers: {
    // Optional local reducer if you want to optimistically set items
    setPricings: (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    },
  },
  extraReducers: (builder) => {
    // FETCH
    builder
      .addCase(fetchPricings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPricings.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchPricings.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message ||
          "Failed to load pricings. Please try again.";
      });

    // CREATE
    builder
      .addCase(createPricing.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createPricing.fulfilled, (state, action) => {
        state.creating = false;
        if (action.payload) state.items.unshift(action.payload);
      })
      .addCase(createPricing.rejected, (state, action) => {
        state.creating = false;
        state.error =
          action.payload?.message ||
          "Failed to create pricing. Please try again.";
      });

    // UPDATE
    builder
      .addCase(updatePricing.pending, (state, action) => {
        const id = action.meta.arg?.id;
        if (id) state.updatingById[id] = true;
        state.error = null;
      })
      .addCase(updatePricing.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated?._id) {
          const idx = state.items.findIndex((p) => p._id === updated._id);
          if (idx !== -1) state.items[idx] = updated;
        }
        if (updated?._id) delete state.updatingById[updated._id];
      })
      .addCase(updatePricing.rejected, (state, action) => {
        const id = action.payload?.id || action.meta.arg?.id;
        if (id) delete state.updatingById[id];
        state.error =
          action.payload?.message ||
          "Failed to update pricing. Please try again.";
      });

    // DELETE
    builder
      .addCase(deletePricing.pending, (state, action) => {
        const id = action.meta.arg;
        if (id) state.deletingById[id] = true;
        state.error = null;
      })
      .addCase(deletePricing.fulfilled, (state, action) => {
        const id = action.payload;
        state.items = state.items.filter((p) => p._id !== id);
        if (id) delete state.deletingById[id];
      })
      .addCase(deletePricing.rejected, (state, action) => {
        const id = action.payload?.id || action.meta.arg;
        if (id) delete state.deletingById[id];
        state.error =
          action.payload?.message ||
          "Failed to delete pricing. Please try again.";
      });
  },
});

export const { setPricings } = pricingSlice.actions;
export default pricingSlice.reducer;
