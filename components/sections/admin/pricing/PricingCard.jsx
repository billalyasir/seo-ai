"use client";
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPricings,
  createPricing,
  updatePricing,
  deletePricing,
} from "@/lib/redux/slices/pricingSlice";

// shadcn/ui components (adjust import paths to your setup)
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, Plus, Pencil, Trash2, Sparkles } from "lucide-react";

/* ------------------------------ utilities ------------------------------ */
const eur = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const num = (n) => new Intl.NumberFormat(undefined).format(Number(n || 0));

/* ------------------------------ Save Ribbon ------------------------------ */
const SaveRibbon = ({ text = "Save 20%" }) => (
  <div
    className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-indigo-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-[0_0_0_3px_var(--tw-bg-opacity)] shadow-background ring-1 ring-white/30"
    title={text}
    aria-label={text}
  >
    <Sparkles className="h-3 w-3" aria-hidden />
    <span className="truncate max-w-[6.5rem] sm:max-w-[8rem]">{text}</span>
  </div>
);

/* --------------------------- FeatureEditor --------------------------- */
/** Exposes `commitPending()` so the parent can include the last typed feature
 * even if the user didn't click + or press Enter. */
const FeatureEditor = forwardRef(function FeatureEditor(
  { features, onChange },
  ref
) {
  const [featureInput, setFeatureInput] = useState("");

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f) return features;
    if (!features.includes(f)) {
      const next = [...(features || []), f];
      onChange(next);
      setFeatureInput("");
      return next;
    }
    setFeatureInput("");
    return features;
  };

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addFeature();
    }
  };

  const removeFeature = (f) => {
    onChange(features.filter((x) => x !== f));
  };

  useImperativeHandle(ref, () => ({
    commitPending: () => addFeature(),
  }));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Add a feature and press Enter…"
          value={featureInput}
          onChange={(e) => setFeatureInput(e.target.value)}
          onKeyDown={handleKey}
          className="w-full min-w-0"
        />
        <Button type="button" onClick={addFeature} aria-label="Add feature">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Make the chip row scrollable on small screens to avoid layout breaks */}
      <div className="flex max-w-full flex-wrap gap-2 overflow-x-auto">
        {(features || []).map((f) => (
          <span key={f} className="inline-flex max-w-full items-center">
            <Badge
              variant="secondary"
              className="inline-flex max-w-full items-center gap-1 py-1 pl-2 pr-1 text-xs font-medium whitespace-nowrap overflow-hidden rounded-md"
              title={f}
            >
              {/* Truncate long feature text so it never grows the container */}
              <span className="truncate max-w-[10rem] sm:max-w-[14rem] md:max-w-[16rem]">
                {f}
              </span>
              <button
                type="button"
                className="-mr-1 ml-1 shrink-0 rounded px-1 opacity-70 hover:bg-muted hover:opacity-100"
                onClick={() => removeFeature(f)}
                aria-label={`Remove ${f}`}
              >
                ×
              </button>
            </Badge>
          </span>
        ))}
        {(!features || features.length === 0) && (
          <span className="text-xs text-muted-foreground">No features yet</span>
        )}
      </div>
    </div>
  );
});

/* ------------------------- PricingFormDialog ------------------------- */
function PricingFormDialog({
  trigger,
  initial,
  open,
  onOpenChange,
  onSubmit,
  submitLabel = "Save",
  submitting = false,
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [desc, setDesc] = useState(initial?.short_description || "");
  const [tokens, setTokens] = useState(
    initial?.tokens != null ? String(initial.tokens) : ""
  );
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : ""
  );
  const [features, setFeatures] = useState(initial?.features || []);
  const [badge, setBadge] = useState(initial?.badge || false);
  const [badgeText, setBadgeText] = useState(initial?.badge_text || "");
  const [errors, setErrors] = useState({});

  const featureRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || "");
      setDesc(initial?.short_description || "");
      setTokens(initial?.tokens != null ? String(initial.tokens) : "");
      setAmount(initial?.amount != null ? String(initial.amount) : "");
      setFeatures(initial?.features || []);
      setBadge(initial?.badge || false);
      setBadgeText(initial?.badge_text || "");
      setErrors({});
    }
  }, [open, initial]);

  const validate = (nextFeatures) => {
    const e = {};
    if (!title.trim()) e.title = "Title is required";
    if (!desc.trim()) e.desc = "Description is required";
    const t = Number(tokens);
    if (!tokens || Number.isNaN(t) || t <= 0) e.tokens = "Tokens must be > 0";
    const a = Number(amount);
    if (amount === "" || Number.isNaN(a) || a < 0)
      e.amount = "Amount must be ≥ 0";
    if (!nextFeatures || nextFeatures.length === 0)
      e.features = "Add at least one feature (you can refine later)";
    if (badge && !badgeText.trim())
      e.badgeText = "Badge text is required when badge is enabled";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // include last typed feature even if + wasn't clicked
    const committed = featureRef.current?.commitPending
      ? featureRef.current.commitPending()
      : null;
    const nextFeatures = committed || features;

    if (!validate(nextFeatures)) return;

    onSubmit({
      title: title.trim(),
      short_description: desc.trim(),
      tokens: Number(tokens),
      amount: Number(amount),
      features: nextFeatures,
      badge,
      badge_text: badge ? badgeText.trim() : "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      {/* Responsive dialog width with no horizontal scroll */}
      <DialogContent className="w-[92vw] sm:max-w-[640px] p-0">
        <div className="max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="break-words">
              {initial ? "Edit pricing" : "Create pricing"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Set the plan name, price, token allowance, and feature list.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Starter, Pro, Enterprise"
                className="w-full min-w-0"
              />
              {errors.title && (
                <p className="text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Short description</Label>
              <Textarea
                id="desc"
                rows={3}
                value={desc}
                maxLength={400}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="One-liner that sells the plan"
                className="w-full min-w-0 break-words"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              />
              {errors.desc && (
                <p className="text-xs text-red-600">{errors.desc}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="amount">Price (EUR)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 9.99"
                />
                {errors.amount && (
                  <p className="text-xs text-red-600">{errors.amount}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tokens">Tokens</Label>
                <Input
                  id="tokens"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={tokens}
                  onChange={(e) => setTokens(e.target.value)}
                  placeholder="e.g., 10000"
                />
                {errors.tokens && (
                  <p className="text-xs text-red-600">{errors.tokens}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Features</Label>
              <FeatureEditor
                ref={featureRef}
                features={features}
                onChange={setFeatures}
              />
              {errors.features && (
                <p className="text-xs text-red-600">{errors.features}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Badge</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="badge"
                  checked={badge}
                  onCheckedChange={(v) => {
                    const next = !!v;
                    setBadge(next);
                    if (next && !badgeText) setBadgeText("Save 20%");
                  }}
                />
                <label
                  htmlFor="badge"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable badge
                </label>
              </div>
              {badge && (
                <Input
                  id="badge_text"
                  value={badgeText}
                  maxLength={50}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g., Save 20%"
                  className="w-full min-w-0"
                />
              )}
              {errors.badgeText && (
                <p className="text-xs text-red-600">{errors.badgeText}</p>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ SkeletonCard ------------------------------ */
function SkeletonCard() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border p-4 animate-pulse">
      <div className="h-5 w-40 rounded bg-muted" />
      <div className="mt-2 h-4 w-64 rounded bg-muted" />
      <Separator className="my-4" />
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded bg-muted" />
        <div className="h-6 w-24 rounded bg-muted" />
      </div>
      <div className="mt-auto pt-4">
        <div className="h-9 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

/* ------------------------------ Main Component ------------------------------ */
export default function PricingManager() {
  const dispatch = useDispatch();
  const { items, loading, error, creating, updatingById, deletingById } =
    useSelector((s) => s.pricing);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const submittingEdit = editingItem ? !!updatingById[editingItem._id] : false;

  useEffect(() => {
    dispatch(fetchPricings());
  }, [dispatch]);

  const onCreate = async (payload) => {
    try {
      await dispatch(createPricing(payload)).unwrap();
      setCreateOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const onEdit = async (payload) => {
    if (!editingItem?._id) return;
    try {
      await dispatch(
        updatePricing({ id: editingItem._id, updates: payload })
      ).unwrap();
      setEditOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await dispatch(deletePricing(id)).unwrap();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section>
      <div>
        {/* Header */}
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pricing Plans
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, edit, or remove plans. This UI is ready for a
              billion-dollar glow-up.
            </p>
          </div>

          {/* Create dialog */}
          <PricingFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={onCreate}
            submitLabel={creating ? "Creating…" : "Create"}
            submitting={creating}
            trigger={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Plan
              </Button>
            }
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30">
            {String(error)}
          </div>
        )}

        {/* Loading skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Empty state */}
            {!items || items.length === 0 ? (
              <div className="rounded-xl border p-8 text-center">
                <p className="mb-4 text-sm text-muted-foreground">
                  No pricing plans yet. Create your first one.
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Pricing
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((tier) => {
                  const isDeleting = !!deletingById[tier._id];
                  const isUpdating = !!updatingById[tier._id];
                  const ribbonText =
                    (tier.badge && (tier.badge_text || "Save 20%")) || null;

                  return (
                    <Card
                      key={tier._id}
                      className="relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow"
                    >
                      {/* Non-intrusive badge ribbon (doesn't affect layout width) */}
                      {ribbonText && <SaveRibbon text={ribbonText} />}

                      <CardHeader
                        className={`rounded-t-2xl ${ribbonText && "mt-4"}`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <CardTitle className="min-w-0 truncate text-lg sm:text-xl">
                            {tier.title}
                          </CardTitle>
                          {/* Keep inline badge if you still want it — but make it safe */}
                        </div>
                        <CardDescription className="break-words">
                          <span
                            className="whitespace-pre-wrap"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                              hyphens: "auto",
                            }}
                          >
                            {tier.short_description}
                          </span>
                        </CardDescription>
                      </CardHeader>

                      {/* grow so footer sits at bottom */}
                      <CardContent className="min-w-0 flex-1">
                        <div className="mb-3 mt-2 flex flex-wrap items-baseline gap-2">
                          <span className="text-3xl font-semibold">
                            {eur.format(tier.amount)}
                          </span>
                          <span className="text-muted-foreground">
                            · {num(tier.tokens)} tokens
                          </span>
                        </div>

                        <Separator className="my-3" />

                        <ul className="space-y-2">
                          {(tier.features || []).map((f, idx) => (
                            <li
                              key={`${tier._id}-${idx}`}
                              className="flex items-start gap-2"
                            >
                              <Check
                                className="mt-0.5 h-4 w-4 shrink-0"
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                {/* Use break-words + hyphens to avoid exploding width */}
                                <span className="block overflow-hidden text-sm leading-snug break-words hyphens-auto">
                                  {f}
                                </span>
                              </div>
                            </li>
                          ))}
                          {(!tier.features || tier.features.length === 0) && (
                            <li className="text-sm text-muted-foreground">
                              No features listed
                            </li>
                          )}
                        </ul>
                      </CardContent>

                      {/* footer pinned to bottom of card */}
                      <CardFooter className="mt-auto flex flex-wrap justify-end gap-2">
                        {/* Edit */}
                        <PricingFormDialog
                          open={editOpen && editingItem?._id === tier._id}
                          onOpenChange={(o) => {
                            setEditOpen(o);
                            if (!o) setEditingItem(null);
                          }}
                          initial={
                            editingItem?._id === tier._id ? editingItem : tier
                          }
                          onSubmit={onEdit}
                          submitLabel="Save changes"
                          submitting={submittingEdit}
                          trigger={
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingItem(tier);
                                setEditOpen(true);
                              }}
                              disabled={isUpdating}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {isUpdating ? "Updating…" : "Edit"}
                            </Button>
                          }
                        />

                        {/* Delete */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeleting}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {isDeleting ? "Deleting…" : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="break-words">
                                Delete “{tier.title}”?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the pricing plan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => confirmDelete(tier._id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
