import React from "react";
import { Header, flexRender } from "@tanstack/react-table";
import {
  TableHead,
} from "@/components/ui/table";
import {
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Product } from "@/services/productService";
import { config } from "@/config/config";

/**
 * One column header with clickable sort controls.
 * Pure presentational – no local state.
 */
export interface SortableTableHeaderProps {
  id: string;
  header: Header<Product, unknown>;
}

export function SortableTableHeader({
  id,
  header,
}: SortableTableHeaderProps) {
  // Get reference to the productsTable config section
  const tableConfig = config.productsTable;

  const column   = header.column;
  const isSorted = column.getIsSorted();

  // Don't show sort arrow on the checkbox column
  if (id === "select") {
    return (
      <TableHead key={header.id} className="w-10 bg-gray-100 font-semibold">
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
      </TableHead>
    );
  }

  // Special styling for action column
  if (id === "actions") {
    return (
      <TableHead
        key={header.id}
        style={{ width: header.getSize() }}
        className="px-2 bg-slate-950/12 text-gray-700 font-semibold text-sm tracking-wide border-b border-gray-200 text-center whitespace-nowrap sticky right-0 z-30 min-w-[90px]"
      >
        <div className="flex items-center justify-center border-l border-slate-300/40 pl-2">
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      </TableHead>
    );
  }

  // which arrow?
  const sortIcon = isSorted === "asc" ? (
    <React.Fragment>
      <ArrowUp className="ml-2 h-4 w-4" />
      <span className="sr-only">{tableConfig.display.tableView.sortAscending}</span>
    </React.Fragment>
  ) : isSorted === "desc" ? (
    <React.Fragment>
      <ArrowDown className="ml-2 h-4 w-4" />
      <span className="sr-only">{tableConfig.display.tableView.sortDescending}</span>
    </React.Fragment>
  ) : null;

  // hide some columns on mobile
  const hideMobile = ["brand", "barcode", "created_at", "tags"].includes(id)
    ? "hidden md:table-cell"
    : "";

  return (
    <TableHead
      key={header.id}
      style={{ width: header.getSize() }}
      className={`px-2 ${hideMobile} bg-slate-950/12 text-gray-700 font-semibold text-sm tracking-wide border-b border-gray-200 text-left whitespace-nowrap`}
      onClick={column.getCanSort() ? column.getToggleSortingHandler() : undefined}
      aria-label={column.getCanSort() ? (isSorted ? tableConfig.display.tableView.sortDescending : tableConfig.display.tableView.sortAscending) : undefined}
      role={column.getCanSort() ? "button" : undefined}
      tabIndex={column.getCanSort() ? 0 : undefined}
    >
      <div className="flex items-center">
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
        {column.getCanSort() && sortIcon}
      </div>
    </TableHead>
  );
}
