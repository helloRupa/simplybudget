'use client';

import { useMemo } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { getWeekRange, getMonthRange, getWeekRanges, toISODate, formatShortDate, getTotalBudgeted } from '@/utils/dates';
import { getCategoryColor } from '@/utils/constants';
import SpendingChart from './SpendingChart';
import { parseISO, isWithinInterval } from 'date-fns';

export default function Dashboard() {
  const { state, t, tc, fc, fd, currencySymbol, intlLocale } = useBudget();

  const stats = useMemo(() => {
    const { start: weekStart, end: weekEnd } = getWeekRange();
    const { start: monthStart, end: monthEnd } = getMonthRange();

    const weekExpenses = state.expenses.filter((e) => {
      try {
        return isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd });
      } catch { return false; }
    });

    const monthExpenses = state.expenses.filter((e) => {
      try {
        return isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd });
      } catch { return false; }
    });

    const spentThisWeek = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
    const spentThisMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingThisWeek = state.weeklyBudget - spentThisWeek;
    const totalSpent = state.expenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate total saved/overspent all time (only count expenses up to today)
    const now = new Date();
    const weekRanges = getWeekRanges(state.firstUseDate);
    const totalBudgeted = getTotalBudgeted(state.firstUseDate, state.budgetHistory);
    const totalSpentToDate = state.expenses
      .filter((e) => {
        try { return e.date >= state.firstUseDate && parseISO(e.date) <= now; } catch { return false; }
      })
      .reduce((sum, e) => sum + e.amount, 0);
    const totalSavedAllTime = totalBudgeted - totalSpentToDate;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    state.expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Weekly spending data for chart
    const weeklyChartData = weekRanges.slice(-8).map((range) => {
      const weekExpenseTotal = state.expenses
        .filter((e) => {
          try {
            return isWithinInterval(parseISO(e.date), { start: range.start, end: range.end });
          } catch { return false; }
        })
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        week: formatShortDate(range.start, intlLocale),
        spent: weekExpenseTotal,
        budget: state.weeklyBudget,
      };
    });

    // Monthly category data for pie-like display, split into past/today vs future
    const today = toISODate(now);
    const monthlyCategoryTotals: Record<string, { current: number; future: number }> = {};
    monthExpenses.forEach((e) => {
      if (!monthlyCategoryTotals[e.category]) {
        monthlyCategoryTotals[e.category] = { current: 0, future: 0 };
      }
      if (e.date > today) {
        monthlyCategoryTotals[e.category].future += e.amount;
      } else {
        monthlyCategoryTotals[e.category].current += e.amount;
      }
    });

    return {
      spentThisWeek,
      spentThisMonth,
      remainingThisWeek,
      totalSavedAllTime,
      totalBudgeted,
      totalSpentToDate,
      numWeeks: weekRanges.length,
      topCategories,
      weeklyChartData,
      monthlyCategoryTotals,
      totalSpent,
      weeklyBudget: state.weeklyBudget,
    };
  }, [state, intlLocale]);

  const budgetPercentage = Math.min(100, (stats.spentThisWeek / stats.weeklyBudget) * 100);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weekly Budget */}
        <SummaryCard
          title={t('weeklyBudget')}
          value={fc(stats.weeklyBudget)}
          subtitle={t('perWeek')}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          }
          color="teal"
        />

        {/* Spent this week */}
        <SummaryCard
          title={t('spentThisWeek')}
          value={fc(stats.spentThisWeek)}
          subtitle={`${budgetPercentage.toFixed(0)}% ${t('of')} ${t('budget').toLowerCase()}`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color={budgetPercentage > 90 ? 'red' : budgetPercentage > 70 ? 'amber' : 'green'}
        />

        {/* Remaining / Saved this week */}
        <SummaryCard
          title={stats.remainingThisWeek >= 0 ? t('remainingThisWeek') : t('overBudgetThisWeek')}
          value={fc(Math.abs(stats.remainingThisWeek))}
          subtitle={t('thisWeek')}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={stats.remainingThisWeek >= 0
                ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              } />
            </svg>
          }
          color={stats.remainingThisWeek >= 0 ? 'green' : 'red'}
        />

        {/* Total saved all time */}
        <SummaryCard
          title={stats.totalSavedAllTime >= 0 ? t('totalSavedAllTime') : t('totalOverspentAllTime')}
          value={fc(Math.abs(stats.totalSavedAllTime))}
          subtitle={stats.totalSavedAllTime >= 0 ? t('allTime') : t('allTime')}
          tooltip={t('totalSavedTooltip')
            .replace('{startDate}', fd(state.firstUseDate))
            .replace('{weeks}', String(stats.numWeeks))
            .replace('{budgeted}', fc(stats.totalBudgeted))
            .replace('{spent}', fc(stats.totalSpentToDate))
          }
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M4 21V10m16 11V10M12 3L2 10h20L12 3z" />
              <path d="M8 10v8m4-8v8m4-8v8" />
            </svg>
          }
          color={stats.totalSavedAllTime >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-600/20 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300 uppercase tracking-wide">{t('weeklyBudget')}</span>
          <span className="text-sm text-white font-semibold">
            {fc(stats.spentThisWeek)} <span className="text-slate-500">/ {fc(stats.weeklyBudget)}</span>
          </span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetPercentage > 90
                ? 'bg-gradient-to-r from-orange-400 via-red-500 to-rose-700'
                : budgetPercentage > 70
                  ? 'bg-gradient-to-r from-amber-300 via-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-teal-300 via-teal-500 to-blue-600'
            }`}
            style={{ width: `${Math.min(100, budgetPercentage)}%` }}
          />
        </div>
      </div>

      {state.expenses.length === 0 ? (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-600/20 p-12 text-center">
          <p className="text-slate-400 text-lg">{t('noExpensesYet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Over Time Chart */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-600/20 p-5">
            <h3 className="text-md font-semibold text-white mb-4">{t('budgetVsSpending')}</h3>
            <SpendingChart data={stats.weeklyChartData} t={t} fc={fc} currencySymbol={currencySymbol} />
          </div>

          {/* Top Categories */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-600/20 p-5">
            <h3 className="text-md font-semibold text-white mb-4">{t('topCategories')}</h3>
            <div className="space-y-4">
              {stats.topCategories.map(([category, amount]) => {
                const percentage = stats.totalSpent > 0 ? (amount / stats.totalSpent) * 100 : 0;
                const catColor = getCategoryColor(category);
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: `${catColor}30`, color: catColor }}
                        >
                          {tc(category)[0]}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-200">{tc(category)}</span>
                          <p className="text-xs text-slate-500">{percentage.toFixed(1)}% {t('of')} {t('total').toLowerCase()}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-white">{fc(amount)}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: catColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.topCategories.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">{t('noExpenses')}</p>
              )}
            </div>
          </div>

          {/* Monthly Spending by Category */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-600/20 p-5 lg:col-span-2">
            <h3 className="text-md font-semibold text-white mb-4">{t('monthlySpending')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(stats.monthlyCategoryTotals)
                .sort(([, a], [, b]) => (a.current + a.future) - (b.current + b.future))
                .reverse()
                .map(([category, { current, future }]) => {
                  const isAllFuture = current === 0 && future > 0;
                  const catColor = getCategoryColor(category);
                  return (
                    <div
                      key={category}
                      className={`rounded-xl p-4 text-center border ${
                        isAllFuture
                          ? 'bg-slate-800/40 border-dashed border-slate-600/30 opacity-50'
                          : 'bg-slate-800/60 border-slate-600/20'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: `${catColor}25`, color: catColor, border: `1.5px solid ${catColor}40` }}
                      >
                        {tc(category)[0]}
                      </div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide truncate">{tc(category)}</p>
                      {future > 0 && current > 0 ? (
                        <div className="mt-1">
                          <span className="text-sm font-bold text-white">{fc(current)}</span>
                          <span className="text-sm font-bold text-slate-500"> + {fc(future)}</span>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-white mt-1">{fc(current + future)}</p>
                      )}
                    </div>
                  );
                })}
              {Object.keys(stats.monthlyCategoryTotals).length === 0 && (
                <p className="text-slate-500 text-sm col-span-full text-center py-4">{t('noExpenses')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'teal' | 'green' | 'red' | 'amber';
  tooltip?: string;
}

function StyledAmount({ value, colorClass, centsColorClass }: { value: string; colorClass: string; centsColorClass: string }) {
  // Split formatted currency into symbol, whole number, and decimal parts
  // e.g. "$1,234.56" -> ["$", "1,234", ".56"]
  const match = value.match(/^([^\d]*)([\d,]+)(\.\d+)?(.*)$/);
  if (!match) return <span className={colorClass}>{value}</span>;
  const [, prefix, whole, decimal, suffix] = match;
  return (
    <span className="inline-flex items-baseline">
      {prefix && <span className={`text-2xl font-bold ${colorClass}`}>{prefix}</span>}
      <span className={`text-2xl font-bold ${colorClass}`}>{whole}</span>
      {decimal && <span className={`text-base font-semibold ${centsColorClass}`}>{decimal}</span>}
      {suffix && <span className={`text-2xl font-bold ${colorClass}`}>{suffix}</span>}
    </span>
  );
}

function SummaryCard({ title, value, subtitle, icon, color, tooltip }: SummaryCardProps) {
  const colorStyles = {
    teal: 'border-teal-500/20 hover:border-teal-400/40',
    green: 'border-green-500/20 hover:border-green-400/40',
    red: 'border-red-500/20 hover:border-red-400/40',
    amber: 'border-amber-500/20 hover:border-amber-400/40',
  };

  const iconBgColors = {
    teal: 'bg-teal-500/20 text-teal-300',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  const valueColors = {
    teal: 'text-teal-200',
    green: 'text-green-300',
    red: 'text-red-300',
    amber: 'text-amber-200',
  };

  const centsColors = {
    teal: 'text-teal-500',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-500',
  };

  return (
    <div className={`bg-slate-800/80 backdrop-blur-sm rounded-2xl border ${colorStyles[color]} p-5 transition-colors`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="mt-2"><StyledAmount value={value} colorClass={valueColors[color]} centsColorClass={centsColors[color]} /></p>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          {tooltip && (
            <div className="relative group/tip inline-block mt-1">
              <svg className="w-4 h-4 text-slate-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:block w-56 p-2 text-xs text-slate-200 bg-slate-900 border border-slate-600 rounded-lg shadow-xl z-10">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgColors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
