'use client';

import { useState, useEffect } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { Expense } from '@/types';
import { toISODate } from '@/utils/dates';

interface ExpenseFormProps {
  editingExpense?: Expense | null;
  onDone: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export default function ExpenseForm({ editingExpense, onDone, onToast }: ExpenseFormProps) {
  const { state, addExpense, updateExpense, t } = useBudget();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setDescription(editingExpense.description);
      setDate(editingExpense.date);
    }
  }, [editingExpense]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) === 0) {
      newErrors.amount = t('amountRequired');
    } else if (parseFloat(amount) < 0) {
      newErrors.amount = t('amountPositive');
    }
    if (!category) newErrors.category = t('categoryRequired');
    if (!date) newErrors.date = t('dateRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;

    if (editingExpense) {
      updateExpense({
        ...editingExpense,
        amount: parsedAmount,
        category,
        description: description.trim(),
        date,
      });
      onToast(t('expenseUpdated'), 'success');
    } else {
      addExpense({
        amount: parsedAmount,
        category,
        description: description.trim(),
        date,
      });
      onToast(t('expenseAdded'), 'success');
    }

    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
    setDate(toISODate(new Date()));
    setErrors({});
    onDone();
  }

  return (
    <div className="bg-purple-800/40 backdrop-blur-sm rounded-2xl border border-purple-600/30 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        {editingExpense ? t('editExpense') : t('addExpense')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">{t('amount')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-purple-900/50 text-white rounded-xl pl-8 pr-4 py-2.5 border ${
                  errors.amount ? 'border-red-400' : 'border-purple-600/50'
                } focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-purple-400`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">{t('category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full bg-purple-900/50 text-white rounded-xl px-4 py-2.5 border ${
                errors.category ? 'border-red-400' : 'border-purple-600/50'
              } focus:outline-none focus:ring-2 focus:ring-purple-400`}
            >
              <option value="">{t('selectCategory')}</option>
              {state.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">{t('date')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full bg-purple-900/50 text-white rounded-xl px-4 py-2.5 border ${
                errors.date ? 'border-red-400' : 'border-purple-600/50'
              } focus:outline-none focus:ring-2 focus:ring-purple-400`}
            />
            {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">{t('description')}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-purple-900/50 text-white rounded-xl px-4 py-2.5 border border-purple-600/50 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-purple-400"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          {editingExpense && (
            <button
              type="button"
              onClick={onDone}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-purple-200 hover:text-white bg-purple-700/30 hover:bg-purple-700/50 transition-colors"
            >
              {t('cancel')}
            </button>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/25 transition-all hover:shadow-purple-500/30"
          >
            {editingExpense ? t('update') : t('addExpense')}
          </button>
        </div>
      </form>
    </div>
  );
}
