// app/claim-tokens/page.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import server from "@/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchUserToken } from "@/lib/redux/slices/userTokenSlice";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Phone input (same as your old signup)
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Breadcrumbs from "@/components/Breadcumb";

// simple Card shell to match your look
function Card({ children }) {
  const router = useRouter();
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setTimeout(() => {
        return router.push("/signup");
      }, 3000);
    }
  }, []);
  return (
    <div className="mx-auto w-full  max-w-md rounded-2xl border bg-white p-6 shadow-lg">
      <Breadcrumbs />
      <hr className="my-2" />

      {children}
    </div>
  );
}

/* ======== OTP boxes (same old/ref-based) ======== */
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

export default function ClaimTokensPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  // we store digits only, like your old signup ("35799123456")
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const RESEND_SECONDS = 45;
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function getToken() {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }

  async function apiPost(path, body) {
    const res = await fetch(`${server}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
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

  // utils like your old phone handling
  function stripToDigits(v) {
    return String(v || "").replace(/[^\d]/g, "");
  }
  function displayE164(val) {
    const s = stripToDigits(val);
    return s ? `+${s}` : "";
  }
  function isPhoneValid(val) {
    const digits = stripToDigits(val);
    return digits.length >= 8 && digits.length <= 15;
  }

  async function sendOtp(e) {
    e.preventDefault();
    const mob = stripToDigits(phone);
    if (!isPhoneValid(mob)) {
      toast.error(
        "Enter a valid phone number including country code (e.g. +357...)."
      );
      return;
    }
    setLoading(true);
    try {
      // Server now returns flags: alreadyVerified, alreadyClaimed
      const data = await apiPost("/api/claim/otp/send", { phone: mob });

      // If already verified & already claimed -> show “Already Claimed” and go home
      if (data?.alreadyVerified && data?.alreadyClaimed) {
        toast.success("Already claimed with this verified phone.");
        // refresh wallet then redirect
        try {
          await dispatch(fetchUserToken()).unwrap?.();
        } catch {}
        router.replace("/");
        return;
      }

      // If already verified but not claimed (unlikely if your /verify path grants idempotently),
      // just let user know and go home (verifyClaimOtp handles grant idempotently as well).
      if (data?.alreadyVerified && !data?.alreadyClaimed) {
        toast.success(data?.message || "Phone already verified.");
        try {
          await dispatch(fetchUserToken()).unwrap?.();
        } catch {}
        router.replace("/");
        return;
      }

      // Otherwise proceed with OTP step
      toast.success(data?.message || "OTP sent via SMS.");
      setStep(2);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      toast.error(err?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiPost("/api/claim/otp/verify", {
        code: otp.replace(/\D/g, ""),
      });
      toast.success(data?.message || "Verified.");
      try {
        await dispatch(fetchUserToken()).unwrap?.();
      } catch {}
      setTimeout(() => router.replace("/"), 800);
    } catch (err) {
      toast.error(err?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto lg:mt-[200px]  my-12 w-full max-w-[92vw] sm:max-w-[480px] md:max-w-[520px]">
      <Card>
        {step === 1 && (
          <form onSubmit={sendOtp} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number (with country code)</Label>

              {/* Same wrapper look as your signup */}
              <div className="rounded-md border border-input bg-background px-2 py-1">
                <PhoneInput
                  inputProps={{
                    name: "phone",
                    id: "phone",
                    required: true,
                    autoComplete: "tel",
                    "aria-label": "Phone number with country code",
                  }}
                  country={"cy"}
                  enableSearch={true}
                  value={phone}
                  onChange={(val) => setPhone(stripToDigits(val))}
                  isValid={(val) => isPhoneValid(val)}
                  containerClass="w-full"
                  inputStyle={{
                    width: "100%",
                    height: "44px",
                    border: "none",
                    background: "transparent",
                    fontSize: "16px",
                  }}
                  buttonStyle={{
                    border: "none",
                    background: "transparent",
                  }}
                  dropdownStyle={{ zIndex: 60 }}
                />
              </div>

              <p className="text-xs text-gray-500">
                We’ll send an OTP via SMS to{" "}
                <b>{displayE164(phone) || "+<code+number>"}</b>.
              </p>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Not logged in?{" "}
              <Link href="/signup" className="underline">
                Create an account
              </Link>
              .
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="otp">Enter the 6-digit SMS code</Label>
              <OtpBoxes
                value={otp}
                onChange={setOtp}
                length={6}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Code sent to <b>{displayE164(phone)}</b>.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || otp.replace(/\D/g, "").length < 4}
            >
              {loading ? "Verifying..." : "Verify & Claim"}
            </Button>

            <div className="flex items-center justify-end">
              <button
                type="button"
                className="text-sm underline disabled:opacity-60"
                onClick={sendOtp}
                disabled={loading || cooldown > 0}
                title={
                  cooldown > 0 ? `Wait ${cooldown}s to resend` : "Resend code"
                }
              >
                {cooldown > 0 ? `Resend (${cooldown})` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
