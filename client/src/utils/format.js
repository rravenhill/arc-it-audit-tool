// The local calendar date as "YYYY-MM-DD" - new Date().toISOString() gives the UTC
// date instead, which is the wrong calendar day for part of the day in any timezone
// with a non-zero offset (e.g. just after midnight BST is still the previous day in UTC).
export function todayIsoDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDate(value) {
  if (!value) return '';
  // Format date-only values straight from their string components - routing them
  // through Date/toLocaleDateString applies the browser's timezone to a UTC-midnight
  // instant, which can shift the displayed day in timezones behind UTC.
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return `${d}/${m}/${y}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB');
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;

export function formatCellValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && ISO_TIMESTAMP.test(value)) return formatDate(value);
  return String(value);
}

export function formatStatus(status) {
  if (!status) return '';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
