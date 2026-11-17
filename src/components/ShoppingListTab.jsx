import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Check,
  ArrowLeftRight,
  Search,
} from 'lucide-react';
import {
  AISLE_CATEGORIES,
  FOOD_DATABASE,
  getFoodById,
  calculateFoodMacros,
  isFoodCompatibleWithProfile,
} from '../data/foodDatabase';
import { normalizeText } from '../utils/substitutionEngine';

export default function ShoppingListTab({
  shoppingItems = [],
  profile,
  onToggleItemChecked,
  onUpdateItemGrams,
  onDeleteItem,
  onClearCheckedItems,
  onClearAllItems,
  onAddFoodItem,
  onAddCustomTextItem,
  onSwapShoppingItem,
  onGenerateFromToday,
  onGenerateFromWeek,
  onOpenSubstitutionModal,
}) {
  const [query, setQuery] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [gramsInput, setGramsInput] = useState(150);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const compatibleFoods = useMemo(
    () => FOOD_DATABASE.filter((f) => isFoodCompatibleWithProfile(f, profile)),
    [profile]
  );

  const matchingFoods = useMemo(() => {
    if (!query.trim()) return compatibleFoods.slice(0, 7);
    const q = normalizeText(query);
    return compatibleFoods
      .filter((f) => normalizeText(f.name).includes(q))
      .slice(0, 8);
  }, [compatibleFoods, query]);

  const uncheckedCount = shoppingItems.filter((i) => !i.checked).length;
  const checkedCount = shoppingItems.length - uncheckedCount;

  const groupedByAisle = useMemo(() => {
    const map = {};
    AISLE_CATEGORIES.forEach((cat) => {
      map[cat] = [];
    });

    shoppingItems.forEach((item) => {
      const food = item.foodId ? getFoodById(item.foodId) : null;
      const cat = food?.category || item.category || AISLE_CATEGORIES[4];
      if (!map[cat]) map[cat] = [];
      map[cat].push({ ...item, food });
    });

    Object.keys(map).forEach((cat) => {
      map[cat].sort((a, b) => Number(Boolean(a.checked)) - Number(Boolean(b.checked)));
    });

    return map;
  }, [shoppingItems]);

  const handleSmartSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (selectedFoodId) {
      const food = getFoodById(selectedFoodId);
      if (food) {
        const g = Math.max(5, Math.round(Number(gramsInput) || food.defaultGrams || 100));
        onAddFoodItem(food.id, g);
        setQuery('');
        setSelectedFoodId('');
        showToast(`${g}g ${food.name} ajouté`);
        return;
      }
    }

    if (!trimmed) return;

    // Si la saisie correspond à un aliment de la base, on l'ajoute avec ses macros & équivalences
    if (matchingFoods.length > 0 && normalizeText(matchingFoods[0].name).includes(normalizeText(trimmed))) {
      const food = matchingFoods[0];
      const g = Math.max(5, Math.round(Number(gramsInput) || food.defaultGrams || 100));
      onAddFoodItem(food.id, g);
      setQuery('');
      showToast(`${g}g ${food.name} ajouté`);
    } else {
      // Sinon ajout libre dans Épicerie
      onAddCustomTextItem(trimmed, AISLE_CATEGORIES[4]);
      setQuery('');
      showToast(`${trimmed} ajouté`);
    }
  };

  const handleOpenSwapForItem = (item) => {
    if (!item.food) return;
    onOpenSubstitutionModal({
      sourceFoodId: item.food.id,
      initialGrams: item.grams,
      contextLabel: item.food.category,
      onConfirmSwap: ({ newFood, newGrams }) => {
        onSwapShoppingItem(item.id, newFood.id, newGrams);
        showToast(`Échangé : ${newGrams}g ${newFood.name}`);
      },
    });
  };

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-100 text-zinc-950 text-xs font-semibold shadow-xl flex items-center gap-1.5 animate-slide-up">
          <Check className="w-3.5 h-3.5" />
          {toast}
        </div>
      )}

      {/* En-tête minimaliste + Génération 1 clic */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Courses</h1>
          <p className="text-xs text-zinc-500 tabular-nums">
            {uncheckedCount} à acheter
            {checkedCount > 0 ? ` · ${checkedCount} dans le panier` : ''}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={async () => {
              const count = await onGenerateFromToday();
              showToast(count > 0 ? 'Repas du jour importés' : "Aucun repas aujourd'hui");
            }}
            className="px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/[0.07] text-xs font-medium text-zinc-200 transition-colors"
          >
            + Aujourd’hui
          </button>
          <button
            type="button"
            onClick={async () => {
              const count = await onGenerateFromWeek();
              showToast(count > 0 ? 'Semaine agrégée' : 'Aucun repas planifié sur 7j');
            }}
            className="px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/[0.07] text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            + 7 jours
          </button>
        </div>
      </div>

      {/* Barre d'ajout unifiée et épurée */}
      <section className="card-surface p-4 space-y-2.5">
        <form onSubmit={handleSmartSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedFoodId('');
              }}
              placeholder="Ajouter un aliment ou un article..."
              className="input-dark !pl-9 !py-2 text-xs"
            />
          </div>

          <div className="inline-flex items-center bg-zinc-950/80 border border-white/[0.08] rounded-2xl px-2.5 py-2 shrink-0">
            <input
              type="number"
              min="5"
              max="5000"
              step="5"
              value={gramsInput}
              onChange={(e) => setGramsInput(e.target.value)}
              className="w-12 bg-transparent text-right text-xs font-semibold text-zinc-200 tabular-nums focus:outline-none"
              title="Quantité en grammes"
            />
            <span className="text-[11px] text-zinc-500 ml-1">g</span>
          </div>

          <button
            type="submit"
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center shrink-0 transition-transform active:scale-95"
            aria-label="Ajouter"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* Suggestions instantanées */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {matchingFoods.map((f) => {
            const isSel = selectedFoodId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedFoodId(f.id);
                  setQuery(f.name);
                  setGramsInput(f.defaultGrams || 150);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all ${
                  isSel
                    ? 'bg-emerald-400 text-zinc-950 font-semibold'
                    : 'bg-zinc-950/70 text-zinc-400 hover:text-zinc-200 border border-white/[0.05]'
                }`}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Actions de nettoyage discrètes */}
      {shoppingItems.length > 0 && (
        <div className="flex items-center justify-end gap-4 px-1 text-xs">
          {checkedCount > 0 && (
            <button
              type="button"
              onClick={onClearCheckedItems}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Retirer les cochés ({checkedCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Vider toute la liste ?')) onClearAllItems();
            }}
            className="text-zinc-500 hover:text-rose-400"
          >
            Tout vider
          </button>
        </div>
      )}

      {/* Liste par Rayons */}
      {shoppingItems.length === 0 ? (
        <div className="card-surface p-10 text-center space-y-1.5">
          <p className="text-sm font-medium text-zinc-300">Aucun article pour le moment</p>
          <p className="text-xs text-zinc-500">
            Importe tes repas en un clic ou cherche un aliment ci-dessus.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {AISLE_CATEGORIES.map((aisle) => {
            const items = groupedByAisle[aisle] || [];
            if (items.length === 0) return null;

            return (
              <section key={aisle} className="card-surface overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-zinc-400">{aisle}</h2>
                  <span className="text-[11px] text-zinc-600 tabular-nums">
                    {items.filter((i) => !i.checked).length}
                  </span>
                </div>

                <div className="divide-y divide-white/[0.04]">
                  {items.map((item) => {
                    const macros = item.food
                      ? calculateFoodMacros(item.food, item.grams)
                      : null;

                    return (
                      <div
                        key={item.id}
                        className={`px-5 py-3.5 flex items-center justify-between gap-3 transition-opacity ${
                          item.checked ? 'opacity-45' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onToggleItemChecked(item.id)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              item.checked
                                ? 'bg-emerald-400 border-emerald-400 text-zinc-950'
                                : 'border-zinc-600 hover:border-zinc-400'
                            }`}
                            aria-label="Cocher"
                          >
                            {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span
                                className={`text-sm font-medium ${
                                  item.checked
                                    ? 'line-through text-zinc-500'
                                    : 'text-zinc-100'
                                }`}
                              >
                                {item.food ? item.food.name : item.customName}
                              </span>
                              {item.food && (
                                <span className="text-[11px] text-zinc-500">
                                  ({item.food.state})
                                </span>
                              )}
                            </div>

                            {macros && !item.checked && (
                              <p className="text-[11px] text-zinc-500 tabular-nums">
                                {macros.kcal} kcal · {macros.protein}g P · {macros.carbs}g G ·{' '}
                                {macros.fat}g L
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.food && !item.checked && (
                            <>
                              <div className="inline-flex items-center bg-zinc-950/70 rounded-xl px-2 py-1 border border-white/[0.06]">
                                <input
                                  type="number"
                                  min="5"
                                  max="5000"
                                  step="5"
                                  value={item.grams}
                                  onChange={(e) =>
                                    onUpdateItemGrams(item.id, e.target.value)
                                  }
                                  className="w-12 bg-transparent text-right text-xs font-semibold text-zinc-200 tabular-nums focus:outline-none"
                                />
                                <span className="text-[10px] text-zinc-500 ml-0.5">g</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenSwapForItem(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-xs font-medium text-emerald-400 transition-colors"
                                title="Remplacer par un aliment équivalent"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span className="hidden xs:inline">Échanger</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
