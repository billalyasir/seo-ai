// components/ProductsComponents.jsx
"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Square, Image as ImageIcon } from "lucide-react";
import { prettyCaption } from "./productsUtils";

/* ======================= Reusable dropdowns (stay open) ======================= */

export function ColumnDropdownSingle({
  caption,
  value,
  options,
  onSelect,
  buttonIcon = null,
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef(null);
  const listRef = React.useRef([]);
  const [highlight, setHighlight] = React.useState(0);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? options.filter((o) => o.toLowerCase().includes(q))
      : options;
    return arr.slice().sort((a, b) => {
      const A = a.toLowerCase();
      const B = b.toLowerCase();
      const qi = q || "";
      const ra =
        A === qi ? 0 : A.startsWith(qi) ? 1 : A.indexOf(qi) >= 0 ? 2 : 3;
      const rb =
        B === qi ? 0 : B.startsWith(qi) ? 1 : B.indexOf(qi) >= 0 ? 2 : 3;
      return ra - rb || A.localeCompare(B);
    });
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      inputRef.current?.focus();
      setHighlight(0);
    }, 0);
  }, [open]);

  const onKeyDown = (e) => {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      listRef.current[
        Math.min(highlight + 1, filtered.length - 1)
      ]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      listRef.current[Math.max(highlight - 1, 0)]?.scrollIntoView({
        block: "nearest",
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[highlight];
      if (pick) onSelect(pick); // keep menu open
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {buttonIcon}
          {caption}: {prettyCaption(value)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 max-h-[320px] overflow-auto p-0"
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="p-3 bg-background z-20 border-b sticky top-0">
          <DropdownMenuLabel className="px-0">Column</DropdownMenuLabel>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type to filter…"
            className="mt-2"
          />
        </div>
        <div className="py-1">
          {filtered.length ? (
            filtered.map((opt, idx) => (
              <DropdownMenuItem
                key={opt}
                onSelect={(e) => {
                  e.preventDefault(); // keep open
                  onSelect(opt);
                }}
                onMouseEnter={() => setHighlight(idx)}
                ref={(el) => (listRef.current[idx] = el)}
                className={`flex items-center gap-2 ${
                  idx === highlight ? "bg-muted" : ""
                }`}
              >
                {value === opt ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="truncate">{prettyCaption(opt)}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-3 py-2 text-sm opacity-60">No matches</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ColumnDropdownMulti({
  caption,
  selectedList,
  options,
  onToggle,
  buttonIcon = null,
  removableChips = [],
  onRemoveChip = () => {},
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef(null);
  const listRef = React.useRef([]);
  const [highlight, setHighlight] = React.useState(0);

  const sanitizedOptions = React.useMemo(
    () => (options || []).filter((o) => String(o).trim() !== ""),
    [options]
  );

  const selectedSet = React.useMemo(
    () => new Set(selectedList || []),
    [selectedList]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? sanitizedOptions.filter((o) => o.toLowerCase().includes(q))
      : sanitizedOptions;
    return arr.slice().sort((a, b) => {
      const A = a.toLowerCase();
      const B = b.toLowerCase();
      const qi = q || "";
      const ra =
        A === qi ? 0 : A.startsWith(qi) ? 1 : A.indexOf(qi) >= 0 ? 2 : 3;
      const rb =
        B === qi ? 0 : B.startsWith(qi) ? 1 : B.indexOf(qi) >= 0 ? 2 : 3;
      return ra - rb || A.localeCompare(B);
    });
  }, [sanitizedOptions, query]);

  React.useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      inputRef.current?.focus();
      setHighlight(0);
    }, 0);
  }, [open]);

  const onKeyDown = (e) => {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      listRef.current[
        Math.min(highlight + 1, filtered.length - 1)
      ]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      listRef.current[Math.max(highlight - 1, 0)]?.scrollIntoView({
        block: "nearest",
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[highlight];
      if (pick) onToggle(pick); // keep open
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            {buttonIcon}
            {caption}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64 max-h-[360px] overflow-auto p-0"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b sticky top-0 z-20 bg-background">
            <DropdownMenuLabel className="px-0">Columns</DropdownMenuLabel>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type to filter…"
              className="mt-2"
            />
          </div>
          <div className="py-1">
            {filtered.length ? (
              filtered.map((opt, idx) => {
                const checked = selectedSet.has(opt);
                return (
                  <DropdownMenuItem
                    key={opt}
                    onSelect={(e) => {
                      e.preventDefault(); // keep open
                      onToggle(opt);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                    ref={(el) => (listRef.current[idx] = el)}
                    className={`flex items-center gap-2 ${
                      idx === highlight ? "bg-muted" : ""
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span className="truncate">{prettyCaption(opt)}</span>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm opacity-60">No matches</div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex flex-wrap gap-2 mt-2">
        {removableChips
          .filter((s) => String(s).trim() !== "")
          .map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onRemoveChip(s)}
              title="Remove"
            >
              {prettyCaption(s)} ×
            </Badge>
          ))}
      </div>
    </>
  );
}

/* ---------- Grid image cell (stateless) ---------- */
export function ImageCell({ data, imagesById, openPreview }) {
  const urls = imagesById[data?.id] || (data?.imageUrl ? [data.imageUrl] : []);
  const hasImages = urls.length > 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex space-x-2">
        {urls.slice(0, 10).map((u, idx) => (
          <div
            key={`${u}-${idx}`}
            className="relative group"
            role="button"
            onClick={() => hasImages && openPreview(data.id, idx)}
          >
            <img
              src={u}
              alt={String(data.description || data.barcode || "image")}
              className="w-32 h-32 object-contain border rounded bg-white transition group-hover:shadow cursor-zoom-in"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
        ))}
        {!hasImages && (
          <span className="text-xs opacity-60 flex items-center gap-1">
            <ImageIcon className="w-4 h-4" /> No images
          </span>
        )}
      </div>
    </div>
  );
}
