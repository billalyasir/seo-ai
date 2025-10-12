"use client";
import React from "react";

/**
 * Spinner
 * - size: diameter in px
 * - strokeWidth: thickness of the ring
 * - label: accessible label for screen readers
 * - className: pass text color or layout classes (color controls the arc via currentColor)
 */
const Spinner = ({
  size = 28,
  strokeWidth = 4,
  label = "Loading…",
  className = "",
  style,
}) => {
  const r = 25 - strokeWidth / 2; // radius inside 50x50 viewBox

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
      style={style}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        className="spinner"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          className="track"
          cx="25"
          cy="25"
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
        />
        {/* Animated arc */}
        <circle
          className="indicator"
          cx="25"
          cy="25"
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>

      {/* Scoped styles (no Tailwind required) */}
      <style jsx>{`
        .spinner {
          animation: spin 1s linear infinite;
          transform-origin: center;
          display: block;
        }
        .track {
          stroke: rgba(0, 0, 0, 0.1);
        }
        .indicator {
          stroke: currentColor;
          stroke-dasharray: 90 150; /* arc length */
          stroke-dashoffset: 0;
        }
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Spinner;
