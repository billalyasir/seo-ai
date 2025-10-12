"use client";

/**
 * ActiveFeedbackTestimonials
 * Public, mobile-first testimonial carousel (shadcn + Tailwind).
 *
 * ✅ Uses Redux state: `state.feedbackActive`
 * ✅ Autoplays on a timer; PERMANENTLY STOPS after user interaction (arrow, key, drag)
 * ✅ Keyboard (←/→), hover-pause, offscreen-pause (IntersectionObserver)
 * ✅ Drag/swipe to change slides with springy motion
 * ✅ Respects `prefers-reduced-motion`
 * ✅ Comment bubble only when present; otherwise just suggested tags
 * ✅ Arrows are POSITION-LOCKED:
 *    - Mobile (<md): inline below content
 *    - Desktop (md+): overlaid bottom-center
 * ✅ If Redux returns empty array, render `null`
 * ✅ Arrows render only when there’s more than one slide
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/* -------------------------------------------
   STATUS -> IMAGE mapping
-------------------------------------------- */
const STATUS_IMG = {
  happy: "/1.png",
  unhappy: "/2.png",
  bored: "/3.png",
  sad: "/4.png",
};

/* -------------------------------------------
   Helpers
-------------------------------------------- */
function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatRelative(date) {
  try {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

const randomRotate = () => Math.floor(Math.random() * 21) - 10;

/* Positive modulo for robust wraparound */
function mod(n, m) {
  return ((n % m) + m) % m;
}

/* -------------------------------------------
   Component
-------------------------------------------- */
export default function ActiveFeedbackTestimonials({
  autoplayInitial = true,
  intervalMs = 5000,
  className,
  headingBadge = "Testimonials",
  headingTitle = "What our customers say",
  headingSubtitle = "Real stories from people who use our product every day.",
}) {
  // ✅ Get feedback from Redux
  const { feedback, loading, error } = useSelector(
    (state) => state.feedbackActive || {}
  );

  const [active, setActive] = useState(0);

  // autoplay + control refs
  const [autoplay, setAutoplay] = useState(Boolean(autoplayInitial));
  const intervalRef = useRef(null);
  const rootRef = useRef(null);
  const isVisibleRef = useRef(true);
  const isHoveringRef = useRef(false);
  const reducedMotion = useReducedMotion();

  // refs for stable handlers
  const handleNavigateRef = useRef(null);

  // Transform Redux feedback into UI shape
  const testimonials = useMemo(() => {
    if (!Array.isArray(feedback)) return [];
    return feedback.map((fb) => {
      const statusKey = (fb?.status || "").toLowerCase();
      const src = STATUS_IMG[statusKey] || "/3.png";
      const name = fb?.user?.name || fb?.user?.username || "Anonymous";
      const designation = `${capitalize(fb?.status || "User")} • ${
        fb?.createdAt ? formatRelative(fb.createdAt) : ""
      }`.trim();
      const comment = (fb?.comment || "").trim();
      const tags = Array.isArray(fb?.suggested_review)
        ? fb.suggested_review
        : [];
      return { src, name, designation, comment, tags };
    });
  }, [feedback]);

  const total = testimonials.length;

  // --------- Interval handling ----------
  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    if (
      !autoplay ||
      total <= 1 ||
      reducedMotion ||
      isHoveringRef.current ||
      !isVisibleRef.current
    ) {
      return;
    }
    intervalRef.current = setInterval(() => {
      setActive((prev) => mod(prev + 1, total));
    }, intervalMs);
  }, [autoplay, intervalMs, reducedMotion, stopInterval, total]);

  useEffect(() => {
    startInterval();
    return stopInterval;
  }, [startInterval, stopInterval]);

  // Pause when offscreen (IntersectionObserver)
  useEffect(() => {
    if (
      !rootRef.current ||
      typeof window === "undefined" ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisibleRef.current = entry?.isIntersecting ?? true;
        startInterval();
      },
      { threshold: 0.2 }
    );
    obs.observe(rootRef.current);
    return () => {
      obs.disconnect();
    };
  }, [startInterval]);

  // Hover pause/resume
  const onMouseEnter = () => {
    isHoveringRef.current = true;
    stopInterval();
  };
  const onMouseLeave = () => {
    isHoveringRef.current = false;
    startInterval();
  };

  // Centralized navigate (also used by drag & keys)
  const handleUserNavigate = useCallback(
    (dir) => {
      if (total <= 1) return;
      if (autoplay) {
        setAutoplay(false);
        stopInterval();
      }
      setActive((prev) =>
        dir === "next" ? mod(prev + 1, total) : mod(prev - 1, total)
      );
    },
    [autoplay, total, stopInterval]
  );
  handleNavigateRef.current = handleUserNavigate;

  const onNext = () => handleUserNavigate("next");
  const onPrev = () => handleUserNavigate("prev");

  // Keyboard navigation (←/→)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") {
        handleNavigateRef.current && handleNavigateRef.current("prev");
      } else if (e.key === "ArrowRight") {
        handleNavigateRef.current && handleNavigateRef.current("next");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Drag/swipe thresholds
  const DRAG_OFFSET_THRESHOLD = 60;
  const DRAG_VELOCITY_THRESHOLD = 500;

  /* ---------------- RENDER STATES ---------------- */

  if (loading) {
    return null;
  }

  if (error) {
    return null;
  }

  if (total === 0) return null;

  /* ---------------- MAIN UI ---------------- */
  return (
    <section
      ref={rootRef}
      className={cn("relative mb-12", className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="region"
      aria-roledescription="carousel"
      aria-label="User testimonials"
    >
      {/* ---- Heading block ---- */}
      <Header
        badge={headingBadge}
        title={headingTitle}
        subtitle={headingSubtitle}
      />

      <div className="mt-8 grid m-auto max-sm:max-w-[250px] grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Left: animated image */}
        <div className="order-2 md:order-1">
          <div className="relative aspect-[4/3] w-full">
            <AnimatePresence initial={false} mode="popLayout">
              {testimonials.map((t, index) => {
                const isActive = index === active;
                return (
                  <motion.div
                    key={`${t.src}-${index}`}
                    initial={
                      reducedMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            scale: 0.9,
                            rotate: randomRotate(),
                          }
                    }
                    animate={
                      reducedMotion
                        ? { opacity: isActive ? 1 : 0 }
                        : {
                            opacity: isActive ? 1 : 0.7,
                            scale: isActive ? 1 : 0.95,
                            rotate: isActive ? 0 : randomRotate(),
                            zIndex: isActive ? 40 : total + 2 - index,
                            y: isActive ? [0, -40, 0] : 0,
                          }
                    }
                    exit={
                      reducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.9 }
                    }
                    transition={{
                      duration: reducedMotion ? 0.2 : 0.4,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 origin-bottom"
                  >
                    {/* Draggable only for the active slide */}
                    <motion.img
                      src={t.src}
                      alt={t.name}
                      width={1200}
                      height={900}
                      draggable={false}
                      loading="lazy"
                      className="h-full w-full rounded-3xl object-cover object-center shadow-sm cursor-grab active:cursor-grabbing"
                      drag={isActive ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragStart={() => {
                        if (autoplay) {
                          setAutoplay(false);
                          stopInterval();
                        }
                      }}
                      onDragEnd={(_, info) => {
                        const { offset, velocity } = info;
                        const v = velocity.x;
                        const dx = offset.x;
                        if (
                          dx > DRAG_OFFSET_THRESHOLD ||
                          v > DRAG_VELOCITY_THRESHOLD
                        ) {
                          handleUserNavigate("prev");
                        } else if (
                          dx < -DRAG_OFFSET_THRESHOLD ||
                          v < -DRAG_VELOCITY_THRESHOLD
                        ) {
                          handleUserNavigate("next");
                        }
                      }}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: text column */}
        <div className="order-1 md:order-2 flex flex-col gap-6 md:gap-8">
          <motion.div
            key={active}
            initial={{ y: reducedMotion ? 0 : 20, opacity: 0.0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground">
              {testimonials[active].name}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {testimonials[active].designation}
            </p>

            {/* Comment (only if present) */}
            {testimonials[active].comment ? (
              <Card className="relative mt-4 rounded-3xl border bg-gradient-to-r from-cyan-50/70 via-white/70 to-white/70 px-4 sm:px-5 py-3 sm:py-4 shadow-sm backdrop-blur dark:from-neutral-900/50 dark:via-neutral-900/40 dark:to-neutral-900/30">
                <Quote className="absolute -top-3 left-3 h-5 w-5 text-gray-300 dark:text-neutral-700" />
                <motion.p className="text-[14.5px] sm:text-[15px] leading-relaxed text-muted-foreground">
                  {testimonials[active].comment.split(" ").map((word, idx) => (
                    <motion.span
                      key={`${word}-${idx}`}
                      initial={{
                        filter: "blur(10px)",
                        opacity: 0,
                        y: reducedMotion ? 0 : 5,
                      }}
                      animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.18,
                        ease: "easeOut",
                        delay: reducedMotion ? 0 : 0.02 * idx,
                      }}
                      className="inline-block"
                    >
                      {word}&nbsp;
                    </motion.span>
                  ))}
                </motion.p>
              </Card>
            ) : null}

            {/* Suggested tags */}
            {testimonials[active].tags &&
            testimonials[active].tags.length > 0 ? (
              <div
                className={cn("mt-2", !testimonials[active].comment && "mt-0")}
              >
                <div className="flex mt-4 flex-wrap gap-1.5">
                  {testimonials[active].tags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="inline-flex items-center rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
      <br />
      <br />
      <br />
      {/* ----- MOBILE CONTROLS (inline) ----- */}
      {total > 1 && (
        <div className="mt-6 z-50 flex justify-center md:hidden">
          <div className="inline-flex z-50 items-center gap-3 rounded-full border bg-background/90 backdrop-blur px-2.5 py-1.5 shadow-sm">
            <button
              type="button"
              onClick={onPrev}
              className="group/button inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5 text-foreground transition-transform duration-300 group-hover/button:rotate-12" />
            </button>
            <div className="text-xs text-muted-foreground min-w-[44px] text-center">
              <span className="font-medium">{active + 1}</span> / {total}
            </div>
            <button
              type="button"
              onClick={onNext}
              className="group/button inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5 text-foreground transition-transform duration-300 group-hover/button:-rotate-12" />
            </button>
          </div>
        </div>
      )}

      {/* ----- DESKTOP CONTROLS (overlay) ----- */}
      {total > 1 && (
        <div className="hidden md:flex pointer-events-none absolute inset-x-0 bottom-4 lg:bottom-6 z-20 justify-center">
          <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full border bg-background/90 backdrop-blur px-2.5 py-1.5 shadow-sm">
            <button
              type="button"
              onClick={onPrev}
              className="group/button inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5 text-foreground transition-transform duration-300 group-hover/button:rotate-12" />
            </button>
            <div className="text-xs text-muted-foreground min-w-[44px] text-center">
              <span className="font-medium">{active + 1}</span> / {total}
            </div>
            <button
              type="button"
              onClick={onNext}
              className="group/button inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5 text-foreground transition-transform duration-300 group-hover/button:-rotate-12" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------
   Heading Block (reusable & responsive)
-------------------------------------------- */
function Header({ badge, title, subtitle }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground bg-background/80 backdrop-blur">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-tr from-sky-400 to-cyan-500" />
        {badge}
      </div>
      <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-4 h-px w-24 bg-gradient-to-r from-sky-400/70 via-cyan-400/70 to-transparent rounded-full" />
    </div>
  );
}
