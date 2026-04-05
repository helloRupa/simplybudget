import { Expense, RecurringExpense, WeeklyBudget } from "@/types";
import { CurrencyCode } from "@/utils/constants";
import { LocaleKey } from "@/i18n/locales";

const BACKUP_VERSION = 1;

interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    expenses: Expense[];
    weeklyBudget: number;
    categories: string[];
    firstUseDate: string;
    locale: LocaleKey;
    currency: CurrencyCode;
    recurringExpenses: RecurringExpense[];
    budgetHistory: WeeklyBudget[];
  };
}

export function exportBackup(state: BackupData["data"]): void {
  const now = new Date();
  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: state,
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `simplybudget-backup-${now.toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseBackup(file: File): Promise<BackupData["data"]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed.version || !parsed.data) {
          reject(new Error("Invalid backup file format."));
          return;
        }
        const { data } = parsed as BackupData;
        if (
          !Array.isArray(data.expenses) ||
          typeof data.weeklyBudget !== "number" ||
          !Array.isArray(data.categories) ||
          typeof data.firstUseDate !== "string"
        ) {
          reject(new Error("Backup file is missing required data."));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error("Could not parse backup file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsText(file);
  });
}
