import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// "Showing a-b of N" + prev / numbered pages / next + per-page select.
// Fully controlled: the parent owns page/pageSize and slices its own rows.
export const TablePagination = ({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 25, 50], noun = 'record' }) => {
  if (total <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;

  // Always first/last plus a window around the current page; null = "…" gap.
  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set([1, totalPages, current - 1, current, current + 1]);
    const sorted = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
  })();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-400 font-inter">
        Showing {start + 1}-{Math.min(start + pageSize, total)} of {total} {noun}{total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          {pageNumbers.map((p, i) => (p === null ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-gray-400 font-inter">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold font-inter transition-colors ${
                p === current ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )))}
          <button
            type="button"
            disabled={current >= totalPages}
            onClick={() => onPageChange(current + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-inter text-gray-600 outline-none"
        >
          {pageSizes.map((n) => <option key={n} value={n}>{n} per page</option>)}
        </select>
      </div>
    </div>
  );
};

export default TablePagination;
