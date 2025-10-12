// features/auth/loginSlice.js
import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { setProfile } from "./profileSlice";

// Async thunk for login
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { dispatch, rejectWithValue }) => {
    try {
      // Adjust path if your routes are mounted under /api/auth
      const { data } = await axios.post(`${server}/api/login`, credentials);
      // data: { user: {...}, token: "..." }

      // 1) Put the user into the profile slice immediately
      if (data?.user) {
        dispatch(setProfile(data.user));
      }

      // 2) Optionally persist token & set axios default header
      if (data?.token) {
        if (typeof window !== "undefined") {
          localStorage.setItem("token", data.token);
        }
        axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
      }

      return data;
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Login failed. Please try again.";
      return rejectWithValue({ message, code: status });
    }
  }
);

const initialState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  success: false,
  isAuthenticated: false,
  message: "",
  // If backend returns 403 for unverified email, flip this on
  verificationRequired: false,
};

const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    resetLoginState: (state) => {
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
      state.success = false;
      state.isAuthenticated = false;
      state.message = "";
      state.verificationRequired = false;
    },
    // Optional helper if you store token elsewhere and want to hydrate it
    setToken: (state, action) => {
      state.token = action.payload || null;
      state.isAuthenticated = !!action.payload;
      if (action.payload) {
        axios.defaults.headers.common.Authorization = `Bearer ${action.payload}`;
      } else {
        delete axios.defaults.headers.common.Authorization;
      }
    },
    // Local logout (clear state). Server logout can be called separately.
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.success = false;
      state.message = "";
      state.error = null;
      state.verificationRequired = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      delete axios.defaults.headers.common.Authorization;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.message = "";
        state.verificationRequired = false;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user || null;
        state.token = action.payload?.token || null;
        state.isAuthenticated = !!action.payload?.token;
        state.success = true;
        state.message = "Logged in successfully.";
        state.verificationRequired = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload || {};
        state.error = payload.message || "Login failed. Please try again.";
        state.success = false;
        state.isAuthenticated = false;
        state.token = null;
        // 403 from backend = unverified account; backend may have re-sent the link
        state.verificationRequired = payload.code === 403;
        state.message = state.verificationRequired
          ? "Your email is not verified. We re-sent a verification link if the previous one expired."
          : "";
      });
  },
});

export const { resetLoginState, setToken, logout } = loginSlice.actions;
export default loginSlice.reducer;
