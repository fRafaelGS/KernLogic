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
  const column   = header.column;
  const isSorted = column.getIsSorted();

  // Don’t show sort arrow on the checkbox column
  if (id === "select") {
    return (
      <TableHead key={header.id} className="p-2 w-10 bg-gray-100 font-semibold">
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
      </TableHead>
    );
  }

  // which arrow?
  const sortIcon =
    isSorted === "asc"
      ? <ArrowUp  className="ml-2 h-4 w-4" />
      : isSorted === "desc"
      ? <ArrowDown className="ml-2 h-4 w-4" />
      : null;

  // hide some columns on mobile
  const hideMobile = ["brand", "barcode", "created_at", "tags"].includes(id)
    ? "hidden md:table-cell"
    : "";

  return (
    <TableHead
      key={header.id}
      style={{ width: header.getSize() }}
      className={`px-2 py-2 ${hideMobile} bg-slate-950/12 text-gray-700 font-semibold text-sm tracking-wide border-b border-gray-200 text-left whitespace-nowrap`}
      onClick={column.getCanSort() ? column.getToggleSortingHandler() : undefined}
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
