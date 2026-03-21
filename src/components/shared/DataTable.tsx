import { useState, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Download, LayoutGrid, LayoutList } from "lucide-react";
import Papa from "papaparse";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCta?: React.ReactNode;
  bulkActions?: (selectedIds: string[]) => React.ReactNode;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  showCardView?: boolean;
  cardRenderer?: (row: T) => React.ReactNode;
  toolbarActions?: React.ReactNode;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T>({
  data, columns, loading, searchPlaceholder = "Search...", emptyIcon, emptyTitle = "No data found",
  emptyDescription, emptyCta, bulkActions, getRowId, onRowClick, showCardView, cardRenderer, toolbarActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = (row as any)[col.key];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const paged = useMemo(() => sorted.slice(page * perPage, (page + 1) * perPage), [sorted, page, perPage]);
  const totalPages = Math.ceil(sorted.length / perPage);

  const toggleSort = useCallback((key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
  }, [sortKey, sortDir]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (paged.every(r => selected.has(getRowId(r)))) {
      const next = new Set(selected);
      paged.forEach(r => next.delete(getRowId(r)));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paged.forEach(r => next.add(getRowId(r)));
      setSelected(next);
    }
  };

  const exportCsv = () => {
    const rows = (selected.size > 0 ? sorted.filter(r => selected.has(getRowId(r))) : sorted);
    const csvData = rows.map(row =>
      Object.fromEntries(columns.map(col => [col.header, col.exportValue ? col.exportValue(row) : (row as any)[col.key] ?? ""]))
    );
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={searchPlaceholder} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <div className="flex gap-2 items-center">
          {toolbarActions}
          {showCardView && (
            <div className="flex border rounded-md">
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")}><LayoutList className="h-4 w-4" /></Button>
              <Button variant={viewMode === "card" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("card")}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && bulkActions && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border">
          <span className="text-sm font-medium">{selected.size} selected</span>
          {bulkActions(Array.from(selected))}
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {/* Card view */}
      {viewMode === "card" && cardRenderer ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              {emptyIcon}
              <h3 className="mt-4 font-semibold text-foreground">{emptyTitle}</h3>
              {emptyDescription && <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>}
              {emptyCta && <div className="mt-4">{emptyCta}</div>}
            </div>
          ) : paged.map(row => <div key={getRowId(row)}>{cardRenderer(row)}</div>)}
        </div>
      ) : (
        /* Table view */
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {bulkActions && (
                  <TableHead className="w-10"><Checkbox checked={paged.length > 0 && paged.every(r => selected.has(getRowId(r)))} onCheckedChange={toggleAll} /></TableHead>
                )}
                {columns.map(col => (
                  <TableHead key={col.key} className={col.sortable ? "cursor-pointer select-none" : ""} onClick={() => col.sortable && toggleSort(col.key)}>
                    <div className="flex items-center">{col.header}{col.sortable && <SortIcon col={col.key} />}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (bulkActions ? 1 : 0)} className="h-40">
                    <div className="flex flex-col items-center justify-center text-center">
                      {emptyIcon}
                      <h3 className="mt-4 font-semibold text-foreground">{emptyTitle}</h3>
                      {emptyDescription && <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>}
                      {emptyCta && <div className="mt-4">{emptyCta}</div>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : paged.map(row => (
                <TableRow key={getRowId(row)} className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} onClick={() => onRowClick?.(row)}>
                  {bulkActions && (
                    <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selected.has(getRowId(row))} onCheckedChange={() => toggleSelect(getRowId(row))} /></TableCell>
                  )}
                  {columns.map(col => (
                    <TableCell key={col.key}>{col.render ? col.render(row) : String((row as any)[col.key] ?? "—")}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, sorted.length)} of {sorted.length}</span>
          <div className="flex items-center gap-2">
            <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
