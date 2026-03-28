'use client';

import { useMemo } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { getWeekRange, getMonthRange, getWeekRanges, toISODate, formatShortDate } from '@/utils/dates';
import { getCategoryColor } from '@/utils/constants';
import SpendingChart from './SpendingChart';
import { parseISO, isWithinInterval } from 'date-fns';

export default function Dashboard() {
  const { state, t, tc, fc, currencySymbol, intlLocale } = useBudget();

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
    const earliestExpenseDate = state.expenses.reduce((earliest, e) => {
      return e.date < earliest ? e.date : earliest;
    }, state.firstUseDate);
    const weekRanges = getWeekRanges(earliestExpenseDate);
    const totalBudgeted = weekRanges.length * state.weeklyBudget;
    const totalSpentToDate = state.expenses
      .filter((e) => {
        try { return parseISO(e.date) <= now; } catch { return false; }
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
      topCategories,
      weeklyChartData,
      monthlyCategoryTotals,
      totalSpent,
      weeklyBudget: state.weeklyBudget,
    };
  }, [state]);

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
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          }
          color={stats.totalSavedAllTime >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">{t('weeklyBudget')}</span>
          <span className="text-sm text-amber-300 font-semibold">
            {fc(stats.spentThisWeek)} / {fc(stats.weeklyBudget)}
          </span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetPercentage > 90
                ? 'bg-red-500'
                : budgetPercentage > 70
                ? 'bg-amber-500'
                : 'bg-teal-400'
            }`}
            style={{ width: `${Math.min(100, budgetPercentage)}%` }}
          />
        </div>
      </div>

      {state.expenses.length === 0 ? (
        <div className="bg-slate-800/30 rounded-2xl border border-slate-600/20 p-12 text-center">
          <p className="text-slate-400 text-lg">{t('noExpensesYet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Over Time Chart */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-5">
            <h3 className="text-md font-semibold text-white mb-4">{t('budgetVsSpending')}</h3>
            <SpendingChart data={stats.weeklyChartData} t={t} fc={fc} currencySymbol={currencySymbol} />
          </div>

          {/* Top Categories */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-5">
            <h3 className="text-md font-semibold text-white mb-4">{t('topCategories')}</h3>
            <div className="space-y-3">
              {stats.topCategories.map(([category, amount]) => {
                const percentage = stats.totalSpent > 0 ? (amount / stats.totalSpent) * 100 : 0;
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(category) }}
                        />
                        <span className="text-sm text-slate-200">{tc(category)}</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-300">{fc(amount)}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getCategoryColor(category),
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{percentage.toFixed(1)}%</p>
                  </div>
                );
              })}
              {stats.topCategories.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">{t('noExpenses')}</p>
              )}
            </div>
          </div>

          {/* Monthly Spending by Category */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-5 lg:col-span-2">
            <h3 className="text-md font-semibold text-white mb-4">{t('monthlySpending')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(stats.monthlyCategoryTotals)
                .sort(([, a], [, b]) => (a.current + a.future) - (b.current + b.future))
                .reverse()
                .map(([category, { current, future }]) => {
                  const isAllFuture = current === 0 && future > 0;
                  return (
                    <div
                      key={category}
                      className={`rounded-xl p-3 text-center border ${
                        isAllFuture
                          ? 'bg-slate-700/20 border-dashed border-slate-500/30 opacity-50'
                          : 'bg-slate-700/40 border-slate-600/20'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: getCategoryColor(category) }}
                      >
                        {tc(category)[0]}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{tc(category)}</p>
                      {future > 0 && current > 0 ? (
                        <div className="mt-1">
                          <span className="text-sm font-bold text-amber-300">{fc(current)}</span>
                          <span className="text-sm font-bold text-amber-300/40"> + {fc(future)}</span>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-amber-300 mt-1">{fc(current + future)}</p>
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
}

function SummaryCard({ title, value, subtitle, icon, color }: SummaryCardProps) {
  const colorStyles = {
    teal: 'from-teal-600/20 to-teal-800/20 border-teal-400/30',
    green: 'from-green-600/20 to-green-800/20 border-green-500/30',
    red: 'from-red-600/20 to-red-800/20 border-red-500/30',
    amber: 'from-amber-600/20 to-amber-800/20 border-amber-500/30',
  };

  const iconColors = {
    teal: 'text-teal-300',
    green: 'text-green-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
  };

  const valueColors = {
    teal: 'text-teal-300',
    green: 'text-green-400',
    red: 'text-red-400',
    amber: 'text-amber-300',
  };

  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} backdrop-blur-sm rounded-2xl border p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${valueColors[color]}`}>{value}</p>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className={`${iconColors[color]} opacity-60`}>{icon}</div>
      </div>
    </div>
  );
}
