export const DEFAULT_CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

export const STORAGE_KEYS = {
  EXPENSES: "simplybudget_expenses",
  WEEKLY_BUDGET: "simplybudget_weekly_budget",
  CATEGORIES: "simplybudget_categories",
  FIRST_USE_DATE: "simplybudget_first_use_date",
  LOCALE: "simplybudget_locale",
  CURRENCY: "simplybudget_currency",
  RECURRING_EXPENSES: "simplybudget_recurring_expenses",
  BUDGET_HISTORY: "simplybudget_budget_history",
} as const;

export type CurrencyCode =
  | "USD"
  | "GBP"
  | "EUR"
  | "CAD"
  | "AUD"
  | "JPY"
  | "INR"
  | "MXN"
  | "BRL"
  | "CHF";

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, string> = {
  USD: "US Dollar ($)",
  GBP: "British Pound (£)",
  EUR: "Euro (€)",
  CAD: "Canadian Dollar (CA$)",
  AUD: "Australian Dollar (A$)",
  JPY: "Japanese Yen (¥)",
  INR: "Indian Rupee (₹)",
  MXN: "Mexican Peso (MX$)",
  BRL: "Brazilian Real (R$)",
  CHF: "Swiss Franc (CHF)",
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f97316",
  Transportation: "#3b82f6",
  Entertainment: "#a855f7",
  Shopping: "#ec4899",
  Bills: "#ef4444",
  Other: "#6b7280",
};

export function getCategoryColor(category: string): string {
  return (
    CATEGORY_COLORS[category] || `hsl(${hashString(category) % 360}, 65%, 55%)`
  );
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
