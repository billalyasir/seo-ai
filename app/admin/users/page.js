// app/components/sections/admin/users/Users.jsx
"use client";

import React from "react";
import axios from "axios";
import UsersList from "@/components/sections/admin/users/UsersList";
import { Card } from "@/components/ui/card";
import { Users as UsersIcon, Coins, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import server from "@/api";

// axios base client (no localStorage here)
const api = axios.create({
  baseURL: server, // e.g. "https://api.example.com"
  timeout: 15000,
  withCredentials: false,
});

function StatCard({
  title,
  value,
  sub,
  Icon,
  accent = "from-primary/10 to-primary/0",
  loading = false,
}) {
  return (
    <Card
      className="
        relative overflow-hidden
        rounded-2xl border shadow-sm
        px-5 py-5 md:px-6
        transition-all
        hover:shadow-md hover:border-primary/30
        bg-gradient-to-br
      "
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`}
        aria-hidden="true"
      />
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="space-y-1">
          {loading ? (
            <>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                <Skeleton className="h-3 w-24" />
              </div>
              <div>
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="mt-1">
                <Skeleton className="h-3 w-32" />
              </div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {title}
              </div>
              <h3 className="text-3xl font-semibold leading-none tracking-tight">
                {value}
              </h3>
              {sub ? (
                <div className="text-xs text-muted-foreground mt-1">{sub}</div>
              ) : null}
            </>
          )}
        </div>
        <div className="shrink-0 h-12 w-12 rounded-xl border bg-background flex items-center justify-center shadow-sm">
          {loading ? (
            <Skeleton className="h-6 w-6 rounded" />
          ) : Icon ? (
            <Icon className="h-6 w-6 text-primary" />
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default function Users() {
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    totalFreeTokensGiven: 0,
    purchasedCount: 0,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // read token ONLY inside useEffect, then fetch stats with axios
  React.useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        let token = null;
        if (typeof window !== "undefined") {
          token = localStorage.getItem("token");
        }

        const res = await api.get("/api/users/stats", {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res && res.data && res.data.success) {
          setStats(
            res.data.data || {
              totalUsers: 0,
              totalFreeTokensGiven: 0,
              purchasedCount: 0,
            }
          );
        } else {
          setError("Failed to load stats");
        }
      } catch (err) {
        if (err && err.name !== "CanceledError" && err.name !== "AbortError") {
          console.error(err);
          setError("Failed to load stats");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const totalUsers = stats.totalUsers || 0;
  const totalFreeTokens = stats.totalFreeTokensGiven || 0;
  const purchasedCount = stats.purchasedCount || 0;

  const purchaseRate =
    totalUsers > 0 ? Math.round((purchasedCount / totalUsers) * 100) : 0;
  const avgFreeTokens =
    totalUsers > 0 ? Math.round(totalFreeTokens / totalUsers) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of users, free token distribution, and purchases.
          </p>
        </div>
      </div>

      {/* Stats grid with skeletons (HTML-safe: no <div> inside <p> or <h*> while loading) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="User List"
          value={totalUsers}
          sub={`${purchaseRate}% have made a purchase`}
          Icon={UsersIcon}
          accent="from-blue-500/10 to-transparent"
          loading={loading}
        />
        <StatCard
          title="Total Free Token Given"
          value={totalFreeTokens}
          sub={`Avg ${avgFreeTokens} per user`}
          Icon={Coins}
          accent="from-amber-500/10 to-transparent"
          loading={loading}
        />
        <StatCard
          title="User Purchased"
          value={purchasedCount}
          sub="Users with at least one purchase"
          Icon={ShoppingBag}
          accent="from-emerald-500/10 to-transparent"
          loading={loading}
        />
      </div>

      {/* Error message (non-blocking, UsersList still renders) */}
      {error ? (
        <div className="text-sm text-destructive">
          {error} — showing cached/initial values.
        </div>
      ) : null}

      <div>
        <UsersList />
      </div>
    </div>
  );
}
