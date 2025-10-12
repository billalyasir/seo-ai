// src/app/(admin)/feedback/page.jsx
"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  RefreshCw,
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Clock,
  User2,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdminFeedbacks,
  activateFeedbackOnHome,
  deactivateFeedbackFromHome,
  selectAdminFeedbackState,
  setPage as setPageAction,
  setLimit as setLimitAction,
  clearError as clearErrorAction,
  clearActivatedFlash,
  clearDeactivatedFlash,
} from "@/lib/redux/slices/feedbackSliceForAdmin";

/* --------------------------------------------
   Config
-------------------------------------------- */

const PAGE_SIZE_OPTIONS = [6, 12, 18, 24];

const STATUS_IMG = {
  happy: "/1.png",
  unhappy: "/2.png",
  bored: "/3.png",
  sad: "/4.png",
};

const STATUS_STYLE = {
  happy:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  unhappy:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  bored:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
  sad: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
};

const STATUS_ORDER = ["happy", "unhappy", "bored", "sad"];

/* --------------------------------------------
   Small UI bits
-------------------------------------------- */

function HeadStat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur px-4 py-3 shadow-sm w-full">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function StatusBadge({ status }) {
  const key = (status || "").toLowerCase();
  const cls =
    STATUS_STYLE[key] ||
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status || "Unknown"}
    </span>
  );
}

function GhostIconBtn({ title, onClick, disabled, children, className }) {
  return (
    <button
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition " +
        (className || "")
      }
    >
      {children}
    </button>
  );
}

/* --------------------------------------------
   Skeletons & Empty/Error
-------------------------------------------- */

function RowSkeleton({ count }) {
  const items = React.useMemo(() => Array.from({ length: count }), [count]);
  return (
    <div className="space-y-3">
      {items.map((_, i) => (
        <Card
          aria-hidden
          key={i}
          className="relative overflow-hidden rounded-2xl border backdrop-blur p-0"
        >
          <div className="absolute -inset-40 rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.slate.400/.10),transparent_60%)] blur-2xl" />
          <div className="relative z-10 flex flex-col sm:flex-row items-stretch gap-0 animate-pulse">
            <div className="w-full sm:w-[120px] p-4 border-b sm:border-b-0 sm:border-r">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted/70 rounded-xl mx-auto" />
            </div>
            <div className="flex-1 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-5 w-24 bg-muted rounded" />
                <div className="h-4 w-14 bg-muted rounded ml-2" />
                <div className="ml-auto h-3 w-24 bg-muted rounded" />
              </div>
              <div className="mt-3 space-y-2 max-w-3xl">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="h-6 w-24 bg-muted rounded-full" />
                <div className="h-6 w-28 bg-muted rounded-full" />
                <div className="h-6 w-20 bg-muted rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-8 sm:p-10 text-center rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
      <div className="mx-auto mb-4 w-20 h-20 sm:w-24 sm:h-24 relative">
        <Image
          src="/3.png"
          alt="No feedback"
          fill
          className="object-contain"
          sizes="96px"
          priority
        />
      </div>
      <h3 className="text-base sm:text-lg font-semibold">No feedback found</h3>
      <p className="text-sm text-muted-foreground">
        Try clearing filters or adjust your search.
      </p>
    </Card>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <Card className="p-6 sm:p-8 rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
      <h3 className="text-lg font-semibold text-rose-600">Failed to load</h3>
      <p className="text-sm text-muted-foreground mt-1 break-all">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </Card>
  );
}

/* --------------------------------------------
   Hooks (small utilities)
-------------------------------------------- */

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* --------------------------------------------
   Main Component
-------------------------------------------- */

export default function AdminFeedbackPage() {
  const prefersReducedMotion = useReducedMotion();
  const dispatch = useDispatch();
  const {
    items,
    loading,
    error,
    page,
    limit,
    totalPages,
    totalFeedbacks,
    hasNextPage,
    hasPrevPage,
    activating,
    activated,
    deactivating,
    deactivated,
  } = useSelector(selectAdminFeedbackState);

  // client-only filters for the current page
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortKey, setSortKey] = React.useState("newest");
  const debouncedQ = useDebouncedValue(q, 250);

  // local UI for jump
  const [jumpVal, setJumpVal] = React.useState(1);

  // fetch when page/limit changes
  React.useEffect(() => {
    dispatch(fetchAdminFeedbacks({ page, limit }));
    setJumpVal(page);
  }, [dispatch, page, limit]);

  const refreshNow = React.useCallback(() => {
    dispatch(clearErrorAction());
    dispatch(fetchAdminFeedbacks({ page, limit }));
  }, [dispatch, page, limit]);

  const gotoPage = React.useCallback(
    (target) => {
      const safe = Math.max(1, Math.min(Number(target) || 1, totalPages || 1));
      dispatch(setPageAction(safe));
      setJumpVal(safe);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [dispatch, totalPages]
  );

  const onChangeLimit = (val) => dispatch(setLimitAction(parseInt(val, 10)));

  // derived: filtered & sorted (on current page)
  const filtered = React.useMemo(() => {
    let out = items.slice();

    if (statusFilter !== "all") {
      out = out.filter((f) => (f?.status || "").toLowerCase() === statusFilter);
    }

    const needle = (debouncedQ || "").trim().toLowerCase();
    if (needle) {
      out = out.filter((f) => {
        const user =
          f?.user?.username || f?.user?.email || f?.user?.name || "anonymous";
        const base = `${user} ${f?.comment || ""} ${
          Array.isArray(f?.suggested_review) ? f.suggested_review.join(" ") : ""
        }`.toLowerCase();
        return base.includes(needle);
      });
    }

    out.sort((a, b) => {
      const da = new Date(a?.createdAt || 0).getTime();
      const db = new Date(b?.createdAt || 0).getTime();
      return sortKey === "newest" ? db - da : da - db;
    });

    return out;
  }, [items, debouncedQ, statusFilter, sortKey]);

  const pageCounts = React.useMemo(() => {
    const counts = { happy: 0, unhappy: 0, bored: 0, sad: 0 };
    for (const f of items) {
      const k = (f?.status || "").toLowerCase();
      if (counts[k] !== undefined) counts[k]++;
    }
    return counts;
  }, [items]);

  const onActivate = async (id) => {
    if (!id || activating[id]) return;
    const res = await dispatch(activateFeedbackOnHome({ id }));
    if (res.meta.requestStatus === "fulfilled") {
      setTimeout(() => dispatch(clearActivatedFlash(id)), 1200);
    }
  };

  const onDeactivate = async (id) => {
    if (!id || deactivating[id]) return;
    const res = await dispatch(deactivateFeedbackFromHome({ id }));
    if (res.meta.requestStatus === "fulfilled") {
      setTimeout(() => dispatch(clearDeactivatedFlash(id)), 1200);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-white to-slate-50 dark:from-neutral-900 dark:to-neutral-950 p-4 sm:p-6 shadow">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-40 rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.cyan.400/.15),transparent_60%)] blur-2xl"
        />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
                Users Feedback
              </h1>
              <p className="text-sm text-muted-foreground">
                High-signal insights from real users, beautifully summarized.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <GhostIconBtn
                title="Refresh"
                onClick={refreshNow}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </GhostIconBtn>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <HeadStat label="Total (all pages)" value={totalFeedbacks} />
            <HeadStat
              label="This page"
              value={items.length}
              sub={`${page}/${totalPages}`}
            />
            <HeadStat label="Positive" value={pageCounts.happy} />
            <HeadStat
              label="Needs attention"
              value={pageCounts.unhappy + pageCounts.sad}
            />
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-950/40 bg-white/90 dark:bg-neutral-950/80 border rounded-2xl p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap w-full">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search user, comment, suggestions…"
              className="w-full rounded-xl border bg-background pl-9 pr-3 py-2 text-sm"
              aria-label="Search"
            />
          </div>

          <div className="hidden md:block w-px h-6 bg-border" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {["all", ...STATUS_ORDER].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs transition " +
                    (statusFilter === s
                      ? "bg-black text-white border-black dark:bg-white dark:text-black"
                      : "bg-white/60 dark:bg-neutral-900/60 hover:bg-muted")
                  }
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-border" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="rounded-xl border bg-background px-2 py-1 text-sm"
              aria-label="Sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {/*
  
    
    */}
      </div>

      {/* ************* LIST LAYOUT ************* */}
      {loading ? (
        <RowSkeleton count={Math.min(limit, 8)} />
      ) : error ? (
        <ErrorState message={error} onRetry={refreshNow} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.ul
          role="list"
          className="space-y-3"
          initial={false}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { staggerChildren: 0.04, delayChildren: 0.02 }
          }
        >
          <AnimatePresence initial={false}>
            {filtered.map((fb) => {
              const key = fb?._id || Math.random().toString(36).slice(2);
              const statusKey = (fb?.status || "").toLowerCase();
              const imgSrc = STATUS_IMG[statusKey] || "/3.png";
              const created = fb?.createdAt ? new Date(fb.createdAt) : null;
              const updated = fb?.updatedAt ? new Date(fb.updatedAt) : null;
              const user =
                fb?.user?.username ||
                fb?.user?.email ||
                fb?.user?.name ||
                "Anonymous";

              const isActivating = !!activating[fb._id];
              const isActivated = !!activated[fb._id];
              const isDeactivating = !!deactivating[fb._id];
              const isDeactivated = !!deactivated[fb._id];

              const alreadyActive = !!fb?.isActive;

              return (
                <motion.li
                  key={key}
                  layout
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={
                    prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
                  }
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 10 }
                  }
                >
                  <Card className="relative overflow-hidden rounded-2xl border bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-0 shadow-sm hover:shadow-md transition-shadow">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -inset-40 rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.sky.400/.10),transparent_60%)] blur-2xl"
                    />
                    <div className="relative z-10 flex flex-col sm:flex-row items-stretch">
                      {/* Left mood rail */}
                      <div className="w-full sm:w-[120px] p-4 border-b sm:border-b-0 sm:border-r">
                        <div className="relative mx-auto h-20 w-20 sm:h-24 sm:w-24">
                          <Image
                            src={imgSrc}
                            alt={fb?.status || "feedback"}
                            fill
                            className="object-contain rounded-xl"
                            sizes="(max-width: 640px) 80px, 96px"
                            loading="lazy"
                          />
                        </div>
                      </div>

                      {/* Right content */}
                      <div className="flex-1 p-4">
                        {/* Header line */}
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={fb?.status} />
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <User2 className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[180px] sm:max-w-none">
                              {user}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                            <Clock className="h-3.5 w-3.5" />
                            {created ? created.toLocaleString() : "—"}
                          </span>
                        </div>

                        {/* Comment block */}
                        <div className="mt-3 max-w-3xl">
                          {fb?.comment ? (
                            <div className="relative rounded-xl border bg-white/70 dark:bg-neutral-800/60 px-3 py-2">
                              <div className="absolute -top-2 left-6">
                                <Quote className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <p className="text-[15px] leading-relaxed break-words">
                                {fb.comment}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No comment provided.
                            </p>
                          )}
                        </div>

                        {/* Suggestions */}
                        {Array.isArray(fb?.suggested_review) &&
                        fb.suggested_review.length > 0 ? (
                          <div className="mt-3">
                            <div className="text-xs font-medium mb-1">
                              Suggested review
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {fb.suggested_review.map((s, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] rounded-full border px-2 py-0.5 bg-white/70 dark:bg-neutral-800/60"
                                >
                                  {typeof s === "string"
                                    ? s
                                    : JSON.stringify(s)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Activate / Deactivate controls */}
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          {alreadyActive ? (
                            <>
                              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/70 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <ShieldCheck className="h-4 w-4" />
                                Active on Home Page
                              </span>

                              <Button
                                onClick={() => onDeactivate(fb._id)}
                                variant="outline"
                                className="border px-3 py-1.5 h-auto text-sm"
                                disabled={isDeactivating}
                                title="Deactivate from Home Page"
                              >
                                {isDeactivating ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Deactivating…
                                  </>
                                ) : isDeactivated ? (
                                  <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Deactivated
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => onActivate(fb._id)}
                              variant="outline"
                              className="border px-3 py-1.5 h-auto text-sm"
                              disabled={isActivating}
                              title="Set Active on Home Page"
                            >
                              {isActivating ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Activating…
                                </>
                              ) : isActivated ? (
                                <>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Activated
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Set Active on Home Page
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Footer meta */}
                        {updated &&
                        created &&
                        updated.getTime() !== created.getTime() ? (
                          <div className="mt-3 text-[11px] text-muted-foreground">
                            Updated: {updated.toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm text-muted-foreground">
            Per page
          </label>
          <select
            id="pageSize"
            value={limit}
            onChange={(e) => onChangeLimit(e.target.value)}
            className="rounded-xl border bg-background px-2 py-1 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <GhostIconBtn
            title="First page"
            onClick={() => gotoPage(1)}
            disabled={!hasPrevPage}
          >
            <ChevronsLeft className="h-4 w-4" />
          </GhostIconBtn>
          <GhostIconBtn
            title="Previous page"
            onClick={() => gotoPage(page - 1)}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </GhostIconBtn>

          <div className="px-2 text-sm">
            Page <span className="font-semibold">{page}</span> /{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>

          <GhostIconBtn
            title="Next page"
            onClick={() => gotoPage(page + 1)}
            disabled={!hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </GhostIconBtn>
          <GhostIconBtn
            title="Last page"
            onClick={() => gotoPage(totalPages)}
            disabled={!hasNextPage}
          >
            <ChevronsRight className="h-4 w-4" />
          </GhostIconBtn>

          {/* Jump */}
          {totalPages > 1 && (
            <>
              <span className="mx-2 hidden sm:block w-px h-6 bg-border" />
              <label htmlFor="jump" className="text-sm text-muted-foreground">
                Jump
              </label>
              <input
                id="jump"
                type="number"
                min={1}
                max={totalPages}
                value={jumpVal}
                onChange={(e) => setJumpVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(jumpVal, 10);
                    gotoPage(Number.isFinite(n) ? n : 1);
                  }
                }}
                className="w-24 rounded-xl border bg-background px-2 py-1 text-sm"
              />
              <button
                onClick={() => {
                  const n = parseInt(jumpVal, 10);
                  gotoPage(Number.isFinite(n) ? n : 1);
                }}
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted transition"
              >
                Go
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
