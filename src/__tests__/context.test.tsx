import { render, screen, act } from "@testing-library/react";
import { BudgetProvider, useBudget } from "@/context/BudgetContext";
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from "@/utils/constants";
import { format, subDays } from "date-fns";

const sixtyDaysAgo = format(subDays(new Date(), 60), "yyyy-MM-dd");

function seedLocalStorage(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    [STORAGE_KEYS.EXPENSES]: [],
    [STORAGE_KEYS.WEEKLY_BUDGET]: 200,
    [STORAGE_KEYS.CATEGORIES]: [...DEFAULT_CATEGORIES],
    [STORAGE_KEYS.FIRST_USE_DATE]: sixtyDaysAgo,
    [STORAGE_KEYS.LOCALE]: "en",
    [STORAGE_KEYS.CURRENCY]: "USD",
    [STORAGE_KEYS.RECURRING_EXPENSES]: [],
    [STORAGE_KEYS.BUDGET_HISTORY]: [{ amount: 200, startDate: sixtyDaysAgo }],
  };
  const merged = { ...defaults, ...overrides };

  for (const [key, value] of Object.entries(merged)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function getStoredValue<T>(key: string): T {
  return JSON.parse(localStorage.getItem(key)!) as T;
}

// Test harness that exposes context actions via buttons
function ContextHarness() {
  const {
    state,
    addExpense,
    updateExpense,
    deleteExpense,
    setWeeklyBudget,
    addCategory,
    deleteCategory,
    isLoaded,
  } = useBudget();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="expense-count">{state.expenses.length}</div>
      <div data-testid="weekly-budget">{state.weeklyBudget}</div>
      <div data-testid="categories">{state.categories.join(",")}</div>
      <div data-testid="expenses-json">{JSON.stringify(state.expenses)}</div>

      <button
        onClick={() =>
          addExpense({
            amount: 25,
            category: "Food",
            description: "Test expense",
            date: "2026-03-15",
          })
        }
      >
        Add Expense
      </button>
      <button
        onClick={() => {
          const expense = state.expenses[0];

          if (expense) {
            updateExpense({
              ...expense,
              description: "Updated description",
              amount: 50,
            });
          }
        }}
      >
        Update First Expense
      </button>
      <button
        onClick={() => {
          const expense = state.expenses[0];

          if (expense) {
            deleteExpense(expense.id);
          }
        }}
      >
        Delete First Expense
      </button>
      <button onClick={() => setWeeklyBudget(500)}>Set Budget 500</button>
      <button onClick={() => addCategory("Custom")}>Add Category</button>
      <button onClick={() => deleteCategory("Other")}>Delete Other</button>
    </div>
  );
}

function renderHarness(overrides: Record<string, unknown> = {}) {
  seedLocalStorage(overrides);
  return render(
    <BudgetProvider>
      <ContextHarness />
    </BudgetProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("BudgetContext", () => {
  describe("loading from localStorage", () => {
    it("loads seeded expenses on mount", async () => {
      const expenses = [
        {
          id: "e1",
          amount: 10,
          category: "Food",
          description: "Coffee",
          date: "2026-03-20",
          createdAt: "2026-03-20T00:00:00Z",
        },
      ];
      renderHarness({ [STORAGE_KEYS.EXPENSES]: expenses });

      expect(await screen.findByTestId("expense-count")).toHaveTextContent("1");
      expect(screen.getByTestId("expenses-json")).toHaveTextContent("Coffee");
    });

    it("loads seeded weekly budget on mount", async () => {
      renderHarness({ [STORAGE_KEYS.WEEKLY_BUDGET]: 350 });

      expect(await screen.findByTestId("weekly-budget")).toHaveTextContent(
        "350"
      );
    });

    it("loads seeded categories on mount", async () => {
      renderHarness({ [STORAGE_KEYS.CATEGORIES]: ["Rent", "Groceries"] });

      expect(await screen.findByTestId("categories")).toHaveTextContent(
        "Rent,Groceries"
      );
    });

    it("uses defaults when localStorage is empty", async () => {
      localStorage.clear();
      render(
        <BudgetProvider>
          <ContextHarness />
        </BudgetProvider>
      );

      expect(await screen.findByTestId("expense-count")).toHaveTextContent("0");
      expect(screen.getByTestId("weekly-budget")).toHaveTextContent("200");
      expect(screen.getByTestId("categories")).toHaveTextContent(
        DEFAULT_CATEGORIES.join(",")
      );
    });
  });

  describe("persisting to localStorage", () => {
    it("persists a new expense", async () => {
      renderHarness();
      await screen.findByTestId("expense-count");

      await act(async () => {
        screen.getByText("Add Expense").click();
      });

      expect(screen.getByTestId("expense-count")).toHaveTextContent("1");
      const stored = getStoredValue<Array<{ description: string }>>(
        STORAGE_KEYS.EXPENSES
      );
      expect(stored).toHaveLength(1);
      expect(stored[0].description).toBe("Test expense");
    });

    it("persists an updated expense", async () => {
      const expenses = [
        {
          id: "e1",
          amount: 10,
          category: "Food",
          description: "Original",
          date: "2026-03-20",
          createdAt: "2026-03-20T00:00:00Z",
        },
      ];
      renderHarness({ [STORAGE_KEYS.EXPENSES]: expenses });
      await screen.findByTestId("expense-count");

      await act(async () => {
        screen.getByText("Update First Expense").click();
      });

      const stored = getStoredValue<
        Array<{ description: string; amount: number }>
      >(STORAGE_KEYS.EXPENSES);
      expect(stored[0].description).toBe("Updated description");
      expect(stored[0].amount).toBe(50);
    });

    it("persists expense deletion", async () => {
      const expenses = [
        {
          id: "e1",
          amount: 10,
          category: "Food",
          description: "To delete",
          date: "2026-03-20",
          createdAt: "2026-03-20T00:00:00Z",
        },
      ];
      renderHarness({ [STORAGE_KEYS.EXPENSES]: expenses });
      expect(await screen.findByTestId("expense-count")).toHaveTextContent("1");

      await act(async () => {
        screen.getByText("Delete First Expense").click();
      });

      expect(screen.getByTestId("expense-count")).toHaveTextContent("0");
      const stored = getStoredValue<unknown[]>(STORAGE_KEYS.EXPENSES);
      expect(stored).toHaveLength(0);
    });

    it("persists weekly budget changes", async () => {
      renderHarness();
      await screen.findByTestId("weekly-budget");

      await act(async () => {
        screen.getByText("Set Budget 500").click();
      });

      expect(screen.getByTestId("weekly-budget")).toHaveTextContent("500");
      expect(getStoredValue<number>(STORAGE_KEYS.WEEKLY_BUDGET)).toBe(500);
    });

    it("persists added categories", async () => {
      renderHarness();
      await screen.findByTestId("categories");

      await act(async () => {
        screen.getByText("Add Category").click();
      });

      const stored = getStoredValue<string[]>(STORAGE_KEYS.CATEGORIES);
      expect(stored).toContain("Custom");
    });

    it("persists deleted categories", async () => {
      renderHarness();
      await screen.findByTestId("categories");

      await act(async () => {
        screen.getByText("Delete Other").click();
      });

      const stored = getStoredValue<string[]>(STORAGE_KEYS.CATEGORIES);
      expect(stored).not.toContain("Other");
    });
  });

  describe("data roundtrip", () => {
    it("data survives a remount", async () => {
      const { unmount } = renderHarness();
      await screen.findByTestId("expense-count");

      await act(async () => {
        screen.getByText("Add Expense").click();
      });
      expect(screen.getByTestId("expense-count")).toHaveTextContent("1");

      // Unmount and remount — should load the persisted expense
      unmount();
      render(
        <BudgetProvider>
          <ContextHarness />
        </BudgetProvider>
      );

      expect(await screen.findByTestId("expense-count")).toHaveTextContent("1");
      expect(screen.getByTestId("expenses-json")).toHaveTextContent(
        "Test expense"
      );
    });
  });
});
