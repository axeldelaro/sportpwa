import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeftRight,
  Search,
  Check,
  X,
  ScanBarcode,
  Loader2,
  Globe,
} from 'lucide-react';
import {
  getAllFoods,
  getFoodById,
  calculateFoodMacros,
  isFoodCompatibleWithProfile,
} from '../data/foodDatabase';
import {
  MEAL_SLOTS,
  RECIPES_DATA,
  computeRecipeMacros,
  isRecipeCompatibleWithProfile,
} from '../data/recipesData';
import {
  normalizeText,
  adaptRecipeIngredientsToProfile,
} from '../utils/substitutionEngine';
import {
  searchOpenFoodFacts,
  fetchProductByBarcode,
} from '../utils/openFoodFactsService';
import { getTodayDateString } from '../db/database';
import { tr } from '../i18n/translations';

function shiftDateString(dateStr, deltaDays) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatHumanDate(dateStr, lang = 'fr') {
  const today = getTodayDateString(0);
  const yesterday = getTodayDateString(-1);
  const tomorrow = getTodayDateString(1);
  if (dateStr === today) return lang === 'en' ? 'Today' : lang === 'es' ? 'Hoy' : "Aujourd'hui";
  if (dateStr === yesterday) return lang === 'en' ? 'Yesterday' : lang === 'es' ? 'Ayer' : 'Hier';
  if (dateStr === tomorrow) return lang === 'en' ? 'Tomorrow' : lang === 'es' ? 'Mañana' : 'Demain';
  const localeCode = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(localeCode, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function computeDayTotals(dayLog) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  if (!dayLog?.meals) return totals;

  Object.values(dayLog.meals).forEach((entries) => {
    (entries || []).forEach((entry) => {
      (entry.items || []).forEach((item) => {
        const m = calculateFoodMacros(item.foodId, item.grams);
        totals.kcal += m.kcal;
        totals.protein += m.protein;
        totals.carbs += m.carbs;
        totals.fat += m.fat;
        totals.fiber += m.fiber;
      });
    });
  });

  return {
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
  };
}

export default function NutritionTab({
  selectedDate,
  lang = 'fr',
  onChangeDate,
  dayLog,
  onSaveDayLog,
  profile,
  customRecipes = [],
  onSaveCustomRecipe,
  onDeleteCustomRecipe,
  onSendItemsToShoppingList,
  onOpenSubstitutionModal,
  onCacheExternalFood,
}) {
  const [drawerMealSlot, setDrawerMealSlot] = useState(null);
  const [drawerTab, setDrawerTab] = useState('recipes');
  const [portionMult, setPortionMult] = useState(1);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [showAdaptableRecipes, setShowAdaptableRecipes] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);

  const [foodSearch, setFoodSearch] = useState('');
  const [remoteFoods, setRemoteFoods] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [barcodePromptOpen, setBarcodePromptOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');

  const [selectedFoodObj, setSelectedFoodObj] = useState(null);
  const [unitGrams, setUnitGrams] = useState(150);

  const [customTitle, setCustomTitle] = useState('');
  const [customPrepMin, setCustomPrepMin] = useState(10);
  const [customDraftItems, setCustomDraftItems] = useState([]);
  const [draftFoodId, setDraftFoodId] = useState('flocons_avoine');
  const [draftGrams, setDraftGrams] = useState(70);

  const [toastMsg, setToastMsg] = useState(null);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  // Recherche dynamique Open Food Facts (3M+ aliments) dès que l'utilisateur tape >= 2 lettres
  useEffect(() => {
    if (drawerTab !== 'foods' || foodSearch.trim().length < 2) {
      setRemoteFoods([]);
      setRemoteLoading(false);
      return;
    }

    const controller = new AbortController();
    setRemoteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchOpenFoodFacts(foodSearch.trim(), lang, controller.signal);
        const compatibleRemote = results.filter((f) => isFoodCompatibleWithProfile(f, profile));
        setRemoteFoods(compatibleRemote);
      } catch {
        // Hors-ligne ou requête annulée : repli silencieux sur le référentiel local CIQUAL/USDA
      } finally {
        setRemoteLoading(false);
      }
    }, 420);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [foodSearch, drawerTab, lang, profile]);

  const targets = profile?.targets || {
    kcal: 2200,
    protein: 140,
    carbs: 230,
    fat: 70,
  };

  const dayTotals = useMemo(() => computeDayTotals(dayLog), [dayLog]);
  const allRecipes = useMemo(() => [...customRecipes, ...RECIPES_DATA], [customRecipes]);

  const compatibleFoods = useMemo(
    () => getAllFoods().filter((f) => isFoodCompatibleWithProfile(f, profile)),
    [profile]
  );

  const filteredLocalFoods = useMemo(() => {
    if (!foodSearch.trim()) return compatibleFoods.slice(0, 45);
    const q = normalizeText(foodSearch);
    return compatibleFoods.filter((f) => normalizeText(f.name).includes(q));
  }, [compatibleFoods, foodSearch]);

  const filteredRecipes = useMemo(() => {
    return allRecipes.filter((rec) => {
      const compatible = isRecipeCompatibleWithProfile(rec, profile);
      if (!compatible && !showAdaptableRecipes) return false;
      if (recipeSearch.trim()) {
        const q = normalizeText(recipeSearch);
        const matchTitle = normalizeText(rec.title).includes(q);
        const matchIng = (rec.ingredients || []).some((ing) => {
          const f = getFoodById(ing.foodId);
          return f && normalizeText(f.name).includes(q);
        });
        if (!matchTitle && !matchIng) return false;
      }
      return true;
    });
  }, [allRecipes, profile, showAdaptableRecipes, recipeSearch]);

  const handleBarcodeSearch = async (e) => {
    e.preventDefault();
    if (!barcodeValue.trim()) return;
    setRemoteLoading(true);
    try {
      const found = await fetchProductByBarcode(barcodeValue.trim());
      if (found) {
        await onCacheExternalFood(found);
        setSelectedFoodObj(found);
        setUnitGrams(found.defaultGrams || 100);
        setBarcodePromptOpen(false);
        setBarcodeValue('');
      } else {
        alert('Aucun produit trouvé pour ce code-barres EAN.');
      }
    } catch {
      alert('Recherche code-barres indisponible hors-ligne.');
    } finally {
      setRemoteLoading(false);
    }
  };

  const handleAddRecipeToMeal = (recipe, autoAdapt = false) => {
    if (!drawerMealSlot) return;
    const baseIngredients = autoAdapt
      ? adaptRecipeIngredientsToProfile(recipe.ingredients, profile)
      : recipe.ingredients;

    const scaledItems = baseIngredients.map((ing) => ({
      foodId: ing.foodId,
      grams: Math.max(5, Math.round(ing.grams * portionMult)),
    }));

    const newEntry = {
      entryId: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${recipe.title}${portionMult !== 1 ? ` (${portionMult}x)` : ''}`,
      isRecipe: true,
      recipeId: recipe.id,
      portionMultiplier: portionMult,
      items: scaledItems,
    };

    const currentSlotList = dayLog?.meals?.[drawerMealSlot] || [];
    onSaveDayLog({
      ...dayLog,
      date: selectedDate,
      meals: {
        ...dayLog.meals,
        [drawerMealSlot]: [...currentSlotList, newEntry],
      },
    });

    setDrawerMealSlot(null);
    triggerToast('Ajouté');
  };

  const handleAddSingleFood = async (e) => {
    e.preventDefault();
    const activeFood = selectedFoodObj || filteredLocalFoods[0];
    if (!drawerMealSlot || !activeFood) return;

    if (activeFood.sourceRef === 'Open Food Facts') {
      await onCacheExternalFood(activeFood);
    }

    const cleanGrams = Math.max(1, Math.round(Number(unitGrams) || 100));
    const newEntry = {
      entryId: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: activeFood.name,
      isRecipe: false,
      items: [{ foodId: activeFood.id, grams: cleanGrams }],
    };

    const currentSlotList = dayLog?.meals?.[drawerMealSlot] || [];
    onSaveDayLog({
      ...dayLog,
      date: selectedDate,
      meals: {
        ...dayLog.meals,
        [drawerMealSlot]: [...currentSlotList, newEntry],
      },
    });

    setDrawerMealSlot(null);
    triggerToast(`${cleanGrams}g ${activeFood.name}`);
  };

  const handleUpdateIngredientGrams = (slotId, entryId, itemIdx, nextGrams) => {
    const safeG = Math.max(5, Math.round(Number(nextGrams) || 5));
    const updatedSlot = (dayLog.meals[slotId] || []).map((entry) => {
      if (entry.entryId !== entryId) return entry;
      return {
        ...entry,
        items: entry.items.map((it, idx) =>
          idx === itemIdx ? { ...it, grams: safeG } : it
        ),
      };
    });

    onSaveDayLog({
      ...dayLog,
      meals: { ...dayLog.meals, [slotId]: updatedSlot },
    });
  };

  const handleSwapIngredientInMeal = (slotId, entryId, itemIdx, item) => {
    const food = getFoodById(item.foodId);
    if (!food) return;

    onOpenSubstitutionModal({
      sourceFoodId: item.foodId,
      initialGrams: item.grams,
      contextLabel: food.name,
      onConfirmSwap: ({ newFood, newGrams }) => {
        const updatedSlot = (dayLog.meals[slotId] || []).map((entry) => {
          if (entry.entryId !== entryId) return entry;
          return {
            ...entry,
            title: entry.isRecipe ? entry.title : newFood.name,
            items: entry.items.map((it, idx) =>
              idx === itemIdx ? { foodId: newFood.id, grams: newGrams } : it
            ),
          };
        });

        onSaveDayLog({
          ...dayLog,
          meals: { ...dayLog.meals, [slotId]: updatedSlot },
        });
        triggerToast(`→ ${newGrams}g ${newFood.name}`);
      },
    });
  };

  const handleDeleteMealEntry = (slotId, entryId) => {
    const updatedSlot = (dayLog.meals[slotId] || []).filter(
      (entry) => entry.entryId !== entryId
    );
    onSaveDayLog({
      ...dayLog,
      meals: { ...dayLog.meals, [slotId]: updatedSlot },
    });
  };

  const handleSendFullDayToShopping = () => {
    const flatItems = Object.values(dayLog?.meals || {})
      .flat()
      .flatMap((e) => e.items || []);
    if (flatItems.length === 0) return;
    onSendItemsToShoppingList(flatItems);
    triggerToast('Envoyé aux courses');
  };

  const handleCreateCustomRecipeSubmit = async (e) => {
    e.preventDefault();
    if (!customTitle.trim() || customDraftItems.length === 0) return;
    const saved = await onSaveCustomRecipe({
      title: customTitle.trim(),
      mealTypes: ['breakfast', 'lunch', 'snack', 'dinner'],
      prepMinutes: Number(customPrepMin) || 10,
      goalTag: 'Perso',
      description: 'Recette personnalisée.',
      ingredients: customDraftItems,
      steps: ['Assembler et préparer selon tes préférences.'],
    });
    setCustomTitle('');
    setCustomDraftItems([]);
    setDrawerTab('recipes');
    if (saved) triggerToast('Recette enregistrée');
  };

  const activePreviewFood = selectedFoodObj || filteredLocalFoods[0];
  const selectedUnitPreview = calculateFoodMacros(activePreviewFood, unitGrams);
  const kcalPct = Math.min(100, Math.round((dayTotals.kcal / Math.max(1, targets.kcal)) * 100));

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-xl flex items-center gap-1.5 animate-slide-up">
          <Check className="w-3.5 h-3.5" />
          {toastMsg}
        </div>
      )}

      {/* 1. NAVIGATION DATE */}
      <div className="flex items-center justify-between px-1">
        <div className="inline-flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-full border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => onChangeDate(shiftDateString(selectedDate, -1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)]"
            aria-label="Précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <label className="relative px-3 py-1 cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
            {formatHumanDate(selectedDate, lang)}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && onChangeDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>

          <button
            type="button"
            onClick={() => onChangeDate(shiftDateString(selectedDate, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)]"
            aria-label="Suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSendFullDayToShopping}
          disabled={dayTotals.kcal === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--bg-subtle)] disabled:opacity-35 border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
          {tr(lang, 'to_shopping')}
        </button>
      </div>

      {/* 2. SYNTHÈSE DU JOUR */}
      <section className="card-surface p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="tabular-nums">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {dayTotals.kcal}
            </span>
            <span className="text-xs text-[var(--text-muted)] ml-1.5">
              / {targets.kcal} kcal
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-nums">
            <span className="text-sky-400 font-semibold">
              {Math.round(dayTotals.protein)}g <span className="text-[var(--text-muted)] font-normal">P</span>
            </span>
            <span className="text-amber-400 font-semibold">
              {Math.round(dayTotals.carbs)}g <span className="text-[var(--text-muted)] font-normal">G</span>
            </span>
            <span className="text-rose-400 font-semibold">
              {Math.round(dayTotals.fat)}g <span className="text-[var(--text-muted)] font-normal">L</span>
            </span>
          </div>
        </div>

        <div className="h-1.5 w-full rounded-full bg-zinc-500/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${kcalPct}%` }}
          />
        </div>
      </section>

      {/* 3. REPAS DU JOUR */}
      <div className="space-y-3">
        {MEAL_SLOTS.map((slot) => {
          const entries = dayLog?.meals?.[slot.id] || [];
          const slotMacros = entries.reduce(
            (acc, entry) => {
              (entry.items || []).forEach((it) => {
                const m = calculateFoodMacros(it.foodId, it.grams);
                acc.kcal += m.kcal;
                acc.protein += m.protein;
              });
              return acc;
            },
            { kcal: 0, protein: 0 }
          );

          return (
            <section key={slot.id} className="card-surface overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {slot.label}
                  </h3>
                  {entries.length > 0 && (
                    <p className="text-xs text-[var(--text-muted)] tabular-nums mt-0.5">
                      {Math.round(slotMacros.kcal)} kcal · {Math.round(slotMacros.protein)}g P
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {entries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const flat = entries.flatMap((e) => e.items || []);
                        onSendItemsToShoppingList(flat);
                        triggerToast(`${slot.label} → Courses`);
                      }}
                      className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerMealSlot(slot.id);
                      setPortionMult(1);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-primary)] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    {tr(lang, 'add')}
                  </button>
                </div>
              </div>

              {entries.length > 0 && (
                <div className="px-4 pb-4 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                  {entries.map((entry) => {
                    const entryTotals = (entry.items || []).reduce(
                      (acc, it) => {
                        const m = calculateFoodMacros(it.foodId, it.grams);
                        acc.kcal += m.kcal;
                        acc.protein += m.protein;
                        return acc;
                      },
                      { kcal: 0, protein: 0 }
                    );

                    return (
                      <div
                        key={entry.entryId}
                        className="rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                              {entry.title}
                            </h4>
                            <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                              {Math.round(entryTotals.kcal)} kcal · {Math.round(entryTotals.protein)}g P
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteMealEntry(slot.id, entry.entryId)}
                            className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
                          {(entry.items || []).map((it, idx) => {
                            const food = getFoodById(it.foodId);
                            if (!food) return null;

                            return (
                              <div
                                key={`${it.foodId}_${idx}`}
                                className="flex items-center justify-between gap-2 text-xs py-0.5"
                              >
                                <div className="min-w-0 flex-1 truncate">
                                  <span className="text-[var(--text-primary)]">{food.name}</span>
                                  <span className="text-[10.5px] text-[var(--text-muted)] ml-1.5">
                                    ({food.state})
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div className="inline-flex items-center bg-[var(--bg-subtle)] rounded-lg px-2 py-0.5 border border-[var(--border-subtle)]">
                                    <input
                                      type="number"
                                      min="5"
                                      max="1500"
                                      step="5"
                                      value={it.grams}
                                      onChange={(e) =>
                                        handleUpdateIngredientGrams(
                                          slot.id,
                                          entry.entryId,
                                          idx,
                                          e.target.value
                                        )
                                      }
                                      className="w-11 bg-transparent text-right text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none"
                                    />
                                    <span className="text-[10px] text-[var(--text-muted)] ml-0.5">g</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSwapIngredientInMeal(
                                        slot.id,
                                        entry.entryId,
                                        idx,
                                        it
                                      )
                                    }
                                    className="p-1.5 rounded-lg bg-[var(--bg-subtle)] text-emerald-400 border border-[var(--border-subtle)]"
                                    title="Remplacer"
                                  >
                                    <ArrowLeftRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* MODALE D'AJOUT : RECETTES | RECHERCHE UNIVERSELLE CIQUAL + OPEN FOOD FACTS | CRÉER */}
      {drawerMealSlot && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-xl max-h-[88vh] card-elevated rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {MEAL_SLOTS.find((s) => s.id === drawerMealSlot)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setDrawerMealSlot(null)}
                className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
              <div className="grid grid-cols-3 p-1 rounded-full bg-[var(--bg-subtle)]">
                {[
                  { id: 'recipes', label: `Recettes (${RECIPES_DATA.length})` },
                  { id: 'foods', label: 'Aliments (3M+)' },
                  { id: 'create_recipe', label: 'Créer' },
                ].map((t) => {
                  const active = drawerTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDrawerTab(t.id)}
                      className={`py-1.5 px-2 rounded-full text-xs font-medium transition-all ${
                        active
                          ? 'bg-emerald-400 text-zinc-950 font-semibold'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ONGLET A : RECETTES */}
            {drawerTab === 'recipes' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      placeholder="Rechercher recette ou ingrédient..."
                      className="input-dark !pl-9 !py-2 text-xs"
                    />
                  </div>

                  <div className="inline-flex items-center gap-0.5 bg-[var(--bg-subtle)] p-1 rounded-full shrink-0">
                    {[0.5, 1, 1.5, 2].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPortionMult(m)}
                        className={`px-2 py-1 rounded-full text-[11px] font-semibold tabular-nums ${
                          portionMult === m
                            ? 'bg-emerald-400 text-zinc-950'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between px-1 text-[11px] text-[var(--text-muted)]">
                  <span>{filteredRecipes.length} recettes compatibles</span>
                  <button
                    type="button"
                    onClick={() => setShowAdaptableRecipes((v) => !v)}
                    className="underline"
                  >
                    {showAdaptableRecipes ? 'Masquer auto-adaptables' : 'Inclure auto-adaptables'}
                  </button>
                </div>

                {filteredRecipes.map((rec) => {
                  const isCompatible = isRecipeCompatibleWithProfile(rec, profile);
                  const macros = computeRecipeMacros(rec, portionMult);
                  const detailsOpen = expandedRecipeId === rec.id;

                  return (
                    <div
                      key={rec.id}
                      className="rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                            <span className="text-emerald-400 font-medium">{rec.goalTag}</span>
                            <span>·</span>
                            <span>{rec.prepMinutes} min</span>
                          </div>
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                            {rec.title}
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)] mt-1 tabular-nums">
                            <strong className="text-[var(--text-primary)]">{macros.kcal} kcal</strong> ·{' '}
                            {macros.protein}g P · {macros.carbs}g G · {macros.fat}g L
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {rec.isCustom && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomRecipe(rec.id)}
                              className="p-2 text-[var(--text-muted)] hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAddRecipeToMeal(rec, !isCompatible)}
                            className="btn-primary !py-1.5 !px-3.5 !text-xs"
                          >
                            {isCompatible ? tr(lang, 'add') : 'Adapter'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
                        <span className="truncate">
                          {(rec.ingredients || [])
                            .map((ing) => {
                              const f = getFoodById(ing.foodId);
                              return f ? `${Math.round(ing.grams * portionMult)}g ${f.name}` : '';
                            })
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedRecipeId(detailsOpen ? null : rec.id)}
                          className="shrink-0 ml-2 underline"
                        >
                          {detailsOpen ? 'Fermer' : 'Étapes'}
                        </button>
                      </div>

                      {detailsOpen && rec.steps && (
                        <ol className="pt-2 border-t border-[var(--border-subtle)] space-y-1 text-xs text-[var(--text-secondary)] list-decimal list-inside">
                          {rec.steps.map((st, idx) => (
                            <li key={idx}>{st}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ONGLET B : RECHERCHE DYNAMIQUE CIQUAL / USDA + 3M+ OPEN FOOD FACTS + CODE-BARRES */}
            {drawerTab === 'foods' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      placeholder={tr(lang, 'search_food_world')}
                      className="input-dark !pl-10 !py-2 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setBarcodePromptOpen((v) => !v)}
                    className="btn-secondary !py-2 !px-3 !text-xs shrink-0"
                    title="Rechercher un code-barres EAN-13"
                  >
                    <ScanBarcode className="w-4 h-4 text-emerald-400" />
                    <span className="hidden xs:inline">{tr(lang, 'scan_barcode')}</span>
                  </button>
                </div>

                {barcodePromptOpen && (
                  <form onSubmit={handleBarcodeSearch} className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={barcodeValue}
                      onChange={(e) => setBarcodeValue(e.target.value)}
                      placeholder="Code-barres EAN (ex: 3329770077003)"
                      className="input-dark !py-2 text-xs tabular-nums"
                    />
                    <button type="submit" className="btn-accent !py-2 !px-3.5 !text-xs shrink-0">
                      Chercher
                    </button>
                  </form>
                )}

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {/* Résultats locaux certifiés CIQUAL / USDA */}
                  {filteredLocalFoods.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10.5px] font-semibold text-[var(--text-muted)] px-1">
                        {tr(lang, 'local_results')}
                      </p>
                      {filteredLocalFoods.map((f) => {
                        const active = activePreviewFood?.id === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setSelectedFoodObj(f);
                              setUnitGrams(f.defaultGrams || 100);
                            }}
                            className={`w-full text-left px-3.5 py-2 rounded-2xl text-xs flex items-center justify-between transition-all ${
                              active
                                ? 'bg-emerald-400/15 border border-emerald-400/40 text-[var(--text-primary)] font-semibold'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                            }`}
                          >
                            <span className="truncate">
                              {f.name}{' '}
                              <span className="text-[10.5px] text-[var(--text-muted)]">
                                ({f.state})
                              </span>
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0 ml-2">
                              {f.per100g.kcal} kcal
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Résultats mondiaux en direct Open Food Facts */}
                  {(remoteLoading || remoteFoods.length > 0) && (
                    <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
                      <p className="text-[10.5px] font-semibold text-emerald-400 px-1 flex items-center gap-1.5">
                        <Globe className="w-3 h-3" />
                        {tr(lang, 'online_results')}
                        {remoteLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      </p>
                      {remoteFoods.map((f) => {
                        const active = activePreviewFood?.id === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setSelectedFoodObj(f);
                              setUnitGrams(f.defaultGrams || 100);
                            }}
                            className={`w-full text-left px-3.5 py-2 rounded-2xl text-xs flex items-center justify-between transition-all ${
                              active
                                ? 'bg-emerald-400/15 border border-emerald-400/40 text-[var(--text-primary)] font-semibold'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              {f.nutriscore && (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-400">
                                  {f.nutriscore}
                                </span>
                              )}
                              <span className="truncate">{f.name}</span>
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0 ml-2">
                              {f.per100g.kcal} kcal · {f.per100g.protein}g P
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {activePreviewFood && (
                  <form
                    onSubmit={handleAddSingleFood}
                    className="rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {activePreviewFood.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] tabular-nums mt-0.5">
                          {selectedUnitPreview.kcal} kcal · {selectedUnitPreview.protein}g P ·{' '}
                          {selectedUnitPreview.carbs}g G · {selectedUnitPreview.fat}g L
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max="2000"
                          value={unitGrams}
                          onChange={(e) => setUnitGrams(e.target.value)}
                          className="w-20 input-dark !py-1.5 text-right font-semibold tabular-nums"
                        />
                        <span className="text-xs text-[var(--text-muted)]">g</span>
                      </div>
                    </div>

                    <button type="submit" className="btn-accent w-full">
                      {tr(lang, 'add')}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ONGLET C : CRÉATION DE RECETTE */}
            {drawerTab === 'create_recipe' && (
              <form
                onSubmit={handleCreateCustomRecipeSubmit}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      required
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Ex: Bowl Post-Séance"
                      className="input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customPrepMin}
                      onChange={(e) => setCustomPrepMin(e.target.value)}
                      className="input-dark tabular-nums"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={draftFoodId}
                    onChange={(e) => {
                      const f = getFoodById(e.target.value);
                      setDraftFoodId(e.target.value);
                      if (f) setDraftGrams(f.defaultGrams || 100);
                    }}
                    className="input-dark flex-1 !py-2 text-xs"
                  >
                    {compatibleFoods.map((f) => (
                      <option key={f.id} value={f.id} className="bg-zinc-900 text-white">
                        {f.name} ({f.state})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="5"
                    max="1500"
                    value={draftGrams}
                    onChange={(e) => setDraftGrams(e.target.value)}
                    className="w-20 input-dark !py-2 text-xs text-right tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCustomDraftItems((prev) => [
                        ...prev,
                        { foodId: draftFoodId, grams: Math.max(5, Number(draftGrams) || 50) },
                      ])
                    }
                    className="btn-secondary !py-2 !px-3"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {customDraftItems.length > 0 && (
                  <div className="space-y-1.5">
                    {customDraftItems.map((it, idx) => {
                      const f = getFoodById(it.foodId);
                      return (
                        <div
                          key={`${it.foodId}_${idx}`}
                          className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[var(--bg-subtle)] text-xs"
                        >
                          <span>
                            <strong>{it.grams}g</strong> {f?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomDraftItems((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="text-[var(--text-muted)] hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!customTitle.trim() || customDraftItems.length === 0}
                  className="btn-accent w-full"
                >
                  Enregistrer la recette
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
