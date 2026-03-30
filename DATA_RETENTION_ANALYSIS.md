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

### Preserving All-Time Calculations

The dashboard computes all-time saved/overspent as `totalBudgeted - totalSpentToDate`, where `totalSpentToDate` sums every expense in state. Category breakdowns also iterate the full expense array. If archived expenses are simply removed, these calculations lose historical data and become inaccurate (spending appears lower than reality, savings appear inflated).

To fix this, store a running summary when archiving:

```ts
archivedSummary: {
  totalSpent: number;                      // sum of all archived expense amounts
  categoryTotals: Record<string, number>;  // per-category sums of archived expenses
  archivedBefore: string;                  // date cutoff
}
```

Dashboard calculations then merge archived and active data:

- `totalSpentToDate = archivedSummary.totalSpent + sum(active expenses)`
- `categoryTotals = merge(archivedSummary.categoryTotals, active category totals)`

The budget side (`getTotalBudgeted`) derives from `firstUseDate` + `budgetHistory`, neither of which is archived, so it needs no changes.

If the user archives multiple times, each archive operation should update the single `archivedSummary` by adding to the existing totals and advancing the `archivedBefore` date.

### localStorage Changes

- Add `archivedSummary` (as above) to BudgetState
- Active data = expenses with dates after `archivedSummary.archivedBefore`
- Dashboard and charts merge archived summary with active data for all-time views
- Week/month scoped views (current week, current month) are unaffected since they already filter by date range

### Export/Import Considerations

- The existing JSON backup (`backup.ts`) exports full state — after archival it would contain only active data, which is correct
- Add a separate "archive export" that saves old data before removing it
- Import (`parseBackup`) replaces state entirely, so importing an old archive restores that period's data without changes to the parser
- Backup must include `archivedSummary` so that imported data retains accurate all-time totals
- Consider bumping the backup format `version` if `archivedSummary` is added, with backward-compatible parsing

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
