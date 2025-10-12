"use client";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import {
  sendPasswordReset,
  resetForgotState,
} from "@/lib/redux/slices/forgotPasswordSlice";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import AuthCard from "@/components/sections/AuthCard";

/* ---------- Memoized selector (no new object per render) ---------- */
const selectForgotSlice = (s) => s.forgotPassword ?? s.forgotpassword;
const selectForgotView = createSelector([selectForgotSlice], (fp) => ({
  loading: fp.loading,
  success: fp.success,
  message: fp.message,
  error: fp.error,
  emailForReset: fp.emailForReset,
}));

function RequestPasswordResetForm() {
  const dispatch = useDispatch();
  const { loading, success, message, error, emailForReset } =
    useSelector(selectForgotView);

  const [email, setEmail] = useState("");

  useEffect(() => {
    return () => {
      // clear banner state when leaving the page
      dispatch(resetForgotState());
    };
  }, [dispatch]);

  function onSubmit(e) {
    e.preventDefault();
    if (!email) return;
    dispatch(sendPasswordReset(email)).then((action) => {
      if (action.type.endsWith("/fulfilled")) {
        setEmail(""); // nice UX touch
      }
    });
  }

  return (
    <AuthCard
      title="Forgot password"
      description="We'll email you a reset link"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <Alert variant="destructive" role="alert" aria-live="assertive">
            <AlertTitle>Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert
            className="border-2 border-green-600 bg-green-50 text-green-900"
            ariala-live="polite"
          >
            <AlertTitle>Sent</AlertTitle>
            <AlertDescription>
              {message || "If that email exists, we've sent a reset link."}
              {emailForReset ? (
                <>
                  {" "}
                  Please check <b>{emailForReset}</b>
                </>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="femail">Email</Label>
          <Input
            id="femail"
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !email}
          aria-busy={loading}
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default RequestPasswordResetForm;
