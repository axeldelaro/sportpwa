import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Check,
  ArrowLeftRight,
  Search,
  Globe,
  ChefHat,
  X,
} from 'lucide-react';
import {
  AISLE_CATEGORIES,
  getAllFoods,
  getFoodById,
  calculateFoodMacros,
  isFoodCompatibleWithProfile,
} from '../data/foodDatabase';
import { normalizeText } from '../utils/substitutionEngine';
import { getVariedRecipesForFood } from '../utils/foodRecipeSuggester';
import {
  scoreFoodMatch,
  synthesizeSmartFoodFromName,
} from '../utils/universalFoodResolver';
import { searchOpenFoodFacts } from '../utils/openFoodFactsService';
import { tr } from '../i18n/translations';

export default function ShoppingListTab({
  shoppingItems = [],
  lang = 'fr',
  profile,
  customRecipes = [],
  onQuickLogRecipe,
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
  onCacheExternalFood,
}) {
  const [query, setQuery] = useState('');
  const [selectedFoodObj, setSelectedFoodObj] = useState(null);
  const [remoteFoods, setRemoteFoods] = useState([]);
  const [gramsInput, setGramsInput] = useState(150);
  const [toast, setToast] = useState(null);
  const [recipeModalFood, setRecipeModalFood] = useState(null);

  const modalSuggestions = useMemo(() => {
    if (!recipeModalFood) return [];
    return getVariedRecipesForFood(recipeModalFood, profile, customRecipes, 4);
  }, [recipeModalFood, profile, customRecipes]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const compatibleFoods = useMemo(
    () => getAllFoods().filter((f) => isFoodCompatibleWithProfile(f, profile)),
    [profile]
  );

  const matchingLocalFoods = useMemo(() => {
    if (!query.trim()) return compatibleFoods.slice(0, 7);
    return compatibleFoods
      .map((f) => ({ f, score: scoreFoodMatch(f, query) }))
      .filter((x) => x.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.f);
  }, [compatibleFoods, query]);

  // Suggestions live Open Food Facts dans la barre des courses si peu de résultats locaux
  useEffect(() => {
    if (query.trim().length < 3) {
      setRemoteFoods([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await searchOpenFoodFacts(query.trim(), lang, controller.signal);
        setRemoteFoods(
          res.filter((f) => isFoodCompatibleWithProfile(f, profile)).slice(0, 5)
        );
      } catch {
        // Hors-ligne
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, lang, profile]);

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

  const handleSmartSubmit = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (selectedFoodObj) {
      if (selectedFoodObj.sourceRef === 'Open Food Facts') {
        await onCacheExternalFood(selectedFoodObj);
      }
      const g = Math.max(
        5,
        Math.round(Number(gramsInput) || selectedFoodObj.defaultGrams || 100)
      );
      onAddFoodItem(selectedFoodObj.id, g);
      setQuery('');
      setSelectedFoodObj(null);
      showToast(`+${g}g ${selectedFoodObj.name}`);
      return;
    }

    if (!trimmed) return;

    if (
      matchingLocalFoods.length > 0 &&
      scoreFoodMatch(matchingLocalFoods[0], trimmed) >= 65
    ) {
      const food = matchingLocalFoods[0];
      const g = Math.max(5, Math.round(Number(gramsInput) || food.defaultGrams || 100));
      onAddFoodItem(food.id, g);
      setQuery('');
      showToast(`+${g}g ${food.name}`);
    } else if (remoteFoods.length > 0) {
      const food = remoteFoods[0];
      await onCacheExternalFood(food);
      const g = Math.max(5, Math.round(Number(gramsInput) || food.defaultGrams || 100));
      onAddFoodItem(food.id, g);
      setQuery('');
      showToast(`+${g}g ${food.name}`);
    } else {
      const synthesized = synthesizeSmartFoodFromName(trimmed);
      if (synthesized) {
        if (onCacheExternalFood) await onCacheExternalFood(synthesized);
        const g = Math.max(
          5,
          Math.round(Number(gramsInput) || synthesized.defaultGrams || 100)
        );
        onAddFoodItem(synthesized.id, g);
        setQuery('');
        showToast(`+${g}g ${synthesized.name}`);
      } else {
        onAddCustomTextItem(trimmed, AISLE_CATEGORIES[4]);
        setQuery('');
        showToast(`${trimmed}`);
      }
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
        showToast(`→ ${newGrams}g ${newFood.name}`);
      },
    });
  };

  const combinedPills = [...matchingLocalFoods, ...remoteFoods].slice(0, 9);

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium shadow-lg flex items-center gap-1.5 animate-slide-up">
          <Check className="w-3.5 h-3.5" />
          {toast}
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {tr(lang, 'shopping_title')}
          </h1>
          <p className="text-xs text-[var(--text-muted)] tabular-nums">
            {uncheckedCount} {tr(lang, 'to_buy')}
            {checkedCount > 0 ? ` · ${checkedCount} ${tr(lang, 'in_cart')}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={async () => {
              const count = await onGenerateFromToday();
              showToast(count > 0 ? 'Importé' : '0 repas');
            }}
            className="chip !py-1.5 !px-3"
          >
            {tr(lang, 'from_today')}
          </button>
          <button
            type="button"
            onClick={async () => {
              const count = await onGenerateFromWeek();
              showToast(count > 0 ? 'Semaine importée' : '0 repas sur 7j');
            }}
            className="chip !py-1.5 !px-3"
          >
            {tr(lang, 'from_week')}
          </button>
        </div>
      </div>

      {/* Barre d'ajout intelligente CIQUAL + Open Food Facts */}
      <section className="card-surface p-4 space-y-2.5">
        <form onSubmit={handleSmartSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedFoodObj(null);
              }}
              placeholder={tr(lang, 'search_food_world')}
              className="input-dark !pl-9 !py-2 text-xs"
            />
          </div>

          <div className="inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-2xl px-2.5 py-2 shrink-0">
            <input
              type="number"
              min="5"
              max="5000"
              step="5"
              value={gramsInput}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setGramsInput(e.target.value)}
              className="w-12 bg-transparent text-right text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none"
            />
            <span className="text-[11px] text-[var(--text-muted)] ml-1">g</span>
          </div>

          <button
            type="submit"
            className="w-9 h-9 rounded-xl bg-[var(--text-primary)] text-[var(--bg-app)] flex items-center justify-center shrink-0 transition-transform active:scale-95"
            aria-label="Ajouter"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {combinedPills.map((f) => {
            const isSel = selectedFoodObj?.id === f.id;
            const isOnline = f.sourceRef === 'Open Food Facts';
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedFoodObj(f);
                  setQuery(f.name);
                  setGramsInput(f.defaultGrams || 150);
                }}
                className={isSel ? 'chip-active !py-1 !px-2.5 !text-[11px]' : 'chip !py-1 !px-2.5 !text-[11px]'}
              >
                {isOnline && <Globe className="w-2.5 h-2.5 opacity-70" />}
                <span>{f.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {shoppingItems.length > 0 && (
        <div className="flex items-center justify-end gap-4 px-1 text-xs">
          {checkedCount > 0 && (
            <button
              type="button"
              onClick={onClearCheckedItems}
              className="text-emerald-400 font-medium"
            >
              {tr(lang, 'clear_checked')} ({checkedCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Vider toute la liste ?')) onClearAllItems();
            }}
            className="text-[var(--text-muted)] hover:text-rose-400"
          >
            {tr(lang, 'clear_all')}
          </button>
        </div>
      )}

      {shoppingItems.length === 0 ? (
        <div className="card-surface p-10 text-center space-y-1.5">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Liste vide
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Importe tes repas ou recherche n’importe quel aliment ci-dessus.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {AISLE_CATEGORIES.map((aisle) => {
            const items = groupedByAisle[aisle] || [];
            if (items.length === 0) return null;

            return (
              <section key={aisle} className="card-surface overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-[var(--text-secondary)]">
                    {aisle}
                  </h2>
                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                    {items.filter((i) => !i.checked).length}
                  </span>
                </div>

                <div className="divide-y divide-[var(--border-subtle)]">
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
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              item.checked
                                ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                : 'border-[var(--border-strong)] hover:border-[var(--accent)]'
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
                                    ? 'line-through text-[var(--text-muted)]'
                                    : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {item.food ? item.food.name : item.customName}
                              </span>
                              {item.food && (
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  ({item.food.state})
                                </span>
                              )}
                            </div>

                            {macros && !item.checked && (
                              <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                                {macros.kcal} kcal · {macros.protein}g P · {macros.carbs}g G ·{' '}
                                {macros.fat}g L
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.food && !item.checked && (
                            <>
                              <div className="inline-flex items-center bg-[var(--bg-subtle)] rounded-xl px-2 py-1 border border-[var(--border-subtle)]">
                                <input
                                  type="number"
                                  min="5"
                                  max="5000"
                                  step="5"
                                  value={item.grams}
                                  onChange={(e) =>
                                    onUpdateItemGrams(item.id, e.target.value)
                                  }
                                  className="w-12 bg-transparent text-right text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none"
                                />
                                <span className="text-[10px] text-[var(--text-muted)] ml-0.5">g</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setRecipeModalFood(item.food)}
                                className="p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
                                title="Voir 4 idées recettes variées avec cet aliment"
                              >
                                <ChefHat className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenSwapForItem(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span className="hidden xs:inline">{tr(lang, 'swap')}</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
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
      {/* Tiroir 4 Recettes Variées pour l'aliment sélectionné dans les courses */}
      {recipeModalFood && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg max-h-[85vh] card-elevated rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <div>
                <span className="section-eyebrow block">Suggestions par repas</span>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                  Recettes avec {recipeModalFood.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRecipeModalFood(null)}
                className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2.5">
              {modalSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="rounded-xl bg-[var(--bg-subtle)]/55 border border-[var(--border-subtle)] p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-emerald-400">
                      {sug.slotBadge} · <span className="text-[var(--text-muted)]">{sug.prepMinutes} min</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                      {sug.title}
                    </h4>
                    <p className="text-xs tabular-nums text-[var(--text-secondary)] mt-0.5">
                      <strong className="font-semibold text-[var(--text-primary)]">
                        {sug.macros.kcal} kcal
                      </strong>{' '}
                      · {sug.macros.protein}g P · {sug.macros.carbs}g G · {sug.macros.fat}g L
                    </p>
                  </div>

                  {onQuickLogRecipe && (
                    <button
                      type="button"
                      onClick={() => {
                        onQuickLogRecipe({
                          title: sug.title,
                          kcal: sug.macros.kcal,
                          protein: sug.macros.protein,
                          items: sug.ingredients,
                          preferredSlot: sug.primarySlot,
                        });
                        setRecipeModalFood(null);
                        showToast('Ajouté au journal du jour');
                      }}
                      className="btn-primary !py-1.5 !px-3 !text-xs shrink-0"
                    >
                      + Repas
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
