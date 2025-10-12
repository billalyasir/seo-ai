"use client";
import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

/**
 * Image Pricing Calculator — Simplified
 * — Keep only: admin token settings, user payment, profit
 * — Also keep per-image costing
 * — Mobile-first, rounded values (tokens = ints, USD = 2 decimals)
 */

const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function PricingCalculator() {
  // Admin controls (minimal)
  const [admin, setAdmin] = useState({
    tokensPerUSD: 1000, // $1 buys this many tokens
    googlePerRequestUSD: 0.005, // Google's cost per request (after free tier)
    markupX: 5, // target revenue multiple of Google's cost
    tokensPerRequest: 0, // what you charge per request (tokens)
    tokensPerImage: 0, // what you charge per image (tokens)
  });

  const toNum = (v) =>
    v === "" || v === null || v === undefined ? 0 : Number(v) || 0;
  const onAdminChange = (e) =>
    setAdmin((s) => ({ ...s, [e.target.name]: toNum(e.target.value) }));

  const calc = useMemo(() => {
    const {
      tokensPerUSD,
      googlePerRequestUSD,
      markupX,
      tokensPerRequest,
      tokensPerImage,
    } = admin;

    const usdPerToken = tokensPerUSD > 0 ? 1 / tokensPerUSD : 0; // $ per token
    const tokensForGoogleRequest = Math.max(
      0,
      Math.round(tokensPerUSD * googlePerRequestUSD)
    );

    // Suggested tokens to hit target markup
    const targetUSD_perRequest = googlePerRequestUSD * (markupX || 1);
    const suggestedTokens_perRequest = Math.max(
      1,
      Math.ceil(usdPerToken > 0 ? targetUSD_perRequest / usdPerToken : 0)
    );

    // Current pricing — per request
    const userPayPerRequest_tokens = Math.max(0, Math.floor(tokensPerRequest));
    const userPayPerRequest_usd = userPayPerRequest_tokens * usdPerToken;
    const costPerRequest_usd = googlePerRequestUSD;
    const profitPerRequest_usd = userPayPerRequest_usd - costPerRequest_usd;
    const profitPerRequest_tokens =
      usdPerToken > 0 ? profitPerRequest_usd / usdPerToken : 0;
    const marginPct =
      userPayPerRequest_usd > 0
        ? (profitPerRequest_usd / userPayPerRequest_usd) * 100
        : 0;
    const realizedMarkupX =
      costPerRequest_usd > 0 ? userPayPerRequest_usd / costPerRequest_usd : 0;

    // Per image (no Google cost)
    const userPayPerImage_tokens = Math.max(0, Math.floor(tokensPerImage));
    const userPayPerImage_usd = userPayPerImage_tokens * usdPerToken;
    const profitPerImage_usd = userPayPerImage_usd; // pure margin

    return {
      usdPerToken,
      tokensForGoogleRequest,
      suggestedTokens_perRequest,
      // per-request
      userPayPerRequest_tokens,
      userPayPerRequest_usd,
      costPerRequest_usd,
      profitPerRequest_usd,
      profitPerRequest_tokens,
      marginPct,
      realizedMarkupX,
      // per-image
      userPayPerImage_tokens,
      userPayPerImage_usd,
      profitPerImage_usd,
    };
  }, [admin]);

  const applySuggested = () =>
    setAdmin((s) => ({
      ...s,
      tokensPerRequest: calc.suggestedTokens_perRequest,
    }));
  const resetDefaults = () =>
    setAdmin({
      tokensPerUSD: 1000,
      googlePerRequestUSD: 0.005,
      markupX: 5,
      tokensPerRequest: 0,
      tokensPerImage: 0,
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold tracking-tight">
          Image Pricing Calculator
        </h1>
        <div className="text-xs text-muted-foreground">
          {nf0.format(admin.tokensPerUSD)} tokens = $1 • 1 token = $
          {nf2.format(calc.usdPerToken)}
        </div>
      </div>

      {/* Admin Settings */}
      <Card className="p-5 sm:p-6 rounded-2xl space-y-4">
        <h2 className="text-sm font-semibold">Admin Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tokensPerUSD">Tokens per $1</Label>
            <Input
              id="tokensPerUSD"
              name="tokensPerUSD"
              type="number"
              min={1}
              step="1"
              value={admin.tokensPerUSD}
              onChange={onAdminChange}
              className="rounded-lg"
            />
          </div>
          <div>
            <Label htmlFor="googlePerRequestUSD">
              Google cost / request (USD)
            </Label>
            <Input
              id="googlePerRequestUSD"
              name="googlePerRequestUSD"
              type="number"
              min={0}
              step="0.0001"
              value={admin.googlePerRequestUSD}
              onChange={onAdminChange}
              className="rounded-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {nf0.format(calc.tokensForGoogleRequest)} tokens to cover Google
            </p>
          </div>
          <div>
            <Label htmlFor="markupX">Target markup ×</Label>
            <div className="flex gap-2">
              <Input
                id="markupX"
                name="markupX"
                type="number"
                min={1}
                step="0.1"
                value={admin.markupX}
                onChange={onAdminChange}
                className="rounded-lg flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={applySuggested}
              >
                Apply {calc.suggestedTokens_perRequest} tokens
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="tokensPerRequest">Charge / request (tokens)</Label>
            <Input
              id="tokensPerRequest"
              name="tokensPerRequest"
              type="number"
              min={0}
              step="1"
              value={admin.tokensPerRequest}
              onChange={onAdminChange}
              className="rounded-lg"
            />
          </div>
          <div>
            <Label htmlFor="tokensPerImage">Charge / image (tokens)</Label>
            <Input
              id="tokensPerImage"
              name="tokensPerImage"
              type="number"
              min={0}
              step="1"
              value={admin.tokensPerImage}
              onChange={onAdminChange}
              className="rounded-lg"
            />
          </div>
        </div>
      </Card>

      {/* Outputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 rounded-2xl space-y-3">
          <h3 className="font-semibold">Per Request</h3>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>User pays</span>
              <span className="font-medium">
                {nf0.format(calc.userPayPerRequest_tokens)} tokens (≈ $
                {nf2.format(calc.userPayPerRequest_usd)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Our cost (Google)</span>
              <span className="font-mono">
                ${nf2.format(calc.costPerRequest_usd)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Profit</span>
              <span className="font-mono">
                ${nf2.format(calc.profitPerRequest_usd)} (
                {nf0.format(calc.profitPerRequest_tokens)} tokens)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Markup / Margin</span>
              <span className="font-mono">
                {nf2.format(calc.realizedMarkupX)}× •{" "}
                {nf2.format(calc.marginPct)}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl space-y-3">
          <h3 className="font-semibold">Per Image</h3>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>User pays</span>
              <span className="font-medium">
                {nf0.format(calc.userPayPerImage_tokens)} tokens (≈ $
                {nf2.format(calc.userPayPerImage_usd)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Our cost</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Profit</span>
              <span className="font-mono">
                ${nf2.format(calc.profitPerImage_usd)} (all margin)
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: Set a higher markup × or increase "Charge / request (tokens)" to
        grow per-request profit while staying simple for users.
      </div>
    </div>
  );
}
