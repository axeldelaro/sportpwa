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
      className="fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-app)]/85 backdrop-blur-2xl border-t border-[var(--border-subtle)] pb-safe"
    >
      <div className="max-w-xl mx-auto px-3 h-16 grid grid-cols-5 items-center">
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
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-[20px] h-[20px] transition-all duration-200 ${
                    isActive ? 'stroke-[2.3] text-emerald-400' : 'stroke-[1.75]'
                  }`}
                />

                {tab.id === 'shopping' && uncheckedShoppingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-emerald-400 text-zinc-950 text-[9.5px] font-bold flex items-center justify-center tabular-nums">
                    {uncheckedShoppingCount > 99 ? '99' : uncheckedShoppingCount}
                  </span>
                )}

                {tab.id === 'workouts' && hasActiveWorkout && (
                  <span className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </div>

              <span
                className={`text-[10px] mt-1 tracking-tight ${
                  isActive ? 'font-semibold text-[var(--text-primary)]' : 'font-medium'
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
