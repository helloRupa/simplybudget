# Manual Testing Strategy

## 1. First-Time User Setup

- [ ] Load app in fresh browser (clear localStorage first)
- [ ] Verify firstUseDate is set to Monday of current week
- [ ] Verify default categories exist: Food, Transportation, Entertainment, Shopping, Bills, Other
- [ ] Verify default budget is 0 and dashboard reflects that
- [ ] Set a weekly budget in Settings, confirm dashboard updates immediately

## 2. Adding Expenses

### Basic

- [ ] Add expense with all fields (amount, category, date, description)
- [ ] Add expense with only required fields (amount, category, date)
- [ ] Verify success toast appears and auto-dismisses after 3 seconds
- [ ] Verify form resets after submission
- [ ] Verify expense appears in expense list
- [ ] Verify dashboard totals update (Spent This Week, Remaining, Total Saved)

### Validation

- [ ] Submit with empty amount — error shown
- [ ] Submit with amount of 0 — error shown
- [ ] Submit with no category selected — error shown
- [ ] Submit with date before firstUseDate — error shown
- [ ] Verify date picker enforces firstUseDate as minimum

### Volume

- [ ] Add 20+ expenses across multiple categories in the current week
- [ ] Add expenses across 8+ different weeks to populate full bar chart
- [ ] Verify dashboard performance remains responsive with many expenses
- [ ] Verify expense list filtering/sorting works with many entries

### Future-Dated Expenses

- [ ] Add expense with a date in the future
- [ ] Verify it appears in Monthly Spending with dashed/muted styling
- [ ] Verify it is NOT included in "Total Spent to Date" calculation
- [ ] Verify it IS visible in the expense list

## 3. Editing & Deleting Expenses

### Edit

- [ ] Click Edit on an expense — form populates with existing values
- [ ] Change amount only, submit — verify updated in list and dashboard
- [ ] Change category — verify category breakdown updates
- [ ] Change date to different week — verify both weeks' totals update
- [ ] Try changing date to before firstUseDate — error shown
- [ ] Click Cancel — verify no changes made

### Delete

- [ ] Click Delete — verify confirmation buttons appear (Delete / Cancel)
- [ ] Click Cancel on confirmation — verify expense remains
- [ ] Click Delete on confirmation — verify expense removed
- [ ] Verify dashboard totals update after deletion
- [ ] Verify success toast appears

## 4. Dashboard Accuracy

### Summary Cards

- [ ] **Weekly Budget**: Matches value set in Settings
- [ ] **Spent This Week**: Sum of all expenses dated Mon-Sun of current week
- [ ] **Remaining This Week**: Budget minus spent (turns red when over budget)
- [ ] **Total Saved All Time**: Total budgeted (from firstUseDate) minus total spent to date

### Budget Progress Bar

- [ ] Under 70% spent: green
- [ ] 70-90% spent: amber
- [ ] Over 90% spent: red
- [ ] Shows correct "spent / budget" text with currency formatting

### Budget vs Spending Chart

- [ ] Shows exactly 8 bars (most recent 8 weeks)
- [ ] Each bar height matches that week's total spending
- [ ] Dashed reference line shows at budget amount
- [ ] Bar colors reflect spending percentage (green/amber/red)
- [ ] Hover tooltip shows "spent / budget" for each week
- [ ] With fewer than 8 weeks of data, only available weeks shown
- [ ] Empty state message when no data exists

### Top Categories

- [ ] Shows top 5 categories by total spent
- [ ] Percentages add up correctly relative to total spending
- [ ] Progress bars visually match percentages
- [ ] Category with 0 spending does not appear

### Monthly Spending Grid

- [ ] Shows categories with expenses in current month
- [ ] Current/past expenses shown with solid styling
- [ ] Future-dated expenses shown with dashed border, muted opacity
- [ ] Mixed categories show "current + future" split
- [ ] Empty state when no expenses in current month

## 5. Budget History & All-Time Calculation

- [ ] Set budget to $100, add expenses for 2 weeks
- [ ] Change budget to $150 in Settings
- [ ] Verify Total Saved All Time uses $100 for old weeks, $150 for new weeks
- [ ] Verify bar chart reference line reflects correct budget per week
- [ ] Change budget multiple times, verify calculation stays accurate

## 6. Recurring Expenses

### Creation

- [ ] Create weekly recurring (e.g., every Monday)
- [ ] Create monthly recurring (e.g., 15th of month)
- [ ] Create annually recurring (e.g., January 1st)
- [ ] Verify generated expenses appear in expense list with recurring icon
- [ ] Verify generated expenses have correct amounts, categories, dates

### Frequency-Specific

- [ ] Weekly: Verify correct day of week is used
- [ ] Monthly on 31st: Verify clamping (Feb 28/29, Apr 30, etc.)
- [ ] Annually: Verify only generates once per year
- [ ] With start date in the past: Verify retroactive generation

### End Dates

- [ ] Create recurring with end date — verify no expenses generated after end date
- [ ] Create recurring with no end date — verify it continues indefinitely
- [ ] Edit end date to stop future generation

### Edit & Delete

- [ ] Edit recurring expense — verify future generation uses new values
- [ ] Delete recurring expense — verify existing generated expenses remain
- [ ] Verify no new expenses generated after deletion

## 7. Expense List Filtering & Sorting

### Filters

- [ ] Search by description text — matches correctly
- [ ] Search by category name — matches correctly
- [ ] Search by amount (as string) — matches correctly
- [ ] Filter by single category dropdown
- [ ] Filter by date range (from only, to only, both)
- [ ] Combine multiple filters — AND logic applied
- [ ] Clear Filters button resets all filters
- [ ] Clear Filters button only visible when filters are active

### Sorting

- [ ] Click Date header — sorts descending, click again — ascending
- [ ] Click Amount header — sorts descending, click again — ascending
- [ ] Click Category header — sorts descending, click again — ascending
- [ ] Sort indicator arrows show correct direction

## 8. Category Management

- [ ] Add custom category — appears in category list and expense form dropdown
- [ ] Try adding duplicate (case-insensitive) — error toast shown
- [ ] Try adding empty category — rejected
- [ ] Delete custom category — removed from list
- [ ] Verify default 6 categories cannot be deleted (no delete button)
- [ ] Verify existing expenses retain deleted category name

## 9. Export & Import

### CSV Export

- [ ] Export CSV — file downloads with correct name format
- [ ] Open CSV — verify headers: Date, Amount, Category, Description
- [ ] Verify all expenses are included
- [ ] Verify amounts and dates use locale-appropriate formatting

### JSON Backup Export

- [ ] Export backup — file downloads with correct name format
- [ ] Open JSON — verify it contains: expenses, weeklyBudget, categories, firstUseDate, locale, currency, recurringExpenses, budgetHistory
- [ ] Verify version and exportedAt metadata present

### JSON Backup Import

- [ ] Export backup, clear localStorage, import backup — all data restored
- [ ] Verify expenses, budget, categories, recurring, locale, currency all match
- [ ] Verify dashboard totals are correct after import
- [ ] Try importing invalid file — error message shown
- [ ] Try importing non-JSON file — error message shown
- [ ] Verify confirmation dialog appears before replacing data

### Cross-Device Scenario

- [ ] Export from one browser, import in another — full data transfer
- [ ] Export, add more expenses, import old backup — confirms data replacement

## 10. Localization

### Language Switching

- [ ] Switch to Spanish — all UI labels translated
- [ ] Switch to French — all UI labels translated
- [ ] Switch back to English — everything reverts
- [ ] Verify category names translate (default categories only)
- [ ] Verify date formatting matches locale
- [ ] Verify language persists on page reload

### Currency

- [ ] Switch to each currency (USD, GBP, EUR, CAD, AUD, JPY, INR, MXN, BRL, CHF)
- [ ] Verify symbol/format is correct everywhere (dashboard, expense list, charts, form)
- [ ] JPY: Verify no decimal places shown
- [ ] Verify currency persists on page reload

## 11. Responsive Design

### Desktop (> 1024px)

- [ ] Dashboard summary cards in 4-column grid
- [ ] Chart and categories side by side
- [ ] Expense list as full table with all columns
- [ ] Filters in 4-column layout

### Tablet (800px - 1024px)

- [ ] Summary cards in 2-column grid
- [ ] Navigation tabs still in header

### Mobile (< 800px)

- [ ] Navigation tabs wrap below header as full-width buttons
- [ ] Expense list renders as cards (not table)
- [ ] Forms stack to single column
- [ ] Filters in 1-2 columns
- [ ] Monthly category grid adjusts to 2 columns

## 12. Edge Cases

- [ ] Refresh page mid-session — all data persists from localStorage
- [ ] Open app in two tabs, add expense in one — other tab shows stale data until refresh
- [ ] Very large expense amount (e.g., 999999.99) — formatting doesn't break layout
- [ ] Very long description — text truncates or wraps gracefully
- [ ] Delete all expenses — dashboard shows empty states correctly
- [ ] Delete all categories except one — can still add expenses
- [ ] Set budget, never add expenses — Total Saved shows full budget amount
