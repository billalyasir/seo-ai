// ==================================
"use client";
import { useState, useEffect, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";
import { useSearchParams, useRouter } from "next/navigation";

import {
  resetPassword,
  resetResetPasswordState,
} from "@/lib/redux/slices/resetPasswordSlice";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import AuthCard from "@/components/sections/AuthCard";
import { Eye, EyeOff } from "lucide-react";

/* -------- memoized selector (stable ref) -------- */
const selectResetSlice = (s) => s.resetPassword ?? s.resetpassword;
const selectResetView = createSelector([selectResetSlice], (rp) => ({
  loading: rp.loading,
  success: rp.success,
  message: rp.message,
  error: rp.error,
  autoLoggedIn: rp.autoLoggedIn,
}));

// Password requirement helpers
const hasUpper = (s) => /[A-Z]/.test(s);
const hasLower = (s) => /[a-z]/.test(s);
const hasDigit = (s) => /\d/.test(s);
const hasSpecial = (s) => /[^A-Za-z0-9\s]/.test(s);
const hasLen6 = (s) => s.length >= 6;

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const token = params.get("token");
  const { loading, success, message, error, autoLoggedIn } =
    useSelector(selectResetView);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    return () => {
      dispatch(resetResetPasswordState());
    };
  }, [dispatch]);

  // Optional fallback redirect (server already logs in and client may redirect elsewhere)
  useEffect(() => {
    if (success) {
      const dest = autoLoggedIn ? "/" : "/login";
      const id = setTimeout(() => router.push(dest), 800);
      return () => clearTimeout(id);
    }
  }, [success, autoLoggedIn, router]);

  // derived password validation state
  const okUpper = hasUpper(password);
  const okLower = hasLower(password);
  const okDigit = hasDigit(password);
  const okSpecial = hasSpecial(password);
  const okLen = hasLen6(password);
  const allRulesPass = okUpper && okLower && okDigit && okSpecial && okLen;

  function onSubmit(e) {
    e.preventDefault();
    if (!token) return;

    if (!allRulesPass) {
      // keep UI simple—highlight via checklist; still block submit here
      setMismatch(
        "Password must include uppercase, lowercase, digit, special character, and be at least 6 characters."
      );
      return;
    }

    if (password !== confirm) {
      setMismatch("Passwords do not match");
      return;
    }

    setMismatch("");
    dispatch(resetPassword({ token, password }))
      .unwrap()
      .then(() => {
        setPassword("");
        setConfirm("");
      })
      .catch(() => {});
  }

  const missingToken = !token;

  // tiny helper for checklist line
  const Rule = ({ ok, children }) => (
    <li
      className={`text-xs leading-5 ${ok ? "text-green-700" : "text-gray-600"}`}
    >
      {children}
    </li>
  );

  return (
    <Suspense>
      <AuthCard title="Reset password">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {missingToken ? (
            <Alert variant="destructive">
              <AlertTitle>Invalid link</AlertTitle>
              <AlertDescription>
                Reset token is missing or invalid.
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive" role="alert" aria-live="assertive">
              <AlertTitle>Failed</AlertTitle>
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
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          {mismatch ? (
            <Alert variant="destructive">
              <AlertTitle>Problem</AlertTitle>
              <AlertDescription>{mismatch}</AlertDescription>
            </Alert>
          ) : null}

          {/* New password */}
          <div className="space-y-2">
            <Label htmlFor="npw">New password</Label>
            <div className="relative">
              <Input
                id="npw"
                type={showNew ? "text" : "password"}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={!allRulesPass && password.length > 0}
                aria-describedby="pw-rules"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                aria-label={showNew ? "Hide new password" : "Show new password"}
                aria-pressed={showNew}
                className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Checklist */}
            <ul id="pw-rules" className="mt-1 space-y-1">
              <Rule ok={okUpper}>1 uppercase (A–Z)</Rule>
              <Rule ok={okLower}>1 lowercase (a–z)</Rule>
              <Rule ok={okDigit}>1 digit (0–9)</Rule>
              <Rule ok={okSpecial}>1 special character (!@#$…)</Rule>
              <Rule ok={okLen}>6 or more characters</Rule>
            </ul>
          </div>

          {/* Confirm */}
          <div className="space-y-2">
            <Label htmlFor="cpw">Confirm password</Label>
            <div className="relative">
              <Input
                id="cpw"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm your password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={confirm.length > 0 && confirm !== password}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={
                  showConfirm
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                aria-pressed={showConfirm}
                className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              loading || missingToken || !allRulesPass || confirm !== password
            }
            aria-busy={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </AuthCard>
    </Suspense>
  );
}

export default ResetPasswordForm;
