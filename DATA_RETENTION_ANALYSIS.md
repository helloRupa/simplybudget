# Data Retention & Truncation Analysis

## Current State

- All expenses stored indefinitely in localStorage as a flat JSON array
- Single expense: ~300 bytes
- localStorage browser limit: 5-10 MB per domain
- No pagination, archival, or pruning logic exists
- Dashboard stats and expense list operate on the full dataset in-memory

## When Truncation Becomes Relevant

### Storage Limits

A heavy user logging 5 expenses/day accumulates ~500 KB/year. That gives 10-20 years before hitting browser localStorage limits. Mobile Safari is more aggressive about evicting localStorage under storage pressure, which is a bigger risk than hitting the cap.

### Performance Degradation

All filtering, sorting, and dashboard aggregation runs client-side via `useMemo` over the full expense array. The expense list renders all filtered results with no pagination. Expect noticeable slowdown around 10,000-20,000+ expenses (~5+ years of heavy use).

## Recommended Strategy: Archive, Don't Truncate

Financial data should never be silently deleted. An archive model is safer:

- Keep recent data active (e.g., current year + last year) in localStorage
- Archive older data into a downloadable backup, then remove from active storage
- Let the user control when archival happens

### localStorage Changes

- Add an `archivedBefore` date field to BudgetState
- Active data = expenses with dates after `archivedBefore`
- Dashboard and charts already filter by date ranges, so they'd naturally scope to active data

### Export/Import Considerations

- The existing JSON backup (`backup.ts`) exports full state — after archival it would contain only active data, which is correct
- Add a separate "archive export" that saves old data before removing it
- Import (`parseBackup`) replaces state entirely, so importing an old archive restores that period's data without changes to the parser
- Consider bumping the backup format `version` if the `archivedBefore` field is added, with backward-compatible parsing

### User Flow

1. User reaches a threshold or chooses to archive manually via Settings
2. App prompts: "Archive expenses older than [date]?"
3. Auto-downloads an archive file (JSON backup of the archived portion)
4. Removes archived expenses from localStorage
5. Stores `archivedBefore` date so the app knows what's been offloaded

## Simpler Wins to Prioritize First

These defer the need for archival and address the earliest pain points:

1. **Pagination on the expense list** — first thing that will feel slow as data grows
2. **Storage usage indicator in Settings** — lets users see when they're approaching limits
3. **Archive feature** — build when the above two signal it's needed
