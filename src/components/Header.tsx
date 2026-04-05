"use client";

import { useBudget } from "@/context/BudgetContext";
import { LOCALE_NAMES, LocaleKey } from "@/i18n/locales";
import moneyFrog from "../assets/images/moneyFrog.svg";
import AppName from "./AppName";

export type Tab = "dashboard" | "expenses" | "settings";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAboutClick: () => void;
}

interface TabButtonProps {
  icon: React.ComponentType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  variant: "desktop" | "mobile";
}

function TabButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  variant,
}: TabButtonProps) {
  const baseClasses = "flex items-center rounded-lg font-medium transition-all";
  const activeClasses =
    variant === "desktop"
      ? "bg-teal-500/20 text-teal-300 shadow-lg shadow-teal-500/10 border border-teal-400/30"
      : "bg-teal-500/20 text-teal-300 border border-teal-400/30";
  const inactiveClasses =
    variant === "desktop"
      ? "text-slate-300 hover:text-white hover:bg-slate-700/50"
      : "text-slate-400 hover:text-white hover:bg-slate-700/50";
  const sizeClasses =
    variant === "desktop"
      ? "gap-2 px-4 py-2 text-sm"
      : "flex-1 justify-center gap-1.5 px-3 py-2 text-xs";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      <Icon />
      {label}
    </button>
  );
}

export default function Header({
  activeTab,
  onTabChange,
  onAboutClick,
}: HeaderProps) {
  const { t, state, setLocale } = useBudget();

  const tabs = [
    { id: "dashboard" as const, label: t("dashboard"), icon: DashboardIcon },
    { id: "expenses" as const, label: t("expenses"), icon: ExpensesIcon },
    { id: "settings" as const, label: t("settings"), icon: SettingsIcon },
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img
              src={moneyFrog.src}
              alt="Money Frog"
              className="w-12 h-12 bg-white p-1 rounded-2xl border-2 border-teal-500"
            />
            <AppName />
            <button
              onClick={onAboutClick}
              className="-ml-0.5 text-slate-400 hover:text-teal-300 transition-colors"
              title={t("about")}
            >
              <InfoIcon />
            </button>
          </div>

          <nav className="hidden min-[800px]:flex items-center gap-1">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                isActive={activeTab === tab.id}
                onClick={() => onTabChange(tab.id)}
                variant="desktop"
              />
            ))}
          </nav>

          <select
            value={state.locale}
            onChange={(e) => setLocale(e.target.value as LocaleKey)}
            className="bg-slate-700/50 text-slate-300 text-sm rounded-lg px-2 py-1.5 border border-slate-500/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {Object.entries(LOCALE_NAMES).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile nav */}
        <nav className="flex min-[800px]:hidden pb-3 gap-1">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              variant="mobile"
            />
          ))}
        </nav>
      </div>
    </header>
  );
}

function InfoIcon() {
  return (
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
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
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
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function ExpensesIcon() {
  return (
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
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
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
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
