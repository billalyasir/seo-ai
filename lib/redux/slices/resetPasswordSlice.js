// features/auth/resetPasswordSlice.js
import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { setToken } from "./loginSlice";
import { fetchProfile } from "./profileSlice";
import { fetchUserToken } from "./userTokenSlice";

// POST /api/password/reset/:token  Body: { password }
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, password }, { dispatch, rejectWithValue }) => {
    try {
      if (!token) {
        return rejectWithValue({ message: "Invalid or missing token." });
      }

      const { data } = await axios.post(
        `${server}/api/password/reset/${encodeURIComponent(token)}`,
        { password }
      );
      // data: { message: "...", token?: "..." }

      if (data?.token) {
        // persist + hydrate auth instantly
        if (typeof window !== "undefined") {
          localStorage.setItem("token", data.token);
        }
        axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        dispatch(setToken(data.token));
        // populate profile so UI updates immediately
        try {
          await dispatch(fetchProfile()).unwrap();
          await dispatch(fetchUserToken()).unwrap();
        } catch (_) {}
      }

      return {
        message: data?.message || "Password has been reset.",
        autoLoggedIn: Boolean(data?.token),
      };
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to reset password.";
      return rejectWithValue({ message });
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  message: "",
  autoLoggedIn: false,
};

const resetPasswordSlice = createSlice({
  name: "resetPassword",
  initialState,
  reducers: {
    resetResetPasswordState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
      state.autoLoggedIn = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.message = "";
        state.autoLoggedIn = false;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload?.message || "";
        state.autoLoggedIn = !!action.payload?.autoLoggedIn;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload?.message || "Failed to reset password.";
      });
  },
});

export const { resetResetPasswordState } = resetPasswordSlice.actions;
export default resetPasswordSlice.reducer;
