// app/components/sections/admin/users/UsersList.jsx
"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  User,
  Mail,
  ArrowUpDown,
  ChevronDown,
  RefreshCcw,
  Receipt,
  CalendarClock,
  CreditCard,
  Filter,
  Sigma,
  Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import server from "@/api";

// --- helpers (deterministic, hydration-safe) ---
function getInitials(name) {
  return (name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Always format in UTC so SSR and client match exactly.
function formatDateUTC(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// Date+time in UTC (HH:MM)
function formatDateTimeUTC(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins} UTC`;
}

const ROLE_OPTIONS = ["All", "Admin", "User"];

// Build Authorization header from localStorage token (client-only)
function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// format amounts by currency map into a compact string: "USD 49 • EUR 10"
function formatAmountsByCurrency(map) {
  if (!map || typeof map !== "object") return "—";
  const entries = Object.keys(map).map(
    (cur) => `${cur} ${Number(map[cur] || 0)}`
  );
  if (entries.length === 0) return "—";
  return entries.join(" • ");
}

/**
 * Compute **fulfilled-only** aggregates from a list of tx items.
 * We ONLY count rows where (fulfilled === true) OR (state === "FULFILL").
 * - Total Tokens: sum(tokensDelivered ?? tokensPlanned ?? 0)
 * - Total Spent: sum(amount) grouped by currency
 */
function computeFulfilledAggregates(items) {
  const agg = { tokens: 0, amountsByCurrency: {} };
  if (!Array.isArray(items)) return agg;

  for (let i = 0; i < items.length; i++) {
    const t = items[i] || {};
    const isFulfilled =
      Boolean(t.fulfilled) || String(t.state || "").toUpperCase() === "FULFILL";
    if (!isFulfilled) continue;

    const tokens = Number(t.tokensDelivered ?? t.tokensPlanned ?? 0) || 0;
    agg.tokens += tokens;

    const cur = (t.currency || "").toString().toUpperCase() || "USD";
    const amt = Number(t.amount ?? 0) || 0;
    if (!agg.amountsByCurrency[cur]) agg.amountsByCurrency[cur] = 0;
    agg.amountsByCurrency[cur] += amt;
  }

  return agg;
}

export default function UsersList() {
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState("All");
  const [sortKey, setSortKey] = React.useState("name");
  const [sortDir, setSortDir] = React.useState("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(8);
  const [openUserId, setOpenUserId] = React.useState(null); // only one open at a time

  const [rows, setRows] = React.useState([]);
  const [meta, setMeta] = React.useState({
    page: 1,
    pageSize: 8,
    total: 0,
    totalPages: 1,
    sortKey: "name",
    sortDir: "asc",
    q: "",
    role: "All",
  });
  const [loading, setLoading] = React.useState(false);

  // per-user transactions cache & pagination
  // txState[userId] = { items: [], meta: {...}, loading: false, error: null }
  const [txState, setTxState] = React.useState({});

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: query,
        role,
        sortKey,
        sortDir,
      });

      const res = await fetch(`${server}/api/users?` + params.toString(), {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...authHeaders(),
        },
      });

      const json = await res.json();

      if (!json || !json.success) {
        throw new Error("Failed to fetch users");
      }
      setRows(Array.isArray(json.data) ? json.data : []);
      setMeta(json.meta || meta);
    } catch (err) {
      console.error(err);
      setRows([]);
      setMeta({
        page: 1,
        pageSize,
        total: 0,
        totalPages: 1,
        sortKey,
        sortDir,
        q: query,
        role,
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query, role, sortKey, sortDir]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function toggleRow(userId) {
    setOpenUserId((cur) => {
      const next = cur === userId ? null : userId;
      // if opening and no tx cached yet, fetch first page
      if (next && !txState[next]) {
        fetchTransactions(next, 1);
      }
      return next;
    });
  }

  async function fetchTransactions(userId, txPage = 1) {
    setTxState((s) => ({
      ...s,
      [userId]: { ...(s[userId] || {}), loading: true, error: null },
    }));
    try {
      const params = new URLSearchParams({
        page: String(txPage),
        pageSize: "5",
        sortDir: "desc",
      });
      const res = await fetch(
        `${server}/api/users/${userId}/transactions?` + params.toString(),
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            ...authHeaders(),
          },
        }
      );
      const json = await res.json();
      if (!json || !json.success) {
        throw new Error("Failed to fetch transactions");
      }

      setTxState((s) => ({
        ...s,
        [userId]: {
          items: Array.isArray(json.data) ? json.data : [],
          meta: json.meta || {
            page: txPage,
            pageSize: 5,
            total: 0,
            totalPages: 1,
          },
          loading: false,
          error: null,
        },
      }));
    } catch (err) {
      console.error(err);
      setTxState((s) => ({
        ...s,
        [userId]: {
          ...(s[userId] || {}),
          loading: false,
          error: "Unable to load payments",
        },
      }));
    }
  }

  function resetAll() {
    setQuery("");
    setRole("All");
    setSortKey("name");
    setSortDir("asc");
    setPage(1);
    setOpenUserId(null);
  }

  // --- Skeleton rows for the main table ---
  function SkeletonRow() {
    return (
      <TableRow>
        <TableCell className="py-2">
          <Skeleton className="h-6 w-6 rounded" />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-16 rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-12" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-5 w-12 rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-24" />
        </TableCell>
      </TableRow>
    );
  }

  // --- Skeleton block for the payment history table ---
  function PaymentSkeleton() {
    return (
      <div className="rounded-md border bg-background p-3">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    );
  }

  function handleRowActivate(id) {
    toggleRow(id);
  }

  function handleRowKeyDown(e, id) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleRow(id);
    }
  }

  return (
    <Card className="p-4 md:p-6 shadow-sm border">
      {/* Header / Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Users</h2>
            <p className="text-sm text-muted-foreground">
              Search, filter and manage your users.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="pl-8"
            />
          </div>

          {/* role filter */}
          <div className="relative">
            <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              className="w-full sm:w-40 rounded-md border bg-background pl-8 pr-3 py-2 text-sm"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <Button variant="default" onClick={resetAll}>
            Reset
          </Button>
          <Button
            variant="outline"
            onClick={fetchList}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead className="w-[320px]">
                <button
                  onClick={() => toggleSort("name")}
                  className="inline-flex items-center gap-1"
                >
                  User
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("role")}
                  className="inline-flex items-center gap-1"
                >
                  Role
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("freeTokensGiven")}
                  className="inline-flex items-center gap-1"
                >
                  Free Tokens
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("purchased")}
                  className="inline-flex items-center gap-1"
                >
                  Purchased
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
              <TableHead className="min-w-[140px]">
                <button
                  onClick={() => toggleSort("joinedAt")}
                  className="inline-flex items-center gap-1"
                >
                  Joined
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : rows.map((u) => {
                  const id = String(u._id || u.id); // backend returns _id
                  const isOpen = openUserId === id;
                  const tx = txState[id];

                  // fulfilled-only totals computed from the currently fetched tx page
                  const fulfilledTotals = tx
                    ? computeFulfilledAggregates(tx.items || [])
                    : { tokens: 0, amountsByCurrency: {} };

                  return (
                    <React.Fragment key={id}>
                      {/* main row (clickable to toggle) */}
                      <TableRow
                        className={`hover:bg-muted/40 cursor-pointer ${
                          isOpen ? "bg-muted/30" : ""
                        }`}
                        role="button"
                        aria-expanded={isOpen}
                        tabIndex={0}
                        onClick={() => handleRowActivate(id)}
                        onKeyDown={(e) => handleRowKeyDown(e, id)}
                      >
                        <TableCell className="py-0 align-middle">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                            aria-label="Toggle details"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(id);
                            }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </TableCell>

                        <TableCell
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(id);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 ring-2 ring-muted">
                              <AvatarImage src={u.avatar || ""} alt={u.name} />
                              <AvatarFallback>
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium leading-none">
                                {u.name}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className="rounded-full px-2"
                          >
                            {u.role}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono">
                          {u.freeTokensGiven ?? 0}
                        </TableCell>

                        <TableCell>
                          {u.purchased ? (
                            <Badge className="rounded-full px-2">Yes</Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="rounded-full px-2"
                            >
                              No
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className="text-sm">
                            {formatDateUTC(u.joinedAt)}
                          </span>
                        </TableCell>
                      </TableRow>

                      {/* accordion content: only one can be open at a time */}
                      {isOpen && (
                        <TableRow className="bg-muted/30">
                          {/* colSpan stays 6 because we didn't add list columns */}
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-4 py-4 border-t space-y-4">
                              {/* >>> THE TWO ROWS YOU ASKED FOR <<< */}
                              <div className="rounded-md border bg-background p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sigma className="h-4 w-4 text-primary" />
                                  <h4 className="text-sm font-medium">
                                    Fulfilled Totals
                                  </h4>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Row 1: Total Spent (fulfilled only) */}
                                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                                    <span className="text-sm text-muted-foreground">
                                      Total Spent
                                    </span>
                                    <span className="text-sm flex items-center gap-1">
                                      <Wallet className="h-3.5 w-3.5" />
                                      {tx && !tx.loading && !tx.error
                                        ? formatAmountsByCurrency(
                                            fulfilledTotals.amountsByCurrency
                                          )
                                        : "—"}
                                    </span>
                                  </div>

                                  {/* Row 2: Total Tokens (fulfilled only) */}
                                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                                    <span className="text-sm text-muted-foreground">
                                      Total Tokens
                                    </span>
                                    <span className="font-mono">
                                      {tx && !tx.loading && !tx.error
                                        ? fulfilledTotals.tokens
                                        : "—"}
                                    </span>
                                  </div>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Only transactions marked as{" "}
                                  <code className="px-1 rounded bg-muted">
                                    FULFILL
                                  </code>{" "}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 mb-2">
                                <Receipt className="h-4 w-4 text-primary" />
                                <h4 className="text-sm font-medium">
                                  Payment History
                                </h4>
                                {tx?.meta ? (
                                  <span className="text-xs text-muted-foreground">
                                    (total {tx.meta.total})
                                  </span>
                                ) : null}
                              </div>

                              {/* states */}
                              {!tx || tx.loading ? (
                                <PaymentSkeleton />
                              ) : tx.error ? (
                                <div className="text-sm text-destructive py-3">
                                  {tx.error}
                                </div>
                              ) : tx.items?.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-3">
                                  No payments found for this user.
                                </div>
                              ) : (
                                <div className="rounded-md border bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="min-w-[120px]">
                                          Date
                                        </TableHead>
                                        <TableHead>Tier</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Tokens</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead>Tx ID</TableHead>
                                        <TableHead>Fulfilled</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {tx.items.map((t) => (
                                        <TableRow key={t._id}>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <CalendarClock className="h-3.5 w-3.5" />
                                              <span className="text-sm">
                                                {formatDateTimeUTC(t.createdAt)}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {t.tierTitle || "—"}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            <div className="flex items-center gap-1">
                                              <CreditCard className="h-3.5 w-3.5" />
                                              <span>
                                                {(t.currency || "—")
                                                  .toString()
                                                  .toUpperCase()}{" "}
                                                {t.amount ?? "—"}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="font-mono text-sm">
                                            {t.tokensDelivered ??
                                              t.tokensPlanned ??
                                              "—"}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={
                                                t.fulfilled ||
                                                String(
                                                  t.state || ""
                                                ).toUpperCase() === "FULFILL"
                                                  ? "default"
                                                  : "secondary"
                                              }
                                              className="rounded-full px-2"
                                            >
                                              {t.state ||
                                                (t.fulfilled
                                                  ? "FULFILL"
                                                  : "PENDING")}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="font-mono text-xs break-all">
                                            {t.txId || "—"}
                                          </TableCell>
                                          <TableCell className="text-xs">
                                            {t.fulfilled
                                              ? `Yes • ${formatDateTimeUTC(
                                                  t.fulfilledAt
                                                )}`
                                              : "No"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}

                              {/* per-user tx pagination */}
                              {tx && tx.meta && tx.meta.totalPages > 1 ? (
                                <div className="mt-3 flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground">
                                    Showing{" "}
                                    <span className="font-medium">
                                      {tx.meta.total === 0
                                        ? 0
                                        : (tx.meta.page - 1) *
                                            tx.meta.pageSize +
                                          1}
                                      {"–"}
                                      {Math.min(
                                        tx.meta.page * tx.meta.pageSize,
                                        tx.meta.total
                                      )}
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-medium">
                                      {tx.meta.total}
                                    </span>
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        fetchTransactions(
                                          id,
                                          Math.max(1, tx.meta.page - 1)
                                        )
                                      }
                                      disabled={tx.loading || tx.meta.page <= 1}
                                    >
                                      Prev
                                    </Button>
                                    <div className="text-xs tabular-nums">
                                      {tx.meta.page} / {tx.meta.totalPages}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        fetchTransactions(
                                          id,
                                          Math.min(
                                            tx.meta.totalPages,
                                            tx.meta.page + 1
                                          )
                                        )
                                      }
                                      disabled={
                                        tx.loading ||
                                        tx.meta.page >= tx.meta.totalPages
                                      }
                                    >
                                      Next
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}

            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center">
                  <div className="text-sm text-muted-foreground">
                    No users found for your filters.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium">
            {meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1}
            {"–"}
            {Math.min(meta.page * meta.pageSize, meta.total)}
          </span>{" "}
          of <span className="font-medium">{meta.total}</span>
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={meta.page <= 1 || loading}
          >
            Prev
          </Button>
          <div className="text-sm tabular-nums">
            {meta.page} / {meta.totalPages}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={meta.page >= meta.totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
