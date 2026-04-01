import { render, screen, within } from '@testing-library/react';
import { BudgetProvider } from '@/context/BudgetContext';
import Dashboard from '@/components/Dashboard';
import { Expense, WeeklyBudget } from '@/types';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from '@/utils/constants';
import { format, startOfWeek, subWeeks } from 'date-fns';

// Recharts needs browser layout APIs; mock the chart to avoid errors
jest.mock('../components/SpendingChart', () => {
  return {
    __esModule: true,
    default: function MockSpendingChart({ data }: { data: Array<{ week: string; spent: number; budget: number }> }) {
      return (
        <div data-testid="spending-chart">
          {data.map((d) => (
            <div key={d.week} data-testid={`chart-week-${d.week}`}>
              {d.week}: spent={d.spent} budget={d.budget}
            </div>
          ))}
        </div>
      );
    },
  };
});

const now = new Date();
const today = format(now, 'yyyy-MM-dd');
const thisMonday = startOfWeek(now, { weekStartsOn: 1 });

function mondayOf(weeksAgo: number): string {
  return format(subWeeks(thisMonday, weeksAgo), 'yyyy-MM-dd');
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: crypto.randomUUID(),
    amount: 25,
    category: 'Food',
    description: 'Lunch',
    date: today,
    createdAt: now.toISOString(),
    ...overrides,
  };
}

function seedAndRender({
  expenses = [] as Expense[],
  weeklyBudget = 200,
  firstUseDate = mondayOf(4),
  budgetHistory = undefined as WeeklyBudget[] | undefined,
} = {}) {
  const effectiveBudgetHistory = budgetHistory ?? [{ amount: weeklyBudget, startDate: firstUseDate }];

  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  localStorage.setItem(STORAGE_KEYS.WEEKLY_BUDGET, JSON.stringify(weeklyBudget));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify([...DEFAULT_CATEGORIES]));
  localStorage.setItem(STORAGE_KEYS.FIRST_USE_DATE, JSON.stringify(firstUseDate));
  localStorage.setItem(STORAGE_KEYS.LOCALE, JSON.stringify('en'));
  localStorage.setItem(STORAGE_KEYS.CURRENCY, JSON.stringify('USD'));
  localStorage.setItem(STORAGE_KEYS.RECURRING_EXPENSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BUDGET_HISTORY, JSON.stringify(effectiveBudgetHistory));

  return render(
    <BudgetProvider>
      <Dashboard />
    </BudgetProvider>
  );
}

// StyledAmount splits "$1,234.56" across multiple spans.
// This helper finds the summary card by title and checks its combined text content.
function getCardByTitle(title: string): HTMLElement {
  const matches = screen.getAllByText(title);
  // Pick the one inside a summary card (has uppercase tracking-wider class)
  const titleEl = matches.find((el) => el.classList.contains('tracking-wider')) ?? matches[0];
  return titleEl.closest('[class*="rounded-2xl"]') as HTMLElement;
}

function expectCardValue(title: string, value: string) {
  const card = getCardByTitle(title);
  expect(card.textContent).toContain(value);
}

// Helper to get a dashboard section by its heading text
function getSectionByHeading(heading: string): HTMLElement {
  const matches = screen.getAllByText(heading);
  // Prefer the one that's a section heading (font-semibold) not a card title (tracking-wider)
  const el = matches.find((e) => !e.classList.contains('tracking-wider')) ?? matches[0];
  return el.closest('[class*="rounded-2xl"]') as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
});

describe('Dashboard', () => {
  describe('empty state', () => {
    it('shows empty state message when there are no expenses', async () => {
      seedAndRender();
      expect(await screen.findByText(/no expenses yet/i)).toBeInTheDocument();
    });

    it('displays the weekly budget', async () => {
      seedAndRender({ weeklyBudget: 300 });
      // Wait for context to load
      await screen.findByText('Spent This Week');
      expectCardValue('Weekly Budget', '$300');
    });

    it('shows $0 spent this week with no expenses', async () => {
      seedAndRender();
      await screen.findByText('Spent This Week');
      expectCardValue('Spent This Week', '$0');
    });
  });

  describe('weekly summary cards', () => {
    it('shows the correct amounts spent and remaining this week', async () => {
      const expenses = [
        makeExpense({ amount: 30, date: today }),
        makeExpense({ amount: 20, date: today }),
      ];
      seedAndRender({ expenses, weeklyBudget: 200 });

      await screen.findByText('Spent This Week');
      expectCardValue('Spent This Week', '$50');
      expectCardValue('Remaining This Week', '$150');
    });

    it('shows over budget when spending exceeds budget', async () => {
      const expenses = [makeExpense({ amount: 250, date: today })];
      seedAndRender({ expenses, weeklyBudget: 200 });

      expect(await screen.findByText('Over Budget This Week')).toBeInTheDocument();
      expectCardValue('Over Budget This Week', '$50');
    });

    it('does not count expenses from other weeks in this week totals', async () => {
      const lastWeekDate = mondayOf(1);
      const expenses = [
        makeExpense({ amount: 40, date: today }),
        makeExpense({ amount: 100, date: lastWeekDate }),
      ];
      seedAndRender({ expenses, weeklyBudget: 200 });

      await screen.findByText('Spent This Week');
      expectCardValue('Spent This Week', '$40');
    });
  });

  describe('total saved/overspent all time', () => {
    it('calculates correctly with a single budget over multiple weeks', async () => {
      // Budget: $100/week, firstUseDate: 3 weeks ago Monday (4 weeks total)
      // Spend each week = $220 total
      // 4 × $100 = $400 budgeted → $180 saved
      const expenses = [
        makeExpense({ amount: 90, date: mondayOf(3) }),
        makeExpense({ amount: 50, date: mondayOf(2) }),
        makeExpense({ amount: 20, date: mondayOf(1) }),
        makeExpense({ amount: 60, date: today }),
      ];
      seedAndRender({
        expenses,
        weeklyBudget: 100,
        firstUseDate: mondayOf(3),
        budgetHistory: [{ amount: 100, startDate: mondayOf(3) }],
      });

      expect(await screen.findByText('Total Saved (All Time)')).toBeInTheDocument();
      expectCardValue('Total Saved (All Time)', '$180');
    });

    it('shows overspent when total spending exceeds total budget', async () => {
      // 2 weeks × $100 = $200 budgeted, spend $270 → $70 overspent
      const expenses = [
        makeExpense({ amount: 150, date: mondayOf(1) }),
        makeExpense({ amount: 120, date: today }),
      ];
      seedAndRender({
        expenses,
        weeklyBudget: 100,
        firstUseDate: mondayOf(1),
        budgetHistory: [{ amount: 100, startDate: mondayOf(1) }],
      });

      expect(await screen.findByText('Total Overspent (All Time)')).toBeInTheDocument();
      expectCardValue('Total Overspent (All Time)', '$70');
    });

    it('handles a budget change mid-history correctly', async () => {
      // Weeks 1-2: $100/week, Weeks 3-4: $150/week
      // Total budgeted: 100 + 100 + 150 + 150 = $500
      // Spend $100 each week = $400 → $100 saved
      const budgetHistory: WeeklyBudget[] = [
        { amount: 100, startDate: mondayOf(3) },
        { amount: 150, startDate: mondayOf(1) },
      ];
      const expenses = [
        makeExpense({ amount: 100, date: mondayOf(3) }),
        makeExpense({ amount: 100, date: mondayOf(2) }),
        makeExpense({ amount: 100, date: mondayOf(1) }),
        makeExpense({ amount: 100, date: today }),
      ];
      seedAndRender({
        expenses,
        weeklyBudget: 150,
        firstUseDate: mondayOf(3),
        budgetHistory,
      });

      expect(await screen.findByText('Total Saved (All Time)')).toBeInTheDocument();
      expectCardValue('Total Saved (All Time)', '$100');
    });

    it('handles multiple budget changes across many weeks', async () => {
      // Week 1: $50, Weeks 2-3: $100, Weeks 4-6: $200
      // Total budgeted: 50 + 100 + 100 + 200 + 200 + 200 = $850
      // Spend $80 each week = $480 → $370 saved
      const budgetHistory: WeeklyBudget[] = [
        { amount: 50, startDate: mondayOf(5) },
        { amount: 100, startDate: mondayOf(4) },
        { amount: 200, startDate: mondayOf(2) },
      ];
      const expenses = [
        makeExpense({ amount: 80, date: mondayOf(5) }),
        makeExpense({ amount: 80, date: mondayOf(4) }),
        makeExpense({ amount: 80, date: mondayOf(3) }),
        makeExpense({ amount: 80, date: mondayOf(2) }),
        makeExpense({ amount: 80, date: mondayOf(1) }),
        makeExpense({ amount: 80, date: today }),
      ];
      seedAndRender({
        expenses,
        weeklyBudget: 200,
        firstUseDate: mondayOf(5),
        budgetHistory,
      });

      expect(await screen.findByText('Total Saved (All Time)')).toBeInTheDocument();
      expectCardValue('Total Saved (All Time)', '$370');
    });

    it('handles exact budget match (zero saved, zero overspent)', async () => {
      // 2 weeks × $100 = $200 budgeted, spend exactly $200
      const expenses = [
        makeExpense({ amount: 100, date: mondayOf(1) }),
        makeExpense({ amount: 100, date: today }),
      ];
      seedAndRender({
        expenses,
        weeklyBudget: 100,
        firstUseDate: mondayOf(1),
        budgetHistory: [{ amount: 100, startDate: mondayOf(1) }],
      });

      // $0 saved — title should say "Total Saved" (>= 0)
      expect(await screen.findByText('Total Saved (All Time)')).toBeInTheDocument();
      expectCardValue('Total Saved (All Time)', '$0');
    });

    it('does not count expenses before the first use date', async () => {
      // 3 weeks × $100 = $300 budgeted
      // $999 expense before start should be excluded, only $50 counted → $250 saved
      const expenses = [
        makeExpense({ amount: 999, date: mondayOf(5) }),
        makeExpense({ amount: 50, date: today }),
      ];
      seedAndRender({
        expenses,
        weeklyBudget: 100,
        firstUseDate: mondayOf(2),
        budgetHistory: [{ amount: 100, startDate: mondayOf(2) }],
      });

      expect(await screen.findByText('Total Saved (All Time)')).toBeInTheDocument();
      expectCardValue('Total Saved (All Time)', '$250');
    });

    it('handles weeks with no expenses (fully saved)', async () => {
      // 3 weeks × $100 = $300 budgeted, only spend in current week
      const expenses = [makeExpense({ amount: 25, date: today })];
      seedAndRender({
        expenses,
        weeklyBudget: 100,
        firstUseDate: mondayOf(2),
        budgetHistory: [{ amount: 100, startDate: mondayOf(2) }],
      });

      // $300 - $25 = $275 saved
      expect(await screen.findByText('Total Saved (All Time)')).toBeInTheDocument();
      expectCardValue('Total Saved (All Time)', '$275');
    });

    it('shows the tooltip with calculation breakdown', async () => {
      const expenses = [makeExpense({ amount: 30, date: today })];
      seedAndRender({
        expenses,
        weeklyBudget: 100,
        firstUseDate: mondayOf(1),
        budgetHistory: [{ amount: 100, startDate: mondayOf(1) }],
      });

      // Tooltip: "Tracking since {date}. Total budgeted across 2 weeks ($200.00) minus total spent ($30.00)."
      const tooltip = await screen.findByText(/tracking since/i);
      expect(tooltip).toHaveTextContent('2 weeks');
      expect(tooltip).toHaveTextContent('$200.00');
      expect(tooltip).toHaveTextContent('$30.00');
    });
  });

  describe('budget progress bar', () => {
    it('displays spent vs budget in the progress bar area', async () => {
      const expenses = [makeExpense({ amount: 80, date: today })];
      seedAndRender({ expenses, weeklyBudget: 200 });

      // Progress bar section contains "$80.00 / $200.00"
      await screen.findByText('Spent This Week');
      const progressSection = getSectionByHeading('Weekly Budget');
      expect(progressSection.textContent).toContain('$80.00');
      expect(progressSection.textContent).toContain('$200.00');
    });

    it('shows correct budget percentage', async () => {
      const expenses = [makeExpense({ amount: 150, date: today })];
      seedAndRender({ expenses, weeklyBudget: 200 });

      // 150/200 = 75%
      await screen.findByText('Spent This Week');
      expect(screen.getByText(/75%/)).toBeInTheDocument();
    });
  });

  describe('category breakdown', () => {
    it('shows top categories with correct totals', async () => {
      const expenses = [
        makeExpense({ amount: 100, category: 'Food', date: today }),
        makeExpense({ amount: 60, category: 'Food', date: today }),
        makeExpense({ amount: 80, category: 'Shopping', date: today }),
      ];
      seedAndRender({ expenses });

      expect(await screen.findByText('Top Categories')).toBeInTheDocument();
      const section = getSectionByHeading('Top Categories');
      expect(section.textContent).toContain('$160.00'); // Food total
      expect(section.textContent).toContain('$80.00'); // Shopping total
    });

    it('shows correct percentages for categories', async () => {
      const expenses = [
        makeExpense({ amount: 75, category: 'Food', date: today }),
        makeExpense({ amount: 25, category: 'Shopping', date: today }),
      ];
      seedAndRender({ expenses });

      await screen.findByText('Top Categories');
      expect(screen.getByText(/75\.0%/)).toBeInTheDocument();
      expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
    });

    it('limits to top 5 categories', async () => {
      // Create 6 categories with distinct amounts
      const expenses = [
        makeExpense({ amount: 60, category: 'Food' }),
        makeExpense({ amount: 50, category: 'Shopping' }),
        makeExpense({ amount: 40, category: 'Transportation' }),
        makeExpense({ amount: 30, category: 'Entertainment' }),
        makeExpense({ amount: 20, category: 'Bills' }),
        makeExpense({ amount: 10, category: 'Other' }),
      ];
      seedAndRender({ expenses });

      await screen.findByText('Top Categories');

      // Top 5 categories section should show the 5 highest
      // "Other" at $10 is the 6th and should be excluded from top categories
      // All 6 appear in monthly spending section though, so check that
      // top categories only has 5 entries by checking the section
      const topCategoriesSection = screen.getByText('Top Categories').closest('div[class*="rounded-2xl"]')!;
      // Each category row has a percentage; count them
      const percentages = within(topCategoriesSection as HTMLElement).getAllByText(/%/);
      expect(percentages).toHaveLength(5);
    });
  });

  describe('weekly chart data', () => {
    it('passes correct data to the spending chart', async () => {
      const expenses = [
        makeExpense({ amount: 45, date: today }),
        makeExpense({ amount: 30, date: mondayOf(1) }),
      ];
      seedAndRender({
        expenses,
        weeklyBudget: 100,
        firstUseDate: mondayOf(1),
        budgetHistory: [{ amount: 100, startDate: mondayOf(1) }],
      });

      const chart = await screen.findByTestId('spending-chart');
      expect(chart).toHaveTextContent('spent=30');
      expect(chart).toHaveTextContent('spent=45');
      expect(chart).toHaveTextContent('budget=100');
    });

    it('limits chart to the most recent 8 weeks', async () => {
      // 12 weeks of history, only the last 8 should appear in the chart
      const expenses = Array.from({ length: 12 }, (_, i) =>
        makeExpense({ amount: 10 * (i + 1), date: mondayOf(11 - i) }),
      );
      seedAndRender({
        expenses,
        weeklyBudget: 100,
        firstUseDate: mondayOf(11),
        budgetHistory: [{ amount: 100, startDate: mondayOf(11) }],
      });

      const chart = await screen.findByTestId('spending-chart');
      const weekEntries = within(chart).getAllByTestId(/^chart-week-/);
      expect(weekEntries).toHaveLength(8);
    });
  });
});
