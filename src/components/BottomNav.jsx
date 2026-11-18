import React from 'react';
import {
  Activity,
  Dumbbell,
  Utensils,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { tr } from '../i18n/translations';

export default function BottomNav({
  activeTab,
  lang = 'fr',
  onChangeTab,
  uncheckedShoppingCount = 0,
  hasActiveWorkout = false,
}) {
  const navTabs = [
    { id: 'dashboard', label: tr(lang, 'nav_today'), icon: Activity },
    { id: 'workouts', label: tr(lang, 'nav_workouts'), icon: Dumbbell },
    { id: 'nutrition', label: tr(lang, 'nav_meals'), icon: Utensils },
    { id: 'shopping', label: tr(lang, 'nav_shopping'), icon: ShoppingBag },
    { id: 'coach', label: tr(lang, 'nav_coach'), icon: Sparkles },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-30 px-3 pb-safe pt-1 pointer-events-none"
    >
      <div className="max-w-md mx-auto bg-[var(--bg-elevated)]/92 backdrop-blur-2xl border border-[var(--border-strong)] rounded-3xl px-2 h-16 grid grid-cols-5 items-center shadow-2xl shadow-black/60 pointer-events-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-12 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-400/15 text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-[19px] h-[19px] transition-all duration-200 ${
                    isActive ? 'stroke-[2.4] text-emerald-400' : 'stroke-[1.8]'
                  }`}
                />

                {tab.id === 'shopping' && uncheckedShoppingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-emerald-400 text-zinc-950 text-[9px] font-extrabold flex items-center justify-center font-mono">
                    {uncheckedShoppingCount > 99 ? '99' : uncheckedShoppingCount}
                  </span>
                )}

                {tab.id === 'workouts' && hasActiveWorkout && (
                  <span className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>

              <span
                className={`text-[9.5px] mt-1 tracking-tight truncate max-w-[60px] ${
                  isActive ? 'font-bold text-[var(--text-primary)]' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
