const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function monthIndex(month) {
  const value = String(month || "").trim();
  if (/^\d+$/.test(value)) {
    const index = Number(value) - 1;
    return index >= 0 && index < 12 ? index : -1;
  }
  return MONTHS.findIndex((name) => name.toLowerCase() === value.toLowerCase());
}

export function getProtectionHistoryDate(day, month, year) {
  const parsedDay = Number(day);
  const parsedYear = Number(year);
  const parsedMonth = monthIndex(month);
  if (!Number.isInteger(parsedDay) || !Number.isInteger(parsedYear) || parsedMonth < 0) return null;

  const date = new Date(parsedYear, parsedMonth, parsedDay);
  return date.getFullYear() === parsedYear && date.getMonth() === parsedMonth && date.getDate() === parsedDay
    ? date
    : null;
}

export function getYearsAgoDate(years, today = new Date()) {
  const start = dateOnly(today);
  start.setFullYear(start.getFullYear() - years);
  return start;
}

export function getContinuousHistoryIssues(records, { startDate, label, today = new Date() }) {
  const requiredStart = dateOnly(startDate);
  const requiredEnd = dateOnly(today);
  if (requiredStart > requiredEnd) return [`${label} cannot start in the future.`];

  const intervals = [];
  const issues = [];

  (records || []).forEach((row, index) => {
    const rowLabel = `Entry ${index + 1}`;
    const start = getProtectionHistoryDate(row.date_from_day, row.date_from_month, row.date_from_year);
    if (!start) {
      issues.push(`${rowLabel}: Date From is incomplete or invalid.`);
      return;
    }

    const toValues = [row.date_to_day, row.date_to_month, row.date_to_year].map((value) => String(value || "").trim());
    const filledToValues = toValues.filter(Boolean).length;
    if (filledToValues > 0 && filledToValues < 3) {
      issues.push(`${rowLabel}: Date To is incomplete.`);
      return;
    }

    const end = filledToValues === 3
      ? getProtectionHistoryDate(row.date_to_day, row.date_to_month, row.date_to_year)
      : requiredEnd;
    if (!end) {
      issues.push(`${rowLabel}: Date To is invalid.`);
      return;
    }
    if (end < start) {
      issues.push(`${rowLabel}: Date To cannot be before Date From.`);
      return;
    }
    if (end < requiredStart || start > requiredEnd) return;

    intervals.push({
      start: start < requiredStart ? requiredStart : start,
      end: end > requiredEnd ? requiredEnd : end,
    });
  });

  if (issues.length) return issues;
  if (!intervals.length) return [`Add ${label.toLowerCase()} entries from ${formatDate(requiredStart)} to today.`];

  intervals.sort((a, b) => a.start - b.start);
  let coveredEnd = null;

  intervals.forEach((interval) => {
    if (!coveredEnd) {
      if (interval.start > requiredStart) {
        issues.push(`${label} must start by ${formatDate(requiredStart)}.`);
      }
      coveredEnd = interval.end;
      return;
    }

    if (interval.start.getTime() > coveredEnd.getTime() + MS_PER_DAY) {
      issues.push(`Gap in ${label.toLowerCase()} between ${formatDate(addDays(coveredEnd, 1))} and ${formatDate(addDays(interval.start, -1))}.`);
    }
    if (interval.end > coveredEnd) coveredEnd = interval.end;
  });

  if (coveredEnd < requiredEnd) {
    issues.push(`Gap in ${label.toLowerCase()} between ${formatDate(addDays(coveredEnd, 1))} and ${formatDate(requiredEnd)}.`);
  }

  return issues;
}
