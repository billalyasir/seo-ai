import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Thunk to fetch file count
export const fetchFileCount = createAsyncThunk(
  "fileCount/fetchFileCount",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${server}/api/file-count`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        throw new Error("Failed to fetch file count");
      }

      const data = await resp.json();

      // ✅ Normalize response so it's always safe
      if (data && typeof data.count === "number") {
        return { count: data.count };
      }
      return { count: 0 };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const fileCountSlice = createSlice({
  name: "fileCount",
  initialState: {
    count: 0,
    loading: false,
    error: null,
  },
  reducers: {
    resetFileCount: (state) => {
      state.count = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFileCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFileCount.fulfilled, (state, action) => {
        state.loading = false;
        // ✅ Use optional chaining + fallback
        state.count = action.payload?.count ?? 0;
      })
      .addCase(fetchFileCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unknown error";
      });
  },
});

export const { resetFileCount } = fileCountSlice.actions;
export default fileCountSlice.reducer;
