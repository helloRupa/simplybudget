import { Expense } from '@/types';

function csvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(
  expenses: Expense[],
  t: (key: string) => string,
  tc: (category: string) => string,
  fd: (dateStr: string) => string,
): void {
  const headers = [t('date'), t('amount'), t('category'), t('description')];
  const rows = expenses.map((e) => [
    csvCell(fd(e.date)),
    e.amount.toFixed(2),
    csvCell(tc(e.category)),
    csvCell(e.description),
  ]);

  const csv = [headers.map(csvCell).join(','), ...rows.map((r) => r.join(','))].join('\n');
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
