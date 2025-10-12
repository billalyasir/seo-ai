"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import server from "@/api";
import { Home, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { fetchUserToken } from "@/lib/redux/slices/userTokenSlice";

export default function WalleeSuccess() {
  const [state, setState] = useState("loading"); // loading | pending | success | failed | error
  const [msg, setMsg] = useState("");
  const [txId, setTxId] = useState(null);
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        let stored = null;
        try {
          stored = sessionStorage.getItem("lastWalleeTxId");
        } catch {}
        const id = stored ? Number(stored) : NaN;
        if (!stored || Number.isNaN(id)) {
          setState("error");
          setMsg(
            "We couldn’t find your transaction. If you completed payment, contact support."
          );
          return;
        }
        setTxId(id);

        const fulfillOnce = async () => {
          const res = await fetch(
            `${server}/api/payments/wallee/fulfill/${id}`,
            { method: "POST" }
          );
          const data = await res.json().catch(() => ({}));
          return { res, data };
        };

        let { res, data } = await fulfillOnce();
        if (res.ok && data?.ok) {
          setState("success");
          setMsg("Payment successful! Your tokens have been applied.");
          dispatch(fetchUserToken()); // refresh token balance
          try {
            sessionStorage.removeItem("lastWalleeTxId");
          } catch {}
          router.push("/upload"); // auto redirect
          return;
        }

        if (res.status === 202) {
          setState("pending");
          setMsg(
            "Payment is processing… this usually resolves in a few seconds."
          );
          setTimeout(async () => {
            try {
              const next = await fulfillOnce();
              if (next.res.ok && next.data?.ok) {
                setState("success");
                setMsg("Payment successful! Your tokens have been applied.");
                try {
                  sessionStorage.removeItem("lastWalleeTxId");
                } catch {}
                router.push("/upload"); // auto redirect after retry success
              } else if (next.res.status === 202) {
                setState("pending");
                setMsg("Still processing… you can refresh in a moment.");
              } else {
                setState("failed");
                setMsg(
                  `Payment not completed. State: ${
                    next.data?.state || "unknown"
                  }`
                );
              }
            } catch {
              setState("error");
              setMsg("We couldn’t verify your payment. Please try again.");
            }
          }, 2500);
          return;
        }

        setState("failed");
        setMsg(`Payment not completed. State: ${data?.state || "unknown"}`);
      } catch {
        setState("error");
        setMsg("Something went wrong verifying your payment.");
      }
    };
    run();
  }, [dispatch, router]);

  // Decide which visual to show
  const Visual = () => {
    if (state === "success") {
      return (
        <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center text-green-600">
          <SuccessSVG />
        </div>
      );
    }
    if (state === "failed" || state === "error") {
      return (
        <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center text-red-600">
          <FailSVG />
        </div>
      );
    }
    // loading | pending -> animated credit card
    return (
      <div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center">
        <PaymentCardSVG />
      </div>
    );
  };

  const heading =
    state === "success"
      ? "Payment Successful"
      : state === "failed"
      ? "Payment Failed"
      : state === "error"
      ? "Verification Error"
      : state === "pending"
      ? "Payment Pending"
      : "Payment Verification";

  return (
    <main className="mx-auto my-10 flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
      <section
        className="w-full rounded-2xl border p-6 sm:p-8"
        aria-live="polite"
        role="status"
      >
        <Visual />

        <header className="text-center">
          <h1 className="text-xl font-semibold">{heading}</h1>
        </header>

        <p className="mt-2 text-center text-sm">
          {msg} {txId ? <span>Transaction: {txId}</span> : null}
        </p>

        <div className="mt-6 flex items-center justify-center">
          <Button
            variant="outline"
            onClick={() => {
              if (state === "success") router.push("/upload");
              else window.location.reload();
            }}
            className="gap-2"
            aria-label={state === "success" ? "Go home" : "Refresh page"}
          >
            {state === "success" ? (
              <>
                <Home className="h-4 w-4" aria-hidden="true" />
                Go home
              </>
            ) : (
              <>
                <RefreshCw
                  className={`h-4 w-4 ${
                    state === "loading" || state === "pending"
                      ? "animate-spin"
                      : ""
                  }`}
                  aria-hidden="true"
                />
                Refresh
              </>
            )}
          </Button>
        </div>
      </section>
    </main>
  );
}

/** Animated “credit card” SVG for loading/pending (neutral; uses currentColor) */
function PaymentCardSVG() {
  return (
    <svg
      viewBox="0 0 200 140"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      role="img"
      aria-label="Payment in progress"
    >
      <rect
        x="10"
        y="20"
        width="180"
        height="110"
        rx="12"
        ry="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="animate-pulse"
      />
      <rect
        x="10"
        y="40"
        width="180"
        height="18"
        rx="2"
        fill="currentColor"
        className="opacity-10"
      />
      <rect
        x="28"
        y="72"
        width="26"
        height="20"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M31 82h20M31 77h20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g className="translate-x-0 animate-bounce">
        <RoundedLine x={70} y={78} w={24} />
        <RoundedLine x={98} y={78} w={24} />
        <RoundedLine x={126} y={78} w={24} />
        <RoundedLine x={154} y={78} w={24} />
      </g>
      <RoundedLine x={28} y={106} w={60} />
      <RoundedLine x={96} y={106} w={32} />
      <g className="animate-ping">
        <path
          d="M166 62c6 4 6 12 0 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M160 62c6 4 6 12 0 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SuccessSVG() {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      role="img"
      aria-label="Payment successful"
    >
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="opacity-80"
      />
      <path
        d="M40 60l13 13 27-27"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="origin-center scale-75 animate-[pulse_1.2s_ease-in-out_infinite]"
      />
    </svg>
  );
}

function FailSVG() {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      role="img"
      aria-label="Payment failed"
    >
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="opacity-80"
      />
      <path
        d="M45 45l30 30M75 45l-30 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        className="animate-pulse"
      />
    </svg>
  );
}

function RoundedLine({ x, y, w }) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height="6"
      rx="3"
      fill="currentColor"
      className="opacity-20"
    />
  );
}
