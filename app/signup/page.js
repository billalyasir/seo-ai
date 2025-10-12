"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

import { resetSignupState } from "@/lib/redux/slices/signupSlice"; // optional
import { fetchProfile } from "@/lib/redux/slices/profileSlice";
import { fetchUserToken } from "@/lib/redux/slices/userTokenSlice";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AuthCard from "@/components/sections/AuthCard";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import server from "@/api";

/* ======== OTP boxes ======== */
function OtpBoxes({ value, onChange, length = 6, disabled }) {
  const inputsRef = useRef([]);

  useEffect(() => {
    const idx = Math.min(value.length, length - 1);
    inputsRef.current[idx]?.focus();
  }, [value, length]);

  function handleChange(idx, v) {
    const digit = v.replace(/\D/g, "").slice(-1);
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
    if (e.key === "Backspace") {
      if (!value[idx]) inputsRef.current[Math.max(idx - 1, 0)]?.focus();
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

export default function SignupPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const [loading, setLoading] = useState(false);

  const RESEND_SECONDS = 45;
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

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

  const nameRef = useRef(null);
  useEffect(() => {
    nameRef.current?.focus();
    try {
      dispatch(resetSignupState());
    } catch {}
    return () => {
      try {
        dispatch(resetSignupState());
      } catch {}
    };
  }, [dispatch]);

  function persistSession(user, token) {
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    } catch {}
  }

  async function apiPost(path, body) {
    const res = await fetch(`${server}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || "Request failed";
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ===== password validation: 1 upper, 1 lower, 1 digit, 1 special, min 8 =====
  const passwordMeetsRules = (() => {
    const s = String(password || "");
    const hasUpper = /[A-Z]/.test(s);
    const hasLower = /[a-z]/.test(s);
    const hasDigit = /\d/.test(s);
    const hasSpecial = /[^A-Za-z0-9]/.test(s);
    const minLen = s.length >= 8; // updated from 6 to 8
    return hasUpper && hasLower && hasDigit && hasSpecial && minLen;
  })();

  const canSubmitStep1 =
    name.trim().length >= 3 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    passwordMeetsRules &&
    !loading;

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (name.trim().length < 3)
        throw new Error("Name must be at least 3 characters.");
      if (!/^\S+@\S+\.\S+$/.test(email))
        throw new Error("Enter a valid email.");
      if (!passwordMeetsRules) {
        throw new Error(
          "Password must include 1 uppercase, 1 lowercase, 1 digit, 1 special character, and be 8+ chars."
        );
      }

      const data = await apiPost(`/api/signup`, {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      toast.success(
        data?.message || "Account created. Check your email for the code."
      );
      setStep(2);
      setCooldown(RESEND_SECONDS);
      setOtp("");
    } catch (err) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const data = await apiPost("/api/otp/email/resend", {
        email: email.trim(),
      });
      toast.success(data?.message || "OTP sent to your email.");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      toast.error(err?.message || "Could not resend code.");
    } finally {
      setResending(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setVerifying(true);
    try {
      const data = await apiPost("/api/otp/email/verify", {
        email: email.trim(),
        code: otp.replace(/\D/g, ""),
      });
      persistSession(data.user, data.token);
      toast.success(data?.message || "Verified. Welcome!");
      try {
        await dispatch(fetchProfile()).unwrap?.();
        await dispatch(fetchUserToken()).unwrap?.();
      } catch {}
      router.replace("/");
    } catch (err) {
      toast.error(err?.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Suspense>
      <div className="mx-auto w-full max-w-[92vw] sm:max-w-[480px] md:max-w-[520px]">
        <AuthCard title="Create account" description="Sign up to continue">
          {/* STEP 1: SIGNUP */}
          {step === 1 && (
            <form onSubmit={handleSignup} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  ref={nameRef}
                  required
                  placeholder="Full name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs opacity-80">Minimum 3 characters.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <ul className="text-xs opacity-80 space-y-1">
                  <li>• 1 uppercase (A–Z)</li>
                  <li>• 1 lowercase (a–z)</li>
                  <li>• 1 digit (0–9)</li>
                  <li>• 1 special character (!@#$…)</li>
                  <li>• 8 or more characters</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmitStep1}
              >
                {loading ? "Creating..." : "Sign up"}
              </Button>

              <p className="text-sm text-center">
                Already have an account?{" "}
                <Link href="/login" className="underline">
                  Log in
                </Link>
              </p>
            </form>
          )}

          {/* STEP 2: OTP ENTRY */}
          {step === 2 && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter the 6-digit code</Label>
                <OtpBoxes
                  value={otp}
                  onChange={setOtp}
                  length={6}
                  disabled={verifying}
                />
                <p className="text-xs opacity-80">
                  We sent the code to <b>{email}</b>.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={verifying || otp.replace(/\D/g, "").length < 4}
              >
                {verifying ? "Verifying..." : "Verify & Continue"}
              </Button>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="text-sm underline disabled:opacity-60"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                >
                  {resending
                    ? "Sending..."
                    : cooldown > 0
                    ? `Resend (${cooldown})`
                    : "Resend code"}
                </button>
              </div>

              <div className="text-center text-sm text-gray-600">
                Wrong email?{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                  }}
                >
                  Go back
                </button>
                .
              </div>
            </form>
          )}
        </AuthCard>
      </div>
    </Suspense>
  );
}
