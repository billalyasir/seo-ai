"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Coins,
  BanknoteArrowUp,
  File,
  Sparkles,
  Send,
  Gauge,
  BarChart4,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

// Framer Motion
import { motion, AnimatePresence } from "framer-motion";

// Your UI bits
import { GradientPillBtn } from "@/components/FancyButtons";
import FeedBackWidget from "../FeedBack";

/* --------------------------
   small utilities
---------------------------*/

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 640px)");
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function AnimatedCounter({ value, format = (v) => v, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);
  const toRef = useRef(Number(value) || 0);

  useEffect(() => {
    const to = Number(value) || 0;
    fromRef.current = display;
    toRef.current = to;
    startRef.current = null;

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = fromRef.current + (toRef.current - fromRef.current) * eased;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{format(display)}</>;
}

/* --------------------------
   framer variants
---------------------------*/

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.07 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 18 },
  },
};

const cardHover = {
  whileHover: {
    y: -2,
    boxShadow: "0 8px 30px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)",
    transition: { duration: 0.18 },
  },
};

/* --------------------------
   main component
---------------------------*/

export default function DashboardContent() {
  const isMobile = useIsMobile();

  // slices
  const { token, loading, error } = useSelector((s) => s.my_token_info || {});
  const fileCountFromSlice = useSelector((s) => s.fileCount?.count ?? 0);
  const productsSlice = useSelector((s) => s.products || {});

  // formatters
  const nf = useMemo(() => new Intl.NumberFormat(), []);
  const eur = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "EUR",
      }),
    []
  );

  // ---- derive values:
  const {
    available,
    spent,
    cap,
    isFreeCreditOnly,
    remainingPct,
    totalFiles,
    resetPrefix,
    resetText,
    createdOnText,
  } = useMemo(() => {
    const available_tokens = Math.max(0, Number(token?.available_tokens ?? 0));
    const rawCap = Math.max(0, Number(token?.total_tokens_from_the_first ?? 0));
    const spentVal = Math.max(
      0,
      Number(token?.total_amout_spent_from_the_first ?? 0)
    );

    const isFreeCreditOnly =
      (rawCap === 0 || !Number.isFinite(rawCap) || rawCap <= 0) &&
      available_tokens > 0;

    const capForUi = isFreeCreditOnly ? null : rawCap > 0 ? rawCap : null;

    let pct = null;
    if (capForUi) {
      pct = Math.min(100, Math.max(0, (available_tokens / capForUi) * 100));
    }

    let resetPrefixLocal = "—";
    let resetTextLocal = "—";
    if (token?.expiration !== undefined && token?.expiration !== null) {
      let ms = Number(token.expiration);
      if (Number.isFinite(ms)) {
        if (ms < 1e12) ms *= 1000; // support seconds epoch
        resetPrefixLocal = "Resets on";
        resetTextLocal = new Date(ms).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    } else if (token?.updatedAt) {
      resetPrefixLocal = "Updated on";
      resetTextLocal = new Date(token.updatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    const createdOnLocal = token?.createdAt
      ? new Date(token.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

    const derivedFromProducts =
      productsSlice?.items?.length ??
      productsSlice?.list?.length ??
      productsSlice?.data?.length ??
      0;

    const filesCount = Number.isFinite(Number(fileCountFromSlice))
      ? Math.max(0, Number(fileCountFromSlice))
      : Math.max(0, Number(derivedFromProducts || 0));

    return {
      available: available_tokens,
      spent: spentVal,
      cap: capForUi,
      isFreeCreditOnly,
      remainingPct: pct,
      totalFiles: filesCount,
      resetPrefix: resetPrefixLocal,
      resetText: resetTextLocal,
      createdOnText: createdOnLocal,
    };
  }, [token, productsSlice, fileCountFromSlice]);

  // stat cards
  const stats = useMemo(() => {
    return [
      {
        title: "Available Tokens",
        value: available,
        formatter: (v) => nf.format(Math.round(v)),
        icon: Coins,
        accent: "from-amber-500/20 to-amber-500/0",
        iconColor: "text-amber-600",
      },
      {
        title: "Total Tokens",
        value: cap || 0,
        formatter: () => (cap ? nf.format(cap) : "—"),
        icon: Gauge,
        accent: "from-sky-500/20 to-sky-500/0",
        iconColor: "text-sky-600",
      },
      {
        title: "Total Spent",
        value: spent,
        formatter: (v) => eur.format(v),
        icon: BanknoteArrowUp,
        accent: "from-emerald-500/20 to-emerald-500/0",
        iconColor: "text-emerald-600",
      },
      {
        title: "Total File (Hit Request)",
        value: totalFiles,
        formatter: (v) => nf.format(Math.round(v)),
        icon: File,
        accent: "from-violet-500/20 to-violet-500/0",
        iconColor: "text-violet-600",
      },
    ];
  }, [available, cap, spent, totalFiles, nf, eur]);

  // charts: omit "Total Tokens" entirely in free-credit-only mode
  const chartData = useMemo(() => {
    const arr = [
      { name: "Available", value: Number(available) || 0, unit: "tokens" },
      { name: "Spent (€)", value: Number(spent) || 0, unit: "EUR" },
      {
        name: "Files (Hit Request)",
        value: Number(totalFiles) || 0,
        unit: "files",
      },
    ];
    if (cap && !isFreeCreditOnly) {
      arr.splice(1, 0, {
        name: "Total Tokens",
        value: Number(cap) || 0,
        unit: "tokens",
      });
    }
    return arr;
  }, [available, spent, totalFiles, cap, isFreeCreditOnly]);

  // token breakdown: only show when we actually use a cap
  const tokensStackData = useMemo(() => {
    if (!cap || isFreeCreditOnly) return [];
    const used = Math.max(0, cap - available);
    return [{ name: "Tokens", Available: available, Used: used }];
  }, [cap, available, isFreeCreditOnly]);

  /* --------------------------
     loading & error
  ---------------------------*/

  if (loading) {
    return (
      <div className="p-4">
        <motion.div
          className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="m-4"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Card className="border-destructive/30 ring-1 ring-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Sparkles className="h-5 w-5" />
              Error
            </CardTitle>
            <CardDescription className="text-destructive">
              {String(error)}
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  /* --------------------------
     render
  ---------------------------*/

  return (
    <motion.div
      className="space-y-6 sm:p-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-3"
        variants={fadeUp}
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart4 className="h-5 w-5 text-primary" />
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            {resetPrefix} {resetText}
            {createdOnText ? ` • Created on ${createdOnText}` : ""}
          </p>
        </div>

        {/*
         <Dialog>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <GradientPillBtn>
                Feedback
                <Send />
              </GradientPillBtn>
            </motion.div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-6xl bg-background p-0">
            <DialogTitle className="sr-only">Send Feedback</DialogTitle>
            <FeedBackWidget />
          </DialogContent>
        </Dialog>
      */}
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              variants={fadeUp}
              whileHover={cardHover.whileHover}
            >
              <Card className="relative overflow-hidden">
                {/* Accent glow */}
                <div className="pointer-events-none absolute inset-x-0 -top-px h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div
                  className={`pointer-events-none absolute -inset-x-8 -top-8 h-20 bg-gradient-to-b ${stat.accent} blur-2xl`}
                />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="grid place-items-center rounded-full bg-muted/60 p-2">
                    <Icon
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold tabular-nums">
                    <AnimatedCounter
                      value={stat.value}
                      format={stat.formatter}
                    />
                  </div>
                </CardContent>

                {/* subtle badge when free-credit-only and this is the Total card */}
                {index === 1 && !cap && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 text-xs">
                      <Info className="h-3.5 w-3.5" />
                      Free credit mode
                    </span>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tokens Card */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-600" />
              Tokens
              {isFreeCreditOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs">
                  <Info className="h-3.5 w-3.5" />
                  Free credit only
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {isFreeCreditOnly
                ? `You have ${nf.format(available)} available (free credit)${
                    createdOnText ? ` — since ${createdOnText}` : ""
                  }`
                : cap
                ? `You have ${nf.format(available)} of ${nf.format(
                    cap
                  )} available${
                    createdOnText ? ` — since ${createdOnText}` : ""
                  }`
                : `You have ${nf.format(available)} available${
                    createdOnText ? ` — since ${createdOnText}` : ""
                  }`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isFreeCreditOnly ? (
                // AVAILABLE-ONLY PROGRESS (always 100% when you have any balance)
                <>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Available balance</span>
                    <span className="tabular-nums">{nf.format(available)}</span>
                  </div>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="origin-left"
                  >
                    <Progress value={available > 0 ? 100 : 0} className="h-2" />
                  </motion.div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    No total cap set. Bar shows your current free-credit
                    balance.
                  </div>
                </>
              ) : cap ? (
                // NORMAL CAP-BASED PROGRESS
                <>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Remaining</span>
                    <span className="tabular-nums">
                      {(remainingPct ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="origin-left"
                  >
                    <Progress value={remainingPct ?? 0} className="h-2" />
                  </motion.div>
                  <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                    <span>Used</span>
                    <span className="tabular-nums">
                      {nf.format(Math.max(0, cap - available))}
                    </span>
                  </div>
                </>
              ) : (
                // NO CAP, NO AVAILABLE (edge)
                <div className="text-sm text-muted-foreground">
                  No tokens available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Statistics */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-primary" />
              Statistics
            </CardTitle>
            <CardDescription>Overview of your key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[240px] sm:h-[300px] lg:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: isMobile ? 11 : 12 }}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 11 : 12 }} />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const unit = item?.payload?.unit || "";
                      if (unit === "EUR") return [eur.format(value), "value"];
                      return [nf.format(value), "value"];
                    }}
                  />
                  {!isMobile && <Legend />}
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === "Available"
                            ? "#f59e0b" // amber
                            : entry.name === "Total Tokens"
                            ? "#3b82f6" // blue
                            : entry.name === "Spent (€)"
                            ? "#10b981" // emerald
                            : "#8b5cf6" // violet
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Token breakdown (ONLY when there is a cap and not free-credit-only) */}
      <AnimatePresence>
        {tokensStackData.length > 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: 8 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-sky-600" />
                  Token Breakdown
                </CardTitle>
                <CardDescription>
                  Available vs Used (derived from Total Tokens)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-lg border p-4">
                    <div className="text-muted-foreground mb-1">Available</div>
                    <div className="font-semibold tabular-nums">
                      {nf.format(Math.max(0, available))}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-muted-foreground mb-1">Used</div>
                    <div className="font-semibold tabular-nums">
                      {nf.format(Math.max(0, (cap || 0) - available))}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-muted-foreground mb-1">Total</div>
                    <div className="font-semibold tabular-nums">
                      {nf.format(cap || 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
