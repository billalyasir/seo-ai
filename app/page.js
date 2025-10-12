"use client";

import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileSpreadsheet,
  Images,
  Sparkles,
  Download,
  ShieldCheck,
  Globe,
  Zap,
  Wand2,
  Key,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import Pricing from "@/components/sections/Pricing";
import VideoModal from "@/components/sections/VideoModal";
import { useSelector } from "react-redux";
import Link from "next/link";
import FeedBackWidget from "@/components/sections/FeedBack";
import { toast } from "sonner";
import ActiveFeedbackCarousel from "@/components/sections/ActiveFeedBack";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ---------- Small helpers ----------
const Fade = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);

const Feature = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start gap-3">
    <div className="p-2 rounded-xl bg-muted">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <div className="font-medium">{title}</div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  </div>
);

/**
 * Step
 * - Click image to open modal
 * - Modal has DialogTitle + DialogDescription (fixes a11y error)
 * - Prev/Next buttons to navigate across steps
 * - Content area is max-h and overflow-y-auto for good alignment on small screens
 *
 * Props:
 *  n, title, desc, img, imgAlt, className
 *  steps        -> array of all steps [{ n, title, desc, img, imgAlt }]
 *  stepIndex    -> index of this step inside steps
 */
const Step = ({
  n = 1,
  title = "",
  desc = "",
  img,
  imgAlt,
  className = "",
  steps = [],
  stepIndex = 0,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(stepIndex);

  // keep local active step in sync whenever this card opens
  const openWithIndex = useCallback(() => {
    setActiveIndex(stepIndex);
    setOpen(true);
  }, [stepIndex]);

  const current = useMemo(() => {
    if (Array.isArray(steps) && steps.length > 0) {
      return steps[(activeIndex + steps.length) % steps.length];
    }
    // fallback to self
    return { n, title, desc, img, imgAlt };
  }, [activeIndex, steps, n, title, desc, img, imgAlt]);

  const goNext = useCallback(() => {
    if (!steps?.length) return;
    setActiveIndex((i) => (i + 1) % steps.length);
  }, [steps]);

  const goPrev = useCallback(() => {
    if (!steps?.length) return;
    setActiveIndex((i) => (i - 1 + steps.length) % steps.length);
  }, [steps]);

  // keyboard nav inside modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goNext, goPrev]);

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      ].join(" ")}
    >
      {/* Media */}
      <div className="relative w-full">
        {img ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label={`Open image for ${title || "step"}`}
                className="relative w-full pt-[56.25%] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={openWithIndex}
              >
                <Image
                  src={img}
                  alt={imgAlt || title || "step"}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </button>
            </DialogTrigger>

            {/* overflow-y-auto + max height keep things aligned on small screens */}
            <DialogContent className="sm:max-w-[980px] max-h-[85vh] overflow-y-auto">
              {/* A11y: Title + Description are required by Radix */}
              <DialogTitle className="text-base font-semibold">
                {current.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {current.desc}
              </DialogDescription>

              <div className="relative mt-2">
                <div className="relative w-full rounded-lg overflow-hidden">
                  <Image
                    src={current.img}
                    alt={current.imgAlt || current.title || "step preview"}
                    width={1600}
                    height={900}
                    className="w-full h-auto"
                    priority={false}
                  />
                </div>

                {/* Prev / Next controls */}
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous step image"
                  className="absolute top-1/2 -translate-y-1/2 left-2 sm:left-3 grid place-items-center rounded-full border bg-background/80 backdrop-blur hover:bg-background shadow p-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next step image"
                  className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-3 grid place-items-center rounded-full border bg-background/80 backdrop-blur hover:bg-background shadow p-2"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-background/80 border shadow">
                  {current.n} / {steps?.length || 1}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="relative w-full pt-[56.25%] grid place-items-center bg-muted/40">
            <Images className="h-8 w-8 opacity-60" />
          </div>
        )}
      </div>

      <div className="flex gap-3 p-4 sm:p-5">
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">
          {n}
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  );
};

// Centralized smooth-scroll helper that accepts a ref or an element id
function smoothScrollTo(target) {
  if (target && typeof target === "object" && target.current) {
    target.current.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  if (typeof target === "string") {
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    }
  }
  return false;
}

export default function HomePage() {
  const workbenchRef = useRef(null);
  const pricingRef = useRef(null);

  // token slice
  const { token, loading: tokenLoading } = useSelector(
    (state) => state?.my_token_info || { token: null, loading: true }
  );

  // profile slice
  const { profile, loading: profileLoading } = useSelector(
    (state) => state?.profile || { profile: null, loading: true }
  );

  const availableTokens =
    typeof token?.available_tokens === "number" ? token.available_tokens : 0;

  const scrollToWorkbench = () => {
    smoothScrollTo(workbenchRef);
  };

  // ---- tiny data array to pass into Step only (everything else unchanged) ----
  const steps = useMemo(
    () => [
      {
        n: 1,
        title: "Upload your catalog CSV",
        desc: "We preserve IDs and structure so everything stays aligned.",
        img: "/s-1.png",
        imgAlt: "Upload CSV screenshot",
      },
      {
        n: 2,
        title: "Select SEO or Images",
        desc: "Map source fields to targets and switch modes anytime.",
        img: "/s-2.png",
        imgAlt: "Select SEO or Images screenshot",
      },
      {
        n: 3,
        title: "Export ready-to-import files",
        desc: "Download clean CSVs for SEO content and image links.",
        img: "/s-3.png",
        imgAlt: "Export CSV screenshot",
      },
    ],
    []
  );

  return (
    <div className="bg-gradient-to-b from-background via-background to-background">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center contents-center justify-center overflow-hidden">
        <div>
          <Fade>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur py-1 text-xs text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                Convert your product catalog into SEO content & images — with
                zero manual effort
              </span>
            </div>
          </Fade>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mt-6">
            <Fade delay={0.05}>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
                  Create SEO titles, descriptions & product images for your
                  catalog — in seconds
                </h1>
                <p className="mt-4 text-muted-foreground max-w-xl">
                  Just upload your product CSV, choose whether to generate SEO,
                  images or both, and export polished files. Built for
                  operations teams and merchants who want scale without the
                  headaches.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {!profileLoading && !profile ? (
                    <Link
                      className="relative inline-block text-lg group"
                      href="/signup?fallback=scrollToWorkbench"
                    >
                      <span className="relative z-10 block px-5 py-3 overflow-hidden font-medium leading-tight text-gray-800 transition-colors duration-300 ease-out border-2 border-gray-900 rounded-lg group-hover:text-white">
                        <span className="absolute inset-0 w-full h-full px-5 py-3 rounded-lg bg-gray-50"></span>
                        <span className="absolute left-0 w-48 h-48 -ml-2 transition-all duration-300 origin-top-right -rotate-90 -translate-x-full translate-y-12 bg-gray-900 group-hover:-rotate-180 ease"></span>
                        <span className="relative flex items-center gap-2">
                          Get Started <Key />
                        </span>
                      </span>
                      <span className="absolute bottom-0 right-0 w-full h-12 -mb-1 -mr-1 transition-all duration-200 ease-linear bg-gray-900 rounded-lg group-hover:mb-0 group-hover:mr-0"></span>
                    </Link>
                  ) : (
                    <Link
                      href="/upload"
                      className="relative cursor-pointer inline-block text-lg group"
                      onClick={(e) => {
                        if (!tokenLoading && availableTokens === 0) {
                          e.preventDefault();
                          toast.error(
                            "You have no tokens available. Please upgrade your plan.",
                            {
                              style: {
                                background: "#fee2e2",
                                color: "#b91c1c",
                              },
                              duration: 5000,
                            }
                          );
                          requestAnimationFrame(() => {
                            smoothScrollTo(pricingRef) ||
                              smoothScrollTo("pricing");
                          });
                        }
                      }}
                    >
                      <span className="relative z-10 block px-5 py-3 overflow-hidden font-medium leading-tight text-gray-800 transition-colors duration-300 ease-out border-2 border-gray-900 rounded-lg group-hover:text-white">
                        <span className="absolute inset-0 w-full h-full px-5 py-3 rounded-lg bg-gray-50"></span>
                        <span className="absolute left-0 w-48 h-48 -ml-2 transition-all duration-300 origin-top-right -rotate-90 -translate-x-full translate-y-12 bg-gray-900 group-hover:-rotate-180 ease"></span>
                        <span className="relative">Upload CSV</span>
                      </span>
                      <span className="absolute bottom-0 right-0 w-full h-12 -mb-1 -mr-1 transition-all duration-200 ease-linear bg-gray-900 rounded-lg group-hover:mb-0 group-hover:mr-0"></span>
                    </Link>
                  )}

                  <VideoModal />

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />{" "}
                    <span>
                      <strong>Your data stays local</strong> — never sent to our
                      servers
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1"
                  >
                    <Zap className="h-3 w-3" /> Bulk actions
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" /> English & Greek support
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1"
                  >
                    <Wand2 className="h-3 w-3" /> Template-driven SEO
                  </Badge>
                </div>
              </div>
            </Fade>

            <Fade delay={0.1}>
              <Card className="shadow-lg border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">What can it do?</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <Feature
                    icon={FileSpreadsheet}
                    title="CSV in, structure preserved"
                    desc="Upload your catalog CSV — IDs, barcodes and columns remain intact."
                  />
                  <Feature
                    icon={Images}
                    title="Bulk image mapping"
                    desc="Find relevant product images at scale and export a clean mapping."
                  />
                  <Feature
                    icon={Sparkles}
                    title="SEO content in one pass"
                    desc="Generate titles, short blurbs and long descriptions from chosen fields."
                  />
                  <Feature
                    icon={Download}
                    title="Ready-to-import exports"
                    desc="Download SEO and image CSVs that fit straight into your system."
                  />
                </CardContent>
              </Card>
            </Fade>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto py-8 lg:py-12">
        <div className="grid lg:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <Step
              key={s.n}
              n={s.n}
              title={s.title}
              desc={s.desc}
              img={s.img}
              imgAlt={s.imgAlt}
              steps={steps}
              stepIndex={i}
            />
          ))}
        </div>
      </section>

      <Separator className="container mb-6 mx-auto" />

      <ActiveFeedbackCarousel />

      {/* FAQ / Footer */}
      <section className="mx-auto pb-16">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                What CSV format do you expect?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ensure your CSV includes a stable{" "}
              <span className="font-medium">ID</span> column (e.g.{" "}
              <span className="font-medium">itemCode</span>,{" "}
              <span className="font-medium">SKU</span>,{" "}
              <span className="font-medium">barcode</span>) plus any other
              fields you want mapped (e.g.{" "}
              <span className="font-medium">title</span>,{" "}
              <span className="font-medium">description</span>). Headers are
              required.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                100% - money back guarantee!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              If application shows as not working or you are unsatisfied with
              the results, contact us and we will refund you in full, no
              questions asked.
            </CardContent>
          </Card>
        </div>

        {/* Only show feedback widget when user has a profile */}
        <div className={`mt-4 ${!profileLoading && !profile ? "hidden" : ""}`}>
          <FeedBackWidget />
        </div>

        {/* Pricing is always visible, keep id for anchor & ref for smooth scroll */}
        <div id="pricing" ref={pricingRef}>
          <Pricing />
        </div>
      </section>
    </div>
  );
}
