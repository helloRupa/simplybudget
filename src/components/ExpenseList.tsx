'use client';

import { useState, useMemo } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { Expense, FilterState, SortState } from '@/types';
import { formatDate, isInRange } from '@/utils/dates';
import { getCategoryColor } from '@/utils/constants';
import ExpenseFilters from './ExpenseFilters';

interface ExpenseListProps {
  onEdit: (expense: Expense) => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export default function ExpenseList({ onEdit, onToast }: ExpenseListProps) {
  const { state, deleteExpense, t, tc, fc } = useBudget();
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    category: '',
    searchQuery: '',
  });
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
  }, [state.expenses, filters, sort]);

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

  const SortIndicator = ({ field }: { field: SortState['field'] }) => {
    if (sort.field !== field) return <span className="text-slate-600 ml-1">↕</span>;
    return <span className="text-slate-300 ml-1">{sort.direction === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <div className="space-y-4">
      <ExpenseFilters filters={filters} onFilterChange={setFilters} />

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
                    {t('date')} <SortIndicator field="date" />
                  </th>
                  <th
                    className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('category')}
                  >
                    {t('category')} <SortIndicator field="category" />
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">
                    {t('description')}
                  </th>
                  <th
                    className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 cursor-pointer hover:text-slate-200"
                    onClick={() => handleSort('amount')}
                  >
                    {t('amount')} <SortIndicator field="amount" />
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
                    <td className="px-5 py-3 text-sm text-slate-300">{formatDate(expense.date)}</td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: getCategoryColor(expense.category) + '33', border: `1px solid ${getCategoryColor(expense.category)}55` }}
                      >
                        <span
                          className="w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: getCategoryColor(expense.category) }}
                        />
                        {tc(expense.category)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-300">
                      {expense.description || <span className="text-slate-600 italic">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-semibold text-amber-300">
                      {fc(expense.amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {deletingId === expense.id ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => confirmDelete(expense.id)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                          >
                            {t('delete')}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-600/30 text-slate-300 hover:bg-slate-600/50 transition-colors"
                          >
                            {t('cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => onEdit(expense)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 hover:text-white transition-colors"
                          >
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                          >
                            {t('delete')}
                          </button>
                        </div>
                      )}
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
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getCategoryColor(expense.category) + '33', border: `1px solid ${getCategoryColor(expense.category)}55` }}
                    >
                      <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: getCategoryColor(expense.category) }} />
                      {tc(expense.category)}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(expense.date)}</p>
                  </div>
                  <p className="text-lg font-bold text-amber-300">{fc(expense.amount)}</p>
                </div>
                {expense.description && (
                  <p className="text-sm text-slate-300 mb-3">{expense.description}</p>
                )}
                <div className="flex gap-2 justify-end">
                  {deletingId === expense.id ? (
                    <>
                      <button onClick={() => confirmDelete(expense.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300">
                        {t('delete')}
                      </button>
                      <button onClick={() => setDeletingId(null)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-600/30 text-slate-300">
                        {t('cancel')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => onEdit(expense)} className="text-xs px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-300">
                        {t('edit')}
                      </button>
                      <button onClick={() => handleDelete(expense.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400/70">
                        {t('delete')}
                      </button>
                    </>
                  )}
                </div>
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
