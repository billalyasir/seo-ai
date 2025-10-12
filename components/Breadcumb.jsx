"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

// Title-case a URL segment for display (e.g. "getting-started" -> "Getting Started")
function defaultTransformLabel(segment) {
  try {
    const decoded = decodeURIComponent(segment);
    return decoded.replace(/[-_]+/g, " ").replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  } catch (e) {
    return segment;
  }
}

// Our custom separator: a plain <li> so we fully control how it renders
function GtSeparator() {
  return (
    <li
      aria-hidden="true"
      className="mx-0 px-0 leading-none select-none text-muted-foreground"
    >
      &gt;
    </li>
  );
}

export default function Breadcrumbs(props) {
  const {
    rootLabel = "Home",
    rootHref = "/",
    hiddenSegments = [],
    labelOverrides = {},
    transformLabel = defaultTransformLabel,
    maxItems = 4,
    className = "",
  } = props || {};

  const pathname = usePathname() || "/";

  // Build an array of { label, href, segment } for each path segment.
  const segments = React.useMemo(
    function () {
      const parts = pathname.split("/").filter(Boolean);
      const filtered = parts.filter(function (seg) {
        return hiddenSegments.indexOf(seg) === -1;
      });

      var acc = "";
      return filtered.map(function (seg, i) {
        acc += "/" + seg;
        var label = Object.prototype.hasOwnProperty.call(labelOverrides, seg)
          ? labelOverrides[seg]
          : transformLabel(seg, i, filtered);
        return { label: label, href: acc, segment: seg };
      });
    },
    [pathname, hiddenSegments, labelOverrides, transformLabel]
  );

  // Collapse logic: keep first and last items visible; show ellipsis in between when needed.
  function getVisibleItems(arr, limit) {
    if (arr.length <= limit) return { head: arr, hidden: [], tail: [] };
    var tailCount = Math.max(1, limit - 2);
    return {
      head: [arr[0]],
      hidden: arr.slice(1, arr.length - tailCount),
      tail: arr.slice(arr.length - tailCount),
    };
  }

  const { head, hidden, tail } = getVisibleItems(
    segments,
    Math.max(2, maxItems)
  );

  // Check if we have any segments to display
  const hasSegments = segments.length > 0;

  return (
    <Breadcrumb className={className}>
      {/* Remove gaps so ">" touches labels */}
      <BreadcrumbList className="gap-0">
        {/* Root */}
        <BreadcrumbItem>
          {pathname === rootHref ? (
            <BreadcrumbPage className="inline-flex items-center gap-1">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{rootLabel}</span>
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href={rootHref} className="inline-flex items-center gap-1">
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>{rootLabel}</span>
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {/* Add separator after root if we have any segments */}
        {hasSegments && <GtSeparator />}

        {/* Head item if present (first real segment) */}
        {head.map(function (item, index) {
          const isLastHeadItem = index === head.length - 1;
          const isLastItem =
            isLastHeadItem && hidden.length === 0 && tail.length === 0;

          return (
            <React.Fragment key={"head-" + item.href}>
              <BreadcrumbItem>
                {isLastItem ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLastItem &&
                (isLastHeadItem
                  ? hidden.length > 0 || tail.length > 0
                  : true) && <GtSeparator />}
            </React.Fragment>
          );
        })}

        {/* Ellipsis when collapsed */}
        {hidden.length > 0 && (
          <>
            <BreadcrumbItem>
              <BreadcrumbEllipsis className="cursor-default" />
            </BreadcrumbItem>
            <GtSeparator />
          </>
        )}

        {/* Tail items (last few) */}
        {tail.map(function (item, idx) {
          const isLast = idx === tail.length - 1;
          return (
            <React.Fragment key={"tail-" + item.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <GtSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
