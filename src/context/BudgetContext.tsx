'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { Expense } from '@/types';
import { DEFAULT_CATEGORIES, STORAGE_KEYS } from '@/utils/constants';
import { getItem, setItem } from '@/utils/storage';
import { toISODate } from '@/utils/dates';
import { locales, LocaleKey, TranslationKey } from '@/i18n/locales';
import { v4 as uuidv4 } from 'uuid';

interface State {
  expenses: Expense[];
  weeklyBudget: number;
  categories: string[];
  firstUseDate: string;
  locale: LocaleKey;
}

type Action =
  | { type: 'SET_INITIAL'; payload: State }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'SET_WEEKLY_BUDGET'; payload: number }
  | { type: 'ADD_CATEGORY'; payload: string }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SET_LOCALE'; payload: LocaleKey };

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
    case 'SET_WEEKLY_BUDGET':
      return { ...state, weeklyBudget: action.payload };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c !== action.payload),
      };
    case 'SET_LOCALE':
      return { ...state, locale: action.payload };
    default:
      return state;
  }
}

const initialState: State = {
  expenses: [],
  weeklyBudget: 200,
  categories: [...DEFAULT_CATEGORIES],
  firstUseDate: toISODate(new Date()),
  locale: 'en',
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
  t: (key: TranslationKey) => string;
  isLoaded: boolean;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const today = toISODate(new Date());
    const loaded: State = {
      expenses: getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []),
      weeklyBudget: getItem<number>(STORAGE_KEYS.WEEKLY_BUDGET, 200),
      categories: getItem<string[]>(STORAGE_KEYS.CATEGORIES, [...DEFAULT_CATEGORIES]),
      firstUseDate: getItem<string>(STORAGE_KEYS.FIRST_USE_DATE, today),
      locale: getItem<LocaleKey>(STORAGE_KEYS.LOCALE, 'en'),
    };
    // Set first use date if not set
    if (!localStorage.getItem(STORAGE_KEYS.FIRST_USE_DATE)) {
      setItem(STORAGE_KEYS.FIRST_USE_DATE, today);
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
    setItem(STORAGE_KEYS.LOCALE, state.locale);
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

  const t = useCallback(
    (key: TranslationKey): string => {
      return locales[state.locale]?.[key] ?? locales.en[key] ?? key;
    },
    [state.locale]
  );

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
        t,
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
