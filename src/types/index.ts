export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO datetime
  recurringExpenseId?: string; // links to RecurringExpense that generated this
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'annually';

export interface RecurringExpense {
  id: string;
  amount: number;
  category: string;
  description: string;
  frequency: RecurringFrequency; // defaults to 'monthly' for legacy data
  dayOfMonth: number; // 1-31 (used for monthly/annually)
  dayOfWeek?: number; // 0=Sunday..6=Saturday (used for weekly)
  monthOfYear?: number; // 0=Jan..11=Dec (used for annually)
  createdAt: string; // ISO datetime
  startDate: string; // ISO date YYYY-MM-DD — first occurrence this applies
  endDate: string | null; // ISO date or null (indefinite)
  lastGeneratedDate: string | null; // ISO date of most recent generated expense
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
