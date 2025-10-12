// features/auth/profileSlice.js
import server from "@/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Helper to resolve token from state or localStorage
const resolveToken = (getState) => {
  const state = getState();
  return (
    state?.login?.token ||
    (typeof window !== "undefined" ? localStorage.getItem("token") : null)
  );
};

// GET /api/me -> returns sanitized user object
export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = resolveToken(getState);
      if (!token) {
        return rejectWithValue({ message: "Not authenticated", code: 401 });
      }
      const { data } = await axios.get(`${server}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Backend returns the user object directly
      return data;
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Failed to load profile.";
      return rejectWithValue({ message, code: status });
    }
  }
);

const initialState = {
  profile: null,
  loading: false,
  error: null,
  loaded: false,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    resetProfileState: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
      state.loaded = false;
    },
    // Useful when you update the user elsewhere and want to locally patch it
    setProfile: (state, action) => {
      state.profile = action.payload || null;
      state.loaded = !!action.payload;
      state.error = null;
    },
    clearProfile: (state) => {
      state.profile = null;
      state.loaded = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.loaded = false;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload || null;
        state.loaded = true;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.profile = null;
        state.loaded = false;
        state.error =
          action.payload?.message ||
          "Failed to load profile. Please try again.";
      });
  },
});

export const { resetProfileState, setProfile, clearProfile } =
  profileSlice.actions;

export default profileSlice.reducer;
