import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetProvider } from '@/context/BudgetContext';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import Settings from '@/components/Settings';
import { Expense } from '@/types';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '@/utils/constants';
import { format, subDays } from 'date-fns';
import { useState, useCallback } from 'react';

// Mock RecurringExpenseManager used inside Settings
jest.mock('../components/RecurringExpenseManager', () => ({
  __esModule: true,
  default: () => <div data-testid="recurring-manager" />,
}));

const fiveDaysAgo = format(subDays(new Date(), 5), 'yyyy-MM-dd');
const tenDaysAgo = format(subDays(new Date(), 10), 'yyyy-MM-dd');
const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: crypto.randomUUID(),
    amount: 25,
    category: 'Food',
    description: 'Lunch',
    date: fiveDaysAgo,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function seedLocalStorage(expenses: Expense[] = [], categories: string[] = [...DEFAULT_CATEGORIES]) {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  localStorage.setItem(STORAGE_KEYS.WEEKLY_BUDGET, JSON.stringify(200));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  localStorage.setItem(STORAGE_KEYS.FIRST_USE_DATE, JSON.stringify(sixtyDaysAgo));
  localStorage.setItem(STORAGE_KEYS.LOCALE, JSON.stringify('en'));
  localStorage.setItem(STORAGE_KEYS.CURRENCY, JSON.stringify('USD'));
  localStorage.setItem(STORAGE_KEYS.RECURRING_EXPENSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BUDGET_HISTORY, JSON.stringify([{ amount: 200, startDate: sixtyDaysAgo }]));
}

// Mirrors the expenses tab in page.tsx
function ExpensesView() {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  return (
    <>
      <ExpenseForm
        editingExpense={editingExpense}
        onDone={() => setEditingExpense(null)}
        onToast={showToast}
      />
      <ExpenseList onEdit={setEditingExpense} onToast={showToast} />
      {toast && <div data-testid="toast">{toast.message}</div>}
    </>
  );
}

function renderExpensesView(expenses: Expense[] = []) {
  seedLocalStorage(expenses);
  return render(
    <BudgetProvider>
      <ExpensesView />
    </BudgetProvider>
  );
}

// Helper: get the desktop table (hidden on mobile via CSS but present in DOM)
function getTable() {
  return screen.getByRole('table');
}

beforeEach(() => {
  localStorage.clear();
});

describe('Expenses view', () => {
  describe('empty state', () => {
    it('shows a no-expenses message when there are no expenses', async () => {
      renderExpensesView();
      expect(await screen.findByText('No expenses found.')).toBeInTheDocument();
    });
  });

  describe('displaying expenses', () => {
    it('renders expenses in the list', async () => {
      const expenses = [
        makeExpense({ description: 'Coffee', amount: 5.5 }),
        makeExpense({ description: 'Groceries', amount: 42, category: 'Shopping' }),
      ];
      renderExpensesView(expenses);

      // Wait for data to load, then check table
      const table = await waitFor(() => getTable());
      expect(within(table).getByText('Coffee')).toBeInTheDocument();
      expect(within(table).getByText('Groceries')).toBeInTheDocument();
      expect(within(table).getByText('$5.50')).toBeInTheDocument();
      expect(within(table).getByText('$42.00')).toBeInTheDocument();
    });

    it('shows expense count', async () => {
      const expenses = [
        makeExpense({ description: 'Coffee' }),
        makeExpense({ description: 'Tea' }),
      ];
      renderExpensesView(expenses);

      expect(await screen.findByText('2 expenses')).toBeInTheDocument();
    });

    it('only shows expenses from the past 30 days by default', async () => {
      const expenses = [
        makeExpense({ description: 'Recent', date: fiveDaysAgo }),
        makeExpense({ description: 'Old expense', date: sixtyDaysAgo }),
      ];
      renderExpensesView(expenses);

      // Only recent expense shows (30 day default filter)
      const table = await waitFor(() => getTable());
      expect(within(table).getByText('Recent')).toBeInTheDocument();
      expect(within(table).queryByText('Old expense')).not.toBeInTheDocument();
      // Shows "1 expenses of 2"
      expect(screen.getByText(/1 expenses/)).toBeInTheDocument();
      expect(screen.getByText(/of 2/)).toBeInTheDocument();
    });
  });

  describe('adding expenses', () => {
    it('adds a new expense via the form', async () => {
      const user = userEvent.setup();
      renderExpensesView();

      await screen.findByText('No expenses found.');

      await user.type(screen.getByPlaceholderText('0.00'), '15.99');
      // The form category select has "Select category" as its first option
      const formCategorySelect = screen.getAllByRole('combobox').find(
        (s) => within(s).queryByText('Select category') !== null,
      )!;
      await user.selectOptions(formCategorySelect, 'Food');
      await user.type(screen.getByPlaceholderText(/optional/i), 'Tacos');

      await user.click(screen.getByRole('button', { name: /^add expense$/i }));

      // Expense should now appear in the table
      const table = await waitFor(() => getTable());
      expect(within(table).getByText('Tacos')).toBeInTheDocument();
      expect(within(table).getByText('$15.99')).toBeInTheDocument();
    });

    it('shows validation errors for empty form submission', async () => {
      const user = userEvent.setup();
      renderExpensesView();
      await screen.findByText('No expenses found.');

      await user.click(screen.getByRole('button', { name: /^add expense$/i }));

      expect(await screen.findByText(/amount is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
    });

    it('rejects a date before the first use date', async () => {
      const user = userEvent.setup();
      renderExpensesView();
      await screen.findByText('No expenses found.');

      await user.type(screen.getByPlaceholderText('0.00'), '10');
      const formCategorySelect = screen.getAllByRole('combobox').find(
        (s) => within(s).queryByText('Select category') !== null,
      )!;
      await user.selectOptions(formCategorySelect, 'Food');

      // Set date before the first use date — the form date input has a min attribute
      const dateInputs = screen.getAllByDisplayValue(format(new Date(), 'yyyy-MM-dd'));
      const dateInput = dateInputs.find((el) => el.hasAttribute('min'))!;
      await user.clear(dateInput);
      await user.type(dateInput, ninetyDaysAgo);

      await user.click(screen.getByRole('button', { name: /^add expense$/i }));

      expect(await screen.findByText(/date cannot be before budget start date/i)).toBeInTheDocument();
    });
  });

  describe('editing expenses', () => {
    it('populates the form when editing and updates the expense', async () => {
      const user = userEvent.setup();
      const expenses = [makeExpense({ description: 'Old lunch', amount: 12, category: 'Food' })];
      renderExpensesView(expenses);

      // Wait for the table to render
      const table = await waitFor(() => getTable());

      // Click Edit in the desktop table
      const editButton = within(table).getByRole('button', { name: /^edit$/i });
      await user.click(editButton);

      // Form should switch to edit mode
      expect(await screen.findByText('Edit Expense')).toBeInTheDocument();

      // Clear and type new description
      const descriptionInput = screen.getByDisplayValue('Old lunch');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated lunch');

      await user.click(screen.getByRole('button', { name: /update/i }));

      // Table should reflect the update
      await waitFor(() => {
        expect(within(table).getByText('Updated lunch')).toBeInTheDocument();
      });
      expect(within(table).queryByText('Old lunch')).not.toBeInTheDocument();
    });

    it('cancels editing when cancel is clicked', async () => {
      const user = userEvent.setup();
      const expenses = [makeExpense({ description: 'Keep this', amount: 10 })];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());
      await user.click(within(table).getByRole('button', { name: /^edit$/i }));

      expect(await screen.findByText('Edit Expense')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Form should go back to add mode
      expect(screen.getByRole('heading', { name: 'Add Expense' })).toBeInTheDocument();
    });
  });

  describe('deleting expenses', () => {
    it('shows confirmation buttons when delete is clicked', async () => {
      const user = userEvent.setup();
      const expenses = [makeExpense({ description: 'To delete' })];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());

      // Click delete in table
      await user.click(within(table).getByRole('button', { name: /^delete$/i }));

      // Confirmation pair should appear in the table row
      expect(within(table).getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
      expect(within(table).getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    });

    it('cancels deletion when cancel is clicked', async () => {
      const user = userEvent.setup();
      const expenses = [makeExpense({ description: 'Keep me' })];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());
      await user.click(within(table).getByRole('button', { name: /^delete$/i }));
      await user.click(within(table).getByRole('button', { name: /^cancel$/i }));

      // Expense should still be there, with edit/delete buttons restored
      expect(within(table).getByText('Keep me')).toBeInTheDocument();
      expect(within(table).getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    });

    it('removes the expense after confirming delete', async () => {
      const user = userEvent.setup();
      const expenses = [makeExpense({ description: 'Bye bye' })];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());
      await user.click(within(table).getByRole('button', { name: /^delete$/i }));

      // Confirm
      await user.click(within(table).getByRole('button', { name: /^delete$/i }));

      // Should show empty state
      expect(await screen.findByText('No expenses found.')).toBeInTheDocument();

      // Toast should appear
      expect(screen.getByTestId('toast')).toHaveTextContent(/deleted/i);
    });
  });

  describe('filtering expenses', () => {
    it('filters by category', async () => {
      const user = userEvent.setup();
      const expenses = [
        makeExpense({ description: 'Pizza', category: 'Food' }),
        makeExpense({ description: 'Bus ticket', category: 'Transportation' }),
      ];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());
      expect(within(table).getByText('Pizza')).toBeInTheDocument();
      expect(within(table).getByText('Bus ticket')).toBeInTheDocument();

      // Filter by Food category
      const categorySelects = screen.getAllByRole('combobox');
      // The filter category select has "All Categories" option
      const filterSelect = categorySelects.find(
        (s) => within(s).queryByText('All Categories') !== null,
      )!;
      await user.selectOptions(filterSelect, 'Food');

      expect(within(table).getByText('Pizza')).toBeInTheDocument();
      expect(within(table).queryByText('Bus ticket')).not.toBeInTheDocument();
    });

    it('filters by search query', async () => {
      const user = userEvent.setup();
      const expenses = [
        makeExpense({ description: 'Morning coffee' }),
        makeExpense({ description: 'Evening dinner' }),
      ];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());
      expect(within(table).getByText('Morning coffee')).toBeInTheDocument();

      await user.type(screen.getByPlaceholderText(/search/i), 'coffee');

      expect(within(table).getByText('Morning coffee')).toBeInTheDocument();
      await waitFor(() => {
        expect(within(table).queryByText('Evening dinner')).not.toBeInTheDocument();
      });
    });

    it('resets filters when reset button is clicked', async () => {
      const user = userEvent.setup();
      const expenses = [
        makeExpense({ description: 'Pizza', category: 'Food' }),
        makeExpense({ description: 'Bus ticket', category: 'Transportation' }),
      ];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());

      // Filter by Food
      const categorySelects = screen.getAllByRole('combobox');
      const filterSelect = categorySelects.find(
        (s) => within(s).queryByText('All Categories') !== null,
      )!;
      await user.selectOptions(filterSelect, 'Food');
      expect(within(table).queryByText('Bus ticket')).not.toBeInTheDocument();

      // Reset
      await user.click(screen.getByText(/reset filters/i));

      expect(within(table).getByText('Pizza')).toBeInTheDocument();
      expect(within(table).getByText('Bus ticket')).toBeInTheDocument();
    });

    it('restores the default 30-day date range on reset', async () => {
      const user = userEvent.setup();
      const expenses = [
        makeExpense({ description: 'Recent', date: fiveDaysAgo }),
        makeExpense({ description: 'Old expense', date: sixtyDaysAgo }),
      ];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());
      expect(within(table).queryByText('Old expense')).not.toBeInTheDocument();

      // Widen the date range to show the old expense
      const dateFromInput = screen.getByTitle('From');
      await user.clear(dateFromInput);
      await user.type(dateFromInput, sixtyDaysAgo);

      await waitFor(() => {
        expect(within(table).getByText('Old expense')).toBeInTheDocument();
      });

      // Reset should restore the 30-day window, hiding the old expense again
      await user.click(screen.getByText(/reset filters/i));

      await waitFor(() => {
        expect(within(table).queryByText('Old expense')).not.toBeInTheDocument();
      });
      expect(within(table).getByText('Recent')).toBeInTheDocument();
    });
  });

  describe('sorting expenses', () => {
    it('sorts by amount when amount header is clicked', async () => {
      const user = userEvent.setup();
      const expenses = [
        makeExpense({ description: 'Cheap', amount: 5, date: fiveDaysAgo }),
        makeExpense({ description: 'Pricey', amount: 100, date: tenDaysAgo }),
      ];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());

      // Click Amount column header in the table
      const amountHeader = within(table).getByText('Amount');
      await user.click(amountHeader);

      const rows = within(table).getAllByRole('row');
      // rows[0] = header, rows[1..] = data
      expect(within(rows[1]).getByText('$100.00')).toBeInTheDocument();
      expect(within(rows[2]).getByText('$5.00')).toBeInTheDocument();
    });

    it('toggles sort direction on second click', async () => {
      const user = userEvent.setup();
      const expenses = [
        makeExpense({ description: 'Cheap', amount: 5, date: fiveDaysAgo }),
        makeExpense({ description: 'Pricey', amount: 100, date: tenDaysAgo }),
      ];
      renderExpensesView(expenses);

      const table = await waitFor(() => getTable());

      // Click Amount header twice: first desc, then asc
      const amountHeader = within(table).getByText('Amount');
      await user.click(amountHeader);
      await user.click(amountHeader);

      const rows = within(table).getAllByRole('row');
      expect(within(rows[1]).getByText('$5.00')).toBeInTheDocument();
      expect(within(rows[2]).getByText('$100.00')).toBeInTheDocument();
    });
  });
});

// Combined Settings + Expenses view to test cross-view interactions
function SettingsAndExpensesView() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'settings'>('settings');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  return (
    <>
      <button onClick={() => setActiveTab('expenses')}>Go to Expenses</button>
      <button onClick={() => setActiveTab('settings')}>Go to Settings</button>

      {activeTab === 'settings' && <Settings onToast={showToast} />}
      {activeTab === 'expenses' && (
        <>
          <ExpenseForm
            editingExpense={editingExpense}
            onDone={() => setEditingExpense(null)}
            onToast={showToast}
          />
          <ExpenseList onEdit={setEditingExpense} onToast={showToast} />
        </>
      )}
      {toast && <div data-testid="toast">{toast.message}</div>}
    </>
  );
}

describe('Expenses with deleted category', () => {
  it('still displays an expense whose category was deleted', async () => {
    const user = userEvent.setup();
    const categories = [...DEFAULT_CATEGORIES, 'Hobbies'];
    const expenses = [makeExpense({ description: 'Guitar strings', category: 'Hobbies' })];
    seedLocalStorage(expenses, categories);

    render(
      <BudgetProvider>
        <SettingsAndExpensesView />
      </BudgetProvider>
    );

    // Start on Settings — delete the Hobbies category
    await screen.findByText('Manage Categories');
    const section = screen.getByText('Manage Categories').closest('[class*="rounded-2xl"]')!;
    const deleteButton = within(section as HTMLElement).getByTitle('Delete');
    await user.click(deleteButton);

    // Switch to Expenses
    await user.click(screen.getByText('Go to Expenses'));

    // The expense should still be visible with its category name
    const table = await waitFor(() => screen.getByRole('table'));
    expect(within(table).getByText('Guitar strings')).toBeInTheDocument();
    expect(within(table).getByText('Hobbies')).toBeInTheDocument();
  });

  it('can edit an expense whose category was deleted and assign a new category', async () => {
    const user = userEvent.setup();
    const categories = [...DEFAULT_CATEGORIES, 'Hobbies'];
    const expenses = [makeExpense({ description: 'Guitar strings', amount: 20, category: 'Hobbies' })];
    seedLocalStorage(expenses, categories);

    render(
      <BudgetProvider>
        <SettingsAndExpensesView />
      </BudgetProvider>
    );

    // Delete the Hobbies category in Settings
    await screen.findByText('Manage Categories');
    const section = screen.getByText('Manage Categories').closest('[class*="rounded-2xl"]')!;
    const deleteButton = within(section as HTMLElement).getByTitle('Delete');
    await user.click(deleteButton);

    // Switch to Expenses
    await user.click(screen.getByText('Go to Expenses'));

    // Click Edit on the expense
    const table = await waitFor(() => screen.getByRole('table'));
    await user.click(within(table).getByRole('button', { name: /^edit$/i }));

    // Form should be in edit mode
    expect(await screen.findByText('Edit Expense')).toBeInTheDocument();

    // The category select won't have "Hobbies" as an option anymore,
    // so it falls back to no selection. Pick a valid category.
    const formCategorySelect = screen.getAllByRole('combobox').find(
      (s) => within(s).queryByText('Select category') !== null,
    )!;
    await user.selectOptions(formCategorySelect, 'Entertainment');

    await user.click(screen.getByRole('button', { name: /update/i }));

    // Expense should now show Entertainment instead of Hobbies
    await waitFor(() => {
      expect(within(table).getByText('Entertainment')).toBeInTheDocument();
    });
    expect(within(table).getByText('Guitar strings')).toBeInTheDocument();
    expect(within(table).queryByText('Hobbies')).not.toBeInTheDocument();
  });

  it('preserves the expense amount and description when reassigning category', async () => {
    const user = userEvent.setup();
    const categories = [...DEFAULT_CATEGORIES, 'Hobbies'];
    const expenses = [makeExpense({ description: 'Guitar strings', amount: 42.5, category: 'Hobbies' })];
    seedLocalStorage(expenses, categories);

    render(
      <BudgetProvider>
        <SettingsAndExpensesView />
      </BudgetProvider>
    );

    // Delete category, switch to expenses, edit
    await screen.findByText('Manage Categories');
    const section = screen.getByText('Manage Categories').closest('[class*="rounded-2xl"]')!;
    await user.click(within(section as HTMLElement).getByTitle('Delete'));
    await user.click(screen.getByText('Go to Expenses'));

    const table = await waitFor(() => screen.getByRole('table'));
    await user.click(within(table).getByRole('button', { name: /^edit$/i }));

    await screen.findByText('Edit Expense');

    // Amount and description should be preserved in the form
    expect(screen.getByDisplayValue('42.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Guitar strings')).toBeInTheDocument();

    // Reassign category and save
    const formCategorySelect = screen.getAllByRole('combobox').find(
      (s) => within(s).queryByText('Select category') !== null,
    )!;
    await user.selectOptions(formCategorySelect, 'Other');
    await user.click(screen.getByRole('button', { name: /update/i }));

    // Verify the amount is still correct
    await waitFor(() => {
      expect(within(table).getByText('$42.50')).toBeInTheDocument();
    });
    expect(within(table).getByText('Guitar strings')).toBeInTheDocument();
  });
});
