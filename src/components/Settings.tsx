'use client';

import { useState } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { formatCurrency } from '@/utils/currency';
import { exportToCSV } from '@/utils/csv';
import { DEFAULT_CATEGORIES } from '@/utils/constants';

interface SettingsProps {
  onToast: (message: string, type: 'success' | 'error') => void;
}

export default function Settings({ onToast }: SettingsProps) {
  const { state, setWeeklyBudget, addCategory, deleteCategory, t } = useBudget();
  const [budgetInput, setBudgetInput] = useState(state.weeklyBudget.toString());
  const [newCategory, setNewCategory] = useState('');
  const [budgetError, setBudgetError] = useState('');

  function handleBudgetSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount <= 0) {
      setBudgetError(t('budgetPositive'));
      return;
    }
    setBudgetError('');
    setWeeklyBudget(Math.round(amount * 100) / 100);
    onToast(t('budgetUpdated'), 'success');
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const success = addCategory(newCategory.trim());
    if (success) {
      setNewCategory('');
      onToast(t('categoryAdded'), 'success');
    } else {
      onToast(t('categoryExists'), 'error');
    }
  }

  function handleExportCSV() {
    if (state.expenses.length === 0) {
      onToast(t('noExpenses'), 'error');
      return;
    }
    exportToCSV(state.expenses, t as (key: string) => string);
    onToast('CSV exported!', 'success');
  }

  const isDefaultCategory = (cat: string) => (DEFAULT_CATEGORIES as readonly string[]).includes(cat);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Weekly Budget Setting */}
      <div className="bg-purple-800/40 backdrop-blur-sm rounded-2xl border border-purple-600/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t('setBudget')}</h2>
        <form onSubmit={handleBudgetSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className={`w-full bg-purple-900/50 text-white rounded-xl pl-8 pr-4 py-2.5 border ${
                budgetError ? 'border-red-400' : 'border-purple-600/50'
              } focus:outline-none focus:ring-2 focus:ring-purple-400`}
              placeholder={t('budgetAmount')}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/25 transition-all"
          >
            {t('save')}
          </button>
        </form>
        {budgetError && <p className="text-red-400 text-xs mt-2">{budgetError}</p>}
        <p className="text-purple-400 text-xs mt-2">
          {t('weeklyBudget')}: {formatCurrency(state.weeklyBudget)}
        </p>
      </div>

      {/* Category Management */}
      <div className="bg-purple-800/40 backdrop-blur-sm rounded-2xl border border-purple-600/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t('manageCategories')}</h2>
        <form onSubmit={handleAddCategory} className="flex gap-3 mb-4">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 bg-purple-900/50 text-white rounded-xl px-4 py-2.5 border border-purple-600/50 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-purple-400"
            placeholder={t('newCategoryPlaceholder')}
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/25 transition-all"
          >
            {t('addCategory')}
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {state.categories.map((cat) => (
            <div
              key={cat}
              className="flex items-center gap-2 bg-purple-900/40 rounded-xl px-3 py-2 border border-purple-600/20"
            >
              <span className="text-sm text-purple-100">{cat}</span>
              {!isDefaultCategory(cat) && (
                <button
                  onClick={() => deleteCategory(cat)}
                  className="text-xs text-red-400/60 hover:text-red-300 transition-colors"
                  title={t('deleteCategory')}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="bg-purple-800/40 backdrop-blur-sm rounded-2xl border border-purple-600/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t('exportData')}</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/25 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('exportCSV')}
        </button>
        <p className="text-purple-400 text-xs mt-2">
          {state.expenses.length} {t('expenses').toLowerCase()}
        </p>
      </div>
    </div>
  );
}
