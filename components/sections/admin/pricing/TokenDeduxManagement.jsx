// app/components/sections/admin/TokenDeduxManagement.jsx
"use client";

import React from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Loader2,
  Image as ImageIcon,
  Wand2,
  Sparkles,
  Coins,
  Settings2,
  RefreshCcw,
} from "lucide-react";
import server from "@/api";

const fields = [
  {
    name: "per_image_request",
    label: "Each Product Request",
    group: "image",
    icon: <ImageIcon className="h-4 w-4" />,
  },
  {
    name: "per_image",
    label: "Per Image",
    group: "image",
    icon: <Wand2 className="h-4 w-4" />,
  },
  {
    name: "per_seo_title",
    label: "Per SEO Title",
    group: "seo",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    name: "per_seo_short_description",
    label: "Per SEO Short Description",
    group: "seo",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    name: "per_seo_long_description",
    label: "Per SEO Long Description",
    group: "seo",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

// -------- Motion --------
const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 14 },
  },
};
const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, type: "spring", stiffness: 90, damping: 16 },
  }),
};
const buttonTap = { scale: 0.98 };
const cardHover = { y: -2, boxShadow: "" };

// -------- Utils --------
function defaultValues() {
  return Object.fromEntries(fields.map((f) => [f.name, "0"]));
}

/**
 * Sanitize to **integers only** with a hard cap of 6 digits.
 * - remove everything except 0-9
 * - keep only first 6 digits
 */
function sanitizeIntegerMax6(raw) {
  if (typeof raw !== "string") raw = String(raw ?? "");
  const onlyDigits = raw.replace(/\D/g, "");
  return onlyDigits.slice(0, 6);
}

/** Normalize on blur:
 * - strip leading zeros (keep single "0" if empty)
 */
function normalizeIntOnBlur(value) {
  const v = String(value ?? "");
  const onlyDigits = v.replace(/\D/g, "");
  if (onlyDigits === "") return "0";
  const normalized = onlyDigits.replace(/^0+(?=\d)/, "");
  return normalized === "" ? "0" : normalized;
}

export default function TokenDeduxManagement() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [doc, setDoc] = React.useState(null);

  // form values
  const [values, setValues] = React.useState(defaultValues());
  const [lastSavedValues, setLastSavedValues] = React.useState(defaultValues());

  // free credit
  const [freeCredit, setFreeCredit] = React.useState(0);
  const [freeCreditInput, setFreeCreditInput] = React.useState("");
  const [updatingCredit, setUpdatingCredit] = React.useState(false);

  const getAuthHeaders = () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const parseAxiosError = (err) => {
    if (axios.isAxiosError(err)) {
      const res = err.response;
      if (res?.data) {
        if (typeof res.data === "string") return res.data;
        if (typeof res.data.message === "string") return res.data.message;
        try {
          return JSON.stringify(res.data);
        } catch {}
      }
      return err.message || "Request failed";
    }
    return err?.message || "Request failed";
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [tokenDeduxRes, freeCreditRes] = await Promise.all([
        axios.get(`${server}/api/admin/token-dedux`, {
          headers: getAuthHeaders(),
          validateStatus: () => true,
        }),
        axios.get(`${server}/api/get-credit`, {
          headers: getAuthHeaders(),
          validateStatus: () => true,
        }),
      ]);

      if (tokenDeduxRes.status === 404) {
        setDoc(null);
        setValues(defaultValues());
        setLastSavedValues(defaultValues());
      } else if (tokenDeduxRes.status >= 200 && tokenDeduxRes.status < 300) {
        const data = tokenDeduxRes.data?.data;
        if (data) {
          const loaded = {
            per_image_request: String(
              sanitizeIntegerMax6(String(data.per_image_request ?? 0)) || "0"
            ),
            per_image: String(
              sanitizeIntegerMax6(String(data.per_image ?? 0)) || "0"
            ),
            per_seo_title: String(
              sanitizeIntegerMax6(String(data.per_seo_title ?? 0)) || "0"
            ),
            per_seo_short_description: String(
              sanitizeIntegerMax6(
                String(data.per_seo_short_description ?? 0)
              ) || "0"
            ),
            per_seo_long_description: String(
              sanitizeIntegerMax6(String(data.per_seo_long_description ?? 0)) ||
                "0"
            ),
          };
          setDoc(data);
          setValues(loaded);
          setLastSavedValues(loaded);
        } else {
          setDoc(null);
          setValues(defaultValues());
          setLastSavedValues(defaultValues());
        }
      } else {
        const msg =
          typeof tokenDeduxRes.data === "object" && tokenDeduxRes.data?.message
            ? String(tokenDeduxRes.data.message)
            : "Request failed";
        throw new Error(msg);
      }

      if (freeCreditRes.status >= 200 && freeCreditRes.status < 300) {
        const creditObj = freeCreditRes.data?.credit;
        const current =
          typeof creditObj?.credit === "number" ? creditObj.credit : 0;
        const safeCurrent = Number.isFinite(current) ? current : 0;
        setFreeCredit(safeCurrent);
        setFreeCreditInput(String(sanitizeIntegerMax6(String(safeCurrent))));
      } else {
        const msg =
          typeof freeCreditRes.data === "object" && freeCreditRes.data?.message
            ? String(freeCreditRes.data.message)
            : "Failed to load free credit";
        toast.error("Free credit load failed", { description: msg });
        setFreeCredit(0);
        setFreeCreditInput("0");
      }
    } catch (e) {
      toast.error("Failed to load", { description: parseAxiosError(e) });
      setDoc(null);
      setValues(defaultValues());
      setLastSavedValues(defaultValues());
      setFreeCredit(0);
      setFreeCreditInput("0");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // --- Controlled integer change with 6-digit cap ---
  const onChange = (name, v) => {
    const cleaned = sanitizeIntegerMax6(v);
    setValues((prev) => ({ ...prev, [name]: cleaned }));
  };

  // --- Normalize on blur ---
  const onBlur = (name) => {
    setValues((prev) => ({ ...prev, [name]: normalizeIntOnBlur(prev[name]) }));
  };

  const preventInvalidKeys = (e) => {
    // block decimals, scientific notation and +/- for numeric input feel
    if ([".", ",", "e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const validate = () => {
    for (const f of fields) {
      const raw = String(values[f.name] ?? "");
      if (!/\d/.test(raw)) {
        toast.error("Validation error", {
          description: `"${f.label}" must contain digits.`,
        });
        return false;
      }
      const digitsCount = raw.replace(/\D/g, "").length;
      if (digitsCount > 6) {
        toast.error("Validation error", {
          description: `"${f.label}" must be ≤ 6 digits.`,
        });
        return false;
      }
      const n = Number(raw);
      if (!Number.isInteger(n)) {
        toast.error("Validation error", {
          description: `"${f.label}" must be a whole number.`,
        });
        return false;
      }
      if (n < 0) {
        toast.error("Validation error", {
          description: `"${f.label}" must be ≥ 0.`,
        });
        return false;
      }
    }
    return true;
  };

  const isSettingsDirty = React.useMemo(() => {
    for (const f of fields) {
      if (
        String(values[f.name] ?? "") !== String(lastSavedValues[f.name] ?? "")
      )
        return true;
    }
    return false;
  }, [values, lastSavedValues]);

  const onSave = async () => {
    if (!validate()) return;
    if (!isSettingsDirty) return;

    setSaving(true);
    try {
      const payload = Object.fromEntries(
        fields.map((f) => [f.name, Number(values[f.name])])
      );
      let res;
      if (!doc || !doc._id) {
        res = await axios.post(`${server}/api/admin/token-dedux`, payload, {
          headers: getAuthHeaders(),
        });
      } else {
        res = await axios.patch(
          `${server}/api/admin/token-dedux/${doc._id}`,
          payload,
          { headers: getAuthHeaders() }
        );
      }
      if (res.status < 200 || res.status >= 300) {
        const msg =
          typeof res.data === "object" && res.data?.message
            ? String(res.data.message)
            : "Request failed";
        throw new Error(msg);
      }
      const updatedDoc = res.data?.data || { ...(doc || {}), ...payload };
      setDoc(updatedDoc);
      setLastSavedValues({ ...values });
      toast.success(doc && doc._id ? "Updated" : "Created", {
        description: "Token deduction settings saved.",
      });
    } catch (e) {
      toast.error("Error", { description: parseAxiosError(e) });
    } finally {
      setSaving(false);
    }
  };

  // Totals (computed from controlled integer values)
  const totalSEO =
    Number(values.per_seo_title || 0) +
    Number(values.per_seo_short_description || 0) +
    Number(values.per_seo_long_description || 0);

  const totalImage =
    Number(values.per_image_request || 0) + Number(values.per_image || 0);

  // Free Credit
  const addAndUpdateCredit = async (e) => {
    e.preventDefault();
    const raw = String(freeCreditInput ?? "").trim();
    if (raw === "") {
      toast.error("Validation error", {
        description: "Credit value is required.",
      });
      return;
    }
    const cleaned = sanitizeIntegerMax6(raw);
    const value = Number(cleaned);
    if (!Number.isInteger(value)) {
      toast.error("Validation error", {
        description: "Credit must be a whole number.",
      });
      return;
    }
    if (value < 0) {
      toast.error("Validation error", { description: "Credit must be ≥ 0." });
      return;
    }

    setUpdatingCredit(true);
    const prevCredit = freeCredit;
    setFreeCredit(value);

    try {
      const res = await axios.post(
        `${server}/api/credit-add`,
        { credit: value },
        { headers: getAuthHeaders() }
      );
      if (res.status < 200 || res.status >= 300) {
        const msg =
          typeof res.data === "object" && res.data?.message
            ? String(res.data.message)
            : "Request failed";
        throw new Error(msg);
      }
      const updated = res.data?.freeCredit?.credit;
      if (typeof updated === "number") {
        setFreeCredit(updated);
        setFreeCreditInput(String(sanitizeIntegerMax6(String(updated))));
      }
      toast.success("Free credit saved", {
        description: "Credit updated successfully.",
      });
    } catch (error) {
      setFreeCredit(prevCredit);
      toast.error("Failed to save credit", {
        description: parseAxiosError(error),
      });
    } finally {
      setUpdatingCredit(false);
    }
  };

  // Disable "Save Free Credit" unless user entered a NEW, valid integer value (≤ 6 digits)
  const creditTrim = String(freeCreditInput ?? "").trim();
  const creditDigitsOk =
    creditTrim.replace(/\D/g, "").length > 0 &&
    creditTrim.replace(/\D/g, "").length <= 6;
  const isCreditDirty =
    creditDigitsOk &&
    !Number.isNaN(Number(creditTrim)) &&
    Number(creditTrim) !== freeCredit &&
    Number.isInteger(Number(creditTrim));

  // ---------- UI ----------
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="grid mt-4 gap-6 grid-cols-1 2xl:grid-cols-3"
    >
      {/* Header */}
      <motion.div
        variants={sectionVariants}
        className="2xl:col-span-3 rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/60 via-fuchsia-500/60 to-rose-500/60"
      >
        <div className="rounded-2xl px-5 py-4 bg-background border">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500">
                Token Settings
              </h1>
              <p className="text-muted-foreground text-sm">
                Enterprise-grade controls for per-action token costs and global
                free credit.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={buttonTap}
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-accent"
                disabled={loading}
                aria-label="Refresh settings"
                title="Refresh settings"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </motion.button>
              <motion.div whileTap={buttonTap}>
                <Button
                  onClick={onSave}
                  disabled={saving || loading || !isSettingsDirty}
                  className="rounded-xl"
                  aria-disabled={saving || loading || !isSettingsDirty}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : doc && doc._id ? (
                    "Update Settings"
                  ) : (
                    "Create Settings"
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Settings + Status */}
      <AnimatePresence initial={false}>
        {/* Settings Card */}
        <motion.div
          key="settings-card"
          variants={sectionVariants}
          custom={1}
          whileHover={cardHover}
          className="2xl:col-span-2"
        >
          <Card className="p-6 rounded-2xl border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 border">
                  <Settings2 className="h-5 w-5 text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold">Manage Tokens</h2>
              </div>
              <motion.div whileTap={buttonTap}>
                <Button
                  onClick={onSave}
                  disabled={saving || loading || !isSettingsDirty}
                  className="rounded-xl"
                  aria-disabled={saving || loading || !isSettingsDirty}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : doc && doc._id ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </Button>
              </motion.div>
            </div>

            <Separator className="my-5" />

            {/* Loading skeleton */}
            {loading ? (
              <div className="grid gap-6">
                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-lg" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="grid gap-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-lg" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="grid gap-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-8">
                {/* Image Settings */}
                <section className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 border">
                      <ImageIcon className="h-4 w-4 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-medium">Image Settings</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {fields
                      .filter((f) => f.group === "image")
                      .map((f) => (
                        <div key={f.name} className="grid gap-2">
                          <Label
                            htmlFor={f.name}
                            className="flex items-center gap-2"
                          >
                            <span className="inline-flex items-center justify-center">
                              {f.icon}
                            </span>
                            {f.label}
                            <span className="text-[11px] text-muted-foreground ml-1">
                              (whole number, max 6 digits)
                            </span>
                          </Label>
                          <Input
                            id={f.name}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={values[f.name]}
                            onChange={(e) => onChange(f.name, e.target.value)}
                            onBlur={() => onBlur(f.name)}
                            onKeyDown={preventInvalidKeys}
                            placeholder="0"
                            className="rounded-xl font-medium"
                            aria-describedby={`${f.name}-hint`}
                          />
                          <span
                            id={`${f.name}-hint`}
                            className="text-xs text-muted-foreground"
                          >
                            Integers only. Up to 6 digits (e.g., 0–999999).
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="text-sm font-medium flex items-center justify-between">
                    <span>Total Image Generation Charge</span>
                    <span className="px-2 py-1 rounded-lg border bg-accent tabular-nums">
                      {totalImage}
                    </span>
                  </div>
                </section>

                <Separator />

                {/* SEO Settings */}
                <section className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-fuchsia-500/10 border">
                      <Sparkles className="h-4 w-4 text-fuchsia-500" />
                    </div>
                    <h3 className="text-lg font-medium">SEO Settings</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {fields
                      .filter((f) => f.group === "seo")
                      .map((f) => (
                        <div key={f.name} className="grid gap-2">
                          <Label
                            htmlFor={f.name}
                            className="flex items-center gap-2"
                          >
                            <span className="inline-flex items-center justify-center">
                              {f.icon}
                            </span>
                            {f.label}
                            <span className="text-[11px] text-muted-foreground ml-1">
                              (whole number, max 6 digits)
                            </span>
                          </Label>
                          <Input
                            id={f.name}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={values[f.name]}
                            onChange={(e) => onChange(f.name, e.target.value)}
                            onBlur={() => onBlur(f.name)}
                            onKeyDown={preventInvalidKeys}
                            placeholder="0"
                            className="rounded-xl font-medium"
                            aria-describedby={`${f.name}-hint`}
                          />
                          <span
                            id={`${f.name}-hint`}
                            className="text-xs text-muted-foreground"
                          >
                            Integers only. Up to 6 digits.
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="text-sm font-medium flex items-center justify-between">
                    <span>Total SEO Token Charge</span>
                    <span className="px-2 py-1 rounded-lg border bg-accent tabular-nums">
                      {totalSEO}
                    </span>
                  </div>
                </section>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Status & Free Credit */}
        <motion.div
          key="status-card"
          variants={sectionVariants}
          custom={2}
          whileHover={cardHover}
          className="2xl:col-span-1"
        >
          <Card className="p-6 rounded-2xl border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border">
                <Coins className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium">Current Status</h3>
            </div>

            <Separator className="my-4" />

            {loading ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-40 rounded-lg" />
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-6 w-24 rounded-lg" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-40 rounded-xl" />
                </div>
              </div>
            ) : (
              <>
                {doc ? (
                  <div className="text-sm grid gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">ID</span>
                      <span className="px-2 py-0.5 rounded-lg bg-muted">
                        {doc._id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Per Image Request</span>
                      <span>{lastSavedValues.per_image_request}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Per Image</span>
                      <span>{lastSavedValues.per_image}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Per SEO Title</span>
                      <span>{lastSavedValues.per_seo_title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Per SEO Short Description
                      </span>
                      <span>{lastSavedValues.per_seo_short_description}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Per SEO Long Description
                      </span>
                      <span>{lastSavedValues.per_seo_long_description}</span>
                    </div>
                    {doc.updatedAt && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Updated</span>
                        <span>{new Date(doc.updatedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    No TokenDedux found. Fill the form and click Create.
                  </div>
                )}

                <Separator className="my-4" />

                {/* Free Credit */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-medium">Free Credit</h4>
                    <div className="text-sm px-2 py-1 rounded-lg border bg-accent">
                      Current:{" "}
                      <span className="font-semibold">{freeCredit}</span>
                    </div>
                  </div>

                  <form onSubmit={addAndUpdateCredit} className="grid gap-2">
                    <Label
                      htmlFor="freeCredit"
                      className="flex items-center gap-2"
                    >
                      Set free token amount{" "}
                      <span className="text-[11px] text-muted-foreground">
                        (whole number, max 6 digits)
                      </span>
                    </Label>
                    <Input
                      id="freeCredit"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={freeCreditInput}
                      onChange={(e) =>
                        setFreeCreditInput(sanitizeIntegerMax6(e.target.value))
                      }
                      onBlur={() =>
                        setFreeCreditInput(normalizeIntOnBlur(freeCreditInput))
                      }
                      onKeyDown={preventInvalidKeys}
                      placeholder="0"
                      className="rounded-xl font-medium"
                    />
                    <motion.div whileTap={buttonTap} className="flex">
                      <Button
                        type="submit"
                        variant="outline"
                        className="rounded-xl"
                        disabled={updatingCredit || !isCreditDirty}
                        aria-disabled={updatingCredit || !isCreditDirty}
                      >
                        {updatingCredit ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Free Credit"
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
