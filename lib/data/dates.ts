// ISO 8601 strings as Dates on one UTC timeline. JavaScript reads a date-only
// string as UTC but a zone-less date-time as local time; appending "Z" to the
// latter puts "2026-01-16" and "2026-01-16T00:07" seven minutes apart everywhere.
export function isoToUtcDate(value: string): Date {
  const zoneless = value.includes("T") && !/(Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(zoneless ? `${value}Z` : value);
}
