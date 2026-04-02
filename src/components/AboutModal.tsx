'use client';

import { useEffect } from 'react';
import { useBudget } from '@/context/BudgetContext';
import moneyFrog from '../assets/images/moneyFrog.svg';

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  const { t } = useBudget();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-800 border border-slate-600/50 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in">
        {/* Header with frog */}
        <div className="flex flex-col items-center text-center mb-5">
          <img
            src={moneyFrog.src}
            alt="Money Frog"
            className="w-20 h-20 mb-3 bg-white p-2 rounded-3xl border-[3px] border-teal-500"
          />
          <h2 className="text-2xl font-extrabold tracking-tight">
            <span className="text-white">Simply</span>
            <span className="text-teal-400">Budget</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">{t('aboutVersion')} 0.1.0</p>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm text-center mb-5 leading-relaxed">
          {t('aboutDescription')}
        </p>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 bg-slate-700/30 rounded-xl px-4 py-3">
            <span className="text-slate-400 text-sm font-medium shrink-0">{t('aboutBuiltBy')}</span>
            <span className="text-slate-200 text-sm">Rupa {t('and')} Claude Code</span>
          </div>
          <div className="flex items-start gap-3 bg-slate-700/30 rounded-xl px-4 py-3">
            <span className="text-slate-400 text-sm font-medium shrink-0">{t('aboutBuiltWith')}</span>
            <span className="text-slate-200 text-sm">Next.js, React, TypeScript, Tailwind CSS, Recharts</span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-teal-500/20 text-teal-300 font-medium text-sm border border-teal-400/30 hover:bg-teal-500/30 transition-colors"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}
