"use client";

import { useRef, useState } from "react";
import { useBudget } from "@/context/BudgetContext";
import { exportToCSV } from "@/utils/csv";
import { exportBackup, parseBackup } from "@/utils/backup";
import {
  DEFAULT_CATEGORIES,
  SUPPORTED_CURRENCIES,
  CurrencyCode,
} from "@/utils/constants";
import RecurringExpenseManager from "./RecurringExpenseManager";

interface SettingsProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function Settings({ onToast }: SettingsProps) {
  const {
    state,
    setWeeklyBudget,
    addCategory,
    deleteCategory,
    setCurrency,
    importData,
    t,
    tc,
    fc,
    fd,
    currencySymbol,
  } = useBudget();
  const [budgetInput, setBudgetInput] = useState(state.weeklyBudget.toString());
  const [newCategory, setNewCategory] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleBudgetSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(budgetInput);

    if (isNaN(amount) || amount <= 0) {
      setBudgetError(t("budgetPositive"));
      return;
    }

    setBudgetError("");
    setWeeklyBudget(Math.round(amount * 100) / 100);
    onToast(t("budgetUpdated"), "success");
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();

    if (!newCategory.trim()) {
      return;
    }

    const success = addCategory(newCategory.trim());

    if (success) {
      setNewCategory("");
      onToast(t("categoryAdded"), "success");
    } else {
      onToast(t("categoryExists"), "error");
    }
  }

  function handleExportCSV() {
    if (state.expenses.length === 0) {
      onToast(t("noExpenses"), "error");
      return;
    }

    exportToCSV(state.expenses, t as (key: string) => string, tc, fd);
    onToast(t("csvExported"), "success");
  }

  function handleExportBackup() {
    exportBackup(state);
    onToast(t("backupExported"), "success");
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // Reset so the same file can be selected again
    e.target.value = "";

    if (!confirm(t("importConfirm"))) {
      return;
    }

    try {
      const data = await parseBackup(file);
      importData({
        expenses: data.expenses ?? [],
        weeklyBudget: data.weeklyBudget ?? 200,
        categories: data.categories ?? [...DEFAULT_CATEGORIES],
        firstUseDate: data.firstUseDate ?? state.firstUseDate,
        locale: data.locale ?? "en",
        currency: data.currency ?? "USD",
        recurringExpenses: data.recurringExpenses ?? [],
        budgetHistory: data.budgetHistory ?? [],
      });
      setBudgetInput((data.weeklyBudget ?? 200).toString());
      onToast(t("backupImported"), "success");
    } catch {
      onToast(t("backupImportFailed"), "error");
    }
  }

  const isDefaultCategory = (cat: string) =>
    (DEFAULT_CATEGORIES as readonly string[]).includes(cat);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Weekly Budget Setting */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {t("setBudget")}
        </h2>
        <form onSubmit={handleBudgetSubmit} noValidate className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className={`w-full bg-slate-700/50 text-white rounded-xl pl-8 pr-4 py-2.5 border ${
                budgetError ? "border-red-400" : "border-slate-500/50"
              } focus:outline-none focus:ring-2 focus:ring-teal-400`}
              placeholder={t("budgetAmount")}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-teal-500 hover:bg-teal-400 shadow-lg shadow-teal-500/25 transition-all"
          >
            {t("save")}
          </button>
        </form>
        {budgetError && (
          <p className="text-red-400 text-xs mt-2">{budgetError}</p>
        )}
        <p className="text-slate-500 text-xs mt-2">
          {t("weeklyBudget")}: {fc(state.weeklyBudget)}
        </p>
      </div>

      {/* Currency */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {t("currency")}
        </h2>
        <select
          value={state.currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          {Object.entries(SUPPORTED_CURRENCIES).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Recurring Expenses */}
      <RecurringExpenseManager onToast={onToast} />

      {/* Category Management */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {t("manageCategories")}
        </h2>
        <form onSubmit={handleAddCategory} className="flex gap-3 mb-4">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 bg-slate-700/50 text-white rounded-xl px-4 py-2.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder-slate-500"
            placeholder={t("newCategoryPlaceholder")}
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-teal-500 hover:bg-teal-400 shadow-lg shadow-teal-500/25 transition-all"
          >
            {t("addCategory")}
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {state.categories.map((cat) => (
            <div
              key={cat}
              className="flex items-center gap-2 bg-slate-700/40 rounded-xl px-3 py-2 border border-slate-600/20"
            >
              <span className="text-sm text-slate-200">{tc(cat)}</span>
              {!isDefaultCategory(cat) && (
                <button
                  onClick={() => deleteCategory(cat)}
                  className="text-xs text-red-400/60 hover:text-red-300 transition-colors"
                  title={t("deleteCategory")}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Export & Import */}
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {t("exportData")}
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-teal-500 hover:bg-teal-400 shadow-lg shadow-teal-500/25 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {t("exportCSV")}
          </button>
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 shadow-lg shadow-indigo-500/25 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {t("exportBackup")}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/25 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            {t("importBackup")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            className="hidden"
          />
        </div>
        <p className="text-slate-500 text-xs mt-2">
          {state.expenses.length} {t("expenses").toLowerCase()}
        </p>
      </div>
    </div>
  );
}
