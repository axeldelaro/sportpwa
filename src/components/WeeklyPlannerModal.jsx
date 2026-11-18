import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Check,
  RefreshCw,
  ShoppingBag,
  CalendarRange,
  ChevronDown,
  Search,
} from 'lucide-react';
import {
  getAllFoods,
  getFoodById,
  isFoodCompatibleWithProfile,
  registerExternalFoods,
} from '../data/foodDatabase';
import { MEAL_SLOTS } from '../data/recipesData';
import {
  scoreFoodMatch,
  synthesizeSmartFoodFromName,
} from '../utils/universalFoodResolver';
import { searchOpenFoodFacts } from '../utils/openFoodFactsService';
import {
  getQuickPantryStaples,
  parsePantryTextToFoods,
  generateWeeklyMealPlan,
  swapPlannedMealInDay,
} from '../utils/weeklyMealPlanner';

const SLOT_LABELS = Object.fromEntries(MEAL_SLOTS.map((s) => [s.id, s.label]));

export default function WeeklyPlannerModal({
  isOpen,
  onClose,
  startDateStr,
  lang = 'fr',
  profile,
  customRecipes = [],
  onCacheExternalFood,
  onApplyPlanToJournalAndShopping,
  onSendMissingOnlyToShopping,
}) {
  const [pantryIds, setPantryIds] = useState(['poulet_blanc', 'riz_basmati_cru', 'oeufs_entiers']);
  const [pantryInput, setPantryInput] = useState('');
  const [remotePantryMatches, setRemotePantryMatches] = useState([]);
  const [daysCount, setDaysCount] = useState(7);
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [batchCooking, setBatchCooking] = useState(false);

  const [viewTab, setViewTab] = useState('menu'); // 'menu' | 'missing'
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [expandedSlotKey, setExpandedSlotKey] = useState(null);
  const [alreadyOwnedMissingIds, setAlreadyOwnedMissingIds] = useState([]);
  const [plan, setPlan] = useState(null);

  // Initialise avec des aliments de base compatibles avec le profil (ex: vegan -> tofu, lentilles, avoine)
  useEffect(() => {
    if (!isOpen) return;
    const staples = getQuickPantryStaples(profile, 12);
    setPantryIds((prev) => {
      const validPrev = prev.filter((id) => {
        const f = getFoodById(id);
        return f && isFoodCompatibleWithProfile(f, profile);
      });
      if (validPrev.length > 0) return validPrev;
      return staples.slice(0, 3).map((f) => f.id);
    });
    setAlreadyOwnedMissingIds([]);
    setActiveDayIdx(0);
  }, [isOpen, profile]);

  // Recalcule automatiquement le plan dès que les ingrédients ou options changent
  useEffect(() => {
    if (!isOpen) return;
    const nextPlan = generateWeeklyMealPlan({
      pantryFoodIds: pantryIds,
      daysCount,
      mealsPerDay,
      batchCooking,
      startDateStr,
      lang,
      profile,
      customRecipes,
    });
    setPlan(nextPlan);
    setActiveDayIdx((prev) => Math.min(prev, Math.max(0, nextPlan.days.length - 1)));
  }, [isOpen, pantryIds, daysCount, mealsPerDay, batchCooking, startDateStr, lang, profile, customRecipes]);

  const quickStaples = useMemo(
    () => getQuickPantryStaples(profile, 14),
    [profile]
  );

  // Recherche Open Food Facts en direct pour les ingrédients de marque ou spécifiques
  useEffect(() => {
    const trimmed = pantryInput.trim();
    if (!isOpen || trimmed.length < 3 || trimmed.includes(',')) {
      setRemotePantryMatches([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await searchOpenFoodFacts(trimmed, lang, controller.signal);
        const valid = (res || [])
          .filter((f) => !pantryIds.includes(f.id) && isFoodCompatibleWithProfile(f, profile))
          .slice(0, 4);
        if (valid.length > 0) registerExternalFoods(valid);
        setRemotePantryMatches(valid);
      } catch {
        // Hors-ligne
      }
    }, 380);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, pantryInput, lang, pantryIds, profile]);

  const searchMatches = useMemo(() => {
    const trimmed = pantryInput.trim();
    if (trimmed.length < 2 || trimmed.includes(',')) return [];
    const local = getAllFoods()
      .filter((f) => !pantryIds.includes(f.id) && isFoodCompatibleWithProfile(f, profile, { ignoreDislikes: true }))
      .map((f) => ({ f, score: scoreFoodMatch(f, trimmed) }))
      .filter((x) => x.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.f);

    const combined = [...local, ...remotePantryMatches].slice(0, 6);
    if (combined.length === 0 || scoreFoodMatch(combined[0], trimmed) < 75) {
      const synth = synthesizeSmartFoodFromName(trimmed);
      if (synth && !pantryIds.includes(synth.id)) {
        return [synth, ...combined].slice(0, 6);
      }
    }
    return combined;
  }, [pantryInput, pantryIds, profile, remotePantryMatches]);

  if (!isOpen || !plan) return null;

  const addPantryFoodId = (id) => {
    if (!id || pantryIds.includes(id)) return;
    setPantryIds((prev) => [...prev, id]);
    setAlreadyOwnedMissingIds((prev) => prev.filter((x) => x !== id));
  };

  const removePantryFoodId = (id) => {
    setPantryIds((prev) => prev.filter((x) => x !== id));
  };

  const handlePantryFormSubmit = (e) => {
    e.preventDefault();
    if (!pantryInput.trim()) return;
    const parsed = parsePantryTextToFoods(pantryInput, profile);
    if (parsed.length > 0) {
      setPantryIds((prev) => {
        const merged = new Set([...prev, ...parsed.map((f) => f.id)]);
        return Array.from(merged);
      });
      setPantryInput('');
    } else if (searchMatches[0]) {
      addPantryFoodId(searchMatches[0].id);
      setPantryInput('');
    }
  };

  const handleSwapSingleMeal = (dayIdx, slotId) => {
    setPlan((prev) =>
      swapPlannedMealInDay(prev, dayIdx, slotId, profile, customRecipes)
    );
  };

  const toggleAlreadyHaveMissing = (foodId) => {
    setAlreadyOwnedMissingIds((prev) =>
      prev.includes(foodId) ? prev.filter((id) => id !== foodId) : [...prev, foodId]
    );
  };

  const missingToBuy = (plan.missingItems || []).filter(
    (it) => !alreadyOwnedMissingIds.includes(it.foodId)
  );

  const activeDay = plan.days[activeDayIdx] || plan.days[0];

  const persistExternalPantryFoods = async () => {
    if (!onCacheExternalFood) return;
    for (const id of pantryIds) {
      const f = getFoodById(id);
      if (f && (f.isAutoSynthesized || f.sourceRef === 'Open Food Facts')) {
        await onCacheExternalFood(f);
      }
    }
  };

  const handleApplyFullPlan = async () => {
    await persistExternalPantryFoods();
    await onApplyPlanToJournalAndShopping(plan, missingToBuy);
    onClose();
  };

  const handleOnlyShopping = async () => {
    await persistExternalPantryFoods();
    await onSendMissingOnlyToShopping(missingToBuy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-xl max-h-[92vh] card-elevated rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>Générateur de semaine & courses manquantes</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] tabular-nums mt-0.5">
              Moyenne calculée : {plan.avgDailyMacros.kcal} kcal/j · {plan.avgDailyMacros.protein}g P ·{' '}
              {plan.avgDailyMacros.carbs}g G · {plan.avgDailyMacros.fat}g L
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. CE QUE J'AI SOUS LA MAIN */}
          <section className="rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="section-eyebrow">
                Mes ingrédients disponibles ({pantryIds.length})
              </span>
              {pantryIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPantryIds([])}
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Tout vider
                </button>
              )}
            </div>

            <form onSubmit={handlePantryFormSubmit} className="relative flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pantryInput}
                  onChange={(e) => setPantryInput(e.target.value)}
                  placeholder="Ex : poulet, riz, œufs, courgette, avoine..."
                  className="input-dark !pl-8 !py-2 !text-xs !bg-[var(--bg-card)]"
                />
              </div>
              <button
                type="submit"
                disabled={!pantryInput.trim()}
                className="btn-secondary !py-2 !px-3 !text-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </form>

            {/* Autocomplétion rapide si un seul mot est saisi */}
            {searchMatches.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {searchMatches.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      addPantryFoodId(f.id);
                      setPantryInput('');
                    }}
                    className="chip !py-1 !px-2.5 !text-[11px]"
                  >
                    <Plus className="w-3 h-3" />
                    {f.name}
                  </button>
                ))}
              </div>
            )}

            {/* Ingrédients sélectionnés dans le placard */}
            {pantryIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pantryIds.map((id) => {
                  const f = getFoodById(id);
                  if (!f) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium"
                    >
                      <span>{f.name.split('(')[0].trim()}</span>
                      <button
                        type="button"
                        onClick={() => removePantryFoodId(id)}
                        className="opacity-70 hover:opacity-100 p-0.5"
                        aria-label={`Retirer ${f.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Suggestions 1-tap d'ingrédients courants */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {quickStaples
                .filter((f) => !pantryIds.includes(f.id))
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => addPantryFoodId(f.id)}
                    className="chip !py-1 !px-2.5 !text-[11px]"
                  >
                    + {f.name.split('(')[0].trim()}
                  </button>
                ))}
            </div>

            {/* Paramètres compacts : Jours · Repas/j · Mode */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <div className="grid grid-cols-3 seg-control">
                {[3, 5, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysCount(d)}
                    className={`py-1 !text-[11px] tabular-nums seg-item ${
                      daysCount === d ? 'seg-item-active' : ''
                    }`}
                  >
                    {d}j
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 seg-control">
                {[
                  { n: 3, lbl: '3 repas' },
                  { n: 4, lbl: '4 repas' },
                ].map((m) => (
                  <button
                    key={m.n}
                    type="button"
                    onClick={() => setMealsPerDay(m.n)}
                    className={`py-1 !text-[11px] seg-item ${
                      mealsPerDay === m.n ? 'seg-item-active' : ''
                    }`}
                  >
                    {m.lbl}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 seg-control">
                {[
                  { b: false, lbl: 'Varié' },
                  { b: true, lbl: 'Batch 2j' },
                ].map((mode) => (
                  <button
                    key={String(mode.b)}
                    type="button"
                    onClick={() => setBatchCooking(mode.b)}
                    className={`py-1 !text-[11px] seg-item ${
                      batchCooking === mode.b ? 'seg-item-active' : ''
                    }`}
                    title="Batch 2j : chaque plat est préparé pour 2 jours d'affilée afin de cuisiner deux fois moins"
                  >
                    {mode.lbl}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2. BASCULE ENTRE LE MENU JOUR PAR JOUR ET CE QU'IL MANQUE */}
          <div className="grid grid-cols-2 seg-control">
            <button
              type="button"
              onClick={() => setViewTab('menu')}
              className={`py-2 seg-item ${viewTab === 'menu' ? 'seg-item-active' : ''}`}
            >
              Menu généré ({plan.days.length} jours)
            </button>
            <button
              type="button"
              onClick={() => setViewTab('missing')}
              className={`py-2 seg-item flex items-center justify-center gap-1.5 ${
                viewTab === 'missing' ? 'seg-item-active' : ''
              }`}
            >
              <span>Ce qu’il manque</span>
              <span className="px-1.5 py-0.2 rounded-md bg-[var(--accent-soft)] text-emerald-400 text-[11px] font-semibold tabular-nums">
                {missingToBuy.length}
              </span>
            </button>
          </div>

          {/* VUE A : MENU JOUR PAR JOUR */}
          {viewTab === 'menu' && activeDay && (
            <div className="space-y-3">
              {/* Sélecteur horizontal des jours */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {plan.days.map((d, idx) => {
                  const isSel = idx === activeDayIdx;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setActiveDayIdx(idx)}
                      className={isSel ? 'chip-active !py-1.5 !px-3' : 'chip !py-1.5 !px-3'}
                    >
                      <span>{d.label}</span>
                      <span className="opacity-65 tabular-nums text-[10.5px]">
                        {d.totals.kcal}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Cartes des repas du jour sélectionné */}
              <div className="space-y-2.5">
                {plan.activeSlots.map((slotId) => {
                  const meal = activeDay.meals?.[slotId];
                  if (!meal) return null;
                  const expandKey = `${activeDayIdx}_${slotId}`;
                  const isExpanded = expandedSlotKey === expandKey;

                  return (
                    <div
                      key={slotId}
                      className="card-surface p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                            <span className="font-medium text-[var(--text-secondary)]">
                              {SLOT_LABELS[slotId] || slotId}
                            </span>
                            <span>·</span>
                            <span className="tabular-nums">{meal.prepMinutes} min</span>
                          </div>
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 leading-snug">
                            {meal.title}
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-0.5">
                            <strong className="font-semibold text-[var(--text-primary)]">
                              {meal.macros.kcal} kcal
                            </strong>{' '}
                            · {meal.macros.protein}g P · {meal.macros.carbs}g G · {meal.macros.fat}g L
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSwapSingleMeal(activeDayIdx, slotId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 transition-colors"
                          title="Proposer une autre recette pour ce créneau"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Autre</span>
                        </button>
                      </div>

                      {/* Ingrédients : distingue visuellement ce que tu as déjà (✓) vs ce qu'il manque (+) */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {meal.items.map((it, idx) => {
                          const f = getFoodById(it.foodId);
                          if (!f) return null;
                          const inPantry =
                            pantryIds.includes(it.foodId) ||
                            alreadyOwnedMissingIds.includes(it.foodId);
                          return (
                            <span
                              key={`${it.foodId}_${idx}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border tabular-nums ${
                                inPantry
                                  ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                                  : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <span>{inPantry ? '✓' : '+'}</span>
                              <span>
                                {it.grams}g {f.name.split('(')[0].trim()}
                              </span>
                            </span>
                          );
                        })}
                      </div>

                      {meal.steps?.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSlotKey(isExpanded ? null : expandKey)
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            <span>{isExpanded ? 'Masquer la préparation' : 'Voir la préparation'}</span>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {isExpanded && (
                            <ol className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1 text-xs text-[var(--text-secondary)] list-decimal list-inside">
                              {meal.steps.map((st, sIdx) => (
                                <li key={sIdx}>{st}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VUE B : BILAN DES INGRÉDIENTS UTILISÉS VS CE QU'IL MANQUE */}
          {viewTab === 'missing' && (
            <div className="space-y-4">
              {plan.pantryUsed.length > 0 && (
                <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/25 p-3.5 space-y-2">
                  <span className="text-xs font-semibold text-emerald-400 block">
                    Déjà dans ta cuisine ({plan.pantryUsed.length} utilisés sur la semaine)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.pantryUsed.map((p) => (
                      <span
                        key={p.foodId}
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] tabular-nums"
                      >
                        ✓ {p.name.split('(')[0].trim()}{' '}
                        <span className="text-[var(--text-muted)]">({p.totalGrams}g)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="section-eyebrow">
                    À compléter pour les {plan.days.length} jours ({missingToBuy.length} à acheter)
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Décoche si tu l’as déjà
                  </span>
                </div>

                {plan.missingItems.length === 0 ? (
                  <div className="card-surface p-6 text-center text-xs text-[var(--text-secondary)]">
                    Tu possèdes déjà tous les ingrédients nécessaires pour cette semaine.
                  </div>
                ) : (
                  <div className="card-surface divide-y divide-[var(--border-subtle)] overflow-hidden">
                    {plan.missingItems.map((item) => {
                      const alreadyHave = alreadyOwnedMissingIds.includes(item.foodId);
                      const toBuy = !alreadyHave;
                      return (
                        <div
                          key={item.foodId}
                          onClick={() => toggleAlreadyHaveMissing(item.foodId)}
                          className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-opacity ${
                            alreadyHave ? 'opacity-45' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                toBuy
                                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                  : 'border-[var(--border-strong)]'
                              }`}
                            >
                              {toBuy && <Check className="w-3 h-3 stroke-[2.6]" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs sm:text-sm font-medium truncate ${
                                  alreadyHave
                                    ? 'line-through text-[var(--text-muted)]'
                                    : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {item.name}
                              </p>
                              <p className="text-[11px] text-[var(--text-muted)] truncate">
                                Utilisé dans {item.usedInCount} repas · {item.category}
                              </p>
                            </div>
                          </div>

                          <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums shrink-0">
                            {item.totalGrams}g
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pied d'action : Courses seules OU Semaine complète + Courses */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={missingToBuy.length === 0}
            onClick={handleOnlyShopping}
            className="btn-secondary sm:w-auto justify-center"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Manquants aux courses ({missingToBuy.length})</span>
          </button>

          <button
            type="button"
            onClick={handleApplyFullPlan}
            className="btn-primary flex-1"
          >
            <Check className="w-4 h-4" />
            <span>
              Appliquer les {plan.days.length} jours & ajouter les manquants
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
