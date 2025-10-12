"use client";

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import DashboardContent from "@/components/sections/account/DashboardContent";
import Spinner from "@/components/ui/Spinner";
import { fetchFileCount } from "@/lib/redux/slices/fileCountSlice";

const Account = () => {
  // profile slice
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useSelector((state) => state.profile || {});

  // fileCount slice
  const { loading: fileLoading } = useSelector(
    (state) => state.fileCount || {}
  );

  const router = useRouter();
  const dispatch = useDispatch();

  // Track token presence in a client-safe way
  const [tokenChecked, setTokenChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Read token once on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const t = localStorage.getItem("token");
        setHasToken(Boolean(t));
      } else {
        setHasToken(false);
      }
    } catch {
      setHasToken(false);
    } finally {
      setTokenChecked(true);
    }
  }, []);

  // Redirect if unauthorized — run in an effect (not during render)
  useEffect(() => {
    if (!tokenChecked) return; // wait until we know token status
    if (profileLoading) return; // wait for profile to resolve

    const unauthorized =
      !hasToken || profileError === "Unauthorized" || !profile;

    if (unauthorized) {
      setRedirecting(true);
      router.replace("/"); // prevent back to protected page
    } else {
      setRedirecting(false);
    }
  }, [tokenChecked, hasToken, profileLoading, profileError, profile, router]);

  // Fetch file count only when authenticated and not redirecting
  useEffect(() => {
    if (!tokenChecked || redirecting) return;
    if (hasToken && profile) {
      dispatch(fetchFileCount());
    }
  }, [dispatch, tokenChecked, redirecting, hasToken, profile]);

  // While checking/redirecting, render nothing or a spinner
  if (!tokenChecked || profileLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Edge safety: if somehow unauthorized, render nothing (effect will navigate)
  if (!hasToken || !profile) return null;

  // Authorized: render the dashboard
  return (
    <div>
      <DashboardContent />
    </div>
  );
};

export default Account;
