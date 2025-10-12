import { configureStore } from "@reduxjs/toolkit";
import signupSlice from "./slices/signupSlice";
import loginSlice from "./slices/loginSlice";
import profileSlice from "./slices/profileSlice";
import forgotpasswordSlice from "./slices/forgotPasswordSlice";
import resetPasswordReducer from "./slices/resetPasswordSlice";
import verifyEmailReducer from "./slices/verifyEmailSlice";
import productsReducer from "./slices/productsSlice";
import tokenSlice from "./slices/userTokenSlice";
import fileCountSlice from "./slices/fileCountSlice";
import pricingSlice from "./slices/pricingSlice";
import tokenDeduxSlice from "./slices/tokenDeduxSlice";
import feedbackSlice from "./slices/feedbackSlice";
import feedbackAdminSlice from "./slices/feedbackSliceForAdmin";
import feedbackCountReducer from "./slices/feedbackCountSlice";
import pricingCount from "./slices/pricingCountSlice";
import userCountSlice from "./slices/userCountSlice";
export const store = configureStore({
  reducer: {
    signup: signupSlice,
    login: loginSlice,
    profile: profileSlice,
    forgotpassword: forgotpasswordSlice, // <-- keep this
    resetPassword: resetPasswordReducer,
    verifyEmail: verifyEmailReducer,
    products: productsReducer,
    my_token_info: tokenSlice,
    fileCount: fileCountSlice,
    pricing: pricingSlice,
    tokenDedux: tokenDeduxSlice,
    feedbackActive: feedbackSlice,
    adminFeedback: feedbackAdminSlice,
    feedbackCount: feedbackCountReducer, // 👈 add here
    pricingCount: pricingCount,
    userCount: userCountSlice,
  },
});
