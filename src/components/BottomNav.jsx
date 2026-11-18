import React from 'react';
import {
  LayoutGrid,
  Dumbbell,
  Utensils,
  ShoppingBag,
  MessageSquare,
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
    { id: 'dashboard', label: tr(lang, 'nav_today'), icon: LayoutGrid },
    { id: 'workouts', label: tr(lang, 'nav_workouts'), icon: Dumbbell },
    { id: 'nutrition', label: tr(lang, 'nav_meals'), icon: Utensils },
    { id: 'shopping', label: tr(lang, 'nav_shopping'), icon: ShoppingBag },
    { id: 'coach', label: tr(lang, 'nav_coach'), icon: MessageSquare },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-card)]/92 backdrop-blur-xl border-t border-[var(--border-subtle)] pb-safe"
    >
      <div className="max-w-xl mx-auto px-2 h-14 grid grid-cols-5 items-center">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-full transition-colors duration-150 ${
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-6 h-[2px] rounded-b-full bg-[var(--text-primary)]" />
              )}

              <div className="relative">
                <Icon
                  className={`w-[18px] h-[18px] transition-all duration-150 ${
                    isActive ? 'stroke-[2.15]' : 'stroke-[1.7]'
                  }`}
                />

                {tab.id === 'shopping' && uncheckedShoppingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[var(--accent)] text-white text-[9px] font-semibold flex items-center justify-center tabular-nums">
                    {uncheckedShoppingCount > 99 ? '99' : uncheckedShoppingCount}
                  </span>
                )}

                {tab.id === 'workouts' && hasActiveWorkout && (
                  <span className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
                )}
              </div>

              <span
                className={`text-[10px] mt-1 tracking-tight truncate max-w-[64px] ${
                  isActive ? 'font-semibold' : 'font-normal'
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
