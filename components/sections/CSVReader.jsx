// ProductsPage.jsx
"use client";

import React from "react";
import { useCSVReader } from "react-papaparse";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { parseCsvResultsToRows } from "@/lib/csv";
import {
  selectProducts,
  selectDisplayedRows,
  productsSlice,
  updateImagesForIds,
  generateSEOForIds,
} from "./productsSlice";

// Utility to create a deep copy of an object to ensure mutability
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---------- utils ----------
function humanSize(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export default function ProductsPage() {
  const { CSVReader } = useCSVReader();
  const dispatch = useDispatch();

  const {
    rows,
    selected,
    acceptedInfo,
    mode,
    showChoice,
    choice,
    seoSourceCols,
    seoTargets,
    lang,
    isProcessing,
    progress,
  } = useSelector(selectProducts);

  const displayedRows = useSelector(selectDisplayedRows);
  const gridRef = React.useRef(null);

  // Create a deep mutable copy of displayedRows to avoid read-only errors
  const mutableDisplayedRows = React.useMemo(
    () => displayedRows.map((r) => deepCopy(r)),
    [displayedRows]
  );

  // Keep selection in sync with displayed rows
  React.useEffect(() => {
    const validIds = new Set(displayedRows.map((r) => r.id));
    dispatch(
      productsSlice.actions.setSelected(
        (selected || []).filter((id) => validIds.has(id))
      )
    );
  }, [dispatch, displayedRows, selected]);

  // Upload handler
  const onUpload = (results, file) => {
    const { rows: withIds } = parseCsvResultsToRows(results);
    dispatch(productsSlice.actions.setRows(deepCopy(withIds))); // Deep copy CSV data
    dispatch(
      productsSlice.actions.setAcceptedInfo({
        name: file?.name,
        size: file?.size || 0,
      })
    );
    dispatch(productsSlice.actions.setProgress({ total: 0, completed: 0 }));
  };

  // CRUD operations
  const onRowInserted = (e) => {
    const rec = deepCopy({
      imageUrl: "",
      weight: 0,
      seoTitle: "",
      seoShort: "",
      seoLong: "",
      ...e.data,
    });

    if (!rec.id) {
      const maxId =
        rows && rows.length
          ? Math.max(...rows.map((r) => Number(r.id) || 0))
          : 0;
      rec.id = maxId + 1;
    }

    dispatch(productsSlice.actions.upsertRow(rec));
  };

  const onRowUpdated = (e) => {
    dispatch(productsSlice.actions.upsertRow(deepCopy(e.data)));
  };

  const onRowRemoved = (e) => {
    dispatch(productsSlice.actions.removeRow(e.data.id));
  };

  // Image actions
  const loadAllImages = () => {
    const ids = displayedRows.map((r) => r.id);
    if (!ids.length) return;
    dispatch(updateImagesForIds(ids));
  };

  const editPageImages = () => {
    if (!gridRef.current) return;
    const ids = gridRef.current
      .getVisibleRows()
      .map((vr) => vr.data?.id)
      .filter(Boolean);
    if (!ids.length) return;
    dispatch(updateImagesForIds(ids));
  };

  const findImagesForSelected = () => {
    if (!selected.length) return;
    dispatch(updateImagesForIds(selected));
  };

  // SEO generation
  const runGenerateSEO = () => {
    const ids = selected.length ? selected : displayedRows.map((r) => r.id);
    if (!ids.length) return;
    dispatch(generateSEOForIds(ids));
  };

  // CSV export for SEO fields
  const downloadSeoCsv = () => {
    const header =
      "id,itemCode,barcode,description,seoTitle,seoShort,seoLong\n";
    const body = rows
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
  };

  // ---------- UI Cells ----------
  const FileChip = () =>
    acceptedInfo ? (
      <div className="inline-flex items-center gap-2 border rounded-full px-3 py-1 text-sm bg-background">
        <span>File size: {humanSize(acceptedInfo.size)}</span>
        <span className="opacity-80 truncate max-w-[200px]">
          {acceptedInfo.name}
        </span>
        <button
          className="text-xs"
          onClick={() => dispatch(productsSlice.actions.clearAll())}
        >
          ×
        </button>
      </div>
    ) : null;

  const ImageCell = ({ data }) => (
    <div className="flex items-center gap-2">
      {data?.imageUrl ? (
        <img
          src={data.imageUrl}
          alt={String(data.description || data.barcode || "image")}
          className="w-12 h-12 object-contain border rounded"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="text-xs opacity-70">No image</span>
      )}
    </div>
  );

  const ProgressBar = () => (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className="h-2.5 rounded-full bg-primary"
        style={{
          width: `${
            progress.total ? (progress.completed / progress.total) * 100 : 0
          }%`,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );

  const SeoToolbar = () => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Select SEO Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Source columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {["Item Code", "Item Description", "Barcode"].map((opt) => {
              const checked = seoSourceCols.includes(opt);
              return (
                <DropdownMenuCheckboxItem
                  key={opt}
                  checked={checked}
                  onCheckedChange={(v) =>
                    dispatch(
                      productsSlice.actions.setSeoSourceCols(
                        v
                          ? [...new Set([...seoSourceCols, opt])]
                          : seoSourceCols.filter((x) => x !== opt)
                      )
                    )
                  }
                >
                  {opt}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-wrap gap-2">
          {seoSourceCols.map((s) => (
            <Badge key={s} variant="secondary" className="cursor-default">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Select SEO fields to generate</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Targets</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {["title", "short description", "long description"].map((opt) => {
              const checked = seoTargets.includes(opt);
              return (
                <DropdownMenuCheckboxItem
                  key={opt}
                  checked={checked}
                  onCheckedChange={(v) =>
                    dispatch(
                      productsSlice.actions.setSeoTargets(
                        v
                          ? [...new Set([...seoTargets, opt])]
                          : seoTargets.filter((x) => x !== opt)
                      )
                    )
                  }
                >
                  {opt}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-wrap gap-2">
          {seoTargets.map((s) => (
            <Badge key={s} variant="secondary" className="cursor-default">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{lang}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["English", "Greek"].map((l) => (
              <DropdownMenuItem
                key={l}
                onClick={() => dispatch(productsSlice.actions.setLang(l))}
              >
                {l}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={runGenerateSEO} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Generate SEO"}
        </Button>
        <Button
          variant="outline"
          onClick={downloadSeoCsv}
          disabled={isProcessing}
        >
          Download SEO CSV
        </Button>
      </div>
    </div>
  );

  const ImagesToolbar = () => (
    <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
      <Button
        variant="outline"
        onClick={editPageImages}
        disabled={isProcessing}
      >
        Edit Page Images
      </Button>
      <Button
        variant="outline"
        onClick={findImagesForSelected}
        disabled={isProcessing || selected.length === 0}
      >
        Find Images For Selected Items
      </Button>
      <Button variant="outline" onClick={loadAllImages} disabled={isProcessing}>
        Find Images For All Items
      </Button>
      <Button
        onClick={() => {
          const header = "id,itemCode,barcode,imageUrl\n";
          const body = rows
            .filter((r) => r.imageUrl)
            .map(
              (r) =>
                `${r.id},"${(r.itemCode || "").replace(/"/g, '""')}",${
                  r.barcode
                },"${r.imageUrl}"`
            )
            .join("\n");
          const blob = new Blob([header + body], {
            type: "text/csv;charset=utf-8",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "images.csv";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }}
      >
        Download Images
      </Button>
      {isProcessing && (
        <div className="text-sm text-muted-foreground ml-2">
          {progress.completed} of {progress.total} completed
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {!acceptedInfo && (
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <CSVReader
            onUploadAccepted={(res, file) => onUpload(res, file)}
            config={{ header: true, skipEmptyLines: true }}
          >
            {({ getRootProps }) => (
              <div
                {...getRootProps()}
                className="border rounded-lg px-6 py-3 cursor-pointer select-none bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Upload CSV
              </div>
            )}
          </CSVReader>
        </div>
      )}

      {acceptedInfo && (
        <>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <FileChip />
              <CSVReader
                onUploadAccepted={(res, file) => onUpload(res, file)}
                config={{ header: true, skipEmptyLines: true }}
              >
                {({ getRootProps }) => (
                  <Button variant="outline" size="sm" {...getRootProps()}>
                    Replace CSV
                  </Button>
                )}
              </CSVReader>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() =>
                  dispatch(productsSlice.actions.setShowChoice(true))
                }
              >
                Change Selected Option
              </Button>
            </div>
          </div>

          {mode === "seo" ? <SeoToolbar /> : <ImagesToolbar />}

          {isProcessing && <ProgressBar />}

          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-0">
              <DataGrid
                dataSource={mutableDisplayedRows}
                keyExpr="id"
                showBorders={true}
                columnAutoWidth={true}
                allowColumnReordering={true}
                allowColumnResizing={true}
                height="70vh"
                onInitialized={(e) => {
                  gridRef.current = e.component;
                }}
                onRowInserted={onRowInserted}
                onRowUpdated={onRowUpdated}
                onRowRemoved={onRowRemoved}
                onSelectionChanged={(e) =>
                  dispatch(
                    productsSlice.actions.setSelected(
                      deepCopy(e.selectedRowKeys)
                    )
                  )
                }
              >
                <Selection mode="multiple" showCheckBoxesMode="always" />
                <SearchPanel visible={true} placeholder="Search..." />
                <FilterRow visible={true} />
                <ColumnChooser enabled={true} />
                <ColumnFixing enabled={true} />

                <Column type="selection" width={50} fixed={true} />
                <Column
                  caption="№"
                  width={60}
                  cellRender={(c) => <span>{c.rowIndex + 1}</span>}
                  allowSorting={false}
                  allowFiltering={false}
                  fixed={true}
                />
                <Column dataField="itemCode" caption="Item Code" width={120} />
                <Column dataField="barcode" caption="Barcode" width={150} />
                <Column
                  dataField="description"
                  caption="Item Description"
                  minWidth={200}
                />
                <Column
                  dataField="weight"
                  caption="Weight"
                  dataType="number"
                  width={100}
                />
                <Column
                  caption="Images"
                  width={150}
                  cellRender={(cell) => <ImageCell data={cell.data} />}
                  readily={true}
                  allowFiltering={false}
                />
                <Column
                  dataField="seoTitle"
                  caption="SEO Title"
                  visible={mode === "seo"}
                />
                <Column
                  dataField="seoShort"
                  caption="SEO Short"
                  visible={mode === "seo"}
                />
                <Column
                  dataField="seoLong"
                  caption="SEO Long"
                  visible={mode === "seo"}
                />

                <Editing
                  mode="row"
                  useIcons={false}
                  allowAdding={true}
                  allowUpdating={true}
                  allowDeleting={true}
                />

                <Pager
                  showInfo={true}
                  showNavigationButtons={true}
                  allowedPageSizes={[10, 20, 50, 100]}
                  showPageSizeSelector={true}
                />
                <Paging defaultPageSize={10} />

                <Toolbar>
                  <ToolbarItem name="searchPanel" />
                  <ToolbarItem name="columnChooserButton" />
                </Toolbar>
              </DataGrid>
            </CardContent>
          </Card>

          <Dialog
            open={showChoice}
            onOpenChange={(v) =>
              dispatch(productsSlice.actions.setShowChoice(v))
            }
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Select Processing Mode</DialogTitle>
                <DialogDescription>
                  Choose whether to generate SEO descriptions or find product
                  images. You can switch modes anytime.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-2">
                <label className="inline-flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent">
                  <input
                    type="radio"
                    className="form-radio"
                    name="choice"
                    checked={choice === "seo"}
                    onChange={() =>
                      dispatch(productsSlice.actions.setChoice("seo"))
                    }
                  />
                  <span className="font-medium">SEO Descriptions</span>
                </label>
                <label className="inline-flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent">
                  <input
                    type="radio"
                    className="form-radio"
                    name="choice"
                    checked={choice === "images"}
                    onChange={() =>
                      dispatch(productsSlice.actions.setChoice("images"))
                    }
                  />
                  <span className="font-medium">Find Images</span>
                </label>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    dispatch(productsSlice.actions.setShowChoice(false))
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    dispatch(productsSlice.actions.setMode(choice));
                    dispatch(productsSlice.actions.setShowChoice(false));
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
