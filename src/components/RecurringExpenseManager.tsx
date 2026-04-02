'use client';

import { useState } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { RecurringExpense, RecurringFrequency } from '@/types';
import { toISODate } from '@/utils/dates';
import { TranslationKey } from '@/i18n/locales';

interface Props {
  onToast: (message: string, type: 'success' | 'error') => void;
}

const DAY_KEYS: TranslationKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_KEYS: TranslationKey[] = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export default function RecurringExpenseManager({ onToast }: Props) {
  const { state, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, t, tc, fc, currencySymbol } = useBudget();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState('1'); // Monday
  const [monthOfYear, setMonthOfYear] = useState('0'); // January
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setAmount('');
    setCategory('');
    setDescription('');
    setFrequency('monthly');
    setDayOfMonth('1');
    setDayOfWeek('1');
    setMonthOfYear('0');
    setStartDate(toISODate(new Date()));
    setEndDate('');
    setErrors({});
    setShowForm(false);
    setEditingId(null);
  }

  function startEdit(re: RecurringExpense) {
    setAmount(re.amount.toString());
    setCategory(re.category);
    setDescription(re.description);
    setFrequency(re.frequency || 'monthly');
    setDayOfMonth(re.dayOfMonth.toString());
    setDayOfWeek((re.dayOfWeek ?? 1).toString());
    setMonthOfYear((re.monthOfYear ?? 0).toString());
    setStartDate(re.startDate);
    setEndDate(re.endDate ?? '');
    setEditingId(re.id);
    setShowForm(true);
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = t('amountPositive');
    }
    if (!category) newErrors.category = t('categoryRequired');
    if (!startDate) newErrors.startDate = t('dateRequired');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data = {
      amount: Math.round(parsedAmount * 100) / 100,
      category,
      description,
      frequency,
      dayOfMonth: parseInt(dayOfMonth),
      dayOfWeek: parseInt(dayOfWeek),
      monthOfYear: parseInt(monthOfYear),
      startDate,
      endDate: endDate || null,
    };

    if (editingId) {
      const existing = state.recurringExpenses.find((r) => r.id === editingId);
      if (existing) {
        updateRecurringExpense({ ...existing, ...data });
        onToast(t('recurringExpenseUpdated'), 'success');
      }
    } else {
      addRecurringExpense(data);
      onToast(t('recurringExpenseAdded'), 'success');
    }
    resetForm();
  }

  function handleDelete(id: string) {
    deleteRecurringExpense(id);
    onToast(t('recurringExpenseDeleted'), 'success');
  }

  function frequencyLabel(re: RecurringExpense): string {
    const freq = re.frequency || 'monthly';
    switch (freq) {
      case 'weekly':
        return `${t('weekly')}, ${t('everyWeek')} ${t(DAY_KEYS[re.dayOfWeek ?? 0])}`;
      case 'annually':
        return `${t('annually')}, ${t(MONTH_KEYS[re.monthOfYear ?? 0])} ${re.dayOfMonth}`;
      case 'monthly':
      default:
        return `${t('monthly')}, ${t('onDay')} ${re.dayOfMonth}`;
    }
  }

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{t('recurringExpenses')}</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-teal-500 hover:bg-teal-400 shadow-lg shadow-teal-500/25 transition-all"
          >
            {t('addRecurringExpense')}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="mb-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/20 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">
            {editingId ? t('editRecurringExpense') : t('addRecurringExpense')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('amount')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full bg-slate-700/50 text-white rounded-xl pl-8 pr-4 py-2.5 border ${
                    errors.amount ? 'border-red-400' : 'border-slate-500/50'
                  } focus:outline-none focus:ring-2 focus:ring-teal-400`}
                />
              </div>
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border ${
                  errors.category ? 'border-red-400' : 'border-slate-500/50'
                } focus:outline-none focus:ring-2 focus:ring-teal-400`}
              >
                <option value="">{t('selectCategory')}</option>
                {state.categories.map((cat) => (
                  <option key={cat} value={cat}>{tc(cat)}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('description')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder-slate-500"
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('frequency')}</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="weekly">{t('weekly')}</option>
                <option value="monthly">{t('monthly')}</option>
                <option value="annually">{t('annually')}</option>
              </select>
            </div>

            {/* Day of Week (weekly) */}
            {frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('dayOfWeek')}</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {DAY_KEYS.map((key, i) => (
                    <option key={i} value={i}>{t(key)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Day of Month (monthly) */}
            {frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('dayOfMonth')}</label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Month + Day (annually) */}
            {frequency === 'annually' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('monthOfYear')}</label>
                  <select
                    value={monthOfYear}
                    onChange={(e) => setMonthOfYear(e.target.value)}
                    className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {MONTH_KEYS.map((key, i) => (
                      <option key={i} value={i}>{t(key)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{t('dayOfMonth')}</label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('startDate')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border ${
                  errors.startDate ? 'border-red-400' : 'border-slate-500/50'
                } focus:outline-none focus:ring-2 focus:ring-teal-400`}
              />
              {errors.startDate && <p className="text-red-400 text-xs mt-1">{errors.startDate}</p>}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{t('endDate')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              {!endDate && <p className="text-slate-500 text-xs mt-1">{t('noEndDate')}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-teal-500 hover:bg-teal-400 shadow-lg shadow-teal-500/25 transition-all"
            >
              {editingId ? t('update') : t('save')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 transition-all"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {state.recurringExpenses.length === 0 ? (
        <p className="text-slate-500 text-sm">{t('noRecurringExpenses')}</p>
      ) : (
        <div className="space-y-3">
          {state.recurringExpenses.map((re) => (
            <div
              key={re.id}
              className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-slate-600/20"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-amber-300">{fc(re.amount)}</span>
                  <span className="text-xs text-slate-400">
                    {frequencyLabel(re)}
                  </span>
                </div>
                <p className="text-sm text-slate-200 truncate">
                  {re.description || tc(re.category)}
                </p>
                <p className="text-xs text-slate-500">
                  {tc(re.category)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <button
                  onClick={() => startEdit(re)}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors px-2 py-1"
                >
                  {t('edit')}
                </button>
                <button
                  onClick={() => handleDelete(re.id)}
                  className="text-xs text-red-400/60 hover:text-red-300 transition-colors px-2 py-1"
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
