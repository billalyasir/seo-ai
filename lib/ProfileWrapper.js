"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";

import { fetchProfile } from "./redux/slices/profileSlice";
import { fetchUserToken } from "./redux/slices/userTokenSlice";
import { fetchTokenDedux } from "./redux/slices/tokenDeduxSlice";
import { fetchActiveFeedbacks } from "./redux/slices/feedbackSlice";

const ProfileWrapper = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const { profile } = useSelector((state) => state.profile);

  // Fetch profile + user token once if an auth token exists
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    dispatch(fetchProfile());
    dispatch(fetchUserToken()); // <-- call the thunk
    dispatch(fetchTokenDedux());
  }, [dispatch]);
  //feedback
  useEffect(() => {
    dispatch(fetchActiveFeedbacks());
  }, [dispatch]);
  // Redirect logged-in users away from login/signup pages
  useEffect(() => {
    if (profile && (pathname === "/login" || pathname === "/signup")) {
      router.replace("/");
    }
  }, [profile, pathname, router]);

  return <>{children}</>;
};

export default ProfileWrapper;
