import { Expense, RecurringExpense } from '@/types';
import { toISODate } from './dates';
import { v4 as uuidv4 } from 'uuid';
import { getDaysInMonth, parseISO, addMonths, startOfMonth } from 'date-fns';

interface GenerationResult {
  newExpenses: Expense[];
  updatedRecurringExpenses: RecurringExpense[];
}

function clampDay(day: number, year: number, month: number): number {
  const maxDay = getDaysInMonth(new Date(year, month));
  return Math.min(day, maxDay);
}

function buildDate(year: number, month: number, day: number): string {
  const clamped = clampDay(day, year, month);
  return toISODate(new Date(year, month, clamped));
}

export function generatePendingExpenses(
  recurringExpenses: RecurringExpense[],
  today: Date,
): GenerationResult {
  const newExpenses: Expense[] = [];
  const updatedRecurringExpenses = recurringExpenses.map((re) => {
    const updated = { ...re };
    const todayStr = toISODate(today);
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    // Determine the first month to generate
    let genStart: Date;
    if (updated.lastGeneratedDate) {
      // Start from the month after the last generated date
      genStart = startOfMonth(addMonths(parseISO(updated.lastGeneratedDate), 1));
    } else {
      // Start from the startDate's month
      genStart = startOfMonth(parseISO(updated.startDate));
    }

    // Skip if startDate is in the future
    if (parseISO(updated.startDate) > today) {
      return updated;
    }

    let year = genStart.getFullYear();
    let month = genStart.getMonth();

    while (true) {
      const clampedDay = clampDay(updated.dayOfMonth, year, month);
      const expenseDate = buildDate(year, month, clampedDay);

      // Don't generate if this date is in the future
      if (year > todayYear || (year === todayYear && month > todayMonth) ||
          (year === todayYear && month === todayMonth && clampedDay > todayDay)) {
        break;
      }

      // Don't generate before the startDate
      if (expenseDate < updated.startDate) {
        // Move to next month
        month++;
        if (month > 11) { month = 0; year++; }
        continue;
      }

      // Don't generate after endDate
      if (updated.endDate && expenseDate > updated.endDate) {
        break;
      }

      // Don't generate beyond today
      if (expenseDate > todayStr) {
        break;
      }

      newExpenses.push({
        id: uuidv4(),
        amount: updated.amount,
        category: updated.category,
        description: updated.description,
        date: expenseDate,
        createdAt: new Date().toISOString(),
        recurringExpenseId: updated.id,
      });

      updated.lastGeneratedDate = expenseDate;

      // Next month
      month++;
      if (month > 11) { month = 0; year++; }
    }

    return updated;
  });

  return { newExpenses, updatedRecurringExpenses };
}
