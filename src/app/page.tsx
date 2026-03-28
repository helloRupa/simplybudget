'use client';

import { useState, useCallback } from 'react';
import { BudgetProvider } from '@/context/BudgetContext';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';
import Settings from '@/components/Settings';
import Toast from '@/components/Toast';
import { Expense } from '@/types';

type Tab = 'dashboard' | 'expenses' | 'settings';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const handleEdit = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setActiveTab('expenses');
  }, []);

  const handleFormDone = useCallback(() => {
    setEditingExpense(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#1e1040] to-[#16082a]">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard />}

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <ExpenseForm
              editingExpense={editingExpense}
              onDone={handleFormDone}
              onToast={showToast}
            />
            <ExpenseList onEdit={handleEdit} onToast={showToast} />
          </div>
        )}

        {activeTab === 'settings' && <Settings onToast={showToast} />}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <BudgetProvider>
      <AppContent />
    </BudgetProvider>
  );
}
