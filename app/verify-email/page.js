// ==================================
"use client";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { useSearchParams, useRouter } from "next/navigation";

import {
  verifyAccount,
  resetVerifyState,
} from "@/lib/redux/slices/verifyEmailSlice";

import { Button } from "@/components/ui/button";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import AuthCard from "@/components/sections/AuthCard";

/* -------- memoized selector (stable ref) -------- */
const selectVerifySlice = (s) => s.verifyEmail ?? s.verifyemail;
const selectVerifyView = createSelector([selectVerifySlice], (ve) => ({
  loading: ve.loading,
  success: ve.success,
  message: ve.message,
  error: ve.error,
  verified: ve.verified,
}));

function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const token = params.get("token");
  const { loading, success, message, error, verified } =
    useSelector(selectVerifyView);

  useEffect(() => {
    if (token) {
      dispatch(verifyAccount({ token }));
    }
    return () => {
      dispatch(resetVerifyState());
    };
  }, [dispatch, token]);

  useEffect(() => {
    if (success && verified) {
      // After a brief pause, send them to login
      const id = setTimeout(() => router.push("/login"), 1000);
      return () => clearTimeout(id);
    }
  }, [success, verified, router]);

  const missingToken = !token;

  return (
    <AuthCard title="Verify your account" description="Confirm your email">
      <div className="space-y-4">
        {missingToken ? (
          <Alert variant="destructive">
            <AlertTitle>Invalid link</AlertTitle>
            <AlertDescription>
              Verification token is missing or invalid.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" role="alert" aria-live="assertive">
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert
            className="border-2 border-green-600 bg-green-50 text-green-900"
            role="status"
            aria-live="polite"
          >
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              {message || "Email verified successfully."} You can now sign in.
            </AlertDescription>
          </Alert>
        ) : null}

        {!missingToken && !success && !error ? (
          <Alert>
            <AlertTitle>Verifying…</AlertTitle>
            <AlertDescription>
              Please wait while we verify your email address.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/login")}
            variant="secondary"
            disabled={!success}
          >
            Go to login
          </Button>
          <Button onClick={() => router.push("/")} variant="ghost">
            Back to home
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}

export default VerifyEmailPage;
