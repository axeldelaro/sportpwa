import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeftRight,
  Search,
  Check,
  X,
  Heart,
  Ban,
  RefreshCw,
  BookmarkPlus,
  RotateCcw,
  Copy,
  CalendarRange,
  Share2,
} from 'lucide-react';
import {
  getAllFoods,
  getFoodById,
  calculateFoodMacros,
} from '../data/foodDatabase';
import {
  MEAL_SLOTS,
  RECIPES_DATA,
  computeRecipeMacros,
  isRecipeCompatibleWithProfile,
} from '../data/recipesData';
import { normalizeText } from '../utils/substitutionEngine';
import {
  resolveDynamicRecipe,
  updateLoggedMealTitleOnSwap,
  getVariedRecipesForFood,
} from '../utils/foodRecipeSuggester';
import {
  normalizeFoodSingular,
  resolveOrSynthesizeFood,
  scoreFoodMatch,
} from '../utils/universalFoodResolver';
import { searchOpenFoodFacts } from '../utils/openFoodFactsService';
import { registerExternalFoods } from '../data/foodDatabase';
import { encodeShareUrl, triggerNativeOrClipboardShare } from '../utils/shareCodec';
import { getTodayDateString } from '../db/database';
import { tr } from '../i18n/translations';
import SmartFoodPicker from './SmartFoodPicker';
import WeeklyPlannerModal from './WeeklyPlannerModal';

const COMMON_EXCLUSION_SUGGESTIONS = [
  'coriandre_fraiche',
  'champignons_paris',
  'brocoli',
  'epinards_frais',
  'avocat',
  'thon_naturel',
  'saumon_frais',
  'banane',
  'oignon_jaune',
  'ail_frais',
  'chevre_frais_buche',
  'fromage_blanc_0',
];

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
  onToggleDislikedFood,
  onToggleFavoriteRecipe,
  onSaveRecipeOverride,
  onCopyPreviousDayMeals,
  onApplyWeeklyPlan,
  allNutritionLogs = [],
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
  const [remoteRecipeFood, setRemoteRecipeFood] = useState(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [exclusionMode, setExclusionMode] = useState('adapt'); // 'adapt' | 'hide'
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  // Modale légère d'ajout d'ingrédient directement DANS un plat/recette déjà posé
  const [appendTargetEntry, setAppendTargetEntry] = useState(null); // { slotId, entryId, title }

  // Tiroir "Ce que je ne mange pas" (mémoire profil)
  const [exclusionsModalOpen, setExclusionsModalOpen] = useState(false);
  const [exclusionQuery, setExclusionQuery] = useState('');
  const [weeklyPlannerOpen, setWeeklyPlannerOpen] = useState(false);

  const upcomingWeekStrip = useMemo(() => {
    const loggedDates = new Set(
      (allNutritionLogs || [])
        .filter((l) =>
          Object.values(l.meals || {}).some((arr) => Array.isArray(arr) && arr.length > 0)
        )
        .map((l) => l.date)
    );
    const days = [];
    let plannedCount = 0;
    for (let offset = 0; offset < 7; offset++) {
      const dStr = getTodayDateString(offset);
      const dt = new Date(dStr + 'T12:00:00');
      const hasMeals = loggedDates.has(dStr);
      if (hasMeals) plannedCount += 1;
      days.push({
        dateStr: dStr,
        dayShort: dt.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
          weekday: 'short',
        }),
        dayNum: dt.getDate(),
        hasMeals,
      });
    }
    return plannedCount >= 2 ? days : null;
  }, [allNutritionLogs, lang]);

  // Créateur de recette avec recherche universelle intégrée
  const [customTitle, setCustomTitle] = useState('');
  const [customPrepMin, setCustomPrepMin] = useState(10);
  const [customDraftItems, setCustomDraftItems] = useState([]);

  const [toastMsg, setToastMsg] = useState(null);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  };

  const targets = profile?.targets || {
    kcal: 2200,
    protein: 140,
    carbs: 230,
    fat: 70,
  };

  const dislikedIds = profile?.dislikedFoodIds || [];
  const favoriteIds = profile?.favoriteRecipeIds || [];

  const dayTotals = useMemo(() => computeDayTotals(dayLog), [dayLog]);
  const allRecipes = useMemo(() => [...customRecipes, ...RECIPES_DATA], [customRecipes]);

  // Si l'utilisateur tape un aliment non pré-enregistré dans Recettes (ex: marque Open Food Facts), on enrichit aussi en arrière-plan
  useEffect(() => {
    const q = recipeSearch.trim();
    if (q.length < 3) {
      setRemoteRecipeFood(null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await searchOpenFoodFacts(q, lang, controller.signal);
        if (res && res.length > 0) {
          registerExternalFoods([res[0]]);
          setRemoteRecipeFood(res[0]);
        }
      } catch {
        // Repli instantané hors-ligne via resolveOrSynthesizeFood
      }
    }, 380);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [recipeSearch, lang]);

  // Liste des recettes dynamiques + Génération automatique de 4 recettes variées pour TOUT aliment tapé (même non pré-enregistré !)
  const preparedRecipes = useMemo(() => {
    const qTrim = recipeSearch.trim();
    const qSing = normalizeFoodSingular(qTrim);

    const catalogMatches = allRecipes
      .map((rec) => {
        const strictlyCompatible = isRecipeCompatibleWithProfile(rec, profile);
        if (!strictlyCompatible && exclusionMode === 'hide' && !profile?.recipeOverrides?.[rec.id]) {
          return null;
        }
        const liveRec = resolveDynamicRecipe(rec, profile);
        return {
          ...liveRec,
          isFavorite: favoriteIds.includes(rec.id),
        };
      })
      .filter(Boolean)
      .filter((rec) => {
        if (onlyFavorites && !rec.isFavorite) return false;
        if (qSing) {
          const matchTitle = normalizeFoodSingular(rec.title).includes(qSing);
          const matchIng = (rec.ingredients || []).some((ing) => {
            const f = getFoodById(ing.foodId);
            return f && (normalizeFoodSingular(f.name).includes(qSing) || scoreFoodMatch(f, qTrim) >= 65);
          });
          if (!matchTitle && !matchIng) return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));

    // Si peu ou pas de recettes existantes pour cet aliment (ex: "cordons bleus", "nuggets", "samoussas", "aligot"...),
    // on résout ou synthétise l'aliment instantanément et on génère 4 recettes équilibrées par type de repas !
    if (qTrim.length >= 2 && !onlyFavorites && catalogMatches.length < 4) {
      const localOrSynth = resolveOrSynthesizeFood(qTrim, profile);
      const targetFood =
        localOrSynth && !localOrSynth.isAutoSynthesized
          ? localOrSynth
          : remoteRecipeFood || localOrSynth;

      if (targetFood) {
        const generated = getVariedRecipesForFood(targetFood, profile, customRecipes, 4)
          .filter((g) => !catalogMatches.some((c) => normalizeFoodSingular(c.title) === normalizeFoodSingular(g.title)))
          .map((g) => ({
            ...g,
            goalTag: `${g.slotBadge} · Sur-mesure`,
            isGeneratedOnTheFly: true,
            isFavorite: false,
          }));
        return [...catalogMatches, ...generated];
      }
    }

    return catalogMatches;
  }, [allRecipes, profile, exclusionMode, favoriteIds, onlyFavorites, recipeSearch, remoteRecipeFood, customRecipes]);

  const draftRecipeTotals = useMemo(
    () => computeRecipeMacros({ ingredients: customDraftItems }, 1),
    [customDraftItems]
  );

  const exclusionSearchMatches = useMemo(() => {
    if (!exclusionQuery.trim()) return [];
    const q = normalizeText(exclusionQuery);
    return getAllFoods()
      .filter((f) => normalizeText(f.name).includes(q) && !dislikedIds.includes(f.id))
      .slice(0, 12);
  }, [exclusionQuery, dislikedIds]);

  const handleAddRecipeToMeal = async (preparedRec) => {
    if (!drawerMealSlot) return;

    // Persiste dans IndexedDB tout aliment synthétisé ou issu d'Open Food Facts utilisé dans la recette
    if (onCacheExternalFood) {
      for (const ing of preparedRec.ingredients || []) {
        const f = getFoodById(ing.foodId);
        if (f && (f.isAutoSynthesized || f.sourceRef === 'Open Food Facts')) {
          await onCacheExternalFood(f);
        }
      }
    }

    const scaledItems = (preparedRec.ingredients || []).map((ing) => ({
      foodId: ing.foodId,
      grams: Math.max(5, Math.round(ing.grams * portionMult)),
    }));

    const newEntry = {
      entryId: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${preparedRec.title}${portionMult !== 1 ? ` (${portionMult}x)` : ''}`,
      isRecipe: true,
      recipeId: preparedRec.id,
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
    triggerToast('Recette ajoutée');
  };

  const handleAddSingleFoodToSlot = (foodObj, cleanGrams) => {
    if (!drawerMealSlot || !foodObj) return;
    const newEntry = {
      entryId: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: foodObj.name,
      isRecipe: false,
      items: [{ foodId: foodObj.id, grams: cleanGrams }],
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
    triggerToast(`+${cleanGrams}g ${foodObj.name}`);
  };

  // Fusionne un ingrédient (ex: 30g de citron) directement À L'INTÉRIEUR d'une recette/repas déjà posé !
  const handleAppendIngredientInsideEntry = (foodObj, cleanGrams) => {
    if (!appendTargetEntry || !foodObj) return;
    const { slotId, entryId } = appendTargetEntry;

    const updatedSlot = (dayLog.meals[slotId] || []).map((entry) => {
      if (entry.entryId !== entryId) return entry;
      const existingIdx = (entry.items || []).findIndex((it) => it.foodId === foodObj.id);
      const nextItems =
        existingIdx >= 0
          ? entry.items.map((it, idx) =>
              idx === existingIdx ? { ...it, grams: it.grams + cleanGrams } : it
            )
          : [...(entry.items || []), { foodId: foodObj.id, grams: cleanGrams }];

      return {
        ...entry,
        isRecipe: nextItems.length > 1 ? true : entry.isRecipe,
        items: nextItems,
      };
    });

    onSaveDayLog({
      ...dayLog,
      meals: { ...dayLog.meals, [slotId]: updatedSlot },
    });

    setAppendTargetEntry(null);
    triggerToast(`+${cleanGrams}g ${foodObj.name} intégré`);
  };

  const handleSaveEntryAsCustomRecipe = async (entry) => {
    if (!entry?.items?.length) return;
    const cleanTitle = entry.title.replace(/\s*\([\d.]+x\)$/, '').trim();
    await onSaveCustomRecipe({
      id: entry.recipeId?.startsWith('crecipe_') ? entry.recipeId : undefined,
      title: entry.recipeId?.startsWith('crecipe_') ? cleanTitle : `${cleanTitle} (Perso)`,
      mealTypes: ['breakfast', 'lunch', 'snack', 'dinner'],
      prepMinutes: 10,
      goalTag: 'Sur-mesure',
      description: 'Recette personnalisée mise à jour.',
      ingredients: entry.items.map((it) => ({ foodId: it.foodId, grams: it.grams })),
      steps: ['Préparer et assembler les ingrédients selon tes goûts.'],
    });
    triggerToast('Recette mémorisée !');
  };

  const handleUpdateIngredientGrams = (slotId, entryId, itemIdx, nextGrams) => {
    const safeG = Math.max(1, Math.round(Number(nextGrams) || 5));
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

  const handleRemoveSingleItemFromEntry = (slotId, entryId, itemIdx) => {
    const updatedSlot = (dayLog.meals[slotId] || [])
      .map((entry) => {
        if (entry.entryId !== entryId) return entry;
        return {
          ...entry,
          items: entry.items.filter((_, idx) => idx !== itemIdx),
        };
      })
      .filter((entry) => entry.items.length > 0);

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
        let updatedRecipeId = null;
        let updatedRecipeItems = null;

        const updatedSlot = (dayLog.meals[slotId] || []).map((entry) => {
          if (entry.entryId !== entryId) return entry;
          const nextItems = entry.items.map((it, idx) =>
            idx === itemIdx ? { foodId: newFood.id, grams: newGrams } : it
          );
          if (entry.recipeId) {
            updatedRecipeId = entry.recipeId;
            updatedRecipeItems = nextItems;
          }
          const nextTitle = entry.isRecipe
            ? updateLoggedMealTitleOnSwap(entry.title, food.name, newFood.name)
            : newFood.name;

          return {
            ...entry,
            title: nextTitle,
            items: nextItems,
          };
        });

        onSaveDayLog({
          ...dayLog,
          meals: { ...dayLog.meals, [slotId]: updatedSlot },
        });

        // Synchronise également la recette correspondante pour qu'elle reste actualisée !
        if (updatedRecipeId && onSaveRecipeOverride && !updatedRecipeId.startsWith('sug_')) {
          const mult = 1;
          const baseItems = updatedRecipeItems.map((it) => ({
            foodId: it.foodId,
            grams: Math.max(5, Math.round(it.grams / mult)),
          }));
          onSaveRecipeOverride(updatedRecipeId, {
            ingredients: baseItems,
            swaps: [{ swappedFrom: food.name, swappedTo: newFood.name }],
          });
        }

        triggerToast(`Recette actualisée → ${newGrams}g ${newFood.name}`);
      },
    });
  };

  // Permet de remplacer un ingrédient directement sur une fiche recette du catalogue Recettes !
  const handleSwapIngredientInCatalogRecipe = (rec, ingIdx, ing) => {
    const food = getFoodById(ing.foodId);
    if (!food || !onSaveRecipeOverride) return;

    onOpenSubstitutionModal({
      sourceFoodId: ing.foodId,
      initialGrams: ing.grams,
      contextLabel: `${rec.title} · ${food.name}`,
      onConfirmSwap: ({ newFood, newGrams }) => {
        const nextIngredients = (rec.ingredients || []).map((item, i) =>
          i === ingIdx ? { foodId: newFood.id, grams: newGrams } : { foodId: item.foodId, grams: item.grams }
        );
        const prevSwaps = Array.isArray(profile?.recipeOverrides?.[rec.id]?.swaps)
          ? profile.recipeOverrides[rec.id].swaps
          : [];
        const nextSwaps = [...prevSwaps, { swappedFrom: food.name, swappedTo: newFood.name }];

        onSaveRecipeOverride(rec.id, {
          ingredients: nextIngredients,
          swaps: nextSwaps,
        });

        // Si cette recette est déjà présente dans le journal du jour, on l'actualise aussi en direct !
        if (dayLog?.meals) {
          let touchedDay = false;
          const nextMeals = {};
          Object.entries(dayLog.meals).forEach(([sId, entries]) => {
            nextMeals[sId] = (entries || []).map((entry) => {
              if (entry.recipeId !== rec.id) return entry;
              touchedDay = true;
              const mult = Number(entry.portionMultiplier) || 1;
              return {
                ...entry,
                title: updateLoggedMealTitleOnSwap(entry.title, food.name, newFood.name),
                items: nextIngredients.map((ni) => ({
                  foodId: ni.foodId,
                  grams: Math.max(5, Math.round(ni.grams * mult)),
                })),
              };
            });
          });
          if (touchedDay) {
            onSaveDayLog({ ...dayLog, meals: nextMeals });
          }
        }

        triggerToast(`${rec.title} mise à jour avec ${newFood.name}`);
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
      goalTag: 'Sur-mesure',
      description: 'Recette personnalisée.',
      ingredients: customDraftItems,
      steps: ['Assembler et préparer selon tes préférences.'],
    });
    if (saved && onToggleFavoriteRecipe && !favoriteIds.includes(saved.id)) {
      onToggleFavoriteRecipe(saved.id);
    }
    setCustomTitle('');
    setCustomDraftItems([]);
    setDrawerTab('recipes');
    triggerToast('Recette créée & ajoutée aux favoris');
  };

  const kcalPct = Math.min(100, Math.round((dayTotals.kcal / Math.max(1, targets.kcal)) * 100));

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium shadow-lg flex items-center gap-1.5 animate-slide-up">
          <Check className="w-3.5 h-3.5" />
          {toastMsg}
        </div>
      )}

      {/* 1. NAVIGATION DATE + ACCÈS RAPIDE EXCLUSIONS ALIMENTAIRES */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="inline-flex items-center gap-0.5 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => onChangeDate(shiftDateString(selectedDate, -1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <label className="relative px-2.5 py-1 cursor-pointer text-xs font-medium text-[var(--text-primary)]">
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
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWeeklyPlannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] transition-colors"
            title="Générer la semaine à partir de quelques ingrédients"
          >
            <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
            <span>Semaine</span>
          </button>

          <button
            type="button"
            onClick={() => setExclusionsModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              dislikedIds.length > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Gérer les ingrédients que tu ne manges pas"
          >
            <Ban className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Exclus</span>
            {dislikedIds.length > 0 && <span>({dislikedIds.length})</span>}
          </button>

          <button
            type="button"
            onClick={handleSendFullDayToShopping}
            disabled={dayTotals.kcal === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] disabled:opacity-35 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] transition-colors"
            title={tr(lang, 'to_shopping')}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Bandeau discret de navigation sur la semaine planifiée (affiché uniquement quand >= 2 jours sont planifiés) */}
      {upcomingWeekStrip && (
        <div className="grid grid-cols-7 gap-1.5">
          {upcomingWeekStrip.map((wd) => {
            const isSel = wd.dateStr === selectedDate;
            return (
              <button
                key={wd.dateStr}
                type="button"
                onClick={() => onChangeDate(wd.dateStr)}
                className={`py-1.5 rounded-lg border text-center transition-colors ${
                  isSel
                    ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-app)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="block text-[10px] capitalize opacity-75">
                  {wd.dayShort.replace('.', '')}
                </span>
                <span className="block text-xs font-semibold tabular-nums leading-tight">
                  {wd.dayNum}
                </span>
                <span
                  className={`mx-auto mt-0.5 block w-1 h-1 rounded-full ${
                    wd.hasMeals
                      ? isSel
                        ? 'bg-[var(--bg-app)]'
                        : 'bg-[var(--accent)]'
                      : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

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

        {dayTotals.kcal === 0 && (
          <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setWeeklyPlannerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:underline"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Générer ma semaine selon mes ingrédients
            </button>

            {onCopyPreviousDayMeals && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await onCopyPreviousDayMeals(selectedDate);
                  triggerToast(ok ? 'Repas de la veille dupliqués' : 'Aucun repas enregistré la veille');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Copy className="w-3.5 h-3.5" />
                Dupliquer la veille
              </button>
            )}
          </div>
        )}
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
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
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
                        acc.carbs += m.carbs;
                        acc.fat += m.fat;
                        return acc;
                      },
                      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
                    );

                    const isExpandedEntry = expandedEntryId === entry.entryId;

                    return (
                      <div
                        key={entry.entryId}
                        className="rounded-2xl bg-[var(--bg-subtle)]/55 border border-[var(--border-subtle)] p-4 space-y-3 transition-colors"
                      >
                        <div
                          onClick={() =>
                            setExpandedEntryId(isExpandedEntry ? null : entry.entryId)
                          }
                          className="flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {entry.title}
                            </h4>
                            <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                              <strong className="text-[var(--text-primary)]">
                                {Math.round(entryTotals.kcal)} kcal
                              </strong>{' '}
                              · {Math.round(entryTotals.protein)}g P · {Math.round(entryTotals.carbs)}g G ·{' '}
                              {Math.round(entryTotals.fat)}g L
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-[var(--text-muted)] font-medium">
                              {isExpandedEntry ? 'Fermer' : 'Modifier'}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                                isExpandedEntry ? 'rotate-180 text-emerald-400' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {isExpandedEntry && (
                          <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)] animate-fade-in">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setAppendTargetEntry({
                                    slotId: slot.id,
                                    entryId: entry.entryId,
                                    title: entry.title,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs font-bold text-emerald-400"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Ajouter un ingrédient
                              </button>

                              <div className="flex items-center gap-1.5">
                                {entry.items?.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEntryAsCustomRecipe(entry)}
                                    className="p-2 rounded-xl bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
                                    title="Sauvegarder comme recette perso"
                                  >
                                    <BookmarkPlus className="w-4 h-4" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMealEntry(slot.id, entry.entryId)}
                                  className="p-2 rounded-xl bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                                  title="Supprimer ce plat"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {(entry.items || []).map((it, idx) => {
                                const food = getFoodById(it.foodId);
                                if (!food) return null;

                                return (
                                  <div
                                    key={`${it.foodId}_${idx}`}
                                    className="flex items-center justify-between gap-2 text-xs py-1 px-2.5 rounded-xl bg-[var(--bg-app)]/55"
                                  >
                                    <div className="min-w-0 flex-1 truncate">
                                      <span className="font-medium text-[var(--text-primary)]">
                                        {food.name}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <div className="inline-flex items-center bg-[var(--bg-subtle)] rounded-lg px-2 py-1 border border-[var(--border-subtle)]">
                                        <input
                                          type="number"
                                          min="1"
                                          max="1500"
                                          value={it.grams}
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) =>
                                            handleUpdateIngredientGrams(
                                              slot.id,
                                              entry.entryId,
                                              idx,
                                              e.target.value
                                            )
                                          }
                                          className="w-12 bg-transparent text-right text-xs font-bold font-mono text-[var(--text-primary)] focus:outline-none"
                                        />
                                        <span className="text-[10px] text-[var(--text-muted)] ml-0.5">
                                          g
                                        </span>
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
                                        title="Remplacer par un équivalent"
                                      >
                                        <ArrowLeftRight className="w-3.5 h-3.5" />
                                      </button>

                                      {entry.items.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveSingleItemFromEntry(
                                              slot.id,
                                              entry.entryId,
                                              idx
                                            )
                                          }
                                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400"
                                          title="Retirer cet ingrédient"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* MODALE 1 : AJOUTER UN REPAS / ALIMENT UNIVERSEL / CRÉER RECETTE     */}
      {/* =================================================================== */}
      {drawerMealSlot && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-xl max-h-[90vh] card-elevated rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {MEAL_SLOTS.find((s) => s.id === drawerMealSlot)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setDrawerMealSlot(null)}
                className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] shrink-0">
              <div className="grid grid-cols-3 seg-control">
                {[
                  { id: 'recipes', label: `Recettes (${allRecipes.length})` },
                  { id: 'foods', label: 'Ingrédients' },
                  { id: 'create_recipe', label: 'Créer recette' },
                ].map((t) => {
                  const active = drawerTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDrawerTab(t.id)}
                      className={`py-1.5 px-2 seg-item ${
                        active ? 'seg-item-active' : ''
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ONGLET A : RECETTES DYNAMIQUES (FAVORIS + AUTO-ADAPTATION AUX EXCLUSIONS) */}
            {drawerTab === 'recipes' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      placeholder="Rechercher une recette ou un ingrédient..."
                      className="input-dark !pl-9 !py-2 text-xs"
                    />
                  </div>

                  <div className="inline-flex items-center gap-0.5 seg-control shrink-0">
                    {[0.5, 1, 1.5, 2].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPortionMult(m)}
                        className={`px-2 py-1 !text-[11px] tabular-nums seg-item ${
                          portionMult === m ? 'seg-item-active' : ''
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Barre de filtres Favoris & Exclusions sans surcharge */}
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOnlyFavorites((v) => !v)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
                        onlyFavorites
                          ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-semibold'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <Heart
                        className={`w-3 h-3 ${onlyFavorites ? 'fill-current text-amber-400' : ''}`}
                      />
                      Favoris ({favoriteIds.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setExclusionsModalOpen(true)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
                        dislikedIds.length > 0
                          ? 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <Ban className="w-3 h-3" />
                      Exclure ingrédient{dislikedIds.length > 0 ? ` (${dislikedIds.length})` : ''}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setExclusionMode((m) => (m === 'adapt' ? 'hide' : 'adapt'))
                    }
                    className="text-[11px] text-emerald-400 font-medium whitespace-nowrap underline"
                  >
                    {exclusionMode === 'adapt' ? 'Mode : Auto-adapter' : 'Mode : Masquer'}
                  </button>
                </div>

                {preparedRecipes.length === 0 ? (
                  <p className="text-center py-8 text-xs text-[var(--text-muted)]">
                    Aucune recette trouvée avec ces filtres.
                  </p>
                ) : (
                  preparedRecipes.map((rec) => {
                    const macros = computeRecipeMacros(rec, portionMult);
                    const detailsOpen = expandedRecipeId === rec.id;

                    return (
                      <div
                        key={rec.id}
                        className="rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] p-4 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] flex-wrap">
                              <span className="text-emerald-400 font-medium">{rec.goalTag}</span>
                              <span>·</span>
                              <span>{rec.prepMinutes} min</span>
                              {(rec.hasAutoSwaps || rec.hasManualOverride) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-400/15 text-emerald-400 text-[10px] font-semibold">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  {rec.hasManualOverride ? 'Personnalisée' : 'Adaptée à tes goûts'}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                              {rec.title}
                            </h4>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 tabular-nums">
                              <strong className="text-[var(--text-primary)]">
                                {macros.kcal} kcal
                              </strong>{' '}
                              · {macros.protein}g P · {macros.carbs}g G · {macros.fat}g L
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {onToggleFavoriteRecipe && (
                              <button
                                type="button"
                                onClick={() => onToggleFavoriteRecipe(rec.id)}
                                className={`p-2 rounded-full transition-colors ${
                                  rec.isFavorite
                                    ? 'text-amber-400 bg-amber-400/15'
                                    : 'text-[var(--text-muted)] hover:text-amber-400'
                                }`}
                                title={
                                  rec.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'
                                }
                              >
                                <Heart
                                  className={`w-4 h-4 ${rec.isFavorite ? 'fill-current' : ''}`}
                                />
                              </button>
                            )}

                            {rec.isCustom && (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const url = encodeShareUrl('recipe', {
                                      title: rec.title,
                                      mealTypes: rec.mealTypes,
                                      prepMinutes: rec.prepMinutes,
                                      goalTag: rec.goalTag,
                                      ingredients: rec.ingredients,
                                      steps: rec.steps,
                                    });
                                    const res = await triggerNativeOrClipboardShare(rec.title, url);
                                    if (res === 'copied') triggerToast('Lien recette copié');
                                  }}
                                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                  title="Partager cette recette"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteCustomRecipe(rec.id)}
                                  className="p-2 text-[var(--text-muted)] hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAddRecipeToMeal(rec)}
                              className="btn-primary !py-1.5 !px-3.5 !text-xs"
                            >
                              {tr(lang, 'add')}
                            </button>
                          </div>
                        </div>

                        {rec.hasAutoSwaps && (
                          <p className="text-[11px] text-emerald-400/90">
                            Remplacement auto :{' '}
                            {rec.swapsMade
                              .map((s) => `${s.swappedFrom} → ${s.swappedTo}`)
                              .join(', ')}
                          </p>
                        )}

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
                            {detailsOpen ? 'Masquer' : 'Détails'}
                          </button>
                        </div>

                        {detailsOpen && (
                          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="section-eyebrow">
                                Ingrédients modifiables en direct
                              </span>
                              {rec.hasManualOverride && onSaveRecipeOverride && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveRecipeOverride(rec.id, null);
                                    triggerToast('Recette originale rétablie');
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-emerald-400"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Rétablir l’originale
                                </button>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              {(rec.ingredients || []).map((ing, idx) => {
                                const f = getFoodById(ing.foodId);
                                if (!f) return null;
                                return (
                                  <div
                                    key={`${ing.foodId}_${idx}`}
                                    className="flex items-center justify-between gap-2 text-xs py-1 px-2.5 rounded-xl bg-[var(--bg-app)]/50"
                                  >
                                    <span className="text-[var(--text-primary)] truncate">
                                      <strong className="font-mono">
                                        {Math.round(ing.grams * portionMult)}g
                                      </strong>{' '}
                                      {f.name}
                                    </span>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSwapIngredientInCatalogRecipe(rec, idx, ing)
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] font-semibold text-emerald-400"
                                        title="Changer cet aliment dans la recette"
                                      >
                                        <ArrowLeftRight className="w-3 h-3" />
                                        Changer
                                      </button>

                                      {onToggleDislikedFood && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onToggleDislikedFood(f.id);
                                            triggerToast(`${f.name} exclu et remplacé !`);
                                          }}
                                          className="p-1 text-[var(--text-muted)] hover:text-rose-400"
                                          title="Exclure définitivement cet ingrédient"
                                        >
                                          <Ban className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {rec.steps && (
                              <ol className="pt-2 border-t border-[var(--border-subtle)] space-y-1 text-xs text-[var(--text-secondary)] list-decimal list-inside">
                                {rec.steps.map((st, idx) => (
                                  <li key={idx}>{st}</li>
                                ))}
                              </ol>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ONGLET B : PANEL INTÉGRAL D'INGRÉDIENTS + 4 RECETTES PAR ALIMENT */}
            {drawerTab === 'foods' && (
              <div className="flex-1 overflow-y-auto p-4">
                <SmartFoodPicker
                  profile={profile}
                  customRecipes={customRecipes}
                  lang={lang}
                  onSelectFoodWithGrams={handleAddSingleFoodToSlot}
                  onSelectRecipeSuggestion={handleAddRecipeToMeal}
                  onCacheExternalFood={onCacheExternalFood}
                  onToggleDislikedFood={onToggleDislikedFood}
                  actionLabel="Ajouter seul"
                />
              </div>
            )}

            {/* ONGLET C : CRÉATION DE RECETTE AVEC AUTO-DÉTECTION UNIVERSELLE DES MACROS */}
            {drawerTab === 'create_recipe' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      Nom de ta recette
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Ex: Saumon grillé au citron"
                      className="input-dark !py-2 text-xs"
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
                      className="input-dark !py-2 text-xs tabular-nums"
                    />
                  </div>
                </div>

                {/* Liste des ingrédients ajoutés + calcul automatique des macros totales en direct */}
                {customDraftItems.length > 0 && (
                  <div className="rounded-2xl bg-emerald-400/10 border border-emerald-400/25 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Macros calculées ({customDraftItems.length} ingr.)
                      </span>
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {draftRecipeTotals.kcal} kcal · {draftRecipeTotals.protein}g P ·{' '}
                        {draftRecipeTotals.carbs}g G · {draftRecipeTotals.fat}g L
                      </span>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-emerald-400/20">
                      {customDraftItems.map((it, idx) => {
                        const f = getFoodById(it.foodId);
                        const m = calculateFoodMacros(it.foodId, it.grams);
                        return (
                          <div
                            key={`${it.foodId}_${idx}`}
                            className="flex items-center justify-between text-xs py-0.5"
                          >
                            <span className="text-[var(--text-primary)] truncate">
                              <strong>{it.grams}g</strong> {f?.name}{' '}
                              <span className="text-[10.5px] text-[var(--text-muted)]">
                                ({m.kcal} kcal)
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomDraftItems((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="text-[var(--text-muted)] hover:text-rose-400 ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={!customTitle.trim()}
                      onClick={handleCreateCustomRecipeSubmit}
                      className="btn-accent w-full !py-2.5 !text-xs mt-1"
                    >
                      <Check className="w-4 h-4" />
                      Enregistrer la recette ({draftRecipeTotals.kcal} kcal)
                    </button>
                  </div>
                )}

                <div className="pt-1 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                    Ajouter n’importe quel ingrédient (détection auto des macros) :
                  </p>
                  <SmartFoodPicker
                    profile={profile}
                    lang={lang}
                    compact
                    onSelectFoodWithGrams={(foodObj, cleanGrams) => {
                      setCustomDraftItems((prev) => {
                        const exists = prev.findIndex((x) => x.foodId === foodObj.id);
                        if (exists >= 0) {
                          return prev.map((x, idx) =>
                            idx === exists ? { ...x, grams: x.grams + cleanGrams } : x
                          );
                        }
                        return [...prev, { foodId: foodObj.id, grams: cleanGrams }];
                      });
                      triggerToast(`+${cleanGrams}g ${foodObj.name}`);
                    }}
                    onCacheExternalFood={onCacheExternalFood}
                    actionLabel="Intégrer à la recette"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALE 2 : INTÉGRER UN INGRÉDIENT DANS UN PLAT EXISTANT             */}
      {/* =================================================================== */}
      {appendTargetEntry && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-xl max-h-[86vh] card-elevated rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  Ajouter dans « {appendTargetEntry.title} »
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Les calories et macros du plat se mettront à jour automatiquement
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAppendTargetEntry(null)}
                className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <SmartFoodPicker
                profile={profile}
                lang={lang}
                onSelectFoodWithGrams={handleAppendIngredientInsideEntry}
                onCacheExternalFood={onCacheExternalFood}
                actionLabel="Intégrer au plat"
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALE 3 : MÉMOIRE PROFIL — INGRÉDIENTS EXCLUS ("JE NE MANGE PAS")   */}
      {/* =================================================================== */}
      {exclusionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md max-h-[85vh] card-elevated rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Ingrédients que je ne mange pas
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Mémorisé sur ton profil · Les recettes s’adaptent toutes seules
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExclusionsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {/* Recherche rapide d'ingrédient à exclure */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={exclusionQuery}
                    onChange={(e) => setExclusionQuery(e.target.value)}
                    placeholder="Exclure un aliment (ex: brocoli, coriandre, thon...)"
                    className="input-dark !pl-9 !py-2 text-xs"
                  />
                </div>

                {exclusionSearchMatches.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-2xl bg-[var(--bg-subtle)] p-1.5 space-y-1">
                    {exclusionSearchMatches.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (onToggleDislikedFood) onToggleDislikedFood(f.id);
                          setExclusionQuery('');
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-xl text-xs hover:bg-[var(--bg-app)] flex items-center justify-between text-[var(--text-primary)]"
                      >
                        <span>{f.name}</span>
                        <span className="text-[11px] text-rose-400 font-medium">+ Exclure</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Aliments actuellement exclus */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)]">
                  Mes exclusions actives ({dislikedIds.length})
                </p>
                {dislikedIds.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-2">
                    Aucun ingrédient exclu pour le moment.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {dislikedIds.map((id) => {
                      const f = getFoodById(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onToggleDislikedFood && onToggleDislikedFood(id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/35 text-xs font-medium text-rose-400"
                        >
                          <span>{f?.name || id}</span>
                          <X className="w-3 h-3" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Suggestions fréquentes en 1 tap */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <p className="text-[11px] text-[var(--text-muted)]">
                  Exclusions fréquentes en 1 clic :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_EXCLUSION_SUGGESTIONS.filter((id) => !dislikedIds.includes(id)).map(
                    (id) => {
                      const f = getFoodById(id);
                      if (!f) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onToggleDislikedFood && onToggleDislikedFood(id)}
                          className="px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] hover:text-rose-400 transition-colors"
                        >
                          + {f.name}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExclusionsModalOpen(false)}
                className="btn-primary w-full !py-2.5 !text-xs"
              >
                Appliquer à mes recettes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 4 : GÉNÉRATEUR DE SEMAINE & CALCUL DES INGRÉDIENTS MANQUANTS */}
      <WeeklyPlannerModal
        isOpen={weeklyPlannerOpen}
        onClose={() => setWeeklyPlannerOpen(false)}
        startDateStr={selectedDate}
        lang={lang}
        profile={profile}
        customRecipes={customRecipes}
        onCacheExternalFood={onCacheExternalFood}
        onApplyPlanToJournalAndShopping={async (plan, missingToBuy) => {
          if (onApplyWeeklyPlan) {
            await onApplyWeeklyPlan(plan, missingToBuy);
            triggerToast(
              `Semaine planifiée (${plan.days.length}j) · ${missingToBuy.length} manquant(s) aux courses`
            );
          }
        }}
        onSendMissingOnlyToShopping={async (missingToBuy) => {
          if (missingToBuy.length > 0) {
            await onSendItemsToShoppingList(
              missingToBuy.map((it) => ({
                foodId: it.foodId,
                grams: it.totalGrams,
              }))
            );
            triggerToast(`${missingToBuy.length} ingrédient(s) manquant(s) ajoutés aux courses`);
          }
        }}
      />
    </div>
  );
}
