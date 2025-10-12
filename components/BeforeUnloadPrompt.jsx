"use client";

import { useEffect } from "react";

/**
 * BeforeUnloadPrompt
 * - Shows a confirmation dialog ONLY when product CSV data exists in localStorage.
 * - Stays silent (no dialog) when there's no CSV data.
 * - Optional suppression via sessionStorage[suppressFlagKey] === "1".
 *
 * Props:
 *  - enabled: toggle the whole guard (default true)
 *  - message: the browser leave message
 *  - checkKeys: extra localStorage keys to treat as CSV signals
 *  - suppressFlagKey: sessionStorage key to skip prompting (default "suppressBeforeUnload")
 */
export default function BeforeUnloadPrompt({
  enabled = true,
  message = "Are you sure you want to leave?",
  checkKeys = ["products_csv_info", "products_csv_rows"],
  suppressFlagKey = "suppressBeforeUnload",
}) {
  // Helpers are defined inside to avoid SSR/window refs before mount
  const hasCsvData = () => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;

      // 1) Explicit keys first
      for (const key of checkKeys) {
        const raw = window.localStorage.getItem(key);
        if (raw && raw.trim() !== "") {
          // If it's rows, try to confirm there's at least one row
          if (key.toLowerCase().includes("rows")) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) return true;
            } catch {
              // If parsing fails but value exists, still treat as present
              return true;
            }
          } else {
            return true;
          }
        }
      }

      // 2) Fallback: any localStorage key that looks CSV-related
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i) || "";
        if (/csv/i.test(k)) {
          const v = window.localStorage.getItem(k);
          if (v && v.trim() !== "") return true;
        }
      }

      return false;
    } catch {
      // On any error, default to "no CSV data" to avoid noisy prompts
      return false;
    }
  };

  const isSuppressed = () => {
    try {
      if (typeof window === "undefined" || !window.sessionStorage) return false;
      return window.sessionStorage.getItem(suppressFlagKey) === "1";
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event) => {
      // Only block if CSV is present AND no suppression flag is set
      if (!hasCsvData() || isSuppressed()) return;

      // Standard confirmation dialog for modern + older browsers
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, message, checkKeys, suppressFlagKey]);

  return null;
}
