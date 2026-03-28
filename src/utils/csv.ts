import { Expense } from '@/types';
import { formatDate } from './dates';

export function exportToCSV(expenses: Expense[], t: (key: string) => string): void {
  const headers = [t('date'), t('amount'), t('category'), t('description')];
  const rows = expenses.map((e) => [
    formatDate(e.date),
    e.amount.toFixed(2),
    e.category,
    `"${e.description.replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `simplybudget-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
