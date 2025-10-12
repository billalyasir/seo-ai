"use client";

import React, { forwardRef } from "react";

/* Small helper */
function cx(...a) {
  return a.filter(Boolean).join(" ");
}

/**
 * Base fancy button that can render as <button> (default, dropdown-safe)
 * or <a> (link-like). When rendering <a>, you can allow navigation by
 * setting preventDefault={false}.
 */
const BaseFancyBtn = forwardRef(function BaseFancyBtn(
  {
    as, // "button" | "a"
    href,
    title,
    disabled = false,
    className = "",
    children,
    type = "button",
    onClick,
    preventDefault = true, // only applies when rendering <a>
    ...props
  },
  ref
) {
  const isAnchor = as === "a" || (!!href && as !== "button");
  if (isAnchor) {
    return (
      <a
        ref={ref}
        href={href || "#_"}
        title={title}
        aria-disabled={disabled || undefined}
        role="button"
        onClick={(e) => {
          if (preventDefault) e.preventDefault();
          if (!disabled) onClick?.(e);
        }}
        className={cx(
          "select-none inline-flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-black",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      ref={ref}
      type={type}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        if (!disabled) onClick?.(e);
      }}
      className={cx(
        "select-none inline-flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-black",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/** Black/white “shift” outline button (great for primary actions & dropdown triggers) */
export const ShiftOutlineBtn = forwardRef(function ShiftOutlineBtn(
  {
    children,
    onClick,
    disabled,
    title,
    className = "",
    as,
    href,
    preventDefault,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <BaseFancyBtn
      ref={ref}
      as={as}
      href={href}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      preventDefault={preventDefault}
      className={cx("relative px-4 py-2 font-medium group", className)}
      {...props}
    >
      <span className="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-1 translate-y-1 bg-black group-hover:-translate-x-0 group-hover:-translate-y-0 rounded-md"></span>
      <span className="absolute inset-0 w-full h-full bg-white border-2 border-black group-hover:bg-black rounded-md"></span>
      <span className="relative text-black group-hover:text-white flex items-center gap-2">
        {children}
      </span>
    </BaseFancyBtn>
  );
});

/** Purple gradient pill (nice accent for Download & Customize) */
export const GradientPillBtn = forwardRef(function GradientPillBtn(
  {
    children,
    onClick,
    disabled,
    title,
    className = "",
    as,
    href,
    preventDefault,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <BaseFancyBtn
      ref={ref}
      as={as}
      href={href}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      preventDefault={preventDefault}
      className={cx(
        "relative px-5 py-3 overflow-hidden font-medium text-indigo-50 transition duration-300 ease-out rounded-full shadow-xl group hover:ring-1 hover:ring-purple-500",
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-700"></span>
      <span className="absolute bottom-0 right-0 block w-64 h-64 mb-32 mr-4 transition duration-500 origin-bottom-left transform rotate-45 translate-x-24 bg-pink-500 rounded-full opacity-30 group-hover:rotate-90 ease"></span>
      <span className="relative flex items-center gap-2">{children}</span>
    </BaseFancyBtn>
  );
});

/** Red sweeping Close button */
export const RedCloseBtn = forwardRef(function RedCloseBtn(
  {
    children,
    onClick,
    disabled,
    title,
    className = "",
    as,
    href,
    preventDefault,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <BaseFancyBtn
      ref={ref}
      as={as}
      href={href}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      preventDefault={preventDefault}
      className={cx(
        "relative inline-flex items-center justify-start px-6 py-3 overflow-hidden font-medium transition-all bg-red-500 rounded-xl group text-white",
        className
      )}
      {...props}
    >
      <span className="absolute top-0 right-0 inline-block w-4 h-4 transition-all duration-500 ease-in-out bg-red-700 rounded group-hover:-mr-4 group-hover:-mt-4">
        <span className="absolute top-0 right-0 w-5 h-5 rotate-45 translate-x-1/2 -translate-y-1/2 bg-white"></span>
      </span>
      <span className="absolute bottom-0 left-0 w-full h-full transition-all duration-500 ease-in-out delay-200 -translate-x-full translate-y-full bg-red-600 rounded-2xl group-hover:mb-12 group-hover:translate-x-0"></span>
      <span className="relative w-full text-left">{children}</span>
    </BaseFancyBtn>
  );
});
