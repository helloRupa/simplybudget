'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { Expense, RecurringExpense, WeeklyBudget } from '@/types';
import { generatePendingExpenses } from '@/utils/recurring';
import { DEFAULT_CATEGORIES, STORAGE_KEYS, CurrencyCode } from '@/utils/constants';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency';
import { getItem, setItem } from '@/utils/storage';
import { toISODate, formatDate, getWeekRange } from '@/utils/dates';
import { parseISO } from 'date-fns';
import { locales, LocaleKey, TranslationKey, categoryTranslations } from '@/i18n/locales';
import { v4 as uuidv4 } from 'uuid';

interface State {
  expenses: Expense[];
  weeklyBudget: number;
  categories: string[];
  firstUseDate: string;
  locale: LocaleKey;
  currency: CurrencyCode;
  recurringExpenses: RecurringExpense[];
  budgetHistory: WeeklyBudget[];
}

type Action =
  | { type: 'SET_INITIAL'; payload: State }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'SET_WEEKLY_BUDGET'; payload: number }
  | { type: 'ADD_CATEGORY'; payload: string }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SET_LOCALE'; payload: LocaleKey }
  | { type: 'SET_CURRENCY'; payload: CurrencyCode }
  | { type: 'ADD_RECURRING_EXPENSE'; payload: RecurringExpense }
  | { type: 'UPDATE_RECURRING_EXPENSE'; payload: RecurringExpense }
  | { type: 'DELETE_RECURRING_EXPENSE'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_INITIAL':
      return action.payload;
    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };
    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.payload),
      };
    case 'SET_WEEKLY_BUDGET': {
      const weekStart = toISODate(getWeekRange().start);
      const existing = state.budgetHistory.findIndex((b) => b.startDate === weekStart);
      const newEntry: WeeklyBudget = { amount: action.payload, startDate: weekStart };
      const updatedHistory =
        existing >= 0
          ? state.budgetHistory.map((b, i) => (i === existing ? newEntry : b))
          : [...state.budgetHistory, newEntry].sort((a, b) => a.startDate.localeCompare(b.startDate));
      return { ...state, weeklyBudget: action.payload, budgetHistory: updatedHistory };
    }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c !== action.payload),
      };
    case 'SET_LOCALE':
      return { ...state, locale: action.payload };
    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };
    case 'ADD_RECURRING_EXPENSE':
      return { ...state, recurringExpenses: [...state.recurringExpenses, action.payload] };
    case 'UPDATE_RECURRING_EXPENSE':
      return {
        ...state,
        recurringExpenses: state.recurringExpenses.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_RECURRING_EXPENSE':
      return {
        ...state,
        recurringExpenses: state.recurringExpenses.filter((r) => r.id !== action.payload),
      };
    default:
      return state;
  }
}

const initialState: State = {
  expenses: [],
  weeklyBudget: 200,
  categories: [...DEFAULT_CATEGORIES],
  firstUseDate: toISODate(getWeekRange().start),
  locale: 'en',
  currency: 'USD',
  recurringExpenses: [],
  budgetHistory: [],
};

interface BudgetContextValue {
  state: State;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  setWeeklyBudget: (amount: number) => void;
  addCategory: (name: string) => boolean;
  deleteCategory: (name: string) => void;
  setLocale: (locale: LocaleKey) => void;
  setCurrency: (currency: CurrencyCode) => void;
  importData: (data: State) => void;
  addRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'createdAt' | 'lastGeneratedDate'>) => void;
  updateRecurringExpense: (expense: RecurringExpense) => void;
  deleteRecurringExpense: (id: string) => void;
  t: (key: TranslationKey) => string;
  tc: (category: string) => string;
  fc: (amount: number) => string;
  fd: (dateStr: string) => string;
  currencySymbol: string;
  intlLocale: string;
  isLoaded: boolean;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const weekStart = toISODate(getWeekRange().start);
    const storedFirstUse = getItem<string>(STORAGE_KEYS.FIRST_USE_DATE, weekStart);
    const firstUseDate = toISODate(getWeekRange(parseISO(storedFirstUse)).start);
    const loaded: State = {
      expenses: getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []),
      weeklyBudget: getItem<number>(STORAGE_KEYS.WEEKLY_BUDGET, 200),
      categories: getItem<string[]>(STORAGE_KEYS.CATEGORIES, [...DEFAULT_CATEGORIES]),
      firstUseDate,
      locale: getItem<LocaleKey>(STORAGE_KEYS.LOCALE, 'en'),
      currency: getItem<CurrencyCode>(STORAGE_KEYS.CURRENCY, 'USD'),
      recurringExpenses: getItem<RecurringExpense[]>(STORAGE_KEYS.RECURRING_EXPENSES, []),
      budgetHistory: getItem<WeeklyBudget[]>(STORAGE_KEYS.BUDGET_HISTORY, []),
    };
    // Migration: seed budget history for existing users
    if (loaded.budgetHistory.length === 0) {
      loaded.budgetHistory = [{ amount: loaded.weeklyBudget, startDate: loaded.firstUseDate }];
      setItem(STORAGE_KEYS.BUDGET_HISTORY, loaded.budgetHistory);
    }
    // Set first use date if not set, and persist the week-aligned value
    if (!localStorage.getItem(STORAGE_KEYS.FIRST_USE_DATE)) {
      setItem(STORAGE_KEYS.FIRST_USE_DATE, weekStart);
    } else if (storedFirstUse !== firstUseDate) {
      setItem(STORAGE_KEYS.FIRST_USE_DATE, firstUseDate);
    }

    // Generate any pending recurring expenses
    if (loaded.recurringExpenses.length > 0) {
      const { newExpenses, updatedRecurringExpenses } = generatePendingExpenses(
        loaded.recurringExpenses,
        new Date(),
      );
      if (newExpenses.length > 0) {
        loaded.expenses = [...newExpenses, ...loaded.expenses];
        loaded.recurringExpenses = updatedRecurringExpenses;
        setItem(STORAGE_KEYS.EXPENSES, loaded.expenses);
        setItem(STORAGE_KEYS.RECURRING_EXPENSES, loaded.recurringExpenses);
      }
    }

    dispatch({ type: 'SET_INITIAL', payload: loaded });
    setIsLoaded(true);
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    setItem(STORAGE_KEYS.EXPENSES, state.expenses);
    setItem(STORAGE_KEYS.WEEKLY_BUDGET, state.weeklyBudget);
    setItem(STORAGE_KEYS.CATEGORIES, state.categories);
    setItem(STORAGE_KEYS.FIRST_USE_DATE, state.firstUseDate);
    setItem(STORAGE_KEYS.LOCALE, state.locale);
    setItem(STORAGE_KEYS.CURRENCY, state.currency);
    setItem(STORAGE_KEYS.RECURRING_EXPENSES, state.recurringExpenses);
    setItem(STORAGE_KEYS.BUDGET_HISTORY, state.budgetHistory);
  }, [state, isLoaded]);

  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
  }, []);

  const updateExpense = useCallback((expense: Expense) => {
    dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    dispatch({ type: 'DELETE_EXPENSE', payload: id });
  }, []);

  const setWeeklyBudget = useCallback((amount: number) => {
    dispatch({ type: 'SET_WEEKLY_BUDGET', payload: amount });
  }, []);

  const addCategory = useCallback((name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (state.categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    dispatch({ type: 'ADD_CATEGORY', payload: trimmed });
    return true;
  }, [state.categories]);

  const deleteCategory = useCallback((name: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: name });
  }, []);

  const setLocale = useCallback((locale: LocaleKey) => {
    dispatch({ type: 'SET_LOCALE', payload: locale });
  }, []);

  const setCurrency = useCallback((currency: CurrencyCode) => {
    dispatch({ type: 'SET_CURRENCY', payload: currency });
  }, []);

  const addRecurringExpense = useCallback((expense: Omit<RecurringExpense, 'id' | 'createdAt' | 'lastGeneratedDate'>) => {
    const newRecurring: RecurringExpense = {
      ...expense,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      lastGeneratedDate: null,
    };
    dispatch({ type: 'ADD_RECURRING_EXPENSE', payload: newRecurring });

    // Immediately generate any pending expenses for this new recurring expense
    const { newExpenses, updatedRecurringExpenses } = generatePendingExpenses(
      [newRecurring],
      new Date(),
    );
    if (newExpenses.length > 0) {
      newExpenses.forEach((exp) => dispatch({ type: 'ADD_EXPENSE', payload: exp }));
      const updated = updatedRecurringExpenses[0];
      dispatch({ type: 'UPDATE_RECURRING_EXPENSE', payload: updated });
    }
  }, []);

  const updateRecurringExpense = useCallback((expense: RecurringExpense) => {
    dispatch({ type: 'UPDATE_RECURRING_EXPENSE', payload: expense });
  }, []);

  const deleteRecurringExpense = useCallback((id: string) => {
    dispatch({ type: 'DELETE_RECURRING_EXPENSE', payload: id });
  }, []);

  const importData = useCallback((data: State) => {
    dispatch({ type: 'SET_INITIAL', payload: data });
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return locales[state.locale]?.[key] ?? locales.en[key] ?? key;
    },
    [state.locale]
  );

  const tc = useCallback(
    (category: string): string => {
      return categoryTranslations[state.locale]?.[category] ?? category;
    },
    [state.locale]
  );

  const LOCALE_TO_INTL: Record<LocaleKey, string> = { en: 'en-US', es: 'es', fr: 'fr' };

  const fc = useCallback(
    (amount: number): string => {
      return formatCurrency(amount, LOCALE_TO_INTL[state.locale], state.currency);
    },
    [state.locale, state.currency]
  );

  const fd = useCallback(
    (dateStr: string): string => {
      return formatDate(dateStr, LOCALE_TO_INTL[state.locale]);
    },
    [state.locale]
  );

  const intlLocale = LOCALE_TO_INTL[state.locale];
  const currencySymbol = getCurrencySymbol(state.currency, intlLocale);

  return (
    <BudgetContext.Provider
      value={{
        state,
        addExpense,
        updateExpense,
        deleteExpense,
        setWeeklyBudget,
        addCategory,
        deleteCategory,
        setLocale,
        setCurrency,
        importData,
        addRecurringExpense,
        updateRecurringExpense,
        deleteRecurringExpense,
        t,
        tc,
        fc,
        fd,
        currencySymbol,
        intlLocale,
        isLoaded,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}
