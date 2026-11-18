import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ProfileModal from './components/ProfileModal';
import SubstitutionModal from './components/SubstitutionModal';
import CloudVaultModal from './components/CloudVaultModal';
import DashboardTab from './components/DashboardTab';
import WorkoutsTab from './components/WorkoutsTab';
import ActiveWorkoutPlayer from './components/ActiveWorkoutPlayer';
import NutritionTab, { computeDayTotals } from './components/NutritionTab';
import ShoppingListTab from './components/ShoppingListTab';
import CoachChatTab from './components/CoachChatTab';

import {
  DEFAULT_PROFILE,
  getTodayDateString,
  loadProfile,
  saveProfile,
  loadHydrationForDate,
  saveHydrationForDate,
  loadTheme,
  saveTheme,
  loadLanguage,
  saveLanguage,
  loadActiveWorkoutSession,
  saveActiveWorkoutSession,
  getAllWorkoutHistory,
  addWorkoutHistoryEntry,
  deleteWorkoutHistoryEntry,
  getNutritionLogByDate,
  getAllNutritionLogs,
  saveNutritionLog,
  createEmptyDayNutrition,
  getShoppingList,
  saveShoppingItem,
  replaceAllShoppingItems,
  deleteShoppingItem,
  getCustomRecipes,
  saveCustomRecipe,
  deleteCustomRecipe,
  getCustomWorkouts,
  saveCustomWorkout,
  deleteCustomWorkout,
  loadCoachMessagesSync,
  saveCoachMessagesSync,
  getCoachMessages,
  addCoachMessage,
  clearCoachMessages,
  getBodyMetricsHistory,
  saveBodyMetricEntry,
  getAllCachedFoods,
  saveCachedFood,
  exportFullBackupData,
  importFullBackupData,
  clearWorkingStoresOnLock,
} from './db/database';

import { getFoodById, registerExternalFoods } from './data/foodDatabase';
import { buildActiveWorkoutExercises } from './data/workoutsData';
import { warmUpCoachEngine } from './utils/localCoachEngine';
import { decodeShareHash } from './utils/shareCodec';
import {
  restoreUnlockedSession,
  clearUnlockedSession,
  syncPushAccountToCloud,
  syncPullAccountFromCloud,
} from './utils/cryptoVaultService';

// Pré-chargement immédiat de l'IA Scientifique dès l'évaluation du bundle au lancement du site (0 ms)
warmUpCoachEngine();

export default function App() {
  const todayStr = getTodayDateString(0);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => loadTheme());
  const [lang, setLang] = useState(() => loadLanguage());

  // Session compte Cloud chiffré multi-appareils
  const [activeAccount, setActiveAccount] = useState(null);
  const suppressNextAutoPushRef = useRef(false);

  const [profile, setProfile] = useState(() => loadProfile());
  const [profileModalOpen, setProfileModalOpen] = useState(
    () => !loadProfile().onboardingCompleted
  );
  const [cloudVaultOpen, setCloudVaultOpen] = useState(false);
  const [waterMl, setWaterMl] = useState(() => loadHydrationForDate(todayStr));

  const [activeWorkoutSession, setActiveWorkoutSession] = useState(() =>
    loadActiveWorkoutSession()
  );
  const [workoutPlayerOpen, setWorkoutPlayerOpen] = useState(false);

  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [todayDayLog, setTodayDayLog] = useState(() =>
    createEmptyDayNutrition(todayStr)
  );
  const [selectedDayLog, setSelectedDayLog] = useState(() =>
    createEmptyDayNutrition(todayStr)
  );
  const [shoppingItems, setShoppingItems] = useState([]);
  const [customRecipes, setCustomRecipes] = useState([]);
  const [customWorkouts, setCustomWorkouts] = useState([]);
  // Initialisation synchrone garantie dès la milliseconde 0 pour le Coach IA
  const [coachMessages, setCoachMessages] = useState(() => loadCoachMessagesSync());
  const [bodyMetrics, setBodyMetrics] = useState([]);
  const [allNutritionLogs, setAllNutritionLogs] = useState([]);

  const [subModalState, setSubModalState] = useState({
    isOpen: false,
    sourceFoodId: null,
    initialGrams: 100,
    contextLabel: '',
    onConfirmSwap: null,
  });

  const [installPromptEvent, setInstallPromptEvent] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-amoled', 'theme-light', 'dark');
    let metaColor = '#111214';
    if (theme === 'amoled') {
      root.classList.add('dark', 'theme-amoled');
      metaColor = '#000000';
    } else if (theme === 'light') {
      root.classList.add('theme-light');
      metaColor = '#f6f5f2';
    } else {
      root.classList.add('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', metaColor);
    saveTheme(theme);
  }, [theme]);

  const handleChangeLang = (nextLang) => {
    setLang(nextLang);
    saveLanguage(nextLang);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Détection automatique d'un lien de partage hors-ligne (#share=...) pour importer une séance ou recette
  useEffect(() => {
    const checkHashImport = async () => {
      if (typeof window === 'undefined' || !window.location.hash.includes('#share=')) {
        return;
      }
      const shared = decodeShareHash(window.location.hash);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (!shared) return;
      if (shared.type === 'workout' && shared.data?.title) {
        await saveCustomWorkout(shared.data);
        setCustomWorkouts(await getCustomWorkouts());
        setActiveTab('workouts');
      } else if (shared.type === 'recipe' && shared.data?.title) {
        await saveCustomRecipe(shared.data);
        setCustomRecipes(await getCustomRecipes());
        setActiveTab('nutrition');
      }
    };
    checkHashImport();
    window.addEventListener('hashchange', checkHashImport);
    return () => window.removeEventListener('hashchange', checkHashImport);
  }, []);

  const reloadAllFromIndexedDB = useCallback(async () => {
    try {
      const [
        cachedExtFoods,
        wkHist,
        tLog,
        selLog,
        allNLogs,
        shop,
        cRecs,
        cWks,
        cMsgs,
        metrics,
      ] = await Promise.all([
        getAllCachedFoods(),
        getAllWorkoutHistory(),
        getNutritionLogByDate(todayStr),
        getNutritionLogByDate(selectedDate),
        getAllNutritionLogs(),
        getShoppingList(),
        getCustomRecipes(),
        getCustomWorkouts(),
        getCoachMessages(),
        getBodyMetricsHistory(),
      ]);

      registerExternalFoods(cachedExtFoods);
      setWorkoutHistory(wkHist);
      setTodayDayLog(tLog);
      setSelectedDayLog(selLog);
      setAllNutritionLogs(allNLogs);
      setShoppingItems(shop);
      setCustomRecipes(cRecs);
      setCustomWorkouts(cWks);
      setCoachMessages((prev) => {
        const map = new Map();
        (cMsgs || []).forEach((m) => {
          if (m?.id) map.set(m.id, m);
        });
        prev.forEach((m) => {
          if (m?.id) map.set(m.id, m);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
        );
        saveCoachMessagesSync(merged);
        return merged;
      });
      setBodyMetrics(metrics);
    } catch (err) {
      console.error('Erreur chargement IndexedDB :', err);
    }
  }, [todayStr, selectedDate]);

  useEffect(() => {
    reloadAllFromIndexedDB();
  }, [reloadAllFromIndexedDB]);

  const handleImportJson = useCallback(
    async (parsedData) => {
      suppressNextAutoPushRef.current = true;
      await importFullBackupData(parsedData);
      const loadedProf = loadProfile();
      setProfile(loadedProf);
      if (loadedProf.onboardingCompleted) {
        setProfileModalOpen(false);
      }
      setTheme(loadTheme());
      setLang(loadLanguage());
      setWaterMl(loadHydrationForDate(todayStr));
      setCoachMessages(loadCoachMessagesSync());
      await reloadAllFromIndexedDB();
      setTimeout(() => {
        suppressNextAutoPushRef.current = false;
      }, 2200);
    },
    [todayStr, reloadAllFromIndexedDB]
  );

  // Restauration automatique de la session Cloud au lancement + synchronisation entrante silencieuse
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await restoreUnlockedSession();
      if (!restored || cancelled) return;
      setActiveAccount(restored);
      setProfileModalOpen(false);

      try {
        const cloudPayload = await syncPullAccountFromCloud(restored);
        if (cloudPayload && !cancelled) {
          const localUpdatedMs = new Date(loadProfile().updatedAt || 0).getTime() || 0;
          const cloudUpdatedMs =
            Number(cloudPayload.updatedAtMs) ||
            new Date(cloudPayload.exportedAt || 0).getTime() ||
            0;
          if (cloudUpdatedMs >= localUpdatedMs) {
            await handleImportJson(cloudPayload);
          }
        }
      } catch {
        // Mode hors-ligne transparent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handleImportJson]);

  // Synchronisation automatique vers les 5 serveurs Cloud dès qu'une donnée évolue
  useEffect(() => {
    if (!activeAccount?.aesKey || !activeAccount?.username) return undefined;
    if (suppressNextAutoPushRef.current) return undefined;

    const timer = setTimeout(async () => {
      try {
        const snapshot = await exportFullBackupData();
        await syncPushAccountToCloud(activeAccount, snapshot);
      } catch {
        // Ignore hors-ligne : sera synchronisé à la prochaine modification connectée
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, [
    activeAccount,
    profile,
    waterMl,
    workoutHistory,
    todayDayLog,
    selectedDayLog,
    shoppingItems,
    customRecipes,
    customWorkouts,
    coachMessages,
    bodyMetrics,
  ]);

  const handleAccountLockedOut = async () => {
    if (activeAccount?.aesKey) {
      try {
        const snapshot = await exportFullBackupData();
        await syncPushAccountToCloud(activeAccount, snapshot);
      } catch {
        // Ignore
      }
    }
    clearUnlockedSession();
    setActiveAccount(null);
    await clearWorkingStoresOnLock().catch(() => {});
    setProfile({ ...DEFAULT_PROFILE });
    setWaterMl(0);
    setCoachMessages([]);
    setActiveWorkoutSession(null);
    await reloadAllFromIndexedDB();
  };

  const handleCacheExternalFood = async (foodObj) => {
    if (!foodObj?.id) return;
    registerExternalFoods([foodObj]);
    await saveCachedFood(foodObj);
  };

  const handleChangeSelectedDate = async (nextDate) => {
    setSelectedDate(nextDate);
    const log = await getNutritionLogByDate(nextDate);
    setSelectedDayLog(log);
  };

  const handleSaveDayLog = async (updatedLog) => {
    const saved = await saveNutritionLog(updatedLog);
    setSelectedDayLog(saved);
    if (saved.date === todayStr) {
      setTodayDayLog(saved);
    }
    setAllNutritionLogs(await getAllNutritionLogs());
  };

  const todayMacros = useMemo(() => computeDayTotals(todayDayLog), [todayDayLog]);

  const handleSaveProfile = async (nextProfile) => {
    const saved = saveProfile(nextProfile);
    setProfile(saved);
    if (saved.weight) {
      await saveBodyMetricEntry({ date: todayStr, weightKg: saved.weight });
      setBodyMetrics(await getBodyMetricsHistory());
    }
  };

  const handleLogWeightQuick = async (weightVal) => {
    const updatedProf = saveProfile({ ...profile, weight: weightVal });
    setProfile(updatedProf);
    await saveBodyMetricEntry({ date: todayStr, weightKg: weightVal });
    setBodyMetrics(await getBodyMetricsHistory());
  };

  const handleUpdateWater = (nextMl) => {
    const clean = saveHydrationForDate(todayStr, nextMl);
    setWaterMl(clean);
  };

  const handleToggleDislikedFood = useCallback((foodId) => {
    if (!foodId) return;
    setProfile((prev) => {
      const list = Array.isArray(prev.dislikedFoodIds) ? prev.dislikedFoodIds : [];
      const nextList = list.includes(foodId)
        ? list.filter((id) => id !== foodId)
        : [...list, foodId];
      return saveProfile({ ...prev, dislikedFoodIds: nextList });
    });
  }, []);

  const handleToggleFavoriteRecipe = useCallback((recipeId) => {
    if (!recipeId) return;
    setProfile((prev) => {
      const list = Array.isArray(prev.favoriteRecipeIds) ? prev.favoriteRecipeIds : [];
      const nextList = list.includes(recipeId)
        ? list.filter((id) => id !== recipeId)
        : [...list, recipeId];
      return saveProfile({ ...prev, favoriteRecipeIds: nextList });
    });
  }, []);

  const handleUpdatePreferredEquipment = useCallback((nextEqList) => {
    setProfile((prev) =>
      saveProfile({
        ...prev,
        preferredEquipment: Array.isArray(nextEqList) ? nextEqList : [],
      })
    );
  }, []);

  const handleSaveRecipeOverride = useCallback((recipeId, overrideData) => {
    if (!recipeId) return;
    setProfile((prev) => {
      const currentMap =
        prev.recipeOverrides && typeof prev.recipeOverrides === 'object'
          ? { ...prev.recipeOverrides }
          : {};
      if (!overrideData) {
        delete currentMap[recipeId];
      } else {
        currentMap[recipeId] = overrideData;
      }
      return saveProfile({
        ...prev,
        recipeOverrides: currentMap,
      });
    });
  }, []);

  const handleCopyPreviousDayMeals = useCallback(
    async (targetDateStr) => {
      const d = new Date(targetDateStr + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      const prevDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const prevLog = await getNutritionLogByDate(prevDateStr);
      const hasEntries = Object.values(prevLog?.meals || {}).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      );
      if (!hasEntries) return false;

      const clonedMeals = {};
      Object.entries(prevLog.meals).forEach(([slotKey, list]) => {
        clonedMeals[slotKey] = (list || []).map((entry, idx) => ({
          ...entry,
          entryId: `meal_${Date.now()}_${slotKey}_${idx}`,
        }));
      });

      await handleSaveDayLog({
        date: targetDateStr,
        meals: clonedMeals,
      });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayStr]
  );

  const handleApplyWeeklyPlan = async (plan, missingItemsToBuy = []) => {
    if (!plan?.days?.length) return;
    for (const day of plan.days) {
      const formattedMeals = {
        breakfast: [],
        lunch: [],
        snack: [],
        dinner: [],
      };
      Object.entries(day.meals || {}).forEach(([slotId, meal], idx) => {
        if (!meal?.items?.length || !formattedMeals[slotId]) return;
        formattedMeals[slotId].push({
          entryId: `meal_${Date.now()}_${day.dayIndex}_${slotId}_${idx}`,
          recipeId: meal.recipeId || null,
          title: meal.title,
          isRecipe: true,
          portionMultiplier: meal.portionMultiplier || 1,
          items: meal.items.map((it) => ({
            foodId: it.foodId,
            grams: it.grams,
          })),
        });
      });

      const dayRecord = {
        date: day.dateStr,
        meals: formattedMeals,
      };
      await saveNutritionLog(dayRecord);
      if (day.dateStr === todayStr) {
        setTodayDayLog(dayRecord);
      }
      if (day.dateStr === selectedDate) {
        setSelectedDayLog(dayRecord);
      }
    }

    if (missingItemsToBuy.length > 0) {
      await mergeItemsIntoShoppingList(
        missingItemsToBuy.map((it) => ({
          foodId: it.foodId,
          grams: it.totalGrams,
        }))
      );
    }
    setAllNutritionLogs(await getAllNutritionLogs());
  };

  const handleStartWorkout = (workout, intensityMode = 'normal') => {
    const rawPrepared = buildActiveWorkoutExercises(workout, intensityMode);
    // Pré-remplit automatiquement les charges de la dernière séance + historique PR !
    const preparedExercises = rawPrepared.map((ex) => {
      let lastWeight = null;
      let lastReps = null;
      let bestPast1RM = 0;

      for (const pastWk of workoutHistory || []) {
        const matchEx = (pastWk.exercises || []).find(
          (pe) => pe.id === ex.id || pe.name === ex.name
        );
        if (matchEx && Array.isArray(matchEx.setRows)) {
          const doneSets = matchEx.setRows.filter((s) => s.completed);
          if (doneSets.length > 0 && lastWeight === null) {
            lastWeight = doneSets[0].weightKg;
            lastReps = doneSets[0].reps;
          }
          doneSets.forEach((s) => {
            if (Number(s.weightKg) > 0 && Number(s.reps) > 0) {
              const est = Number(s.weightKg) * (1 + Number(s.reps) / 30);
              if (est > bestPast1RM) bestPast1RM = est;
            }
          });
        }
      }

      const shouldPrefillWeight =
        ex.type === 'reps' && Number(lastWeight) > 0;

      return {
        ...ex,
        bestPast1RM: Math.round(bestPast1RM * 10) / 10,
        lastPerfLabel:
          shouldPrefillWeight && lastReps
            ? `${lastWeight}kg×${lastReps}`
            : null,
        setRows: shouldPrefillWeight
          ? ex.setRows.map((row) => ({ ...row, weightKg: Number(lastWeight) }))
          : ex.setRows,
      };
    });
    const session = {
      sessionId: `sess_${Date.now()}`,
      programId: workout.programId || 'custom',
      workoutId: workout.id,
      workoutTitle: workout.title,
      intensityMode,
      exercises: preparedExercises,
      currentExIdx: 0,
      elapsedSec: 0,
      startedAt: new Date().toISOString(),
    };
    setActiveWorkoutSession(session);
    saveActiveWorkoutSession(session);
    setWorkoutPlayerOpen(true);
  };

  const handlePersistActiveSession = useCallback((updatedSession) => {
    setActiveWorkoutSession(updatedSession);
    saveActiveWorkoutSession(updatedSession);
  }, []);

  const handleCancelWorkoutSession = () => {
    setActiveWorkoutSession(null);
    saveActiveWorkoutSession(null);
    setWorkoutPlayerOpen(false);
  };

  const handleCompleteWorkout = async (summaryRecord) => {
    await addWorkoutHistoryEntry(summaryRecord);
    setActiveWorkoutSession(null);
    saveActiveWorkoutSession(null);
    setWorkoutPlayerOpen(false);
    setWorkoutHistory(await getAllWorkoutHistory());
  };

  const handleCreateCustomWorkout = async (wkPayload) => {
    await saveCustomWorkout(wkPayload);
    setCustomWorkouts(await getCustomWorkouts());
  };

  const handleDeleteCustomWorkout = async (id) => {
    await deleteCustomWorkout(id);
    setCustomWorkouts(await getCustomWorkouts());
  };

  const handleDeleteWorkoutHistory = async (id) => {
    await deleteWorkoutHistoryEntry(id);
    setWorkoutHistory(await getAllWorkoutHistory());
  };

  const mergeItemsIntoShoppingList = async (rawItems = []) => {
    if (!rawItems.length) return 0;
    const currentList = await getShoppingList();
    const updatedList = [...currentList];
    let touchedCount = 0;

    rawItems.forEach(({ foodId, grams }) => {
      const food = getFoodById(foodId);
      if (!food) return;
      const g = Math.max(5, Math.round(Number(grams) || food.defaultGrams || 100));
      const existingIdx = updatedList.findIndex(
        (item) => item.foodId === food.id && !item.checked
      );

      if (existingIdx >= 0) {
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          grams: updatedList[existingIdx].grams + g,
        };
      } else {
        updatedList.push({
          id: `shop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          foodId: food.id,
          category: food.category,
          grams: g,
          state: food.state,
          checked: false,
          isCustom: false,
          addedAt: Date.now() + touchedCount,
        });
      }
      touchedCount += 1;
    });

    await replaceAllShoppingItems(updatedList);
    setShoppingItems(await getShoppingList());
    return touchedCount;
  };

  const handleGenerateShoppingFromToday = async () => {
    const tLog = await getNutritionLogByDate(todayStr);
    const items = Object.values(tLog.meals || {})
      .flat()
      .flatMap((e) => e.items || []);
    return mergeItemsIntoShoppingList(items);
  };

  const handleGenerateShoppingFromWeek = async () => {
    const allLogs = await getAllNutritionLogs();
    const validDates = new Set();
    for (let offset = 0; offset < 7; offset++) {
      validDates.add(getTodayDateString(offset));
    }
    const weekItems = allLogs
      .filter((log) => validDates.has(log.date))
      .flatMap((log) =>
        Object.values(log.meals || {})
          .flat()
          .flatMap((e) => e.items || [])
      );
    return mergeItemsIntoShoppingList(weekItems);
  };

  const handleAddFoodToShopping = async (foodId, grams) => {
    await mergeItemsIntoShoppingList([{ foodId, grams }]);
  };

  const handleAddCustomTextShopping = async (customName, category) => {
    await saveShoppingItem({
      customName,
      category,
      checked: false,
      isCustom: true,
    });
    setShoppingItems(await getShoppingList());
  };

  const handleToggleShoppingChecked = async (id) => {
    const target = shoppingItems.find((i) => i.id === id);
    if (!target) return;
    await saveShoppingItem({ ...target, checked: !target.checked });
    setShoppingItems(await getShoppingList());
  };

  const handleUpdateShoppingGrams = async (id, grams) => {
    const target = shoppingItems.find((i) => i.id === id);
    if (!target) return;
    const safeG = Math.max(5, Math.round(Number(grams) || 5));
    await saveShoppingItem({ ...target, grams: safeG });
    setShoppingItems(await getShoppingList());
  };

  const handleSwapShoppingItem = async (itemId, newFoodId, newGrams) => {
    const newFood = getFoodById(newFoodId);
    if (!newFood) return;

    const currentList = await getShoppingList();
    const otherSameFoodIdx = currentList.findIndex(
      (i) => i.id !== itemId && i.foodId === newFoodId && !i.checked
    );

    let nextList;
    if (otherSameFoodIdx >= 0) {
      nextList = currentList
        .filter((i) => i.id !== itemId)
        .map((i, idx) =>
          idx === otherSameFoodIdx ? { ...i, grams: i.grams + newGrams } : i
        );
    } else {
      nextList = currentList.map((i) =>
        i.id === itemId
          ? {
              ...i,
              foodId: newFood.id,
              category: newFood.category,
              state: newFood.state,
              grams: newGrams,
              isCustom: false,
            }
          : i
      );
    }

    await replaceAllShoppingItems(nextList);
    setShoppingItems(await getShoppingList());
  };

  const handleDeleteShoppingItem = async (id) => {
    await deleteShoppingItem(id);
    setShoppingItems(await getShoppingList());
  };

  const handleClearCheckedShopping = async () => {
    const remaining = shoppingItems.filter((i) => !i.checked);
    await replaceAllShoppingItems(remaining);
    setShoppingItems(await getShoppingList());
  };

  const handleClearAllShopping = async () => {
    await replaceAllShoppingItems([]);
    setShoppingItems([]);
  };

  const handleSaveCustomRecipe = async (rec) => {
    const saved = await saveCustomRecipe(rec);
    setCustomRecipes(await getCustomRecipes());
    return saved;
  };

  const handleDeleteCustomRecipe = async (id) => {
    await deleteCustomRecipe(id);
    setCustomRecipes(await getCustomRecipes());
  };

  // Ajout synchrone garanti (fonctionnel React + miroir localStorage + IndexedDB asynchrone)
  const handleAppendCoachMessage = useCallback((msg) => {
    const record = {
      ...msg,
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: msg.timestamp || Date.now(),
    };

    setCoachMessages((prev) => {
      const next = [...prev.filter((m) => m.id !== record.id), record].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );
      saveCoachMessagesSync(next);
      return next;
    });

    addCoachMessage(record).catch(() => {});
    return record;
  }, []);

  const handleClearCoachHistory = async () => {
    setCoachMessages([]);
    await clearCoachMessages();
  };

  const handleLogMealFromCoach = async (mealAction) => {
    if (!mealAction?.items?.length) return;
    const hour = new Date().getHours();
    const targetSlot =
      mealAction.preferredSlot ||
      (hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : 'dinner');
    const currentDay = await getNutritionLogByDate(todayStr);
    const entry = {
      entryId: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: mealAction.title || 'Repas IA',
      isRecipe: mealAction.items.length > 1,
      items: mealAction.items,
    };
    const nextLog = {
      ...currentDay,
      date: todayStr,
      meals: {
        ...currentDay.meals,
        [targetSlot]: [...(currentDay.meals?.[targetSlot] || []), entry],
      },
    };
    await handleSaveDayLog(nextLog);
  };

  const handleExportJson = async () => {
    const backup = await exportFullBackupData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulsefit-sauvegarde-${todayStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleTriggerPwaInstall = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
  };

  const uncheckedShoppingCount = shoppingItems.filter((i) => !i.checked).length;

  return (
    <div className="min-h-screen app-surface flex flex-col">
      <Header
        profile={profile}
        activeAccount={activeAccount}
        lang={lang}
        onChangeLang={handleChangeLang}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenCloudVault={() => setCloudVaultOpen(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        theme={theme}
        onSetTheme={setTheme}
        installPromptEvent={installPromptEvent}
        onTriggerInstall={handleTriggerPwaInstall}
      />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-4 pb-24">
        {activeTab === 'dashboard' && (
          <DashboardTab
            profile={profile}
            lang={lang}
            todayMacros={todayMacros}
            waterMl={waterMl}
            onUpdateWater={handleUpdateWater}
            workoutHistory={workoutHistory}
            activeWorkoutSession={activeWorkoutSession}
            onStartWorkout={handleStartWorkout}
            onResumeWorkout={() => setWorkoutPlayerOpen(true)}
            onNavigateTab={setActiveTab}
            bodyMetrics={bodyMetrics}
            onLogWeight={handleLogWeightQuick}
          />
        )}

        {activeTab === 'workouts' && (
          <WorkoutsTab
            lang={lang}
            profile={profile}
            onUpdatePreferredEquipment={handleUpdatePreferredEquipment}
            customWorkouts={customWorkouts}
            workoutHistory={workoutHistory}
            activeWorkoutSession={activeWorkoutSession}
            onStartWorkout={handleStartWorkout}
            onResumeWorkout={() => setWorkoutPlayerOpen(true)}
            onCreateCustomWorkout={handleCreateCustomWorkout}
            onDeleteCustomWorkout={handleDeleteCustomWorkout}
            onDeleteHistoryEntry={handleDeleteWorkoutHistory}
          />
        )}

        {activeTab === 'nutrition' && (
          <NutritionTab
            selectedDate={selectedDate}
            lang={lang}
            onChangeDate={handleChangeSelectedDate}
            dayLog={selectedDayLog}
            onSaveDayLog={handleSaveDayLog}
            profile={profile}
            onToggleDislikedFood={handleToggleDislikedFood}
            onToggleFavoriteRecipe={handleToggleFavoriteRecipe}
            onSaveRecipeOverride={handleSaveRecipeOverride}
            onCopyPreviousDayMeals={handleCopyPreviousDayMeals}
            onApplyWeeklyPlan={handleApplyWeeklyPlan}
            allNutritionLogs={allNutritionLogs}
            customRecipes={customRecipes}
            onSaveCustomRecipe={handleSaveCustomRecipe}
            onDeleteCustomRecipe={handleDeleteCustomRecipe}
            onSendItemsToShoppingList={mergeItemsIntoShoppingList}
            onOpenSubstitutionModal={(cfg) =>
              setSubModalState({ ...cfg, isOpen: true })
            }
            onCacheExternalFood={handleCacheExternalFood}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingListTab
            shoppingItems={shoppingItems}
            lang={lang}
            profile={profile}
            customRecipes={customRecipes}
            onQuickLogRecipe={handleLogMealFromCoach}
            onToggleItemChecked={handleToggleShoppingChecked}
            onUpdateItemGrams={handleUpdateShoppingGrams}
            onDeleteItem={handleDeleteShoppingItem}
            onClearCheckedItems={handleClearCheckedShopping}
            onClearAllItems={handleClearAllShopping}
            onAddFoodItem={handleAddFoodToShopping}
            onAddCustomTextItem={handleAddCustomTextShopping}
            onSwapShoppingItem={handleSwapShoppingItem}
            onGenerateFromToday={handleGenerateShoppingFromToday}
            onGenerateFromWeek={handleGenerateShoppingFromWeek}
            onOpenSubstitutionModal={(cfg) =>
              setSubModalState({ ...cfg, isOpen: true })
            }
            onCacheExternalFood={handleCacheExternalFood}
          />
        )}

        {activeTab === 'coach' && (
          <CoachChatTab
            profile={profile}
            lang={lang}
            todayMacros={todayMacros}
            waterMl={waterMl}
            workoutHistory={workoutHistory}
            messages={coachMessages}
            onAppendMessage={handleAppendCoachMessage}
            onClearHistory={handleClearCoachHistory}
            onStartWorkoutFromCoach={(wk) => handleStartWorkout(wk, 'normal')}
            onLogMealFromCoach={handleLogMealFromCoach}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        lang={lang}
        onChangeTab={setActiveTab}
        uncheckedShoppingCount={uncheckedShoppingCount}
        hasActiveWorkout={Boolean(activeWorkoutSession)}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        profile={profile}
        bodyMetrics={bodyMetrics}
        allNutritionLogs={allNutritionLogs}
        onClose={() => setProfileModalOpen(false)}
        onSaveProfile={handleSaveProfile}
        onSwitchToCloudRestore={() => setCloudVaultOpen(true)}
      />

      <CloudVaultModal
        isOpen={cloudVaultOpen}
        activeAccount={activeAccount}
        onClose={() => setCloudVaultOpen(false)}
        onAccountAuthenticated={(acc) => {
          setActiveAccount(acc);
          setProfileModalOpen(false);
        }}
        onAccountLockedOut={handleAccountLockedOut}
        onGetFullBackup={exportFullBackupData}
        onRestoreFullBackup={handleImportJson}
      />

      <SubstitutionModal
        isOpen={subModalState.isOpen}
        sourceFoodId={subModalState.sourceFoodId}
        initialGrams={subModalState.initialGrams}
        contextLabel={subModalState.contextLabel}
        profile={profile}
        onToggleDislikedFood={handleToggleDislikedFood}
        onClose={() => setSubModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirmSwap={(swapResult) => {
          if (typeof subModalState.onConfirmSwap === 'function') {
            subModalState.onConfirmSwap(swapResult);
          }
        }}
      />

      {workoutPlayerOpen && activeWorkoutSession && (
        <ActiveWorkoutPlayer
          session={activeWorkoutSession}
          onPersistSession={handlePersistActiveSession}
          onMinimize={() => setWorkoutPlayerOpen(false)}
          onCancelSession={handleCancelWorkoutSession}
          onCompleteWorkout={handleCompleteWorkout}
        />
      )}
    </div>
  );
}
