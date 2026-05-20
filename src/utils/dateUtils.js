export function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function advanceToNextBilling(dateStr, cycle) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr) || new Date(dateStr);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const result = new Date(d);
  while (result < today) {
    if (cycle === 'weekly') result.setDate(result.getDate() + 7);
    else if (cycle === 'yearly') result.setFullYear(result.getFullYear() + 1);
    else result.setMonth(result.getMonth() + 1);
  }
  return result;
}
