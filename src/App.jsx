import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  inspectPendingSyncHash,
  saveEncryptedSessionSnapshot,
} from './utils/cryptoVaultService';

export default function App() {
  const todayStr = getTodayDateString(0);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => loadTheme());
  const [lang, setLang] = useState(() => loadLanguage());

  // Session compte chiffré en mémoire (CryptoKey non-extractible)
  const [activeAccount, setActiveAccount] = useState(null);
  const [pendingSyncInfo, setPendingSyncInfo] = useState(() =>
    typeof window !== 'undefined' ? inspectPendingSyncHash(window.location.hash) : null
  );

  const [profile, setProfile] = useState(() => loadProfile());
  const [profileModalOpen, setProfileModalOpen] = useState(() => {
    const hasSync =
      typeof window !== 'undefined' && Boolean(inspectPendingSyncHash(window.location.hash));
    return !hasSync && !loadProfile().onboardingCompleted;
  });
  const [cloudVaultOpen, setCloudVaultOpen] = useState(() =>
    typeof window !== 'undefined' && Boolean(inspectPendingSyncHash(window.location.hash))
  );
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
  const [coachMessages, setCoachMessages] = useState([]);
  const [bodyMetrics, setBodyMetrics] = useState([]);

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
    if (theme === 'amoled') {
      root.classList.add('dark', 'theme-amoled');
    } else if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.add('dark');
    }
    saveTheme(theme);
  }, [theme]);

  const handleChangeLang = (nextLang) => {
    setLang(nextLang);
    saveLanguage(nextLang);
  };

  // Remonte proprement en haut de page à chaque changement d'onglet
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Détection automatique si un lien de synchronisation #sync=... est ouvert
  useEffect(() => {
    const onHashChange = () => {
      const info = inspectPendingSyncHash(window.location.hash);
      if (info) {
        setPendingSyncInfo(info);
        setProfileModalOpen(false);
        setCloudVaultOpen(true);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const reloadAllFromIndexedDB = useCallback(async () => {
    try {
      const [
        cachedExtFoods,
        wkHist,
        tLog,
        selLog,
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
      setShoppingItems(shop);
      setCustomRecipes(cRecs);
      setCustomWorkouts(cWks);
      setCoachMessages(cMsgs);
      setBodyMetrics(metrics);
    } catch (err) {
      console.error('Erreur chargement IndexedDB :', err);
    }
  }, [todayStr, selectedDate]);

  useEffect(() => {
    reloadAllFromIndexedDB();
  }, [reloadAllFromIndexedDB]);

  // Sauvegarde automatique chiffrée en AES-256-GCM dès qu'un compte est connecté
  useEffect(() => {
    if (!activeAccount?.sessionKey || !activeAccount?.username) return undefined;
    const timer = setTimeout(async () => {
      try {
        const snapshot = await exportFullBackupData();
        await saveEncryptedSessionSnapshot(
          activeAccount.username,
          activeAccount.sessionKey,
          activeAccount.saltBase64,
          snapshot
        );
      } catch {
        // Ignore
      }
    }, 900);

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
  ]);

  const handleClearPendingSync = () => {
    setPendingSyncInfo(null);
    if (window.location.hash.startsWith('#sync=')) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
  };

  const handleAccountLockedOut = async () => {
    if (activeAccount?.sessionKey) {
      const snapshot = await exportFullBackupData();
      await saveEncryptedSessionSnapshot(
        activeAccount.username,
        activeAccount.sessionKey,
        activeAccount.saltBase64,
        snapshot
      );
    }
    setActiveAccount(null);
    await clearWorkingStoresOnLock();
    setProfile({ ...DEFAULT_PROFILE });
    setWaterMl(0);
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

  const handleStartWorkout = (workout, intensityMode = 'normal') => {
    const preparedExercises = buildActiveWorkoutExercises(workout, intensityMode);
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

  const handleAppendCoachMessage = async (msg) => {
    await addCoachMessage(msg);
    setCoachMessages(await getCoachMessages());
  };

  const handleClearCoachHistory = async () => {
    await clearCoachMessages();
    setCoachMessages([]);
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

  const handleImportJson = async (parsedData) => {
    await importFullBackupData(parsedData);
    setProfile(loadProfile());
    setTheme(loadTheme());
    setLang(loadLanguage());
    setWaterMl(loadHydrationForDate(todayStr));
    await reloadAllFromIndexedDB();
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
        onClose={() => setProfileModalOpen(false)}
        onSaveProfile={handleSaveProfile}
        onSwitchToCloudRestore={() => setCloudVaultOpen(true)}
      />

      <CloudVaultModal
        isOpen={cloudVaultOpen}
        activeAccount={activeAccount}
        pendingSyncInfo={pendingSyncInfo}
        onClearPendingSync={handleClearPendingSync}
        onClose={() => setCloudVaultOpen(false)}
        onAccountAuthenticated={(acc) => setActiveAccount(acc)}
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
