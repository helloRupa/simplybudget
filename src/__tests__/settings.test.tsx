import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetProvider } from '@/context/BudgetContext';
import Settings from '@/components/Settings';
import { Expense } from '@/types';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '@/utils/constants';
import { format, startOfWeek, subWeeks } from 'date-fns';
import { useState, useCallback } from 'react';

// Mock RecurringExpenseManager — it's complex enough for its own test file
jest.mock('../components/RecurringExpenseManager', () => ({
  __esModule: true,
  default: () => <div data-testid="recurring-manager">Recurring Expenses</div>,
}));

const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
const fourWeeksAgo = format(subWeeks(thisMonday, 4), 'yyyy-MM-dd');

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: crypto.randomUUID(),
    amount: 25,
    category: 'Food',
    description: 'Lunch',
    date: format(new Date(), 'yyyy-MM-dd'),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function seedLocalStorage(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    [STORAGE_KEYS.EXPENSES]: [],
    [STORAGE_KEYS.WEEKLY_BUDGET]: 200,
    [STORAGE_KEYS.CATEGORIES]: [...DEFAULT_CATEGORIES],
    [STORAGE_KEYS.FIRST_USE_DATE]: fourWeeksAgo,
    [STORAGE_KEYS.LOCALE]: 'en',
    [STORAGE_KEYS.CURRENCY]: 'USD',
    [STORAGE_KEYS.RECURRING_EXPENSES]: [],
    [STORAGE_KEYS.BUDGET_HISTORY]: [{ amount: 200, startDate: fourWeeksAgo }],
  };
  const merged = { ...defaults, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function SettingsView() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  return (
    <>
      <Settings onToast={showToast} />
      {toast && <div data-testid="toast" data-type={toast.type}>{toast.message}</div>}
    </>
  );
}

function renderSettings(overrides: Record<string, unknown> = {}) {
  seedLocalStorage(overrides);
  return render(
    <BudgetProvider>
      <SettingsView />
    </BudgetProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Settings', () => {
  describe('weekly budget', () => {
    it('displays the budget input with the initial value', async () => {
      renderSettings();
      // Budget input initializes from context's initial state
      expect(await screen.findByDisplayValue('200')).toBeInTheDocument();
    });

    it('updates the budget when a valid amount is submitted', async () => {
      const user = userEvent.setup();
      renderSettings();

      const budgetInput = await screen.findByDisplayValue('200');
      await user.clear(budgetInput);
      await user.type(budgetInput, '500');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByTestId('toast')).toHaveTextContent(/budget updated/i);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.WEEKLY_BUDGET)!)).toBe(500);
    });

    it('shows an error for zero budget', async () => {
      const user = userEvent.setup();
      renderSettings();

      const budgetInput = await screen.findByDisplayValue('200');
      await user.clear(budgetInput);
      await user.type(budgetInput, '0');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText(/budget must be greater than zero/i)).toBeInTheDocument();
    });

    it('shows an error for empty budget', async () => {
      const user = userEvent.setup();
      renderSettings();

      const budgetInput = await screen.findByDisplayValue('200');
      await user.clear(budgetInput);
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText(/budget must be greater than zero/i)).toBeInTheDocument();
    });

    it('saves a decimal budget correctly', async () => {
      const user = userEvent.setup();
      renderSettings();

      const budgetInput = await screen.findByDisplayValue('200');
      await user.clear(budgetInput);
      await user.type(budgetInput, '150.75');
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByTestId('toast')).toHaveTextContent(/budget updated/i);
      await waitFor(() => {
        expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.WEEKLY_BUDGET)!)).toBe(150.75);
      });
    });
  });

  describe('currency', () => {
    it('displays the current currency', async () => {
      renderSettings();
      expect(await screen.findByDisplayValue('US Dollar ($)')).toBeInTheDocument();
    });

    it('changes the currency', async () => {
      const user = userEvent.setup();
      renderSettings();

      const currencySelect = await screen.findByDisplayValue('US Dollar ($)');
      await user.selectOptions(currencySelect, 'EUR');

      await waitFor(() => {
        expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENCY)!)).toBe('EUR');
      });
    });
  });

  describe('categories', () => {
    it('displays all default categories', async () => {
      renderSettings();
      await screen.findByText('Manage Categories');

      for (const cat of DEFAULT_CATEGORIES) {
        expect(screen.getByText(cat)).toBeInTheDocument();
      }
    });

    it('does not show delete buttons on default categories', async () => {
      renderSettings();
      await screen.findByText('Manage Categories');

      const section = screen.getByText('Manage Categories').closest('[class*="rounded-2xl"]')!;
      const deleteButtons = within(section as HTMLElement).queryAllByTitle('Delete');
      expect(deleteButtons).toHaveLength(0);
    });

    it('adds a new custom category', async () => {
      const user = userEvent.setup();
      renderSettings();

      await screen.findByText('Manage Categories');
      await user.type(screen.getByPlaceholderText(/new category/i), 'Hobbies');
      await user.click(screen.getByRole('button', { name: /add category/i }));

      expect(screen.getByTestId('toast')).toHaveTextContent(/category added/i);
      expect(screen.getByText('Hobbies')).toBeInTheDocument();
    });

    it('shows an error when adding a duplicate category', async () => {
      const user = userEvent.setup();
      renderSettings();

      await screen.findByText('Manage Categories');
      await user.type(screen.getByPlaceholderText(/new category/i), 'Food');
      await user.click(screen.getByRole('button', { name: /add category/i }));

      expect(screen.getByTestId('toast')).toHaveTextContent(/already exists/i);
      expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'error');
    });

    it('deletes a custom category', async () => {
      const user = userEvent.setup();
      renderSettings({
        [STORAGE_KEYS.CATEGORIES]: [...DEFAULT_CATEGORIES, 'Hobbies'],
      });

      await screen.findByText('Hobbies');

      const section = screen.getByText('Manage Categories').closest('[class*="rounded-2xl"]')!;
      const deleteButton = within(section as HTMLElement).getByTitle('Delete');
      await user.click(deleteButton);

      expect(screen.queryByText('Hobbies')).not.toBeInTheDocument();
    });

    it('does not add an empty category', async () => {
      const user = userEvent.setup();
      renderSettings();

      await screen.findByText('Manage Categories');
      await user.click(screen.getByRole('button', { name: /add category/i }));

      // No toast should appear, and categories unchanged
      expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });
  });

  describe('export', () => {
    it('shows error toast when exporting CSV with no expenses', async () => {
      const user = userEvent.setup();
      renderSettings();

      await screen.findByText('Export Data');
      await user.click(screen.getByRole('button', { name: /export as csv/i }));

      expect(screen.getByTestId('toast')).toHaveTextContent(/no expenses/i);
      expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'error');
    });

    it('shows the expense count', async () => {
      const expenses = [makeExpense(), makeExpense()];
      renderSettings({ [STORAGE_KEYS.EXPENSES]: expenses });

      expect(await screen.findByText(/2 expenses/i)).toBeInTheDocument();
    });
  });

  describe('import backup', () => {
    it('imports a valid backup file', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => true);
      renderSettings();

      await screen.findByText('Export Data');

      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          expenses: [makeExpense({ description: 'Imported lunch' })],
          weeklyBudget: 999,
          categories: [...DEFAULT_CATEGORIES, 'Custom'],
          firstUseDate: fourWeeksAgo,
          locale: 'en',
          currency: 'USD',
          recurringExpenses: [],
          budgetHistory: [{ amount: 999, startDate: fourWeeksAgo }],
        },
      };

      const file = new File([JSON.stringify(backupData)], 'backup.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      expect(await screen.findByTestId('toast')).toHaveTextContent(/imported successfully/i);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.WEEKLY_BUDGET)!)).toBe(999);
    });

    it('does not import when user cancels the confirmation', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => false);
      renderSettings();

      await screen.findByText('Export Data');

      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          expenses: [],
          weeklyBudget: 999,
          categories: [...DEFAULT_CATEGORIES],
          firstUseDate: fourWeeksAgo,
          locale: 'en',
          currency: 'USD',
          recurringExpenses: [],
          budgetHistory: [],
        },
      };

      const file = new File([JSON.stringify(backupData)], 'backup.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      // Budget should remain unchanged
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.WEEKLY_BUDGET)!)).toBe(200);
      expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    it('shows an error for an invalid backup file', async () => {
      const user = userEvent.setup();
      window.confirm = jest.fn(() => true);
      renderSettings();

      await screen.findByText('Export Data');

      const file = new File(['not json'], 'bad.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      expect(await screen.findByTestId('toast')).toHaveTextContent(/could not parse/i);
      expect(screen.getByTestId('toast')).toHaveAttribute('data-type', 'error');
    });
  });
});
