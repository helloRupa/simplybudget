import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetProvider } from '@/context/BudgetContext';
import RecurringExpenseManager from '@/components/RecurringExpenseManager';
import { RecurringExpense } from '@/types';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '@/utils/constants';
import { generatePendingExpenses } from '@/utils/recurring';
import { format, startOfWeek, subWeeks, subMonths } from 'date-fns';
import { useState, useCallback } from 'react';

const now = new Date();
const today = format(now, 'yyyy-MM-dd');
const thisMonday = startOfWeek(now, { weekStartsOn: 1 });
const fourWeeksAgo = format(subWeeks(thisMonday, 4), 'yyyy-MM-dd');

function makeRecurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: crypto.randomUUID(),
    amount: 50,
    category: 'Bills',
    description: 'Internet',
    frequency: 'monthly',
    dayOfMonth: 1,
    dayOfWeek: 1,
    monthOfYear: 0,
    createdAt: now.toISOString(),
    startDate: fourWeeksAgo,
    endDate: null,
    lastGeneratedDate: today, // Already generated up to today
    ...overrides,
  };
}

function seedLocalStorage(recurringExpenses: RecurringExpense[] = []) {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.WEEKLY_BUDGET, JSON.stringify(200));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify([...DEFAULT_CATEGORIES]));
  localStorage.setItem(STORAGE_KEYS.FIRST_USE_DATE, JSON.stringify(fourWeeksAgo));
  localStorage.setItem(STORAGE_KEYS.LOCALE, JSON.stringify('en'));
  localStorage.setItem(STORAGE_KEYS.CURRENCY, JSON.stringify('USD'));
  localStorage.setItem(STORAGE_KEYS.RECURRING_EXPENSES, JSON.stringify(recurringExpenses));
  localStorage.setItem(STORAGE_KEYS.BUDGET_HISTORY, JSON.stringify([{ amount: 200, startDate: fourWeeksAgo }]));
}

function RecurringView() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  return (
    <>
      <RecurringExpenseManager onToast={showToast} />
      {toast && <div data-testid="toast" data-type={toast.type}>{toast.message}</div>}
    </>
  );
}

function renderRecurring(recurringExpenses: RecurringExpense[] = []) {
  seedLocalStorage(recurringExpenses);
  return render(
    <BudgetProvider>
      <RecurringView />
    </BudgetProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('RecurringExpenseManager', () => {
  describe('empty state', () => {
    it('shows no recurring expenses message', async () => {
      renderRecurring();
      expect(await screen.findByText(/no recurring expenses/i)).toBeInTheDocument();
    });

    it('shows the add button', async () => {
      renderRecurring();
      expect(await screen.findByRole('button', { name: /add recurring expense/i })).toBeInTheDocument();
    });
  });

  describe('displaying recurring expenses', () => {
    it('renders a recurring expense with its details', async () => {
      const recurring = [makeRecurring({ amount: 75, description: 'Internet bill', category: 'Bills' })];
      renderRecurring(recurring);

      expect(await screen.findByText('$75.00')).toBeInTheDocument();
      expect(screen.getByText('Internet bill')).toBeInTheDocument();
      expect(screen.getByText('Bills')).toBeInTheDocument();
    });

    it('shows the frequency label for monthly', async () => {
      const recurring = [makeRecurring({ frequency: 'monthly', dayOfMonth: 15 })];
      renderRecurring(recurring);

      expect(await screen.findByText(/monthly, on day 15/i)).toBeInTheDocument();
    });

    it('shows the frequency label for weekly', async () => {
      const recurring = [makeRecurring({ frequency: 'weekly', dayOfWeek: 3 })];
      renderRecurring(recurring);

      expect(await screen.findByText(/weekly, every Wednesday/i)).toBeInTheDocument();
    });

    it('shows the frequency label for annually', async () => {
      const recurring = [makeRecurring({ frequency: 'annually', monthOfYear: 11, dayOfMonth: 25 })];
      renderRecurring(recurring);

      expect(await screen.findByText(/annually, December 25/i)).toBeInTheDocument();
    });
  });

  describe('adding a recurring expense', () => {
    it('opens the form when add button is clicked', async () => {
      const user = userEvent.setup();
      renderRecurring();

      await user.click(await screen.findByRole('button', { name: /add recurring expense/i }));

      expect(screen.getByText('Frequency')).toBeInTheDocument();
      expect(screen.getByText('Start Date')).toBeInTheDocument();
    });

    it('adds a monthly recurring expense', async () => {
      const user = userEvent.setup();
      renderRecurring();

      await user.click(await screen.findByRole('button', { name: /add recurring expense/i }));

      // Fill out the form
      const amountInputs = screen.getAllByRole('spinbutton');
      await user.type(amountInputs[0], '99.50');

      const categorySelect = screen.getAllByRole('combobox').find(
        (s) => within(s).queryByText('Select category') !== null,
      )!;
      await user.selectOptions(categorySelect, 'Bills');

      await user.type(screen.getByPlaceholderText(/optional/i), 'Phone plan');

      // Frequency defaults to monthly, day of month defaults to 1
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(await screen.findByTestId('toast')).toHaveTextContent(/recurring expense added/i);
      expect(screen.getByText('Phone plan')).toBeInTheDocument();
      expect(screen.getByText('$99.50')).toBeInTheDocument();
    });

    it('shows validation errors for empty form submission', async () => {
      const user = userEvent.setup();
      renderRecurring();

      await user.click(await screen.findByRole('button', { name: /add recurring expense/i }));
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText(/amount must be greater than zero/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
    });

    it('cancels adding and hides the form', async () => {
      const user = userEvent.setup();
      renderRecurring();

      await user.click(await screen.findByRole('button', { name: /add recurring expense/i }));
      expect(screen.getByText('Frequency')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText('Frequency')).not.toBeInTheDocument();
    });

    it('shows day of week field when frequency is weekly', async () => {
      const user = userEvent.setup();
      renderRecurring();

      await user.click(await screen.findByRole('button', { name: /add recurring expense/i }));

      const frequencySelect = screen.getAllByRole('combobox').find(
        (s) => within(s).queryByText('weekly') !== null,
      )!;
      await user.selectOptions(frequencySelect, 'weekly');

      expect(screen.getByText('Day of Week')).toBeInTheDocument();
    });

    it('shows month and day fields when frequency is annually', async () => {
      const user = userEvent.setup();
      renderRecurring();

      await user.click(await screen.findByRole('button', { name: /add recurring expense/i }));

      const frequencySelect = screen.getAllByRole('combobox').find(
        (s) => within(s).queryByText('weekly') !== null,
      )!;
      await user.selectOptions(frequencySelect, 'annually');

      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('Day of Month')).toBeInTheDocument();
    });
  });

  describe('editing a recurring expense', () => {
    it('populates the form and updates the expense', async () => {
      const user = userEvent.setup();
      const recurring = [makeRecurring({ description: 'Old internet', amount: 50 })];
      renderRecurring(recurring);

      await user.click(await screen.findByRole('button', { name: /^edit$/i }));

      expect(screen.getByDisplayValue('Old internet')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();

      const descInput = screen.getByDisplayValue('Old internet');
      await user.clear(descInput);
      await user.type(descInput, 'New fiber');

      await user.click(screen.getByRole('button', { name: /update/i }));

      expect(await screen.findByTestId('toast')).toHaveTextContent(/updated/i);
      expect(screen.getByText('New fiber')).toBeInTheDocument();
      expect(screen.queryByText('Old internet')).not.toBeInTheDocument();
    });
  });

  describe('deleting a recurring expense', () => {
    it('shows confirmation before deleting', async () => {
      const user = userEvent.setup();
      const recurring = [makeRecurring({ description: 'To remove' })];
      renderRecurring(recurring);

      await screen.findByText('To remove');
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      // First click shows confirmation — expense still visible, no toast yet
      expect(screen.getByText('To remove')).toBeInTheDocument();
      expect(screen.queryByTestId('toast')).not.toBeInTheDocument();

      // Cancel dismisses confirmation
      await user.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(screen.getByText('To remove')).toBeInTheDocument();
    });

    it('removes the recurring expense after confirming', async () => {
      const user = userEvent.setup();
      const recurring = [makeRecurring({ description: 'To remove' })];
      renderRecurring(recurring);

      await screen.findByText('To remove');
      await user.click(screen.getByRole('button', { name: /^delete$/i }));
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByTestId('toast')).toHaveTextContent(/deleted/i);
      expect(screen.queryByText('To remove')).not.toBeInTheDocument();
      expect(screen.getByText(/no recurring expenses/i)).toBeInTheDocument();
    });
  });
});

describe('generatePendingExpenses', () => {
  describe('monthly generation', () => {
    it('generates expenses for past months since start date', () => {
      const threeMonthsAgo = format(subMonths(now, 3), 'yyyy-MM-dd');
      const re = makeRecurring({
        frequency: 'monthly',
        dayOfMonth: 1,
        startDate: threeMonthsAgo,
        lastGeneratedDate: null,
      });

      const { newExpenses } = generatePendingExpenses([re], now);

      // Should generate for each month from start through today
      expect(newExpenses.length).toBeGreaterThanOrEqual(3);
      newExpenses.forEach((exp) => {
        expect(exp.amount).toBe(50);
        expect(exp.category).toBe('Bills');
        expect(exp.recurringExpenseId).toBe(re.id);
      });
    });

    it('does not generate future expenses', () => {
      const nextMonth = format(new Date(now.getFullYear(), now.getMonth() + 2, 1), 'yyyy-MM-dd');
      const re = makeRecurring({
        frequency: 'monthly',
        dayOfMonth: 1,
        startDate: nextMonth,
        lastGeneratedDate: null,
      });

      const { newExpenses } = generatePendingExpenses([re], now);
      expect(newExpenses).toHaveLength(0);
    });

    it('does not regenerate already-generated months', () => {
      const twoMonthsAgo = format(subMonths(now, 2), 'yyyy-MM-dd');
      const oneMonthAgo = format(subMonths(now, 1), 'yyyy-MM-dd');
      const re = makeRecurring({
        frequency: 'monthly',
        dayOfMonth: 1,
        startDate: twoMonthsAgo,
        lastGeneratedDate: oneMonthAgo,
      });

      const { newExpenses } = generatePendingExpenses([re], now);

      // Should only generate for the current month (not past ones)
      const dates = newExpenses.map((e) => e.date);
      dates.forEach((d) => {
        expect(d > oneMonthAgo).toBe(true);
      });
    });

    it('respects the end date', () => {
      const threeMonthsAgo = format(subMonths(now, 3), 'yyyy-MM-dd');
      const twoMonthsAgo = format(subMonths(now, 2), 'yyyy-MM-dd');
      const re = makeRecurring({
        frequency: 'monthly',
        dayOfMonth: 1,
        startDate: threeMonthsAgo,
        endDate: twoMonthsAgo,
        lastGeneratedDate: null,
      });

      const { newExpenses } = generatePendingExpenses([re], now);

      newExpenses.forEach((exp) => {
        expect(exp.date <= twoMonthsAgo).toBe(true);
      });
    });

    it('clamps day of month for short months', () => {
      // February has 28 days; dayOfMonth=31 should clamp to 28
      const feb1 = '2026-02-01';
      const re = makeRecurring({
        frequency: 'monthly',
        dayOfMonth: 31,
        startDate: feb1,
        lastGeneratedDate: null,
      });

      const febDate = new Date(2026, 1, 28); // Feb 28
      const { newExpenses } = generatePendingExpenses([re], febDate);

      expect(newExpenses.length).toBeGreaterThanOrEqual(1);
      expect(newExpenses[0].date).toBe('2026-02-28');
    });
  });

  describe('weekly generation', () => {
    it('generates weekly expenses on the correct day', () => {
      const fourWeeksAgoDate = format(subWeeks(now, 4), 'yyyy-MM-dd');
      const re = makeRecurring({
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        startDate: fourWeeksAgoDate,
        lastGeneratedDate: null,
      });

      const { newExpenses } = generatePendingExpenses([re], now);

      expect(newExpenses.length).toBeGreaterThanOrEqual(3);
      newExpenses.forEach((exp) => {
        const date = new Date(exp.date + 'T00:00:00');
        expect(date.getDay()).toBe(1); // Monday
      });
    });
  });

  describe('annually generation', () => {
    it('generates an annual expense when the date has passed this year', () => {
      const lastYear = `${now.getFullYear() - 1}-01-15`;
      const re = makeRecurring({
        frequency: 'annually',
        monthOfYear: 0, // January
        dayOfMonth: 15,
        startDate: lastYear,
        lastGeneratedDate: null,
      });

      const { newExpenses } = generatePendingExpenses([re], now);

      // Should generate for last year and this year (Jan 15 already passed)
      expect(newExpenses.length).toBeGreaterThanOrEqual(1);
      newExpenses.forEach((exp) => {
        expect(exp.date).toMatch(/-01-15$/);
      });
    });

    it('does not generate if annual date has not occurred yet this year', () => {
      // Use December 31 — unlikely to have passed if test runs before then
      const startDate = `${now.getFullYear()}-12-31`;
      const re = makeRecurring({
        frequency: 'annually',
        monthOfYear: 11, // December
        dayOfMonth: 31,
        startDate,
        lastGeneratedDate: null,
      });

      // Run as if today is January
      const january = new Date(now.getFullYear(), 0, 15);
      const { newExpenses } = generatePendingExpenses([re], january);

      expect(newExpenses).toHaveLength(0);
    });
  });

  describe('updates lastGeneratedDate', () => {
    it('sets lastGeneratedDate on the updated recurring expense', () => {
      const twoMonthsAgo = format(subMonths(now, 2), 'yyyy-MM-dd');
      const re = makeRecurring({
        frequency: 'monthly',
        dayOfMonth: 1,
        startDate: twoMonthsAgo,
        lastGeneratedDate: null,
      });

      const { updatedRecurringExpenses } = generatePendingExpenses([re], now);

      expect(updatedRecurringExpenses[0].lastGeneratedDate).not.toBeNull();
    });
  });
});
