// features/auth/signupSlice.js
import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Async thunk for signup (triggers verification email on the server)
export const signupUser = createAsyncThunk(
  "auth/signupUser",
  async (userData, { rejectWithValue }) => {
    try {
      // Backend route: POST /api/auth/signup
      const { data } = await axios.post(`${server}/api/signup`, userData);
      // Expected shape: { message: string, user: {...} }
      return { ...data, email: userData?.email };
    } catch (error) {
      console.log(error);
      return rejectWithValue(
        error?.response?.data?.message || "Signup failed. Please try again."
      );
    }
  }
);

const initialState = {
  user: null,
  loading: false,
  error: null,
  success: false,
  message: "",
  // Useful for UI: prompt user to check inbox after successful signup
  verificationRequired: false,
  // Keep the email to display "We sent a link to <email>"
  emailForVerification: "",
};

const signupSlice = createSlice({
  name: "signup",
  initialState,
  reducers: {
    resetSignupState: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
      state.success = false;
      state.message = "";
      state.verificationRequired = false;
      state.emailForVerification = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.message = "";
        state.verificationRequired = false;
        state.emailForVerification = "";
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user || null;
        state.success = true;
        state.message =
          action.payload?.message ||
          "Account created. Please check your email to verify your account.";
        state.verificationRequired = true;
        state.emailForVerification = action.payload?.email || "";
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Signup failed. Please try again.";
        state.success = false;
        state.message = "";
        state.verificationRequired = false;
        state.emailForVerification = "";
      });
  },
});

export const { resetSignupState } = signupSlice.actions;
export default signupSlice.reducer;
