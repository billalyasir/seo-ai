"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import Breadcrumbs from "@/components/Breadcumb";

/**
 * Client-side layout that guards the section:
 * - If NO localStorage token OR profile is missing/unauthorized -> redirect to "/"
 * - Shows a spinner while checking/redirecting (never navigates during render)
 */
export default function Layout({ children }) {
  const { profile, error, loading } = useSelector(
    (state) => state.profile || {}
  );
  const router = useRouter();

  // Track token presence in a client-safe way
  const [tokenChecked, setTokenChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Read token on mount (client only)
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

  // Redirect logic (must be inside an effect)
  useEffect(() => {
    if (!tokenChecked) return; // wait until we know token status
    if (loading) return; // wait for profile to resolve

    const unauthorized =
      !hasToken || error === "Unauthorized" || !profile || !profile.isAdmin;

    if (unauthorized) {
      setRedirecting(true);
      router.replace("/"); // prevent going back to the protected page
    } else {
      setRedirecting(false);
    }
  }, [tokenChecked, hasToken, loading, error, profile, router]);

  // While checking auth / loading profile / redirecting, show a spinner
  if (!tokenChecked || loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // If we somehow reach here unauthorized (edge), render nothing (effect will have navigated)
  const stillUnauthorized =
    !hasToken || error === "Unauthorized" || !profile || !profile.isAdmin;
  if (stillUnauthorized) {
    return null;
  }

  // Authorized: render the section
  return (
    <>
      <main>
        <Breadcrumbs />
        <br />
        {children}
      </main>
    </>
  );
}
