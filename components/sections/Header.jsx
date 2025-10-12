"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, Menu, User, X } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchProfile } from "@/lib/redux/slices/profileSlice";
import Image from "next/image";

/** Tiny spinner for loading state */
function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4A4 4 0 0 0 8 12H4z"
      />
    </svg>
  );
}

/** Safely get first name from a full name */
function getFirstName(name) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(/\s+/);
  return parts[0] || "";
}

/** Format token display safely (handles null/undefined) */
function TokenLabel({ token, loading }) {
  if (loading)
    return (
      <span className="inline-flex items-center gap-2">
        <Spinner /> Loading tokens…
      </span>
    );
  const available = Number.isFinite(token?.available_tokens)
    ? token.available_tokens
    : 0;
  return <span>{available} Tokens Available</span>;
}

/** Small, muted variant for under-trigger placement */
function SmallTokenLabel({ token, loading, align = "right" }) {
  const content = loading
    ? "Loading tokens…"
    : `${
        Number.isFinite(token?.available_tokens) ? token.available_tokens : 0
      } Available Tokens`;
  return (
    <div
      className={[
        "text-xs text-muted-foreground mt-1",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
      aria-live="polite"
    >
      {content}
    </div>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  const dispatch = useDispatch();

  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useSelector((state) => state.profile);

  const { token, loading: tokenLoading } = useSelector(
    (state) => state.my_token_info || { token: null, loading: false }
  );

  const firstName = getFirstName(profile?.name);
  const accountHref =
    !profileLoading && profile?.isAdmin ? "/admin" : "/account";

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
    } catch {
      // no-op
    }
    dispatch(fetchProfile());
    setOpen(false);
  };

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const lastY = lastYRef.current;

        // Always show near the top
        if (y < 10) {
          setShowHeader(true);
        } else if (y > lastY + 2) {
          // scrolling down
          if (!open) setShowHeader(false);
        } else if (y < lastY - 2) {
          // scrolling up
          setShowHeader(true);
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "transition-transform duration-300 will-change-transform",
        showHeader ? "translate-y-0" : "-translate-y-full",
      ].join(" ")}
    >
      <div className="container mx-auto flex items-center justify-between max-sm:px-2 py-3 2xl:px-2">
        {/* Logo / Brand */}
        <Link href="/" className="text-xl font-semibold">
          <Image
            src="/powersoft-logo.png"
            alt="SEO Gen Logo"
            width={240}
            height={240}
            className="inline-block mr-2 object-cover w-36 h-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6 items-center">
          {/* Auth / Profile */}
          {profileLoading ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="inline-flex items-center gap-2"
            >
              <Spinner />
              <span>Loading…</span>
            </Button>
          ) : profileError || !profile ? (
            <>
              {/* Fancy gray/black Login button */}
              <Link
                className="relative px-5 py-2 overflow-hidden font-medium text-gray-600 bg-gray-100 border border-gray-100 rounded-full shadow-inner group"
                href="/login"
              >
                <span className="absolute top-0 left-0 w-0 h-0 transition-all duration-200 border-t-2 border-gray-600 group-hover:w-full ease"></span>
                <span className="absolute bottom-0 right-0 w-0 h-0 transition-all duration-200 border-b-2 border-gray-600 group-hover:w-full ease"></span>
                <span className="absolute top-0 left-0 w-full h-0 transition-all duration-300 delay-200 bg-gray-600 group-hover:h-full ease"></span>
                <span className="absolute bottom-0 left-0 w-full h-0 transition-all duration-300 delay-200 bg-gray-600 group-hover:h-full ease"></span>
                <span className="absolute inset-0 w-full h-full duration-300 delay-300 bg-gray-900 opacity-0 group-hover:opacity-100"></span>
                <span className="relative transition-colors duration-300 delay-200 group-hover:text-white ease">
                  Login <LogIn className="inline-block h-4 w-4 ml-1" />
                </span>
              </Link>

              {/* Inverted gray/black Sign Up button */}
              <Link
                className="relative px-5 py-2 overflow-hidden font-medium text-gray-100 hover:text-gray-600 bg-gray-900 border border-gray-100 rounded-full shadow-inner group"
                href="/signup"
              >
                <span className="absolute top-0 left-0 w-0 h-0 hover:text-gray-600 transition-all duration-200 border-t-2 border-gray-100 group-hover:w-full ease"></span>
                <span className="absolute bottom-0 right-0 w-0 h-0 hover:text-gray-600 transition-all duration-200 border-b-2 border-gray-100 group-hover:w-full ease"></span>
                <span className="absolute top-0 left-0 w-full h-0 hover:text-gray-600 transition-all duration-300 delay-200 bg-gray-100 group-hover:h-full ease"></span>
                <span className="absolute bottom-0 left-0 w-full hover:text-gray-600 h-0 transition-all duration-300 delay-200 bg-gray-100 group-hover:h-full ease"></span>
                <span className="absolute inset-0 w-full h-full hover:text-gray-600 duration-300 delay-300 bg-gray-100 opacity-0 group-hover:opacity-100"></span>
                <span className="relative transition-colors duration-300 delay-200 group-hover:text-gray-900 ease">
                  Sign Up <LogIn className="inline-block h-4 w-4 ml-1" />
                </span>
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* PROFILE TRIGGER — Gradient rounded button with icon */}
                  <button
                    className="relative inline-flex items-center justify-center p-4 px-5 py-2 overflow-hidden font-medium text-indigo-600 transition duration-300 ease-out rounded-full shadow-xl group hover:ring-1 hover:ring-purple-500"
                    aria-label="Open account menu"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-black via-gray-800 to-gray-500"></span>
                    <span className="absolute bottom-0 right-0 block w-64 h-64 mb-32 mr-4 transition duration-500 origin-bottom-left transform rotate-45 translate-x-24 bg-gray-900 rounded-full opacity-30 group-hover:rotate-90 ease"></span>
                    <span className="relative flex items-center gap-2 text-white">
                      <User className="h-4 w-4" />
                      <span>{firstName || "Account"}</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <TokenLabel token={token} loading={tokenLoading} />
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={accountHref}>Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* NEW: Small token line under the dropdown trigger (desktop) */}
              <SmallTokenLabel
                token={token}
                loading={tokenLoading}
                align="right"
              />
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent"
          onClick={() => {
            setOpen((v) => !v);
            setShowHeader(true); // keep header visible when toggling menu
          }}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {open && (
        <nav id="mobile-nav" className="md:hidden border-t bg-background">
          <div className="flex flex-col px-4 py-3 gap-3">
            {profileLoading ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="mt-2 w-full inline-flex items-center gap-2"
              >
                <Spinner />
                <span>Loading…</span>
              </Button>
            ) : profileError || !profile ? (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)}>
                  <Button size="sm" className="mt-2 w-full">
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              // MOBILE PROFILE DROPDOWN (same gradient trigger)
              <div className="flex flex-col">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative inline-flex items-center justify-center p-4 px-5 py-2 overflow-hidden font-medium text-indigo-600 transition duration-300 ease-out rounded-full shadow-xl group hover:ring-1 hover:ring-purple-500 mt-2 w-full"
                      aria-label="Open account menu"
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-gray-700"></span>
                      <span className="absolute bottom-0 right-0 block w-64 h-64 mb-32 mr-4 transition duration-500 origin-bottom-left transform rotate-45 translate-x-24 bg-pink-500 rounded-full opacity-30 group-hover:rotate-90 ease"></span>
                      <span className="relative flex items-center justify-between gap-2 text-white w-full">
                        <span className="inline-flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {firstName || "Account"}
                        </span>
                      </span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-64 mr-4">
                    <DropdownMenuLabel>
                      <TokenLabel token={token} loading={tokenLoading} />
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={accountHref} onClick={() => setOpen(false)}>
                        Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* NEW: Small token line under the dropdown trigger (mobile) */}
                <SmallTokenLabel
                  token={token}
                  loading={tokenLoading}
                  align="left"
                />
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
