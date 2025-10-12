"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useCSVReader } from "react-papaparse";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  selectProducts,
  selectDisplayedRows,
  productsSlice,
  updateImagesForIds,
  generateSEOForIds,
  computeDownloadSelections,
  makeBaseName,
} from "@/lib/redux/slices/productsSlice";
import { parseCsvResultsToRows } from "@/lib/csv";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataGrid, {
  Column,
  Editing,
  Pager,
  Paging,
  FilterRow,
  SearchPanel,
  Toolbar,
  Item as ToolbarItem,
  ColumnChooser,
  ColumnFixing,
  Selection,
} from "devextreme-react/data-grid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Download as DownloadIcon,
  Settings2,
  ArrowDown,
  Pickaxe,
  CheckSquare,
  Square,
  Image as ImageIcon,
  FileText,
  WandSparkles,
  FileType,
  FileSpreadsheet,
  FileJson,
  Share as ExportIcon,
  FilePlus2,
  Paperclip,
  LanguagesIcon,
  Eye,
  AlertCircle,
  Zap,
  Search,
  Package,
  Tag,
  Hash,
  Type,
  Loader2,
  X,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { fetchTokenDedux } from "@/lib/redux/slices/tokenDeduxSlice";
import { fetchUserToken } from "@/lib/redux/slices/userTokenSlice";
import Pricing from "../sections/Pricing";

/* -------------------- local utils -------------------- */
const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));
function humanSize(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
const ALL_SEO_TARGETS = [
  { key: "title", field: "seoTitle", label: "Title", icon: Type },
  {
    key: "short description",
    field: "seoShort",
    label: "Short Description",
    icon: Type,
  },
  {
    key: "long description",
    field: "seoLong",
    label: "Long Description",
    icon: Type,
  },
];
function inferExt(url) {
  const m = String(url)
    .split("?")[0]
    .match(/\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i);
  return m ? m[0].toLowerCase() : ".jpg";
}
function prettyCaption(key) {
  if (!key || typeof key !== "string") return "Select";
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
/* ======================= NEW: simple localStorage helpers ======================= */
const STORAGE_KEYS = {
  rows: "products_csv_rows",
  info: "products_csv_info",
};
function safeSetItem(key, value) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function safeGetItem(key) {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function safeRemoveItem(key) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {}
}

/* ======================= Reusable Components ======================= */
const SectionCard = ({ title, description, children, className = "" }) => (
  <Card className={`mb-6 ${className}`}>
    <CardHeader>
      <CardTitle className="text-lg font-semibold flex items-center gap-2">
        {title}
      </CardTitle>
      {description && (
        <CardDescription className="text-sm">{description}</CardDescription>
      )}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
const IconButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "ghost",
  className = "",
}) => (
  <Button
    variant={variant}
    size="icon"
    onClick={onClick}
    disabled={disabled}
    className={className}
    title={label}
  >
    <Icon className="h-4 w-4" />
    <span className="sr-only">{label}</span>
  </Button>
);
const ActionButton = ({
  children,
  icon: Icon,
  onClick,
  disabled,
  variant = "default",
  className = "",
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    variant={variant}
    className={`flex items-center gap-2 ${className}`}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </Button>
);
const StatusBadge = ({ children, variant = "default" }) => (
  <Badge variant={variant} className="text-xs">
    {children}
  </Badge>
);

/* ======================= Column Selection Dropdowns ======================= */
function ColumnDropdownSingle({ label, value, options, onSelect, icon: Icon }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef(null);
  const listRef = React.useRef([]);
  const [highlight, setHighlight] = React.useState(0);
  const sanitizedOptions = React.useMemo(
    () =>
      (options || []).filter((o) => typeof o === "string" && o.trim() !== ""),
    [options]
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
      if (pick) {
        onSelect(pick);
        setOpen(false);
      }
    }
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-left font-normal"
          >
            {Icon && <Icon className="mr-2 h-4 w-4 opacity-50" />}
            {prettyCaption(value) || "Select..."}
            <ArrowDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64 max-h-[320px] overflow-auto p-0"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="p-3 bg-background z-20 border-b sticky top-0">
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
                  onSelect={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
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
    </div>
  );
}
function ColumnDropdownMulti({
  label,
  selectedList,
  options,
  onToggle,
  icon: Icon,
  removableChips = [],
  onRemoveChip = () => {},
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef(null);
  const listRef = React.useRef([]);
  const [highlight, setHighlight] = React.useState(0);
  const sanitizedOptions = React.useMemo(
    () =>
      (options || []).filter((o) => typeof o === "string" && o.trim() !== ""),
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
      if (pick) {
        onToggle(pick);
        setOpen(true);
      }
    }
  };
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </Label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-left font-normal"
          >
            Select Columns
            <ArrowDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64 max-h-[360px] overflow-auto p-0"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b sticky top-0 z-20 bg-background">
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
                    onSelect={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={(e) => {
                      e.preventDefault?.();
                      onToggle(opt);
                      setOpen(true);
                    }}
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
      {removableChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {removableChips
            .filter((s) => typeof s === "string" && s.trim() !== "")
            .map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="cursor-pointer text-xs"
                onClick={() => onRemoveChip(s)}
                title="Remove"
              >
                {prettyCaption(s)} <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}

/* ======================= PAGE ======================= */
export default function ProductsPage() {
  const { CSVReader } = useCSVReader();
  const dispatch = useAppDispatch();
  React.useEffect(() => {
    dispatch(fetchTokenDedux());
  }, [dispatch]);
  const productsState = useAppSelector(selectProducts) || {};
  const {
    rows = [],
    selected = [],
    acceptedInfo = null,
    mode = "images",
    seoSourceCols = [],
    seoTargets = [],
    lang = "English",
    isProcessing = false,
    progress = { total: 0, completed: 0 },
    imagesPerProduct = 3,
    filenameBaseField = "",
    filenameSeparator = "_",
    imagesById = {},
    selectedImagesById = {},
    imageQueryField = "",
  } = productsState;
  const allDownloadSelections =
    useAppSelector((s) => computeDownloadSelections(s)) || [];
  const hasAnyBarcodes = React.useMemo(
    () => rows.some((r) => String(r?.barcode ?? "").trim().length > 0),
    [rows]
  );

  /* ---------- broken-image tracking ---------- */
  const [badUrls, setBadUrls] = React.useState(new Set());
  const markBroken = (u) =>
    setBadUrls((prev) => {
      if (prev.has(u)) return prev;
      const next = new Set(prev);
      next.add(u);
      return next;
    });

  /* ---------- columns ---------- */
  const availableColumns = React.useMemo(() => {
    const allKeys = new Set();
    rows.forEach((r) =>
      Object.keys(r).forEach((k) => {
        if (
          !["id", "seoTitle", "seoShort", "seoLong", "imageUrl"].includes(k) &&
          typeof k === "string" &&
          k.trim() !== ""
        ) {
          allKeys.add(k);
        }
      })
    );
    return Array.from(allKeys).filter(
      (col) => typeof col === "string" && col.trim() !== ""
    );
  }, [rows]);
  const knownFields = new Set([
    "itemCode",
    "barcode",
    "description",
    "weight",
    "imageUrl",
    "seoTitle",
    "seoShort",
    "seoLong",
  ]);
  const extraFields = React.useMemo(
    () => availableColumns.filter((k) => !knownFields.has(k)),
    [availableColumns]
  );
  const showBarcodeCol = hasAnyBarcodes;

  /* ---------- defaults & smart fallbacks ---------- */
  React.useEffect(() => {
    if (!seoSourceCols.length && availableColumns.length) {
      const defaults = [];
      if (availableColumns.includes("description"))
        defaults.push("description");
      if (availableColumns.includes("itemCode")) defaults.push("itemCode");
      if (hasAnyBarcodes && availableColumns.includes("barcode"))
        defaults.push("barcode");
      dispatch(productsSlice.actions.setSeoSourceCols(defaults));
    }
  }, [availableColumns, seoSourceCols, dispatch, hasAnyBarcodes]);
  React.useEffect(() => {
    if (!imageQueryField && availableColumns.length) {
      const def = hasAnyBarcodes ? "barcode" : "";
      dispatch(productsSlice.actions.setImageQueryField(def));
    }
    if (imageQueryField === "barcode" && !hasAnyBarcodes) {
      dispatch(productsSlice.actions.setImageQueryField(""));
    }
  }, [availableColumns, imageQueryField, dispatch, hasAnyBarcodes]);
  const pickFallbackBase = React.useCallback(() => {
    return availableColumns.includes("itemCode")
      ? "itemCode"
      : availableColumns.includes("description")
      ? "description"
      : availableColumns[0] || "";
  }, [availableColumns]);
  React.useEffect(() => {
    if (!filenameBaseField && availableColumns.length) {
      const def = hasAnyBarcodes ? "barcode" : pickFallbackBase();
      dispatch(productsSlice.actions.setFilenameBaseField(def));
    }
    if (filenameBaseField === "barcode" && !hasAnyBarcodes) {
      dispatch(productsSlice.actions.setFilenameBaseField(pickFallbackBase()));
    }
  }, [
    availableColumns,
    filenameBaseField,
    dispatch,
    hasAnyBarcodes,
    pickFallbackBase,
  ]);

  /* ---------- toggle show only selected ---------- */
  const [showOnlySelected, setShowOnlySelected] = React.useState(false);
  const filteredRows = React.useMemo(() => {
    if (showOnlySelected) {
      const selectedSet = new Set(selected);
      return rows.filter((row) => selectedSet.has(row.id));
    }
    return rows;
  }, [rows, selected, showOnlySelected]);

  /* ---------- customize / picker ---------- */
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerScopeId, setPickerScopeId] = React.useState(null);
  const [zipLoading, setZipLoading] = React.useState(false);
  const productsWithImages = React.useMemo(() => {
    const list = (
      pickerScopeId ? rows.filter((r) => r.id === pickerScopeId) : rows
    ).filter((r) => Array.isArray(imagesById[r.id]) && imagesById[r.id].length);
    return list;
  }, [rows, imagesById, pickerScopeId]);
  const [modalSelectedProductIds, setModalSelectedProductIds] = React.useState(
    new Set()
  );
  React.useEffect(() => {
    if (pickerOpen) {
      const ids = new Set(productsWithImages.map((p) => p.id));
      setModalSelectedProductIds(ids);
      if (filenameBaseField === "barcode" && !hasAnyBarcodes) {
        dispatch(
          productsSlice.actions.setFilenameBaseField(pickFallbackBase())
        );
      }
    }
  }, [
    pickerOpen,
    productsWithImages,
    filenameBaseField,
    hasAnyBarcodes,
    pickFallbackBase,
    dispatch,
  ]);
  const allChecked =
    productsWithImages.length > 0 &&
    productsWithImages.every((p) => modalSelectedProductIds.has(p.id));
  const someChecked =
    !allChecked &&
    productsWithImages.some((p) => modalSelectedProductIds.has(p.id));
  const handlePickerOpenChange = (v) => {
    if (zipLoading) return;
    setPickerOpen(v);
    if (!v) setPickerScopeId(null);
  };
  const toggleAllProductsInModal = (checked) => {
    if (checked)
      setModalSelectedProductIds(new Set(productsWithImages.map((p) => p.id)));
    else setModalSelectedProductIds(new Set());
  };
  const downloadSelections = React.useMemo(() => {
    if (!productsWithImages.length) return [];
    if (modalSelectedProductIds.size === 0) return [];
    return allDownloadSelections.filter((f) =>
      modalSelectedProductIds.has(f.id)
    );
  }, [allDownloadSelections, modalSelectedProductIds, productsWithImages]);
  const selectedImagesCount = React.useMemo(
    () => downloadSelections.length,
    [downloadSelections]
  );

  /* ---------- preview modal ---------- */
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewProductId, setPreviewProductId] = React.useState(null);
  const [previewIndex, setPreviewIndex] = React.useState(0);
  const [singleDownloading, setSingleDownloading] = React.useState(false);
  const [estimated_for_images, setEstimated_for_images] = React.useState({
    selected: "",
    status: false,
    total_products: 0,
  });
  const [estimated_for_seo, setEstimated_for_seo] = React.useState({
    status: false,
    selectedScope: "all",
    productsCount: 0,
  });
  const currentProduct = React.useMemo(
    () => rows.find((r) => r.id === previewProductId) || null,
    [rows, previewProductId]
  );
  const currentUrls = React.useMemo(() => {
    if (!currentProduct) return [];
    return (
      imagesById[currentProduct.id] ||
      (currentProduct.imageUrl ? [currentProduct.imageUrl] : [])
    );
  }, [currentProduct, imagesById]);
  const boundedIndex = React.useMemo(() => {
    if (!currentUrls.length) return 0;
    return Math.max(0, Math.min(previewIndex, currentUrls.length - 1));
  }, [currentUrls, previewIndex]);
  const currentUrl = currentUrls[boundedIndex] || null;
  const openPreview = (productId, index = 0) => {
    setPreviewProductId(productId);
    setPreviewIndex(index);
    setPreviewOpen(true);
  };
  const closePreview = (v) => {
    if (singleDownloading) return;
    setPreviewOpen(v);
  };
  const goPrev = () => {
    if (!currentUrls.length) return;
    setPreviewIndex((i) => (i - 1 + currentUrls.length) % currentUrls.length);
  };
  const goNext = () => {
    if (!currentUrls.length) return;
    setPreviewIndex((i) => (i + 1) % currentUrls.length);
  };

  /* ---------- preview names ---------- */
  const previewBaseName = React.useMemo(() => {
    if (!currentProduct) return "";
    const baseCandidate = makeBaseName(currentProduct, filenameBaseField);
    if (
      filenameBaseField === "barcode" &&
      !String(currentProduct?.barcode ?? "").trim()
    ) {
      const fallbackBase = makeBaseName(currentProduct, pickFallbackBase());
      return fallbackBase || String(currentProduct.id);
    }
    return baseCandidate || String(currentProduct.id);
  }, [currentProduct, filenameBaseField, pickFallbackBase]);
  const previewShownName = React.useMemo(() => {
    const ext = inferExt(currentUrl);
    return `${previewBaseName}${ext}`;
  }, [previewBaseName, currentUrl]);
  const previewDownloadName = React.useMemo(() => {
    const ext = inferExt(currentUrl);
    return `${previewBaseName}${ext}`;
  }, [previewBaseName, currentUrl]);

  /* ---------- grid ---------- */
  const gridRef = React.useRef(null);
  const dataSource = React.useMemo(
    () => filteredRows.map((r) => deepCopy(r)),
    [filteredRows]
  );

  // ✅ NEW: Track visible row IDs
  const [visibleRowIds, setVisibleRowIds] = useState(new Set());

  const updateVisibleRowIds = useCallback(() => {
    if (!gridRef.current) return;
    const visibleRows = gridRef.current.getVisibleRows();
    const ids = new Set(visibleRows.map((vr) => vr.data?.id).filter(Boolean));
    setVisibleRowIds(ids);
  }, []);

  /* ---------- upload ---------- */
  const onUpload = React.useCallback(
    (results, file) => {
      const { rows: withIds } = parseCsvResultsToRows(results);
      dispatch(productsSlice.actions.setRows(deepCopy(withIds)));
      dispatch(
        productsSlice.actions.setAcceptedInfo({
          name: file?.name,
          size: file?.size || 0,
        })
      );
      dispatch(productsSlice.actions.setProgress({ total: 0, completed: 0 }));
      safeSetItem(STORAGE_KEYS.rows, withIds);
      safeSetItem(STORAGE_KEYS.info, {
        name: file?.name || "uploaded.csv",
        size: file?.size || 0,
      });
      toast.success("CSV loaded successfully");
    },
    [dispatch]
  );

  /* ---------- CRUD ---------- */
  const onRowInserted = React.useCallback(
    (e) => {
      const rec = {
        imageUrl: "",
        weight: 0,
        seoTitle: "",
        seoShort: "",
        seoLong: "",
        ...e.data,
      };
      if (!rec.id) {
        const maxId =
          rows && rows.length
            ? Math.max(...rows.map((r) => Number(r.id) || 0))
            : 0;
        rec.id = maxId + 1;
      }
      dispatch(productsSlice.actions.upsertRow(rec));
    },
    [dispatch, rows]
  );
  const onRowUpdated = React.useCallback(
    (e) => {
      dispatch(productsSlice.actions.upsertRow({ ...e.data }));
    },
    [dispatch]
  );
  const onRowRemoved = React.useCallback(
    (e) => {
      dispatch(productsSlice.actions.removeRow(e.data.id));
    },
    [dispatch]
  );

  /* ---------- image fetch ---------- */
  const guardBarcode = () => {
    if (
      imageQueryField === "" ||
      (imageQueryField === "barcode" && !hasAnyBarcodes)
    ) {
      toast.error(
        "No barcodes found. Please choose a different 'Search by' column."
      );
      return false;
    }
    return true;
  };
  const runUpdateImages = async (ids) => {
    try {
      await dispatch(
        updateImagesForIds({ ids, queryField: imageQueryField })
      ).unwrap();
      toast.success("Images generated successfully");
    } catch (e) {
      toast.error(`Failed to generate images: ${e?.message || e}`);
    }
  };
  const loadAllImages = React.useCallback(
    async (fetcher) => {
      const ids = filteredRows.map((r) => r.id);
      if (!ids.length || !imageQueryField) return;
      if (!guardBarcode()) return;
      dispatch(fetchTokenDedux());
      dispatch(fetchUserToken());
      if (fetcher !== true) {
        setEstimated_for_images({
          status: true,
          total_products: ids.length,
          selected: "all",
        });
        return;
      }
      await runUpdateImages(ids);
      setEstimated_for_images({
        status: false,
        selected: "",
        total_products: 0,
      });
      dispatch(fetchTokenDedux());
      dispatch(fetchUserToken());
    },
    [filteredRows, imageQueryField, hasAnyBarcodes]
  );
  const editPageImages = React.useCallback(
    async (fetcher) => {
      if (!gridRef.current || !imageQueryField) return;
      if (!guardBarcode()) return;
      dispatch(fetchTokenDedux());
      dispatch(fetchUserToken());
      const ids = gridRef.current
        .getVisibleRows()
        .map((vr) => vr.data?.id)
        .filter(Boolean);
      if (!ids.length) return;
      if (fetcher !== true) {
        setEstimated_for_images({
          status: true,
          total_products: ids.length,
          selected: "visible",
        });
        return;
      }
      await runUpdateImages(ids);
      setEstimated_for_images({
        status: false,
        selected: "",
        total_products: 0,
      });
      dispatch(fetchTokenDedux());
      dispatch(fetchUserToken());
    },
    [imageQueryField, hasAnyBarcodes]
  );
  const findImagesForSelected = React.useCallback(
    async (fetcher) => {
      if (!selected.length || !imageQueryField) return;
      if (!guardBarcode()) return;
      dispatch(fetchTokenDedux());
      dispatch(fetchUserToken());
      if (fetcher !== true) {
        setEstimated_for_images({
          status: true,
          total_products: selected.length,
          selected: "specific",
        });
        return;
      }
      await runUpdateImages(selected);
      setEstimated_for_images({
        status: false,
        selected: "",
        total_products: 0,
      });
      dispatch(fetchTokenDedux());
      dispatch(fetchUserToken());
    },
    [selected, imageQueryField, hasAnyBarcodes]
  );

  /* ---------- selection helpers ---------- */
  const selectAll = React.useCallback(() => {
    const allIds = filteredRows.map((r) => r.id);
    dispatch(productsSlice.actions.setSelected(allIds));
  }, [dispatch, filteredRows]);
  const deselectAll = React.useCallback(() => {
    const keepOthers = selected.filter(
      (id) => !filteredRows.some((r) => r.id === id)
    );
    dispatch(productsSlice.actions.setSelected(keepOthers));
  }, [dispatch, selected, filteredRows]);
  const allRowsChecked =
    filteredRows.length > 0 &&
    filteredRows.every((r) => selected.includes(r.id));
  const someRowsChecked =
    !allRowsChecked && filteredRows.some((r) => selected.includes(r.id));

  /* ---------- token configs & wallet ---------- */
  const {
    data: tokenDeduxDoc,
    loading: status,
    error: rr,
  } = useSelector((state) => state.tokenDedux);
  const token = useSelector((s) => s.my_token_info?.token);
  const walletAvailable = Number(token?.available_tokens ?? 0);
  const cfg = tokenDeduxDoc?.data || {};
  const perTitle = Number(cfg.per_seo_title || 0);
  const perShort = Number(cfg.per_seo_short_description || 0);
  const perLong = Number(cfg.per_seo_long_description || 0);
  const perReq = Number(cfg.per_image_request || 0);
  const perImg = Number(cfg.per_image || 0);

  const {
    seoPerProductTokens,
    seoTotalTokens,
    seoHasBalance,
    activeSeoKeysDisplay,
  } = React.useMemo(() => {
    const norm = (seoTargets || []).map((t) => String(t).toLowerCase());
    const includeTitle = norm.includes("title");
    const includeShort = norm.includes("short description");
    const includeLong = norm.includes("long description");
    const perProduct =
      (includeTitle ? perTitle : 0) +
      (includeShort ? perShort : 0) +
      (includeLong ? perLong : 0);
    const total = perProduct * Number(estimated_for_seo.productsCount || 0);
    const hasBal = total <= walletAvailable;
    const active = [
      includeTitle ? `Title (${perTitle})` : null,
      includeShort ? `Short (${perShort})` : null,
      includeLong ? `Long (${perLong})` : null,
    ]
      .filter(Boolean)
      .join(", ");
    return {
      seoPerProductTokens: perProduct,
      seoTotalTokens: total,
      seoHasBalance: hasBal,
      activeSeoKeysDisplay: active || "—",
    };
  }, [
    seoTargets,
    perTitle,
    perShort,
    perLong,
    estimated_for_seo.productsCount,
    walletAvailable,
  ]);

  const { imgPerProductTokens, imgTotalTokens, imgHasBalance } =
    React.useMemo(() => {
      const ipp = Number(imagesPerProduct || 0);
      const products = Number(estimated_for_images.total_products || 0);
      const perProduct = perReq + perImg * ipp;
      const total = perProduct * products;
      const hasBal = total <= walletAvailable;
      return {
        imgPerProductTokens: perProduct,
        imgTotalTokens: total,
        imgHasBalance: hasBal,
      };
    }, [
      perReq,
      perImg,
      imagesPerProduct,
      estimated_for_images.total_products,
      walletAvailable,
    ]);

  /* ---------- SEO actions ---------- */
  const runGenerateSEOForIds = React.useCallback(
    async (ids) => {
      if (!ids.length) return;
      try {
        await dispatch(generateSEOForIds(ids)).unwrap();
        toast.success("SEO generated successfully");
        dispatch(fetchUserToken());
      } catch (e) {
        toast.error(`Failed to generate SEO: ${e?.message || e}`);
      }
    },
    [dispatch]
  );
  const openSeoEstimateForIds = React.useCallback(
    (ids, scope) => {
      const productsCount = ids.length;
      if (!productsCount) return;
      if (!seoTargets || !seoTargets.length) {
        toast.error("Select at least one SEO field to generate.");
        return;
      }
      setEstimated_for_seo({
        status: true,
        selectedScope: scope,
        productsCount,
      });
    },
    [seoTargets]
  );
  const openSeoEstimate_All = React.useCallback(() => {
    const ids = filteredRows.map((r) => r.id);
    openSeoEstimateForIds(ids, "all");
    dispatch(fetchTokenDedux());
    dispatch(fetchUserToken());
  }, [filteredRows, openSeoEstimateForIds]);
  const openSeoEstimate_Selected = React.useCallback(() => {
    if (!selected.length) return;
    openSeoEstimateForIds(selected, "specific");
    dispatch(fetchTokenDedux());
    dispatch(fetchUserToken());
  }, [selected, openSeoEstimateForIds]);
  const openSeoEstimate_Visible = React.useCallback(() => {
    if (!gridRef.current) return;
    const ids =
      gridRef.current
        .getVisibleRows()
        .map((vr) => vr.data?.id)
        .filter(Boolean) || [];
    openSeoEstimateForIds(ids, "visible");
    dispatch(fetchTokenDedux());
    dispatch(fetchUserToken());
  }, [gridRef, openSeoEstimateForIds]);

  useEffect(() => {
    if (isProcessing) {
      toast.loading("Processing, please wait...");
    } else {
      toast.dismiss();
    }
  }, [isProcessing]);

  /* ---------- export helpers ---------- */
  const getSeoRows = React.useCallback(() => {
    return rows.map((r) => ({
      id: r.id,
      itemCode: r.itemCode ?? "",
      barcode: r.barcode ?? "",
      description: r.description ?? "",
      seoTitle: r.seoTitle ?? "",
      seoShort: r.seoShort ?? "",
      seoLong: r.seoLong ?? "",
    }));
  }, [rows]);
  const exportCSV = React.useCallback(() => {
    const header =
      "id,itemCode,barcode,description,seoTitle,seoShort,seoLong\n";
    const body = getSeoRows()
      .map((r) => {
        const esc = (v) => `${v ?? ""}`.replace(/"/g, '""');
        return [
          r.id,
          `"${esc(r.itemCode)}"`,
          `"${esc(r.barcode)}"`,
          `"${esc(r.description)}"`,
          `"${esc(r.seoTitle)}"`,
          `"${esc(r.seoShort)}"`,
          `"${esc(r.seoLong)}"`,
        ].join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seo-data.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [getSeoRows]);
  const exportJSON = React.useCallback(() => {
    const blob = new Blob([JSON.stringify(getSeoRows(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seo-data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [getSeoRows]);
  const exportXLSX = React.useCallback(async () => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(getSeoRows());
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SEO");
      XLSX.writeFile(wb, "seo-data.xlsx");
    } catch (e) {
      toast.error("Failed to export XLSX. Make sure 'xlsx' is installed.");
    }
  }, [getSeoRows]);
  const exportDOCX = React.useCallback(async () => {
    try {
      const {
        Document,
        Packer,
        Paragraph,
        Table,
        TableRow,
        TableCell,
        TextRun,
      } = await import("docx");
      const rowsData = getSeoRows();
      const headers = [
        "id",
        "itemCode",
        "barcode",
        "description",
        "seoTitle",
        "seoShort",
        "seoLong",
      ];
      const headerRow = new TableRow({
        children: headers.map(
          (h) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true })],
                }),
              ],
            })
        ),
      });
      const bodyRows = rowsData.map(
        (r) =>
          new TableRow({
            children: headers.map(
              (h) =>
                new TableCell({ children: [new Paragraph(String(r[h] ?? ""))] })
            ),
          })
      );
      const table = new Table({
        rows: [headerRow, ...bodyRows],
        width: { size: 100, type: "percent" },
      });
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "SEO Data", bold: true, size: 28 }),
                ],
              }),
              new Paragraph(" "),
              table,
            ],
          },
        ],
      });
      const { saveAs } = await import("file-saver");
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "seo-data.docx");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export DOCX. Make sure 'docx' is installed.");
    }
  }, [getSeoRows]);

  const downloadSeoCsv = exportCSV;
  /* ---------- ZIP posting ---------- */
  const postZip = React.useCallback(async (files) => {
    const res = await fetch("/api/images-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) throw new Error(`Zip failed: ${res.status}`);
    return res.blob();
  }, []);
  const downloadSelectedImages = React.useCallback(async () => {
    if (!downloadSelections.length || zipLoading) return;
    setZipLoading(true);
    try {
      const FileSaver = await import("file-saver");
      const saveAs = FileSaver?.default || FileSaver?.saveAs;
      if (typeof saveAs !== "function") throw new Error("saveAs not available");

      const blob = await postZip(downloadSelections);
      saveAs(
        blob,
        `product-images-${new Date().toISOString().slice(0, 10)}.zip`
      );
      toast.success("Images archived and downloading…");
    } catch (err) {
      toast.error(`Download failed: ${err?.message || err}`);
    } finally {
      setZipLoading(false);
    }
  }, [downloadSelections, zipLoading, postZip]);
  const downloadCurrentPreview = React.useCallback(async () => {
    if (!currentUrl || !currentProduct) return;
    setSingleDownloading(true);
    try {
      const response = await fetch(
        `/api/images-zip?url=${encodeURIComponent(currentUrl)}`,
        {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
        }
      );
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = previewDownloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (e) {
      toast.error(`Download failed: ${e?.message || e}`);
    } finally {
      setSingleDownloading(false);
    }
  }, [currentUrl, currentProduct, previewDownloadName]);
  /* ---------- file chip ---------- */
  const FileChip = React.useCallback(
    () =>
      acceptedInfo ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Package className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{acceptedInfo.name}</p>
            <p className="text-xs text-muted-foreground">
              {humanSize(acceptedInfo.size)}
            </p>
          </div>
          <IconButton
            icon={X}
            label="Clear"
            onClick={() => {
              dispatch(productsSlice.actions.clearAll());
              safeRemoveItem(STORAGE_KEYS.rows);
              safeRemoveItem(STORAGE_KEYS.info);
            }}
            variant="ghost"
          />
        </div>
      ) : null,
    [acceptedInfo, dispatch]
  );

  /* --------- preview helpers --------- */
  const displayUrls = React.useMemo(
    () => (currentUrls || []).filter((u) => !badUrls.has(u)),
    [currentUrls, badUrls]
  );
  const safeIndex = Math.min(
    typeof boundedIndex === "number" ? boundedIndex : 0,
    Math.max(0, displayUrls.length - 1)
  );
  const safeUrl = displayUrls[safeIndex];

  /* ---------- grid image cell ---------- */
  const ImageCell = ({ data }) => {
    // ✅ Only render if row is currently visible
    const isVisible = visibleRowIds.has(data?.id);
    if (!isVisible) {
      return <div className="text-muted-foreground text-xs">Loading...</div>;
    }

    const urls =
      imagesById[data?.id] || (data?.imageUrl ? [data.imageUrl] : []);
    const hasImages = urls.length > 0;
    return (
      <div className="flex items-center gap-3">
        <div className="flex overflow-x-auto space-x-2 py-1">
          {urls.slice(0, 5).map((u, idx) => (
            <div
              key={`${u}-${idx}`}
              className="relative group shrink-0"
              role="button"
              onClick={() => hasImages && openPreview(data.id, idx)}
              title="Click to preview"
            >
              <div className="w-30 h-30 rounded-md border bg-white overflow-hidden cursor-zoom-in hover:shadow transition-shadow">
                <Image
                  src={u}
                  alt={String(data.description || data.barcode || "image")}
                  className="w-full h-full object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  width={300}
                  height={300}
                  loading="lazy"
                />
              </div>
            </div>
          ))}
          {urls.length > 5 && (
            <div
              className="w-20 h-20 rounded-md border bg-muted flex items-center justify-center text-xs cursor-pointer hover:bg-accent"
              onClick={() => openPreview(data.id, 0)}
              title={`View all ${urls.length} images`}
            >
              +{urls.length - 5}
            </div>
          )}
          {!hasImages && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="w-4 h-4" /> No images
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ---------- Toolbars ---------- */
  const SeoToolbar = () => (
    <SectionCard
      title="SEO Generation Settings"
      description="Configure which columns to use as input and which SEO fields to generate."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ColumnDropdownMulti
          label="Input Columns (Source Data)"
          icon={Tag}
          options={availableColumns}
          selectedList={seoSourceCols}
          onToggle={(opt) =>
            dispatch(
              productsSlice.actions.setSeoSourceCols(
                seoSourceCols.includes(opt)
                  ? seoSourceCols.filter((x) => x !== opt)
                  : [...seoSourceCols, opt]
              )
            )
          }
          removableChips={seoSourceCols}
          onRemoveChip={(s) =>
            dispatch(
              productsSlice.actions.setSeoSourceCols(
                seoSourceCols.filter((x) => x !== s)
              )
            )
          }
        />
        <ColumnDropdownMulti
          label="Output Fields (SEO to Generate)"
          icon={WandSparkles}
          options={ALL_SEO_TARGETS.map((t) => t.key)}
          selectedList={seoTargets}
          onToggle={(opt) =>
            dispatch(
              productsSlice.actions.setSeoTargets(
                seoTargets.includes(opt)
                  ? seoTargets.filter((x) => x !== opt)
                  : [...seoTargets, opt]
              )
            )
          }
          removableChips={seoTargets}
          onRemoveChip={(s) =>
            dispatch(
              productsSlice.actions.setSeoTargets(
                seoTargets.filter((x) => x !== s)
              )
            )
          }
        />
        <div className="space-y-1">
          <Label className="text-xs font-medium">Language</Label>
          <Select
            value={lang}
            onValueChange={(value) =>
              dispatch(productsSlice.actions.setLang(value))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {["English", "Greek"].map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {selected.length > 0 && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showOnlySelectedSeo"
              checked={showOnlySelected}
              onChange={(e) => setShowOnlySelected(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="showOnlySelectedSeo" className="text-sm mt-2.5">
              Show Only Selected Rows
            </Label>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={Eye}
            onClick={openSeoEstimate_Visible}
            disabled={isProcessing || !(seoTargets && seoTargets.length)}
            variant="outline"
          >
            Generate for Visible Page
          </ActionButton>
          <ActionButton
            icon={CheckSquare}
            onClick={openSeoEstimate_Selected}
            disabled={
              isProcessing ||
              !(seoTargets && seoTargets.length) ||
              !selected.length
            }
            variant="outline"
          >
            Generate for Selected ({selected.length})
          </ActionButton>
          <ActionButton
            icon={Zap}
            onClick={openSeoEstimate_All}
            disabled={isProcessing || !(seoTargets && seoTargets.length)}
            variant="default"
          >
            Generate for All ({filteredRows.length})
          </ActionButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <ExportIcon className="h-4 w-4" />
                Export Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export SEO Data</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCSV}>
                <FileType className="w-4 h-4 mr-2" />
                CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportXLSX}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportDOCX}>
                <FileText className="w-4 h-4 mr-2" />
                Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportJSON}>
                <FileJson className="w-4 h-4 mr-2" />
                JSON (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </SectionCard>
  );
  const ImagesToolbar = () => {
    const disabledBecauseNoBarcodes =
      (imageQueryField === "" || imageQueryField === "barcode") &&
      !hasAnyBarcodes;
    return (
      <SectionCard
        title="Image Generation Settings"
        description="Configure how images are searched for and generated for your products."
      >
        {disabledBecauseNoBarcodes && (
          <div className="p-3 mb-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2 text-sm text-yellow-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>No barcodes found.</strong> Please choose a different
              “Search by” column or ensure your CSV contains barcode data.
            </div>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ColumnDropdownSingle
            label="Search By"
            icon={Search}
            value={imageQueryField}
            options={availableColumns}
            onSelect={(opt) =>
              dispatch(productsSlice.actions.setImageQueryField(opt))
            }
          />
          <div className="space-y-1">
            <Label className="text-xs font-medium">Images per Product</Label>
            <Select
              value={String(imagesPerProduct)}
              onValueChange={(value) =>
                dispatch(
                  productsSlice.actions.setImagesPerProduct(Number(value))
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {selected.length > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showOnlySelected"
                checked={showOnlySelected}
                onChange={(e) => setShowOnlySelected(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="showOnlySelected" className="text-sm mt-2.5">
                Show Only Selected Rows
              </Label>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={Eye}
              onClick={() => editPageImages(false).then(() => {})}
              disabled={
                isProcessing || !imageQueryField || disabledBecauseNoBarcodes
              }
              variant="outline"
            >
              Generate for Visible Page
            </ActionButton>
            <ActionButton
              icon={CheckSquare}
              onClick={() => findImagesForSelected(false).then(() => {})}
              disabled={
                isProcessing ||
                selected.length === 0 ||
                !imageQueryField ||
                disabledBecauseNoBarcodes
              }
              variant="outline"
            >
              Generate for Selected ({selected.length})
            </ActionButton>
            <ActionButton
              icon={Zap}
              onClick={() => loadAllImages(false).then(() => {})}
              disabled={
                isProcessing || !imageQueryField || disabledBecauseNoBarcodes
              }
              variant="default"
            >
              Generate for All ({filteredRows.length})
            </ActionButton>
            {Object.values(imagesById)[0] && (
              <ActionButton
                icon={DownloadIcon}
                onClick={() => setPickerOpen(true)}
                disabled={!availableColumns.length}
                variant="outline"
              >
                Customize & Download
              </ActionButton>
            )}
          </div>
        </div>
        {isProcessing && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                Processing: {progress.completed} of {progress.total} completed
              </span>
            </div>
            <StatusBadge variant="secondary">
              {Math.round((progress.completed / progress.total) * 100)}%
            </StatusBadge>
          </div>
        )}
      </SectionCard>
    );
  };

  /* ---------- NEW: restore from localStorage on first mount ---------- */
  useEffect(() => {
    if (acceptedInfo || (rows && rows.length > 0)) return;
    const savedRows = safeGetItem(STORAGE_KEYS.rows);
    const savedInfo = safeGetItem(STORAGE_KEYS.info);
    if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) {
      dispatch(productsSlice.actions.setRows(deepCopy(savedRows)));
      if (savedInfo && savedInfo.name) {
        dispatch(productsSlice.actions.setAcceptedInfo(savedInfo));
      } else {
        dispatch(
          productsSlice.actions.setAcceptedInfo({
            name: "restored.csv",
            size: 0,
          })
        );
      }
      dispatch(productsSlice.actions.setProgress({ total: 0, completed: 0 }));
      toast.success("Restored last uploaded CSV");
    }
  }, [acceptedInfo, rows, dispatch]);

  useEffect(() => {
    if (acceptedInfo && rows && rows.length > 0) {
      safeSetItem(STORAGE_KEYS.rows, rows);
      safeSetItem(STORAGE_KEYS.info, acceptedInfo);
    }
  }, [rows, acceptedInfo]);

  useEffect(() => {
    updateVisibleRowIds();
  }, [filteredRows, updateVisibleRowIds]);

  useEffect(() => {
    if (selected?.length === 0) {
      setShowOnlySelected(false);
    }
  }, [selected]);

  const toggleAllImagesForProduct = React.useCallback(
    (rec, checked) => {
      const urls = (imagesById[rec.id] || []).filter((u) => !badUrls.has(u));
      const chosen = (selectedImagesById[rec.id] || []).filter(
        (u) => !badUrls.has(u)
      );
      chosen.forEach((u) =>
        dispatch(
          productsSlice.actions.toggleSelectImage({
            id: rec.id,
            url: u,
            checked: false,
          })
        )
      );
      if (checked) {
        urls.forEach((u) =>
          dispatch(
            productsSlice.actions.toggleSelectImage({
              id: rec.id,
              url: u,
              checked: true,
            })
          )
        );
      }
    },
    [dispatch, imagesById, selectedImagesById, badUrls]
  );

  if (!productsState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {!acceptedInfo && (
        <SectionCard
          title="Get Started"
          description="Upload your product CSV file to begin."
          className="text-center"
        >
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="p-6 border-2 border-dashed border-primary/50 rounded-xl bg-primary/5">
              <Package className="h-16 w-16 text-primary/50 mx-auto mb-4" />
              <CSVReader
                onUploadAccepted={(res, file) => onUpload(res, file)}
                config={{ header: true, skipEmptyLines: true }}
              >
                {({ getRootProps }) => (
                  <ActionButton
                    icon={Paperclip}
                    {...getRootProps()}
                    className="mx-auto"
                  >
                    Upload CSV File
                  </ActionButton>
                )}
              </CSVReader>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Your CSV should include columns like Item Code, Barcode, or
              Description to help us generate SEO content and find relevant
              images.
            </p>
          </div>
        </SectionCard>
      )}

      {acceptedInfo && (
        <>
          <SectionCard title="Current File & Mode">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="md:flex space-y-2 gap-2">
                {" "}
                <FileChip />
                <CSVReader
                  onUploadAccepted={(res, file) => onUpload(res, file)}
                  config={{ header: true, skipEmptyLines: true }}
                >
                  {({ getRootProps }) => (
                    <ActionButton
                      className="md:py-6.5 max-md:w-full"
                      icon={FilePlus2}
                      variant="outline"
                      {...getRootProps()}
                    >
                      Replace CSV
                    </ActionButton>
                  )}
                </CSVReader>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Mode:</Label>
                  <Tabs
                    value={mode}
                    onValueChange={(value) =>
                      dispatch(productsSlice.actions.setMode(value))
                    }
                    className="w-full lg:w-auto"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger
                        value="seo"
                        className="flex items-center gap-2"
                      >
                        <WandSparkles className="h-4 w-4" />
                        SEO
                      </TabsTrigger>
                      <TabsTrigger
                        value="images"
                        className="flex items-center gap-2"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Images
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </div>
          </SectionCard>

          {mode === "seo" ? <SeoToolbar /> : <ImagesToolbar />}

          {mode === "seo" && (
            <Dialog
              open={estimated_for_seo.status === true}
              onOpenChange={(v) =>
                setEstimated_for_seo((prev) => ({ ...prev, status: v }))
              }
            >
              <DialogContent
                className={`${
                  !seoHasBalance
                    ? "!max-w-6xl h-[90vh] overflow-y-auto"
                    : "max-w-xl"
                } max-sm:h-[100vh] overflow-y-auto`}
              >
                <DialogHeader>
                  <DialogTitle>Confirm SEO Generation</DialogTitle>
                  <DialogDescription>
                    Review the estimated cost before proceeding.
                  </DialogDescription>
                </DialogHeader>
                {rr && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                    {rr}
                  </div>
                )}
                {status && !rr ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <LanguagesIcon className="h-4 w-4" />
                          Language
                        </h3>
                        <p>{lang}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Selected Fields
                        </h3>
                        <p>{activeSeoKeysDisplay}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Products
                        </h3>
                        <p>{estimated_for_seo.productsCount}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <WalletIcon className="h-4 w-4" />
                          Your Balance
                        </h3>
                        <p className="text-lg font-bold">
                          {walletAvailable.toLocaleString()} tokens
                        </p>
                        {!seoHasBalance && (
                          <p className="text-xs text-red-600 mt-1">
                            Insufficient balance
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border bg-accent/50">
                      <h3 className="font-medium mb-2">Estimated Cost</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Per Product:
                          </span>
                          <div className="font-bold">
                            {seoPerProductTokens.toLocaleString()} tokens
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <div className="font-bold text-lg">
                            {seoTotalTokens.toLocaleString()} tokens
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!seoHasBalance && (
                  <div className="w-full ">
                    <Pricing />
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setEstimated_for_seo((p) => ({ ...p, status: false }))
                    }
                    disabled={isProcessing}
                  >
                    Go Back
                  </Button>
                  <ActionButton
                    icon={Pickaxe}
                    onClick={async () => {
                      setEstimated_for_seo((p) => ({ ...p, status: false }));
                      let ids = [];
                      if (estimated_for_seo.selectedScope === "visible") {
                        ids =
                          gridRef.current
                            ?.getVisibleRows()
                            ?.map((vr) => vr.data?.id)
                            ?.filter(Boolean) || [];
                      } else if (
                        estimated_for_seo.selectedScope === "specific"
                      ) {
                        ids = selected;
                      } else {
                        ids = filteredRows.map((r) => r.id);
                      }
                      await runGenerateSEOForIds(ids);
                    }}
                    disabled={
                      isProcessing ||
                      !(seoTargets && seoTargets.length) ||
                      !seoHasBalance
                    }
                    variant="default"
                  >
                    {!seoHasBalance
                      ? "Insufficient Tokens"
                      : "Confirm & Generate SEO"}
                  </ActionButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {mode === "images" && (
            <Dialog
              open={estimated_for_images.status === true}
              onOpenChange={(v) =>
                setEstimated_for_images((prev) => ({ ...prev, status: v }))
              }
            >
              <DialogContent
                className={`${
                  !imgHasBalance
                    ? "!max-w-6xl h-[90vh] overflow-y-auto"
                    : "max-w-xl"
                } max-sm:h-[100vh] overflow-y-auto`}
              >
                <DialogHeader>
                  <DialogTitle>Confirm Image Generation</DialogTitle>
                  <DialogDescription>
                    Review the estimated cost and image count before proceeding.
                  </DialogDescription>
                </DialogHeader>
                {status && !rr ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <h3 className="font-medium mb-2">Per Request</h3>
                        <p>{perReq} tokens</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <h3 className="font-medium mb-2">Per Image</h3>
                        <p>{perImg} tokens</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <h3 className="font-medium mb-2">Images/Product</h3>
                        <p>{imagesPerProduct}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <WalletIcon className="h-4 w-4" />
                          Your Balance
                        </h3>
                        <p className="text-lg font-bold">
                          {walletAvailable.toLocaleString()} tokens
                        </p>
                        {!imgHasBalance && (
                          <p className="text-xs text-red-600 mt-1">
                            Insufficient balance
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border bg-accent/50">
                      <h3 className="font-medium mb-2">Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Products:</span>
                          <span className="font-medium">
                            {estimated_for_images.total_products}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected Images:</span>
                          <span className="font-medium">
                            {Number(estimated_for_images.total_products || 0) *
                              Number(imagesPerProduct || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost per Product:</span>
                          <span className="font-medium">
                            {imgPerProductTokens.toLocaleString()} tokens
                          </span>
                        </div>
                        <div className="pt-2 border-t flex justify-between">
                          <span className="font-bold">
                            Total Estimated Cost:
                          </span>
                          <span className="font-bold text-lg">
                            {imgTotalTokens.toLocaleString()} tokens
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!imgHasBalance && (
                  <div className="w-full ">
                    <Pricing />
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setEstimated_for_images((prev) => ({
                        ...prev,
                        status: false,
                      }))
                    }
                    disabled={isProcessing}
                  >
                    Go Back
                  </Button>
                  <ActionButton
                    icon={Pickaxe}
                    onClick={async () => {
                      setEstimated_for_images((prev) => ({
                        ...prev,
                        status: false,
                      }));
                      if (estimated_for_images.selected === "visible")
                        await editPageImages(true);
                      else if (estimated_for_images.selected === "specific")
                        await findImagesForSelected(true);
                      else if (estimated_for_images.selected === "all")
                        await loadAllImages(true);
                    }}
                    disabled={
                      isProcessing || !imageQueryField || !imgHasBalance
                    }
                    variant="default"
                  >
                    {!imgHasBalance
                      ? "Insufficient Tokens"
                      : "Confirm & Generate Images"}
                  </ActionButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <SectionCard title="Product Data">
            <div
              className={`flex items-center justify-between ${
                showOnlySelected && "hidden"
              } mb-4`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={allRowsChecked}
                  ref={(el) => el && (el.indeterminate = someRowsChecked)}
                  onChange={(e) =>
                    e.target.checked ? selectAll() : deselectAll()
                  }
                  className="rounded"
                />
                <Label htmlFor="selectAll" className="text-sm mt-2.5">
                  Select All Rows
                </Label>
                {selected.length > 0 && (
                  <StatusBadge variant="secondary">
                    {selected.length} selected
                  </StatusBadge>
                )}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <DataGrid
                dataSource={dataSource}
                keyExpr="id"
                showBorders={false}
                columnAutoWidth
                allowColumnReordering
                allowColumnResizing
                height="70vh"
                onInitialized={(e) => (gridRef.current = e.component)}
                onContentReady={updateVisibleRowIds}
                onOptionChanged={(e) => {
                  if (
                    e.fullName === "paging.pageIndex" ||
                    e.fullName === "scrolling"
                  ) {
                    updateVisibleRowIds();
                  }
                }}
                onRowInserted={onRowInserted}
                onRowUpdated={onRowUpdated}
                onRowRemoved={onRowRemoved}
                onSelectionChanged={(e) =>
                  dispatch(
                    productsSlice.actions.setSelected([...e.selectedRowKeys])
                  )
                }
                selectedRowKeys={[...selected]}
                onCellPrepared={(e) => {
                  if (
                    e.rowType === "header" &&
                    e.column?.type === "selection"
                  ) {
                    e.cellElement.innerHTML = "";
                    e.cellElement.style.pointerEvents = "none";
                  }
                }}
              >
                <Selection
                  mode="multiple"
                  showCheckBoxesMode="always"
                  allowSelectAll={false}
                />
                <SearchPanel visible placeholder="Search products..." />
                <FilterRow visible />
                <ColumnChooser enabled />
                <ColumnFixing enabled />
                <Column type="selection" width={40} fixed />
                <Column
                  caption="#"
                  width={60}
                  cellRender={(c) => {
                    const instance = gridRef.current;
                    const ds = instance?.getDataSource();
                    const pageSize = ds?.pageSize() || 10;
                    const pageIndex = ds?.pageIndex() || 0;
                    const startIndex = pageIndex * pageSize + 1;
                    return (
                      <span className="text-sm">{startIndex + c.rowIndex}</span>
                    );
                  }}
                  allowSorting={false}
                  allowFiltering={false}
                  fixed
                />
                <Column
                  caption="Images"
                  width={300}
                  cellRender={(cell) => <ImageCell data={cell.data} />}
                  allowFiltering={false}
                />
                {ALL_SEO_TARGETS.map((t) => (
                  <Column
                    key={t.field}
                    dataField={t.field}
                    caption={`SEO ${t.label}`}
                    visible={mode === "seo" && seoTargets.includes(t.key)}
                    minWidth={150}
                  />
                ))}
                <Column dataField="itemCode" caption="Item Code" width={140} />
                <Column
                  dataField="barcode"
                  caption="Barcode"
                  width={160}
                  visible={showBarcodeCol}
                />
                <Column
                  dataField="description"
                  caption="Description"
                  minWidth={200}
                />
                {extraFields.map((field) => (
                  <Column
                    key={field}
                    dataField={field}
                    caption={prettyCaption(field)}
                    minWidth={120}
                  />
                ))}
                <Column
                  dataField="weight"
                  caption="Weight"
                  dataType="number"
                  width={100}
                />
                <Editing
                  mode="row"
                  useIcons={true}
                  allowAdding
                  allowUpdating
                  allowDeleting
                />
                <Pager
                  showInfo
                  showNavigationButtons
                  allowedPageSizes={[10, 20, 50, 100]}
                  showPageSizeSelector
                  infoText={`Showing {0} - {1} of {2} rows`}
                />
                <Paging defaultPageSize={20} />
                <Toolbar>
                  <ToolbarItem name="searchPanel" />
                  <ToolbarItem name="columnChooserButton" />
                </Toolbar>
                <Toolbar location="bottom">
                  <ToolbarItem
                    render={() => (
                      <div className="flex items-center justify-between w-full px-4 py-2 text-sm text-muted-foreground bg-background border-t">
                        <span>Total Items: {filteredRows.length}</span>
                      </div>
                    )}
                  />
                </Toolbar>
              </DataGrid>
            </div>
          </SectionCard>

          <Dialog open={pickerOpen} onOpenChange={handlePickerOpenChange}>
            <DialogContent className="!max-w-6xl max-h-[95vh] max-sm:max-h-screen  max-sm:overflow-y-auto ">
              <DialogHeader>
                <DialogTitle>Customize & Download Images</DialogTitle>
                <DialogDescription>
                  Select the images you want and customize their filenames
                  before downloading.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-xs">Base Name</Label>
                  <Select
                    value={filenameBaseField}
                    onValueChange={(value) =>
                      dispatch(
                        productsSlice.actions.setFilenameBaseField(value)
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.length ? (
                        availableColumns
                          .filter(
                            (opt) =>
                              typeof opt === "string" && opt.trim() !== ""
                          )
                          .map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {prettyCaption(opt)}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem disabled>No columns</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Separator</Label>
                  <Input
                    value={filenameSeparator}
                    onChange={(e) =>
                      dispatch(
                        productsSlice.actions.setFilenameSeparator(
                          e.target.value
                        )
                      )
                    }
                    className="w-full"
                    maxLength={3}
                    placeholder="_"
                  />
                </div>
                <div className="flex items-end">
                  <StatusBadge variant="secondary">
                    Selected: {selectedImagesCount} images
                  </StatusBadge>
                </div>
              </div>
              <div className=" h-[60vh] overflow-y-auto space-y-6 pr-1">
                {productsWithImages.map((rec) => {
                  const urls = (imagesById[rec.id] || []).filter(
                    (u) => !badUrls.has(u)
                  );
                  const chosen = (selectedImagesById[rec.id] || []).filter(
                    (u) => !badUrls.has(u)
                  );
                  const base = (() => {
                    const candidate = makeBaseName(rec, filenameBaseField);
                    if (
                      filenameBaseField === "barcode" &&
                      !String(rec?.barcode ?? "").trim()
                    ) {
                      return (
                        makeBaseName(rec, pickFallbackBase()) || String(rec.id)
                      );
                    }
                    return candidate || String(rec.id);
                  })();
                  const productChecked = modalSelectedProductIds.has(rec.id);
                  const productAllSelected =
                    urls.length > 0 && chosen.length === urls.length;
                  const productSomeSelected =
                    !productAllSelected && chosen.length > 0;
                  return (
                    <div
                      key={rec.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        productChecked
                          ? "bg-accent/30 border-accent"
                          : "bg-background"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <h4 className="font-medium">
                            {rec.description ||
                              rec.itemCode ||
                              `Product ${rec.id}`}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Images: {urls.length} | Selected: {chosen.length}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`product-${rec.id}`}
                            checked={productChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModalSelectedProductIds((prev) =>
                                  new Set(prev).add(rec.id)
                                );
                              } else {
                                setModalSelectedProductIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(rec.id);
                                  return next;
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <Label
                            htmlFor={`product-${rec.id}`}
                            className="text-sm mt-2"
                          >
                            Include Product
                          </Label>
                        </div>
                      </div>
                      {urls.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {urls.map((u, tileIdx) => {
                            const checked = chosen.includes(u);
                            let labelWhenSelected = "";
                            if (checked) {
                              const orderIndex = chosen.indexOf(u);
                              if (orderIndex === 0) {
                                labelWhenSelected = base;
                              } else {
                                labelWhenSelected = `${base}${filenameSeparator}${orderIndex}`;
                              }
                            }
                            const checkboxId = `cb-${rec.id}-${tileIdx}`;
                            return (
                              <div
                                key={`${rec.id}-${tileIdx}`}
                                className={`border rounded-lg p-2 flex flex-col gap-2 cursor-pointer transition ${
                                  checked
                                    ? "ring-2 ring-primary"
                                    : "hover:ring-1 hover:ring-muted"
                                } ${
                                  !productChecked
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                title={u}
                              >
                                <label
                                  htmlFor={
                                    productChecked ? checkboxId : undefined
                                  }
                                  className="aspect-square w-full bg-white rounded overflow-hidden"
                                  onClick={(e) => {
                                    if (!productChecked) e.preventDefault();
                                  }}
                                >
                                  <Image
                                    width={200}
                                    height={200}
                                    loading="lazy"
                                    src={u}
                                    alt="product"
                                    className="w-full h-full object-contain"
                                    onError={() => {
                                      markBroken(u);
                                      dispatch(
                                        productsSlice.actions.toggleSelectImage(
                                          {
                                            id: rec.id,
                                            url: u,
                                            checked: false,
                                          }
                                        )
                                      );
                                    }}
                                  />
                                </label>
                                <div className="flex items-center justify-between text-xs">
                                  <input
                                    id={checkboxId}
                                    type="checkbox"
                                    className="rounded"
                                    checked={checked}
                                    onChange={(e) =>
                                      dispatch(
                                        productsSlice.actions.toggleSelectImage(
                                          {
                                            id: rec.id,
                                            url: u,
                                            checked: e.target.checked,
                                          }
                                        )
                                      )
                                    }
                                    disabled={!productChecked}
                                  />
                                  {checked && (
                                    <span className="truncate font-medium text-xs">
                                      {labelWhenSelected}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {urls.length === 0 && (
                        <div className="text-sm text-muted-foreground py-4 text-center">
                          No valid images available for this product.
                        </div>
                      )}
                    </div>
                  );
                })}
                {productsWithImages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No products with images to display.</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => handlePickerOpenChange(false)}
                  disabled={zipLoading}
                >
                  Go Back
                </Button>
                <ActionButton
                  icon={DownloadIcon}
                  onClick={downloadSelectedImages}
                  disabled={zipLoading || downloadSelections.length === 0}
                  variant="default"
                >
                  {zipLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    `Download (${downloadSelections.length} images)`
                  )}
                </ActionButton>
              </DialogFooter>
              {zipLoading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <div className="bg-background p-6 rounded-lg shadow-lg border flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Preparing your download...</p>
                    <p className="text-xs text-muted-foreground">
                      Please keep this window open.
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={previewOpen} onOpenChange={closePreview}>
            <DialogContent className="!max-w-6xl max-sm:overflow-y-auto max-h-[95vh]">
              <DialogHeader>
                <DialogTitle className="truncate">
                  {previewBaseName || "Image Preview"}
                </DialogTitle>
                <DialogDescription className="truncate">
                  {previewShownName}
                </DialogDescription>
              </DialogHeader>
              <div className="relative bg-muted/50 rounded-lg border lg:max-h-[60vh] 3xl:max-h-auto    max-lg:h-[60vh] overflow-y-auto space-y-6 pr-1 overflow-hidden">
                <div className="aspect-video w-full flex items-center justify-center p-4">
                  {safeUrl ? (
                    <Image
                      width={400}
                      height={400}
                      src={safeUrl}
                      alt="Preview"
                      className="max-w-md object-contain rounded"
                      onError={() => markBroken(safeUrl)}
                    />
                  ) : (
                    <div className="text-muted-foreground p-6 text-center">
                      <ImageIcon className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p>No image available</p>
                    </div>
                  )}
                </div>
                {displayUrls.length > 1 && (
                  <>
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background shadow-md hover:bg-accent transition-colors"
                      onClick={goPrev}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background shadow-md hover:bg-accent transition-colors"
                      onClick={goNext}
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              {displayUrls.length > 1 && (
                <div className="mt-4 overflow-x-auto pb-2">
                  <div className="flex gap-2">
                    {displayUrls.map((u, i) => (
                      <button
                        key={`${u}-${i}`}
                        className={`shrink-0 border rounded bg-white p-1 ${
                          i === safeIndex
                            ? "ring-2 ring-primary"
                            : "hover:ring-1 hover:ring-muted"
                        }`}
                        onClick={() => setPreviewIndex(i)}
                        title={`Image ${i + 1}`}
                      >
                        <Image
                          width={100}
                          height={100}
                          loading="lazy"
                          src={u}
                          alt={`Preview ${i + 1}`}
                          className="w-16 h-16 object-contain"
                          onError={() => markBroken(u)}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Base Name</Label>
                    <Select
                      value={filenameBaseField}
                      onValueChange={(value) =>
                        dispatch(
                          productsSlice.actions.setFilenameBaseField(value)
                        )
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.length ? (
                          availableColumns
                            .filter(
                              (opt) =>
                                typeof opt === "string" && opt.trim() !== ""
                            )
                            .map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {prettyCaption(opt)}
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem disabled>No columns</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    icon={Settings2}
                    onClick={() => {
                      setPreviewOpen(false);
                      setPickerScopeId(previewProductId);
                      setPickerOpen(true);
                    }}
                    variant="outline"
                  >
                    Select Image (Options)
                  </ActionButton>
                  <ActionButton
                    icon={DownloadIcon}
                    onClick={downloadCurrentPreview}
                    disabled={singleDownloading || !safeUrl}
                    variant="default"
                  >
                    {singleDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      "Download Image"
                    )}
                  </ActionButton>
                  <Button
                    variant="outline"
                    onClick={() => closePreview(false)}
                    disabled={singleDownloading}
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
              {singleDownloading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <div className="bg-background p-6 rounded-lg shadow-lg border flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Downloading image...</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

const WalletIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);
