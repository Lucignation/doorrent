import type { ReactNode } from "react";
import type { TableColumn } from "../../types/app";

interface DataTableProps<T extends object> {
  columns: TableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
}

type KeyableRow = {
  id?: string | number;
  reference?: string;
  ticket?: string;
};

export default function DataTable<T extends object>({
  columns,
  rows,
  emptyMessage = "No records.",
  loading = false,
  loadingMessage = "Refreshing records...",
}: DataTableProps<T>) {
  const isLoading = loading || /^loading\b/i.test(emptyMessage);

  return (
    <div className={`table-wrap${isLoading ? " table-wrap-loading" : ""}`}>
      <table aria-busy={isLoading}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr
                key={
                  (row as KeyableRow).id ||
                  (row as KeyableRow).reference ||
                  (row as KeyableRow).ticket ||
                  rowIndex
                }
              >
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render
                      ? column.render(row)
                      : ((row as Record<string, ReactNode | undefined>)[column.key] ?? null)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--ink2)" }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {isLoading ? (
        <div className="table-loading-overlay" role="status" aria-live="polite">
          <div className="table-loading-spinner" />
          <div className="table-loading-title">Loading table data</div>
          <div className="table-loading-message">{loading ? loadingMessage : emptyMessage}</div>
        </div>
      ) : null}
    </div>
  );
}
