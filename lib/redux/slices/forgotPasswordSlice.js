// features/auth/forgotPasswordSlice.js
import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// POST /api/password/forgot  Body: { email }
// Backend always returns 200 with a generic message if the email exists.
export const sendPasswordReset = createAsyncThunk(
  "auth/sendPasswordReset",
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${server}/api/password/forgot`, {
        email,
      });
      return {
        message:
          data?.message || "If that email exists, we've sent a reset link.",
        email,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message ||
          "Failed to send reset link. Please try again."
      );
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  message: "",
  emailForReset: "",
};

const forgotPasswordSlice = createSlice({
  name: "forgotPassword",
  initialState,
  reducers: {
    resetForgotState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
      state.emailForReset = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendPasswordReset.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.message = "";
        state.emailForReset = "";
      })
      .addCase(sendPasswordReset.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload?.message;
        state.emailForReset = action.payload?.email || "";
      })
      .addCase(sendPasswordReset.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error =
          action.payload || "Failed to send reset link. Please try again.";
      });
  },
});

export const { resetForgotState } = forgotPasswordSlice.actions;
export default forgotPasswordSlice.reducer;
