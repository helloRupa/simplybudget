export const DEFAULT_CATEGORIES = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
] as const;

export const STORAGE_KEYS = {
  EXPENSES: 'simplybudget_expenses',
  WEEKLY_BUDGET: 'simplybudget_weekly_budget',
  CATEGORIES: 'simplybudget_categories',
  FIRST_USE_DATE: 'simplybudget_first_use_date',
  LOCALE: 'simplybudget_locale',
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Transportation: '#3b82f6',
  Entertainment: '#a855f7',
  Shopping: '#ec4899',
  Bills: '#ef4444',
  Other: '#6b7280',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || `hsl(${hashString(category) % 360}, 65%, 55%)`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
