import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Async thunk to fetch the user's token
export const fetchUserToken = createAsyncThunk(
  "userToken/fetchUserToken",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${server}/api/tokens`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      // endpoint should hit your getAllTokens controller
      return res.data; // should be the token object
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch user token"
      );
    }
  }
);

const userTokenSlice = createSlice({
  name: "userToken",
  initialState: {
    token: null, // will hold the user token object
    loading: false,
    error: null,
  },
  reducers: {
    clearUserToken: (state) => {
      state.token = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserToken.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload;
      })
      .addCase(fetchUserToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearUserToken } = userTokenSlice.actions;
export default userTokenSlice.reducer;
