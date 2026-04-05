"use client";

import { useBudget } from "@/context/BudgetContext";
import { FilterState } from "@/types";

interface ExpenseFiltersProps {
  filters: FilterState;
  defaultFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function ExpenseFilters({
  filters,
  defaultFilters,
  onFilterChange,
}: ExpenseFiltersProps) {
  const { state, t, tc } = useBudget();

  function updateFilter(key: keyof FilterState, value: string) {
    onFilterChange({ ...filters, [key]: value });
  }

  function resetFilters() {
    onFilterChange(defaultFilters);
  }

  const inputClass =
    "w-full bg-slate-700/40 text-white text-sm rounded-xl px-4 py-2 border border-slate-500/30 focus:outline-none focus:ring-2 focus:ring-teal-400";

  const hasActiveFilters =
    filters.dateFrom !== defaultFilters.dateFrom ||
    filters.dateTo !== defaultFilters.dateTo ||
    filters.category !== defaultFilters.category ||
    filters.searchQuery !== defaultFilters.searchQuery;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-600/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">{t("filters")}</h3>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            {t("resetFilters")}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`${inputClass} pl-9 pr-4 placeholder-slate-500`}
          />
        </div>

        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) => updateFilter("category", e.target.value)}
          className={inputClass}
        >
          <option value="">{t("allCategories")}</option>
          {state.categories.map((cat) => (
            <option key={cat} value={cat}>
              {tc(cat)}
            </option>
          ))}
        </select>

        {/* Date From */}
        <div>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            className={inputClass}
            title={t("dateFrom")}
          />
        </div>

        {/* Date To */}
        <div>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            className={inputClass}
            title={t("dateTo")}
          />
        </div>
      </div>
    </div>
  );
}
