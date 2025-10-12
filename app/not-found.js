"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// File: app/not-found.js
// Simple, premium look: RGB animated icon + Home button (no inputs)
// Tailwind + shadcn + Framer Motion

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <section className="w-full max-w-md flex flex-col items-center gap-8">
        {/* RGB Icon */}
        <div className="relative">
          {/* Outer RGB aura */}
          <motion.div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full blur-2xl opacity-70"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, #ff3b3b, #ffd93b, #3bff6b, #3bc6ff, #9c3bff, #ff3b8a, #ff3b3b)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          {/* Core ring with subtle RGB sweep */}
          <motion.div
            className="size-40 rounded-full grid place-items-center border border-white/10 bg-neutral-50/40 dark:bg-neutral-900/40 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
            style={{
              boxShadow:
                "0 10px 40px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
            initial={{ scale: 0.96, filter: "saturate(1)" }}
            animate={{
              scale: [0.96, 1, 0.96],
              filter: ["saturate(1)", "saturate(1.3)", "saturate(1)"],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Inner rotating gradient stroke */}
            <motion.div
              className="size-32 rounded-full p-[2px]"
              style={{
                background:
                  "conic-gradient(from 0deg at 50% 50%, rgba(255,59,59,1), rgba(255,217,59,1), rgba(59,255,107,1), rgba(59,198,255,1), rgba(156,59,255,1), rgba(255,59,138,1), rgba(255,59,59,1))",
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            >
              <div className="size-full rounded-full bg-background grid place-items-center">
                {/* The 404 mark */}
                <motion.div
                  className="text-3xl font-extrabold tracking-tight"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: [0.9, 1, 0.9] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 1.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <span className="bg-clip-text text-transparent bg-[conic-gradient(at_50%_50%,#ff3b3b,#ffd93b,#3bff6b,#3bc6ff,#9c3bff,#ff3b8a,#ff3b3b)]">
                    404
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Label */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Page Not Found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The page you requested doesn’t exist or may have moved.
          </p>
        </div>

        {/* Home Button */}
        <Button asChild size="lg" className="px-6">
          <Link href="/">Go to Home</Link>
        </Button>
      </section>
    </main>
  );
}
