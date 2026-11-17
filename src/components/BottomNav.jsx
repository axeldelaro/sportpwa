import React from 'react';
import {
  Activity,
  Dumbbell,
  Utensils,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

const NAV_TABS = [
  { id: 'dashboard', label: 'Aujourd’hui', icon: Activity },
  { id: 'workouts', label: 'Séances', icon: Dumbbell },
  { id: 'nutrition', label: 'Repas', icon: Utensils },
  { id: 'shopping', label: 'Courses', icon: ShoppingBag },
  { id: 'coach', label: 'Coach', icon: Sparkles },
];

export default function BottomNav({
  activeTab,
  onChangeTab,
  uncheckedShoppingCount = 0,
  hasActiveWorkout = false,
}) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-30 bg-zinc-950/85 backdrop-blur-2xl border-t border-white/[0.05] pb-safe"
    >
      <div className="max-w-xl mx-auto px-3 h-16 grid grid-cols-5 items-center">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center h-12 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-300 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-[20px] h-[20px] transition-all duration-200 ${
                    isActive ? 'stroke-[2.3] text-emerald-400' : 'stroke-[1.75]'
                  }`}
                />

                {tab.id === 'shopping' && uncheckedShoppingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-zinc-100 text-zinc-950 text-[9.5px] font-bold flex items-center justify-center tabular-nums">
                    {uncheckedShoppingCount > 99 ? '99' : uncheckedShoppingCount}
                  </span>
                )}

                {tab.id === 'workouts' && hasActiveWorkout && (
                  <span className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </div>

              <span
                className={`text-[10px] mt-1 tracking-tight ${
                  isActive ? 'font-semibold text-zinc-100' : 'font-medium'
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
