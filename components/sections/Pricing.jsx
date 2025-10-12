"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  memo,
  useId,
} from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Wand } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPricings } from "@/lib/redux/slices/pricingSlice";
import { Skeleton } from "@/components/ui/skeleton";
import server from "@/api";
import { ShiftOutlineBtn } from "../FancyButtons";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* shadcn ui: modal & checkbox */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/* ----------------------------- format helpers ----------------------------- */
const eur = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const num = (n) => new Intl.NumberFormat(undefined).format(Number(n || 0));

/* ------------------------------- UI: Badges ------------------------------- */
const SaveBadge = memo(function SaveBadge({ text = "Save 20%" }) {
  return (
    <div
      className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-indigo-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-[0_0_0_3px_var(--tw-bg-opacity)] shadow-background ring-1 ring-white/30"
      aria-label={text}
      title={text}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      <span className="truncate max-w-[7rem] sm:max-w-[9rem]">{text}</span>
    </div>
  );
});

/* ------------------------------ UI: Skeletons ----------------------------- */
const SkeletonTierCard = memo(function SkeletonTierCard() {
  return (
    <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl">
      <SaveBadge />
      <CardHeader className="relative">
        <div className="absolute -top-3 right-4">
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-60" />
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-start gap-2">
              <Skeleton className="mt-0.5 h-4 w-4 rounded" />
              <Skeleton className="h-4 w-48" />
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="mt-auto pt-2">
        <Skeleton className="h-10 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
});

/* ------------------------ UI: Show-more feature list ----------------------- */
const FeaturesList = memo(function FeaturesList({ features = [] }) {
  const [open, setOpen] = useState(false);
  const FIRST = 5;
  const visible = open ? features : features.slice(0, FIRST);
  const extra = Math.max(0, features.length - FIRST);

  if (!features.length) {
    return <p className="text-sm text-muted-foreground">No features listed.</p>;
  }

  return (
    <>
      <ul className="space-y-2">
        {visible.map((f, idx) => (
          <li key={`${idx}-${f}`} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="block overflow-hidden break-words hyphens-auto text-sm leading-snug">
              {f}
            </span>
          </li>
        ))}
      </ul>

      {extra > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 px-2"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Show less" : `Show ${extra} more`}
        </Button>
      )}
    </>
  );
});

/* ---------------------------- UI: Purchase button ------------------------- */
const PurchaseButton = memo(function PurchaseButton({
  tier,
  busyId,
  onRequestPurchase,
}) {
  const isBusy = busyId === tier._id;

  const priceLabel = useMemo(
    () => eur.format(Number(tier.amount || 0)),
    [tier]
  );

  const onClick = useCallback(() => {
    onRequestPurchase(tier);
  }, [onRequestPurchase, tier]);

  return (
    <ShiftOutlineBtn
      className="w-full"
      disabled={isBusy}
      onClick={onClick}
      aria-label={`Purchase ${tier.title} for ${priceLabel}`}
    >
      {isBusy ? "Redirecting…" : `Buy Service`}
    </ShiftOutlineBtn>
  );
});

/* ---------------------------- UI: Tier card (memo) ------------------------ */
const TierCard = memo(function TierCard({ tier, busyId, onRequestPurchase }) {
  const headingId = useId();

  const price = useMemo(
    () => eur.format(Number(tier.amount || 0)),
    [tier.amount]
  );
  const tokensLabel = useMemo(
    () => (tier.tokens ? `${num(tier.tokens)} tokens` : null),
    [tier.tokens]
  );

  const highlighted = !!tier.highlighted;

  const showRibbon = !!tier.badge;
  const ribbonText =
    (typeof tier.badge_text === "string" && tier.badge_text.trim()) ||
    "Save 20%";

  return (
    <Card
      aria-labelledby={headingId}
      className={[
        "relative flex h-full flex-col overflow-hidden rounded-2xl transition-all",
        highlighted
          ? "border-primary/60 shadow-lg ring-1 ring-primary/20"
          : "hover:shadow-md",
      ].join(" ")}
    >
      {showRibbon && <SaveBadge text={ribbonText} />}

      <CardHeader className="relative">
        {highlighted && (
          <span className="absolute -top-3 right-4 rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            Most Popular
          </span>
        )}
        <CardTitle
          id={headingId}
          className={`line-clamp-2 ${
            showRibbon && "mt-4 "
          } break-words text-lg leading-tight sm:text-xl`}
        >
          {tier.title}
        </CardTitle>
        <CardDescription className="line-clamp-3 break-words text-sm leading-snug">
          {tier.short_description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl font-semibold sm:text-4xl">{price}</span>
            {tokensLabel && (
              <span className="text-muted-foreground">{tokensLabel}</span>
            )}
          </div>
        </div>

        <FeaturesList
          features={Array.isArray(tier.features) ? tier.features : []}
        />
      </CardContent>

      <CardFooter className="mt-auto pt-2">
        <PurchaseButton
          tier={tier}
          busyId={busyId}
          onRequestPurchase={onRequestPurchase}
        />
      </CardFooter>
    </Card>
  );
});

/* ----------------------------- Terms Modal UI ----------------------------- */
function TermsModal({
  open,
  onOpenChange,
  agreed,
  setAgreed,
  onProceed,
  busy,
  tierTitle,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Terms &amp; Conditions</DialogTitle>
          <DialogDescription>
            You must agree to the Terms &amp; Conditions before purchasing
            {tierTitle ? ` “${tierTitle}”` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex items-start gap-3">
          <Checkbox
            id="tac"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(!!v)}
            aria-describedby="tac-desc"
          />
          <Label
            htmlFor="tac"
            className="text-sm leading-snug text-muted-foreground"
          >
            I have read and agree to the{" "}
            <Link
              href="https://powersoft365.com/terms-and-conditions/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Terms and Conditions
            </Link>
            .
          </Label>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            onClick={onProceed}
            disabled={!agreed || busy}
            aria-disabled={!agreed || busy}
          >
            {busy ? "Proceeding…" : "Proceed"}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Gentle Empty UI ---------------------------- */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h3 className="text-lg font-semibold">Pricing plans are being updated</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;re refreshing our plans. Check back soon or contact us if you
        need help choosing a plan.
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Link
          href="/claim-tokens"
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
        >
          Claim Free Tokens
        </Link>
      </div>
    </div>
  );
});

/* --------------------------------- Page ---------------------------------- */
const Pricing = () => {
  const dispatch = useDispatch();
  const [busyId, setBusyId] = useState(null);

  /* modal state */
  const [termsOpen, setTermsOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  const { profile } = useSelector((s) => s.profile);
  const userId = profile?._id;

  useEffect(() => {
    dispatch(fetchPricings());
  }, [dispatch]);

  const router = useRouter();
  const { items = [], loading, error } = useSelector((state) => state.pricing);
  const isEmpty =
    !loading && !error && Array.isArray(items) && items.length === 0;

  /* open modal when user clicks Buy */
  const onRequestPurchase = useCallback((tier) => {
    setSelectedTier(tier || null);
    setAgreed(false);
    setTermsOpen(true);
  }, []);

  /* actual checkout (called from Proceed in modal) */
  const startWalleeCheckout = useCallback(
    async ({ tierId }) => {
      if (!userId) {
        router.push("/signup");
        return;
      }

      const tier = items.find((t) => t._id === tierId);
      if (!tier || !tier.amount) {
        alert(
          "This plan is unavailable right now. Please choose another plan."
        );
        return;
      }

      const res = await fetch(`${server}/api/payments/wallee/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tierId,
          amount: tier.amount,
          currency: "EUR",
        }),
        credentials: "omit",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(err);
        alert("We couldn't start the payment. Please try again in a moment.");
        return;
      }

      const { paymentPageUrl, transactionId } = await res.json();

      if (transactionId) {
        try {
          sessionStorage.setItem("lastWalleeTxId", String(transactionId));
          sessionStorage.setItem("lastWalleeSource", "pricing");
        } catch {}
      }

      if (!paymentPageUrl) {
        alert("Payment session created but URL is missing. Please try again.");
        return;
      }

      try {
        sessionStorage.setItem("suppressBeforeUnload", "1");
      } catch {}
      window.location.href = paymentPageUrl;
    },
    [userId, items, router]
  );

  /* handler for Proceed button inside the modal */
  const handleProceed = useCallback(async () => {
    if (!selectedTier || !agreed) return;
    try {
      setBusyId(selectedTier._id);
      await startWalleeCheckout({ tierId: selectedTier._id });
    } finally {
      setTermsOpen(false);
      setBusyId(null);
    }
  }, [selectedTier, agreed, startWalleeCheckout]);

  return (
    <section
      className="relative py-10 sm:py-12 lg:py-16"
      aria-labelledby="pricing-heading"
      aria-busy={loading ? "true" : "false"}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-40" />
      </div>

      <div className="mx-auto">
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
          <h2
            id="pricing-heading"
            className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
          >
            Flexible, token-based pricing
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Pay only for what you use. Stay within included tokens and scale
            affordably as you grow.
          </p>
          <div className="mt-4">
            <Link
              href="/claim-tokens"
              className="relative border border-black inline-flex items-center justify-start px-6 py-3 overflow-hidden font-medium transition-all bg-gray-100 rounded hover:bg-white group"
            >
              <span
                className="
                  w-48 h-48 rounded rotate-[-40deg] bg-purple-600
                  absolute bottom-0 left-0
                  -translate-x-full translate-y-full
                  ease-out duration-500 transition-all
                  mb-9 ml-9
                  group-hover:ml-0 group-hover:mb-32 group-hover:translate-x-0
                "
              ></span>
              <span className="relative w-full flex gap-2 text-left text-black transition-colors duration-300 ease-in-out group-hover:text-white">
                Claim Free Token <Wand />
              </span>
            </Link>
          </div>
        </header>

        {/* Loading skeleton grid */}
        {loading && (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
            role="status"
            aria-live="polite"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonTierCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="mx-auto max-w-md text-center">
            <h3 className="text-lg font-semibold">We’re updating pricing</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Something went wrong loading plans. Please try again shortly or
              contact support.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button onClick={() => dispatch(fetchPricings())}>
                Try again
              </Button>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
              >
                Contact Support
              </Link>
            </div>
          </div>
        )}

        {/* Empty state (softer) */}
        {!loading && !error && isEmpty && <EmptyState />}

        {/* Content grid */}
        {!loading && !error && !isEmpty && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {items.map((tier) => (
              <TierCard
                key={tier._id}
                tier={tier}
                busyId={busyId}
                onRequestPurchase={onRequestPurchase}
              />
            ))}
          </div>
        )}

        {/* Helper text */}
        {!loading && !error && !isEmpty && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            by clicking &apos;Buy Service&apos;, you need to accept our{" "}
            <Link
              target="_blank"
              href="https://powersoft365.com/privacy-policy/"
              className="underline"
            >
              policies and terms
            </Link>
          </p>
        )}
      </div>

      {/* Terms & Conditions Modal */}
      <TermsModal
        open={termsOpen}
        onOpenChange={setTermsOpen}
        agreed={agreed}
        setAgreed={setAgreed}
        onProceed={handleProceed}
        busy={!!(selectedTier && busyId === selectedTier._id)}
        tierTitle={selectedTier?.title}
      />
    </section>
  );
};

export default Pricing;
