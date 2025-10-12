// app/components/InfoCards.jsx
"use client";

import React from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users2, MessageSquareHeart, HandCoins } from "lucide-react";

// thunks (make sure these paths match your project)
import { fetchUserCount } from "@/lib/redux/slices/userCountSlice";
import { fetchFeedbackCount } from "@/lib/redux/slices/feedbackCountSlice";
import { fetchPricingCount } from "@/lib/redux/slices/pricingCountSlice";

/* --------------------------------------------
   Tiny, dependency-free skeletons (HTML-safe)
-------------------------------------------- */
function ValueSkeleton() {
  return (
    <div
      className="mt-1 h-7 w-16 rounded bg-muted animate-pulse"
      aria-hidden="true"
    />
  );
}

function TitleSkeleton() {
  // Use <span> (inline) to avoid invalid <div> inside <h*> or <p>
  return (
    <span
      className="inline-block h-3 w-24 rounded bg-muted animate-pulse align-middle"
      aria-hidden="true"
    />
  );
}

function IconSkeleton() {
  return (
    <span
      className="inline-block h-6 w-6 rounded bg-muted-foreground/20 animate-pulse align-middle"
      aria-hidden="true"
    />
  );
}

/* --------------------------------------------
   Reusable StatCard
   - Shows skeletons while loading
   - Shows error banner + retry when error
-------------------------------------------- */
function StatCard({ title, value, icon: Icon, loading, error, onRetry }) {
  return (
    <div className="h-full">
      <Card className="h-full rounded-2xl transition-transform duration-150 hover:-translate-y-0.5">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="rounded-xl p-3 bg-muted flex items-center justify-center">
            {loading ? (
              <IconSkeleton />
            ) : (
              <Icon
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-sm font-medium text-muted-foreground">
                <TitleSkeleton />
              </div>
            ) : (
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
            )}

            <div
              className="mt-1 text-3xl font-semibold tracking-tight"
              aria-live="polite"
            >
              {loading ? <ValueSkeleton /> : value}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 text-xs text-muted-foreground">
          {error ? (
            <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {typeof error === "string" ? error : "Something went wrong."}
                </span>
                {onRetry ? (
                  <button
                    onClick={onRetry}
                    className="shrink-0 rounded px-2 py-1 text-xs font-medium border border-destructive/40 hover:bg-destructive/10"
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------------------------
   Main
-------------------------------------------- */
export default function InfoCards() {
  const dispatch = useDispatch();

  // --- Select from Redux (each slice shape: { count, loading, error }) ---
  const userSlice = useSelector((s) => s.userCount) || {};
  const feedbackSlice = useSelector((s) => s.feedbackCount) || {};
  const pricingSlice = useSelector((s) => s.pricingCount) || {};

  const userCount = typeof userSlice.count === "number" ? userSlice.count : 0;
  const feedbackCount =
    typeof feedbackSlice.count === "number" ? feedbackSlice.count : 0;
  const pricingCount =
    typeof pricingSlice.count === "number" ? pricingSlice.count : 0;

  const userLoading = !!userSlice.loading;
  const feedbackLoading = !!feedbackSlice.loading;
  const pricingLoading = !!pricingSlice.loading;

  const userError = userSlice.error || "";
  const feedbackError = feedbackSlice.error || "";
  const pricingError = pricingSlice.error || "";

  // --- Kick off fetches (client-side only) ---
  React.useEffect(() => {
    // fire-and-forget; your slices already handle errors/loading
    dispatch(fetchUserCount());
    dispatch(fetchFeedbackCount());
    dispatch(fetchPricingCount());
  }, [dispatch]);

  // Cards config
  const stats = [
    {
      title: "Users",
      href: "/admin/users",
      value: userCount,
      icon: Users2,
      loading: userLoading,
      error: userError,
      retry: () => dispatch(fetchUserCount()),
    },
    {
      title: "Feedback",
      href: "/admin/feedback",
      value: feedbackCount,
      icon: MessageSquareHeart,
      loading: feedbackLoading,
      error: feedbackError,
      retry: () => dispatch(fetchFeedbackCount()),
    },
    {
      title: "Manage Pricing",
      href: "/admin/pricing",
      value: pricingCount,
      icon: HandCoins,
      loading: pricingLoading,
      error: pricingError,
      retry: () => dispatch(fetchPricingCount()),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
      {stats.map((stat, index) => {
        const content = (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            loading={stat.loading}
            error={stat.error}
            onRetry={stat.retry}
          />
        );

        // Only wrap with Link if an href is provided
        return stat.href ? (
          <Link
            key={index}
            href={stat.href}
            className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-2xl"
            aria-disabled={stat.loading ? "true" : "false"}
          >
            {content}
          </Link>
        ) : (
          <div key={index} className="block">
            {content}
          </div>
        );
      })}
    </div>
  );
}
