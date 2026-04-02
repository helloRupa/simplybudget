'use client';

import { useState, useMemo } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { Expense, FilterState, SortState } from '@/types';
import { isInRange } from '@/utils/dates';
import { getCategoryColor } from '@/utils/constants';
import { subDays, format } from 'date-fns';
import ExpenseFilters from './ExpenseFilters';

interface ExpenseListProps {
  onEdit: (expense: Expense) => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

function getDefaultFilters(): FilterState {
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  return { dateFrom: thirtyDaysAgo, dateTo: today, category: '', searchQuery: '' };
}

function CategoryBadge({ category }: { category: string }) {
  const { tc } = useBudget();
  const color = getCategoryColor(category);
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color + '33', border: `1px solid ${color}55` }}
    >
      <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
      {tc(category)}
    </span>
  );
}

function RecurringIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-teal-400/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function SortIndicator({ field, sort }: { field: SortState['field']; sort: SortState }) {
  if (sort.field !== field) return <span className="text-slate-600 ml-1">↕</span>;
  return <span className="text-slate-300 ml-1">{sort.direction === 'desc' ? '↓' : '↑'}</span>;
}

interface ExpenseActionsProps {
  expense: Expense;
  deletingId: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  size: 'compact' | 'normal';
}

function ExpenseActions({ expense, deletingId, onEdit, onDelete, onConfirmDelete, onCancelDelete, size }: ExpenseActionsProps) {
  const { t } = useBudget();
  const padding = size === 'compact' ? 'px-2.5 py-1' : 'px-3 py-1.5';

  if (deletingId === expense.id) {
    return (
      <div className="flex gap-2 justify-end">
        <button onClick={() => onConfirmDelete(expense.id)} className={`text-xs ${padding} rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors`}>
          {t('delete')}
        </button>
        <button onClick={onCancelDelete} className={`text-xs ${padding} rounded-lg bg-slate-600/30 text-slate-300 hover:bg-slate-600/50 transition-colors`}>
          {t('cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-end">
      <button onClick={() => onEdit(expense)} className={`text-xs ${padding} rounded-lg bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 hover:text-white transition-colors`}>
        {t('edit')}
      </button>
      <button onClick={() => onDelete(expense.id)} className={`text-xs ${padding} rounded-lg bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-300 transition-colors`}>
        {t('delete')}
      </button>
    </div>
  );
}

export default function ExpenseList({ onEdit, onToast }: ExpenseListProps) {
  const { state, deleteExpense, t, tc, fc, fd } = useBudget();
  const [defaultFilters] = useState(getDefaultFilters);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState<SortState>({ field: 'date', direction: 'desc' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    const result = state.expenses.filter((expense) => {
      if (filters.category && expense.category !== filters.category) return false;
      if (!isInRange(expense.date, filters.dateFrom, filters.dateTo)) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          expense.description.toLowerCase().includes(q) ||
          tc(expense.category).toLowerCase().includes(q) ||
          expense.amount.toString().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case 'date':
          cmp = a.date.localeCompare(b.date);
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sort.direction === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [state.expenses, filters, sort, tc]);

  function handleSort(field: SortState['field']) {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  function handleDelete(id: string) {
    setDeletingId(id);
  }

  function confirmDelete(id: string) {
    deleteExpense(id);
    setDeletingId(null);
    onToast(t('expenseDeleted'), 'success');
  }

  return (
    <div className="space-y-4">
      <ExpenseFilters filters={filters} defaultFilters={defaultFilters} onFilterChange={setFilters} />

      {filteredExpenses.length === 0 ? (
        <div className="bg-slate-800/30 rounded-2xl border border-slate-600/20 p-12 text-center">
          <div className="text-slate-500 text-4xl mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-slate-400">{t('noExpenses')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-600/20 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600/20">
                  <th
                    className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('date')}
                  >
                    {t('date')} <SortIndicator field="date" sort={sort} />
                  </th>
                  <th
                    className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('category')}
                  >
                    {t('category')} <SortIndicator field="category" sort={sort} />
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">
                    {t('description')}
                  </th>
                  <th
                    className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('amount')}
                  >
                    {t('amount')} <SortIndicator field="amount" sort={sort} />
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-slate-600/10 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-slate-300">{fd(expense.date)}</td>
                    <td className="px-5 py-3">
                      <CategoryBadge category={expense.category} />
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        {expense.description || <span className="text-slate-600 italic">—</span>}
                        {expense.recurringExpenseId && <RecurringIcon />}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-semibold text-amber-300">
                      {fc(expense.amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ExpenseActions
                        expense={expense}
                        deletingId={deletingId}
                        onEdit={onEdit}
                        onDelete={handleDelete}
                        onConfirmDelete={confirmDelete}
                        onCancelDelete={() => setDeletingId(null)}
                        size="compact"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-600/20 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <CategoryBadge category={expense.category} />
                    <p className="text-xs text-slate-500 mt-1">{fd(expense.date)}</p>
                  </div>
                  <p className="text-lg font-bold text-amber-300">{fc(expense.amount)}</p>
                </div>
                {(expense.description || expense.recurringExpenseId) && (
                  <p className="text-sm text-slate-300 mb-3 inline-flex items-center gap-1.5">
                    {expense.description}
                    {expense.recurringExpenseId && <RecurringIcon />}
                  </p>
                )}
                <ExpenseActions
                  expense={expense}
                  deletingId={deletingId}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onConfirmDelete={confirmDelete}
                  onCancelDelete={() => setDeletingId(null)}
                  size="normal"
                />
              </div>
            ))}
          </div>

          <div className="text-center text-sm text-slate-500">
            {filteredExpenses.length} {t('expenses').toLowerCase()}
            {filteredExpenses.length !== state.expenses.length && ` ${t('of')} ${state.expenses.length}`}
          </div>
        </>
      )}
    </div>
  );
}
