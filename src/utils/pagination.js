// Page buttons with ellipses: 1 2 3 4 5 … 10.
export const pageItems = (current, count) => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', count];
  if (current >= count - 3) return [1, '…', count - 4, count - 3, count - 2, count - 1, count];
  return [1, '…', current - 1, current, current + 1, '…', count];
};

// "Showing 1–10 of 17" bounds for the current page.
export const pageRange = (page, pageSize, total) => ({
  from: total === 0 ? 0 : (page - 1) * pageSize + 1,
  to: Math.min(page * pageSize, total),
});
