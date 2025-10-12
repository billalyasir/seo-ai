"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useId,
  useCallback,
} from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Send } from "lucide-react";
import server from "@/api";
import { ShiftOutlineBtn } from "../FancyButtons";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";

export default function FeedBackWidget() {
  const pathname = usePathname();
  const { profile, loading: profileLoading } = useSelector(
    (state) => state.profile || {}
  );

  // STATE
  const [rating, setRating] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [comment, setComment] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [loadingFeedbackStatus, setLoadingFeedbackStatus] = useState(true);

  const reduceMotion = useReducedMotion();
  const groupId = useId();
  const buttonsRef = useRef([]);

  // OPTIONS
  const options = [
    { id: 1, label: "Happy", src: "/1.png", hue: "bg-[#2caf5e]" },
    { id: 2, label: "Unhappy", src: "/2.png", hue: "bg-[#95e2b7]" },
    { id: 3, label: "Bored", src: "/3.png", hue: "bg-[#fed751]" },
    { id: 4, label: "Sad", src: "/4.png", hue: "bg-[#d72b20]" },
  ];

  const suggestionsMap = {
    1: [
      "Great overall experience",
      "Fast delivery",
      "Friendly support",
      "Easy to use",
      "High quality",
      "Would recommend",
    ],
    2: [
      "Delivery was delayed",
      "Bug encountered",
      "Unclear instructions",
      "Support wasn't helpful",
      "Performance issues",
      "Didn't meet expectations",
    ],
    3: [
      "Content felt repetitive",
      "Too many steps",
      "UI felt plain",
      "Lack of interaction",
      "Slow pacing",
      "Hard to stay engaged",
    ],
    4: [
      "Feature I needed is missing",
      "Account/Sign-in issue",
      "Payment problem",
      "App crashed",
      "Lost progress/data",
      "Other serious issue",
    ],
  };

  const activeCopy = useMemo(() => {
    if (!rating) return "How was your experience?";
    return {
      1: "Happy — what did you like most?",
      2: "Unhappy — we want to fix this",
      3: "Bored — what didn't hold your interest?",
      4: "Sad — sorry about that, what happened?",
    }[rating];
  }, [rating]);

  const toggleSuggestion = useCallback((s) => {
    setSelectedSuggestions((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }, []);

  const onPickRating = useCallback((id) => {
    setRating(id);
    setSelectedSuggestions([]);
    setError("");
  }, []);

  // Check if feedback should be shown using API only
  const checkFeedbackStatus = useCallback(async () => {
    try {
      setLoadingFeedbackStatus(true);
      const tokenLS =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!tokenLS) {
        setShowFeedback(false);
        setLoadingFeedbackStatus(false);
        return;
      }

      const res = await fetch(`${server}/api/feedback/should-show`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenLS}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setShowFeedback(data.showFeedback);
        // Reset submitted state based on API response
        setSubmitted(!data.showFeedback);
      } else {
        setShowFeedback(false);
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error checking feedback status:", error);
      setShowFeedback(false);
      setSubmitted(true);
    } finally {
      setLoadingFeedbackStatus(false);
    }
  }, []);

  // keyboard arrows within the radiogroup
  const onKeyDownGroup = useCallback((e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    e.preventDefault();
    if (!buttonsRef.current.length) return;

    const currentIndex = Math.max(
      0,
      buttonsRef.current.findIndex((el) => el === document.activeElement)
    );
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next =
      (currentIndex + delta + buttonsRef.current.length) %
      buttonsRef.current.length;
    const nextBtn = buttonsRef.current[next];
    if (nextBtn) nextBtn.focus();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!rating) {
      toast.error("Please choose a mood first.", {
        style: { background: "#fee2e2", color: "#b91c1c" },
      });
      return;
    }
    if (comment.trim().length === 0 && selectedSuggestions.length === 0) {
      toast.error("Please add a quick note or pick at least one suggestion.", {
        style: { background: "#fee2e2", color: "#b91c1c" },
      });
      return;
    }

    setSubmitting(true);

    const statusMap = { 1: "happy", 2: "unhappy", 3: "bored", 4: "sad" };
    const payload = {
      status: statusMap[rating],
      comment: comment.trim(),
      suggested_review: selectedSuggestions,
      url: pathname || "",
    };

    try {
      const tokenLS =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`${server}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenLS ? { Authorization: `Bearer ${tokenLS}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to submit feedback");
      }

      setSubmitted(true);
      setSubmitting(false);
      setShowFeedback(false); // Hide widget after successful submission

      toast.success("Feedback submitted, thank you!", {
        style: { background: "#d1fae5", color: "#065f46" },
      });

      // No localStorage usage - rely only on API for status checking
    } catch (err) {
      setSubmitting(false);
      toast.error(err.message || "Something went wrong.", {
        style: { background: "#fee2e2", color: "#b91c1c" },
      });
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tokenLS = localStorage.getItem("token") || "";
    setToken(tokenLS);

    // Check feedback status when token or pathname changes
    if (tokenLS) {
      checkFeedbackStatus();
    } else {
      setShowFeedback(false);
      setLoadingFeedbackStatus(false);
      setSubmitted(false);
    }
  }, [pathname, checkFeedbackStatus]);

  // Don't show anything while loading
  if (loadingFeedbackStatus) {
    return null;
  }

  // Don't show widget if API says not to show feedback
  if (!showFeedback) {
    return null;
  }

  // Additional safety checks
  const shouldHideForAuth =
    !token && !profile && !profileLoading && pathname !== "/";
  if (shouldHideForAuth) return null;

  // Don't show if already submitted (handled by API, but extra safety)
  if (submitted) {
    return null;
  }

  // motion helpers
  const reduce = reduceMotion;
  const hoverScale = reduce ? 1 : 1.08;
  const tapScale = reduce ? 1 : 0.95;
  const jiggleAnim = reduce
    ? { scale: 1, y: 0 }
    : { scale: [1, 1.05, 1], y: [0, -4, 0] };

  // Conditional scroll styles
  const contentStyle = rating
    ? {
        maxHeight: "85vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
      }
    : {};

  return (
    <div
      className="mx-auto w-full"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <Card className="relative overflow-visible border border-border/60 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-neutral-900/60">
        {/* Ambient halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-[radial-gradient(ellipse_at_center,theme(colors.cyan.500/.18),transparent_60%)] blur-2xl"
        />

        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-2xl font-semibold tracking-tight">
              Share your feedback
            </CardTitle>
            {rating && (
              <Badge variant="secondary" className="animate-in fade-in">
                Selected: {options.find((o) => o.id === rating)?.label}
              </Badge>
            )}
          </div>
        </CardHeader>

        <div className="relative z-10 max-h-full sm:max-h-full md:max-h-full">
          <CardContent className="relative" style={contentStyle}>
            {/* Faces (radiogroup) */}
            <div
              role="radiogroup"
              aria-labelledby={`${groupId}-label`}
              onKeyDown={onKeyDownGroup}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
            >
              <span id={`${groupId}-label`} className="sr-only">
                Choose your mood
              </span>

              {options.map((opt, idx) => {
                const isActive = rating === opt.id;
                const isHover = hovered === opt.id;
                const isDimmed = rating !== null && rating !== opt.id;

                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    ref={(el) => (buttonsRef.current[idx] = el)}
                    onClick={() => onPickRating(opt.id)}
                    onMouseEnter={() => setHovered(opt.id)}
                    onMouseLeave={() => setHovered(null)}
                    whileHover={{ scale: hoverScale }}
                    whileTap={{ scale: tapScale }}
                    className={[
                      "group relative flex aspect-square w-full items-center justify-center rounded-2xl border bg-gradient-to-b p-2 sm:p-3 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      isActive
                        ? "border-black/10 dark:border-white/10 shadow-lg"
                        : "border-black/5 dark:border-white/5",
                    ].join(" ")}
                    role="radio"
                    aria-checked={isActive}
                    aria-label={opt.label}
                  >
                    {/* Glow */}
                    <motion.div
                      className={`absolute inset-0 -z-10 rounded-2xl ${opt.hue}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isActive || isHover ? 0.45 : 0 }}
                      transition={{ duration: reduce ? 0 : 0.25 }}
                      aria-hidden
                    />

                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                      <motion.div
                        animate={isActive ? jiggleAnim : { scale: 1, y: 0 }}
                        transition={{
                          duration: isActive && !reduce ? 2 : 0.25,
                          repeat: isActive && !reduce ? Infinity : 0,
                        }}
                      >
                        <Image
                          src={opt.src}
                          alt={opt.label}
                          width={180}
                          height={180}
                          sizes="(max-width: 480px) 96px, (max-width: 640px) 120px, 140px"
                          className={[
                            "h-24 w-24 xs:h-28 xs:w-28 sm:h-52 sm:w-52 select-none object-contain transition-all",
                            "bg-transparent mix-blend-multiply dark:mix-blend-screen",
                            "filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.15)]",
                            isActive
                              ? "ring-4 ring-black/10 dark:ring-white/10"
                              : "",
                            isDimmed ? "grayscale opacity-60" : "",
                          ].join(" ")}
                          style={{
                            backgroundColor: "transparent",
                            WebkitMaskImage:
                              "radial-gradient(circle, black 95%, transparent 100%)",
                            maskImage:
                              "radial-gradient(circle, black 95%, transparent 100%)",
                          }}
                          priority={false}
                        />
                      </motion.div>
                      <span
                        className={`text-xs sm:text-sm font-medium ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Suggestions + form */}
            <AnimatePresence>
              {rating && !submitted && (
                <motion.div
                  initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : 12 }}
                  className="mt-5 sm:mt-6"
                >
                  <div className="mb-3">
                    <p className="text-sm font-medium">
                      Suggested review (
                      {options.find((o) => o.id === rating)?.label}):
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestionsMap[rating].map((s) => {
                        const active = selectedSuggestions.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSuggestion(s)}
                            disabled={submitting}
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                              active
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : "bg-white/70 text-foreground border-border hover:bg-muted"
                            }`}
                            aria-pressed={active}
                          >
                            {active && <Check className="h-3.5 w-3.5" />}
                            <span>{s}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <Textarea
                      value={comment}
                      onChange={(e) =>
                        setComment(e.target.value.slice(0, 1000))
                      }
                      placeholder={activeCopy}
                      aria-label="Your feedback"
                      disabled={submitting}
                      className="min-h-[96px] sm:min-h-[120px] resize-y rounded-xl border-muted/40 bg-white/70 backdrop-blur placeholder:text-muted-foreground focus-visible:ring-2"
                    />
                    {!!error && (
                      <div className="text-xs text-rose-600">{error}</div>
                    )}
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-muted-foreground">
                        We only use this to improve your experience.
                      </div>
                      <ShiftOutlineBtn
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl px-5 self-end sm:self-auto"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {submitting ? "Sending..." : "Send feedback"}
                      </ShiftOutlineBtn>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          {/* Success footer */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10"
              >
                <CardFooter className="flex flex-col items-center gap-3 py-6 sm:py-8">
                  <div className="text-center">
                    <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-emerald-500/90 p-2 text-white shadow">
                      <Check className="h-6 w-6" />
                    </div>
                    <p className="text-base sm:text-lg font-medium">
                      Thanks for the feedback!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      We appreciate you taking the time.
                    </p>
                  </div>
                </CardFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
