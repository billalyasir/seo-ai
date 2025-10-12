"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcumb";
import Spinner from "@/components/ui/Spinner";

export default function Layout({ children }) {
  const router = useRouter();

  const [tokenChecked, setTokenChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);

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

  // Redirect only after we’ve checked token
  useEffect(() => {
    if (!tokenChecked) return;
    if (!hasToken) {
      router.replace("/");
      toast.warning("You are not authorized yet!");
    }
  }, [tokenChecked, hasToken, router]);

  // Show a small blocker while we check
  if (!tokenChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // If no token (effect will have redirected), render nothing
  if (!hasToken) return null;

  return (
    <main>
      <div className="md:ml-3">
        <Breadcrumbs />
      </div>
      <br />
      {children}
    </main>
  );
}
