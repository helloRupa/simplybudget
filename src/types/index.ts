export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO datetime
}

export interface WeeklyBudget {
  amount: number;
  startDate: string; // ISO date of the Monday that begins this budget week
}

export interface BudgetState {
  expenses: Expense[];
  weeklyBudget: number;
  categories: string[];
  firstUseDate: string; // ISO date of when user first started using the app
}

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  category: string;
  searchQuery: string;
}

export type SortField = 'date' | 'amount' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}
