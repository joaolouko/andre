"use client";

import React, { useState } from "react";
import { Search, Plus, Loader2, Inbox } from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  onAdd?: () => void;
  addButtonLabel?: string;
  emptyMessage?: string;
}

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading,
  searchPlaceholder = "Buscar registros...",
  searchFilter,
  onAdd,
  addButtonLabel = "Adicionar Novo",
  emptyMessage = "Nenhum registro encontrado.",
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) return data;
    return data.filter((item) => searchFilter(item, searchQuery.toLowerCase()));
  }, [data, searchQuery, searchFilter]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 border-b border-slate-100 bg-white">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shrink-0"
          >
            <Plus size={16} />
            <span>{addButtonLabel}</span>
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-3.5 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">
                      Carregando dados...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400">
                      <Inbox size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {emptyMessage}
                      </p>
                      {searchQuery && (
                        <p className="text-xs text-slate-400 mt-1">
                          Nenhum resultado corresponde à busca &quot;{searchQuery}&quot;
                        </p>
                      )}
                    </div>
                    {onAdd && !searchQuery && (
                      <button
                        onClick={onAdd}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Plus size={14} />
                        <span>{addButtonLabel}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => (
                <tr
                  key={row.id ?? rowIdx}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-6 py-4 ${col.className || ""}`}
                    >
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? "")
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      {!isLoading && filteredData.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-xs text-slate-400 bg-slate-50/30">
          <span>
            Exibindo {filteredData.length} de {data.length} registro(s)
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-blue-600 hover:underline"
            >
              Limpar filtro de busca
            </button>
          )}
        </div>
      )}
    </div>
  );
}

