/**
 * Groups an array of entries (assets or liabilities) by name,
 * and returns only the entry with the latest date for each name.
 */
export function getLatestEntries(entries) {
  const map = new Map();

  for (const entry of entries) {
    // If date is missing, treat it as a very old date so newer ones with dates overwrite it
    const entryDate = entry.date ? new Date(entry.date) : new Date(0);
    const existing = map.get(entry.name);

    if (!existing) {
      map.set(entry.name, entry);
    } else {
      const existingDate = existing.date ? new Date(existing.date) : new Date(0);
      // Also fallback to created_at if dates are exactly the same or missing
      if (entryDate > existingDate) {
        map.set(entry.name, entry);
      } else if (entryDate.getTime() === existingDate.getTime()) {
        const entryCreated = entry.created_at ? new Date(entry.created_at) : new Date(0);
        const existingCreated = existing.created_at ? new Date(existing.created_at) : new Date(0);
        if (entryCreated > existingCreated) {
          map.set(entry.name, entry);
        }
      }
    }
  }

  return Array.from(map.values());
}
