// features/auth/verifyEmailSlice.js
import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/**
 * GET /api/verify?token=...
 * Your backend returns: { message: "Email verified successfully." }
 */
export const verifyAccount = createAsyncThunk(
  "auth/verifyAccount",
  async ({ token }, { rejectWithValue }) => {
    try {
      if (!token) {
        return rejectWithValue({ message: "Invalid or missing token." });
      }
      const { data } = await axios.get(`${server}/api/verify`, {
        params: { token },
      });
      return {
        message: data?.message || "Email verified successfully.",
        verified: true,
      };
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Verification failed. Your link may be invalid or expired.";
      return rejectWithValue({ message });
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  message: "",
  verified: false,
};

const verifyEmailSlice = createSlice({
  name: "verifyEmail",
  initialState,
  reducers: {
    resetVerifyState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
      state.verified = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.message = "";
        state.verified = false;
      })
      .addCase(verifyAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload?.message || "";
        state.verified = !!action.payload?.verified;
      })
      .addCase(verifyAccount.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error =
          action.payload?.message || "Verification failed. Please try again.";
      });
  },
});

export const { resetVerifyState } = verifyEmailSlice.actions;
export default verifyEmailSlice.reducer;
