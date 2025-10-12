// ==================================
// LoginForm.jsx — Next.js Client Component
// JavaScript only. Fully responsive. Clean UX.
//
// What this does now:
//   • Step 1: Email + Password login via POST /api/auth/login
//       - If server returns 200 -> saves token, fetches wallet, redirects to "/"
//       - If server returns 403 because PHONE NOT VERIFIED ->
//           shows Step 2 (OTP), starts a resend cooldown, and lets user verify
//   • Step 2: Enter OTP (no phone needed here; we use your email)
//       - POST /api/auth/otp/verify { email, code } -> on success auto-login
//       - Resend OTP -> POST /api/auth/otp/send/public { email }
//
// Notes:
//   • No token is ever displayed in UI.
//   • Resend button is right-aligned with a live countdown.
//   • Uses an accessible 6-box OTP input optimized for mobile.
//   • Works even if your Redux login slice doesn't expose HTTP status,
//     because we call the API directly here to detect the 403 OTP case.
//
// Requirements:
//   npm i (already have shadcn/ui + tailwind)
//   an "@/api" export that points to your API base, e.g. export default process.env.NEXT_PUBLIC_API
// ==================================
"use client";

import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AuthCard from "@/components/sections/AuthCard";
import { Eye, EyeOff } from "lucide-react";

import server from "@/api"; // e.g. "https://api.example.com"
import { resetLoginState } from "@/lib/redux/slices/loginSlice";
import { fetchUserToken } from "@/lib/redux/slices/userTokenSlice";
import { fetchProfile } from "@/lib/redux/slices/profileSlice";
import { toast } from "sonner";

/* ========== Small OTP input group (6 boxes, mobile-friendly & accessible) ========== */
function OtpBoxes({ value, onChange, length = 6, disabled }) {
  const inputsRef = useRef([]);

  useEffect(() => {
    const idx = Math.min(value.length, length - 1);
    inputsRef.current[idx]?.focus();
  }, [value, length]);

  function handleChange(idx, v) {
    const digit = v.replace(/\D/g, "").slice(-1); // one digit only
    const chars = value.split("");
    if (digit) {
      if (idx < value.length) {
        chars[idx] = digit;
        onChange(chars.join(""));
      } else {
        onChange((value + digit).slice(0, length));
      }
      inputsRef.current[Math.min(idx + 1, length - 1)]?.focus();
    } else {
      onChange((value.slice(0, idx) + value.slice(idx + 1)).slice(0, length));
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === "Backspace" && !value[idx]) {
      inputsRef.current[Math.max(idx - 1, 0)]?.focus();
    }
    if (e.key === "ArrowLeft") inputsRef.current[Math.max(idx - 1, 0)]?.focus();
    if (e.key === "ArrowRight")
      inputsRef.current[Math.min(idx + 1, length - 1)]?.focus();
  }

  function handlePaste(e) {
    const clip = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
    if (clip) {
      e.preventDefault();
      onChange(clip.slice(0, length));
    }
  }

  return (
    <div
      className="grid grid-cols-6 gap-2 sm:gap-3"
      onPaste={handlePaste}
      role="group"
      aria-label="One-time passcode"
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          disabled={disabled}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-11 sm:h-12 w-full rounded-md border border-input bg-background text-center text-base sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function LoginForm() {
  const dispatch = useDispatch();
  const router = useRouter();

  // ------- step control -------
  const [step, setStep] = useState(1); // 1 = login, 2 = otp

  // ------- login fields -------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ------- otp fields -------
  const [otp, setOtp] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const RESEND_SECONDS = 45; // keep aligned with backend
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // ------- ui state -------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // focus email on mount
  const emailRef = useRef(null);
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // clear any stale redux login state on unmount
  useEffect(() => {
    return () => dispatch(resetLoginState());
  }, [dispatch]);

  // cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  // ------- helpers -------
  async function apiPost(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    // Attach status for branching (e.g., 403 -> OTP needed)
    if (!res.ok) {
      const msg = data?.message || "Request failed";
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function persistSession(user, token) {
    try {
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));
    } catch {}
  }

  // ------- submit login -------
  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const data = await apiPost(`${server}/api/login`, { email, password });
      // Success -> token present. Save + fetch wallet + go home
      persistSession(data.user, data.token);
      try {
        await dispatch(fetchProfile()).unwrap?.();
        await dispatch(fetchUserToken()).unwrap?.();
      } catch {}
      router.replace("/");
    } catch (err) {
      // If phone not verified, backend returns 403 and (re)sends OTP.
      if (err?.status === 403) {
        setStep(2);
        setInfo(
          err?.message ||
            "Your phone is not verified. We sent you an OTP. Enter it below."
        );
        setCooldown(RESEND_SECONDS);
        setOtp("");
        return;
      }
      setError(err?.message || "Sign-in failed.");
      toast.error(err?.message || "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  // ------- resend OTP -------
  async function resendOtp() {
    setError("");
    setInfo("");
    setOtpSending(true);
    try {
      const data = await apiPost(`${server}/api/otp/send/public`, { email });
      setInfo(data?.message || "OTP sent.");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err?.message || "Failed to resend OTP.");
    } finally {
      setOtpSending(false);
    }
  }

  // ------- verify OTP (auto-login) -------
  async function verifyCode(e) {
    e?.preventDefault?.();
    setError("");
    setInfo("");
    setOtpVerifying(true);
    try {
      const data = await apiPost(`${server}/api/otp/verify`, {
        email,
        code: otp.replace(/\D/g, ""),
      });
      // Save session, fetch wallet, go home
      persistSession(data.user, data.token);
      try {
        await dispatch(fetchUserToken()).unwrap?.();
      } catch {}
      router.replace("/");
    } catch (err) {
      setError(err?.message || "Verification failed.");
    } finally {
      setOtpVerifying(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[92vw] sm:max-w-[480px] md:max-w-[520px]">
      <AuthCard
        title={step === 1 ? "Sign in" : "Verify to continue"}
        description={
          step === 1
            ? "Access your account"
            : "Enter the 6-digit code we sent to your phone"
        }
        footer={
          step === 1 ? <Link href="/forgot">Forgot password?</Link> : null
        }
      >
        {/* Alerts */}
        {error ? (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {info ? (
          <div className="mb-4">
            <Alert className="border-2 border-green-600 bg-green-50 text-green-900">
              <AlertTitle>Notice</AlertTitle>
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {/* STEP 1: LOGIN */}
        {step === 1 && (
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="lemail">Email</Label>
              <Input
                ref={emailRef}
                id="lemail"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="lpassword">Password</Label>
              <div className="relative">
                <Input
                  id="lpassword"
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || email === "" || password === ""}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            {/* Signup link */}
            <p className="text-sm text-center">
              No account?{" "}
              <Link href="/signup" className="underline">
                Create one
              </Link>
            </p>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <form onSubmit={verifyCode} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp">Enter the 6-digit OTP</Label>
              <OtpBoxes
                value={otp}
                onChange={setOtp}
                length={6}
                disabled={otpVerifying}
              />
              <p className="text-xs opacity-80">
                We sent the code to your registered phone for <b>{email}</b>.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={otpVerifying || otp.replace(/\D/g, "").length < 4}
            >
              {otpVerifying ? "Verifying..." : "Verify"}
            </Button>

            {/* Resend row — right aligned */}
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resendOtp}
                disabled={otpSending || cooldown > 0}
                className="px-2 py-1 h-8"
                title={
                  cooldown > 0 ? `Wait ${cooldown}s to resend` : "Resend code"
                }
              >
                {otpSending
                  ? "Sending..."
                  : cooldown > 0
                  ? `Resend (${cooldown})`
                  : "Resend code"}
              </Button>
            </div>

            <p className="text-sm text-center">
              Entered the wrong email?{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setInfo("");
                  setError("");
                }}
              >
                Go back
              </button>
              .
            </p>
          </form>
        )}
      </AuthCard>
    </div>
  );
}

export default LoginForm;
