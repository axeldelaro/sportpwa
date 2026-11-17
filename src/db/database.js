// Persistance 100% locale hybride : localStorage + IndexedDB (Wrapper natif basé sur les Promises)

const DB_NAME = 'pulsefit_local_db';
const DB_VERSION = 3;

export function safeJsonParse(rawStr, fallback = null) {
  try {
    return JSON.parse(rawStr, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
  } catch {
    return fallback;
  }
}

export const LS_KEYS = {
  PROFILE: 'pulsefit_profile_v1',
  HYDRATION: 'pulsefit_hydration_v1',
  THEME: 'pulsefit_theme_v1',
  LANG: 'pulsefit_lang_v1',
  ACTIVE_WORKOUT: 'pulsefit_active_workout_v1',
  ACTIVE_ACCOUNT: 'pulsefit_active_account_v1',
  COACH_HISTORY: 'pulsefit_coach_history_v1',
};

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sédentaire (bureau, < 5 000 pas/j)', factor: 1.2, waterBonus: 0 },
  { id: 'light', label: 'Léger (1 à 2 séances / sem.)', factor: 1.375, waterBonus: 250 },
  { id: 'moderate', label: 'Modéré (3 à 4 séances / sem.)', factor: 1.55, waterBonus: 500 },
  { id: 'active', label: 'Soutenu (5 à 6 séances / sem.)', factor: 1.725, waterBonus: 750 },
  { id: 'athlete', label: 'Athlète / Quotidien physique intense', factor: 1.9, waterBonus: 1000 },
];

export const FITNESS_GOALS = [
  {
    id: 'cut',
    label: 'Perte de gras',
    subtitle: 'Déficit contrôlé (-18%) & maintien musculaire',
    kcalMultiplier: 0.82,
    proteinPerKg: 2.0,
    fatPerKg: 0.9,
  },
  {
    id: 'maintain',
    label: 'Maintien / Recomposition',
    subtitle: 'Équilibre énergétique (0%) & tonicité',
    kcalMultiplier: 1.0,
    proteinPerKg: 1.8,
    fatPerKg: 1.0,
  },
  {
    id: 'bulk',
    label: 'Prise de muscle',
    subtitle: 'Surplus propre (+12%) & hypertrophie',
    kcalMultiplier: 1.12,
    proteinPerKg: 1.9,
    fatPerKg: 1.0,
  },
];

export const DIETARY_FILTERS = [
  { id: 'omnivore', label: 'Omnivore', isDietBase: true },
  { id: 'vegetarien', label: 'Végétarien', isDietBase: true },
  { id: 'vegan', label: 'Vegan', isDietBase: true },
  { id: 'sans_lactose', label: 'Sans lactose', isDietBase: false },
  { id: 'sans_gluten', label: 'Sans gluten', isDietBase: false },
  { id: 'sans_oeufs', label: 'Sans œufs', isDietBase: false },
  { id: 'sans_fruits_a_coque', label: 'Sans fruits à coque', isDietBase: false },
  { id: 'sans_porc', label: 'Sans porc', isDietBase: false },
  { id: 'sans_poissons_crustaces', label: 'Sans poissons/crustacés', isDietBase: false },
  { id: 'digestion_sensible', label: 'Digestion sensible / Sans alliacés', isDietBase: false },
];

export function getTodayDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formule scientifique de Mifflin-St Jeor + répartition intelligente des macronutriments
 */
export function calculateNutritionalTargets({
  sex = 'male',
  age = 28,
  height = 176,
  weight = 74,
  activityLevel = 'moderate',
  goal = 'maintain',
}) {
  const safeWeight = Math.max(35, Math.min(250, Number(weight) || 74));
  const safeHeight = Math.max(120, Math.min(230, Number(height) || 176));
  const safeAge = Math.max(14, Math.min(100, Number(age) || 28));

  const bmr =
    sex === 'female'
      ? 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge - 161
      : 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge + 5;

  const activityObj =
    ACTIVITY_LEVELS.find((a) => a.id === activityLevel) || ACTIVITY_LEVELS[2];
  const goalObj = FITNESS_GOALS.find((g) => g.id === goal) || FITNESS_GOALS[1];

  const tdee = Math.round(bmr * activityObj.factor);
  const kcal = Math.max(1200, Math.round((tdee * goalObj.kcalMultiplier) / 10) * 10);

  const protein = Math.round(safeWeight * goalObj.proteinPerKg);
  const fat = Math.max(40, Math.round(safeWeight * goalObj.fatPerKg));
  const remainingKcal = Math.max(200, kcal - protein * 4 - fat * 9);
  const carbs = Math.round(remainingKcal / 4);

  const rawWater = safeWeight * 33 + activityObj.waterBonus;
  const waterMl = Math.round(rawWater / 100) * 100;

  return {
    bmr: Math.round(bmr),
    tdee,
    kcal,
    protein,
    carbs,
    fat,
    waterMl,
  };
}

export const DEFAULT_PROFILE = (() => {
  const baseBio = {
    name: 'Athlète',
    sex: 'male',
    age: 28,
    height: 176,
    weight: 74,
    activityLevel: 'moderate',
    goal: 'maintain',
  };
  const computed = calculateNutritionalTargets(baseBio);
  return {
    ...baseBio,
    dietBase: 'omnivore',
    restrictions: [],
    dislikedFoodIds: [],
    favoriteRecipeIds: [],
    preferredEquipment: [],
    manualTargets: false,
    targets: {
      kcal: computed.kcal,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat,
      waterMl: computed.waterMl,
    },
    onboardingCompleted: false,
    updatedAt: new Date().toISOString(),
  };
})();

// ==========================================
// HELPERS LOCALSTORAGE
// ==========================================

export function loadProfile() {
  try {
    const raw = localStorage.getItem(LS_KEYS.PROFILE);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      targets: {
        ...DEFAULT_PROFILE.targets,
        ...(parsed.targets || {}),
      },
      restrictions: Array.isArray(parsed.restrictions) ? parsed.restrictions : [],
      dislikedFoodIds: Array.isArray(parsed.dislikedFoodIds) ? parsed.dislikedFoodIds : [],
      favoriteRecipeIds: Array.isArray(parsed.favoriteRecipeIds)
        ? parsed.favoriteRecipeIds
        : [],
      preferredEquipment: Array.isArray(parsed.preferredEquipment)
        ? parsed.preferredEquipment
        : [],
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  const updated = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(LS_KEYS.PROFILE, JSON.stringify(updated));
  return updated;
}

export function loadHydrationForDate(dateStr = getTodayDateString()) {
  try {
    const raw = localStorage.getItem(LS_KEYS.HYDRATION);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    return Number(map[dateStr] || 0);
  } catch {
    return 0;
  }
}

export function saveHydrationForDate(dateStr, ml) {
  const safeMl = Math.max(0, Math.min(10000, Math.round(Number(ml) || 0)));
  try {
    const raw = localStorage.getItem(LS_KEYS.HYDRATION);
    const map = raw ? JSON.parse(raw) : {};
    map[dateStr] = safeMl;
    // Conserve uniquement les 60 derniers jours dans localStorage pour rester léger
    const keys = Object.keys(map).sort();
    if (keys.length > 60) {
      keys.slice(0, keys.length - 60).forEach((k) => delete map[k]);
    }
    localStorage.setItem(LS_KEYS.HYDRATION, JSON.stringify(map));
  } catch {
    // Ignore quota errors
  }
  return safeMl;
}

export function loadTheme() {
  try {
    return localStorage.getItem(LS_KEYS.THEME) || 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(LS_KEYS.THEME, theme);
  } catch {
    // Ignore
  }
}

export function loadLanguage() {
  try {
    const saved = localStorage.getItem(LS_KEYS.LANG);
    if (saved && ['fr', 'en', 'es'].includes(saved)) return saved;
    const browserLang = (navigator.language || 'fr').slice(0, 2).toLowerCase();
    return ['fr', 'en', 'es'].includes(browserLang) ? browserLang : 'fr';
  } catch {
    return 'fr';
  }
}

export function saveLanguage(lang) {
  try {
    localStorage.setItem(LS_KEYS.LANG, lang);
  } catch {
    // Ignore
  }
}

export function loadActiveWorkoutSession() {
  try {
    const raw = localStorage.getItem(LS_KEYS.ACTIVE_WORKOUT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveWorkoutSession(session) {
  try {
    if (!session) {
      localStorage.removeItem(LS_KEYS.ACTIVE_WORKOUT);
    } else {
      localStorage.setItem(LS_KEYS.ACTIVE_WORKOUT, JSON.stringify(session));
    }
  } catch {
    // Ignore
  }
}

// ==========================================
// WRAPPER INDEXEDDB NATIF (PROMISES)
// ==========================================

let dbInstancePromise = null;

export function openDatabase() {
  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('workoutHistory')) {
        const ws = db.createObjectStore('workoutHistory', { keyPath: 'id' });
        ws.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains('nutritionLogs')) {
        db.createObjectStore('nutritionLogs', { keyPath: 'date' });
      }

      if (!db.objectStoreNames.contains('shoppingList')) {
        db.createObjectStore('shoppingList', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('customRecipes')) {
        db.createObjectStore('customRecipes', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('customWorkouts')) {
        db.createObjectStore('customWorkouts', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('coachMessages')) {
        db.createObjectStore('coachMessages', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('bodyMetrics')) {
        db.createObjectStore('bodyMetrics', { keyPath: 'date' });
      }

      if (!db.objectStoreNames.contains('cachedFoods')) {
        db.createObjectStore('cachedFoods', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('accountsVault')) {
        db.createObjectStore('accountsVault', { keyPath: 'username' });
      }
    };

    const timeoutId = setTimeout(() => {
      dbInstancePromise = null;
      reject(new Error('IndexedDB timeout (connexion bloquée par un ancien onglet)'));
    }, 2500);

    request.onsuccess = (event) => {
      clearTimeout(timeoutId);
      const db = event.target.result;
      db.onversionchange = () => {
        db.close();
        dbInstancePromise = null;
      };
      resolve(db);
    };

    request.onblocked = () => {
      clearTimeout(timeoutId);
      dbInstancePromise = null;
      reject(new Error('IndexedDB bloquée par un autre onglet ouvert'));
    };

    request.onerror = (event) => {
      clearTimeout(timeoutId);
      dbInstancePromise = null;
      reject(event.target.error);
    };
  });

  return dbInstancePromise;
}

async function withStore(storeName, mode, callback) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let requestResult;

    try {
      requestResult = callback(store, tx);
    } catch (err) {
      reject(err);
      return;
    }

    if (requestResult && typeof requestResult === 'object' && 'onsuccess' in requestResult) {
      requestResult.onsuccess = () => resolve(requestResult.result);
      requestResult.onerror = () => reject(requestResult.error);
    } else {
      tx.oncomplete = () => resolve(requestResult);
      tx.onerror = () => reject(tx.error);
    }
  });
}

// --- Séances d'entraînement terminées ---
export async function getAllWorkoutHistory() {
  const list = await withStore('workoutHistory', 'readonly', (store) => store.getAll());
  return (list || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function addWorkoutHistoryEntry(entry) {
  const record = {
    ...entry,
    id: entry.id || `wk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: entry.date || getTodayDateString(),
    timestamp: entry.timestamp || new Date().toISOString(),
  };
  await withStore('workoutHistory', 'readwrite', (store) => store.put(record));
  return record;
}

export async function deleteWorkoutHistoryEntry(id) {
  return withStore('workoutHistory', 'readwrite', (store) => store.delete(id));
}

// --- Journal Nutritionnel par Date ---
export function createEmptyDayNutrition(date) {
  return {
    date,
    meals: {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function getNutritionLogByDate(date) {
  const record = await withStore('nutritionLogs', 'readonly', (store) => store.get(date));
  return record || createEmptyDayNutrition(date);
}

export async function getAllNutritionLogs() {
  const list = await withStore('nutritionLogs', 'readonly', (store) => store.getAll());
  return list || [];
}

export async function saveNutritionLog(dayLog) {
  const updated = {
    ...dayLog,
    updatedAt: new Date().toISOString(),
  };
  await withStore('nutritionLogs', 'readwrite', (store) => store.put(updated));
  return updated;
}

// --- Liste de Courses Interactive ---
export async function getShoppingList() {
  const list = await withStore('shoppingList', 'readonly', (store) => store.getAll());
  return (list || []).sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
}

export async function saveShoppingItem(item) {
  const record = {
    ...item,
    id: item.id || `shop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    addedAt: item.addedAt || Date.now(),
  };
  await withStore('shoppingList', 'readwrite', (store) => store.put(record));
  return record;
}

export async function replaceAllShoppingItems(items) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('shoppingList', 'readwrite');
    const store = tx.objectStore('shoppingList');
    store.clear();
    items.forEach((item, idx) => {
      store.put({
        ...item,
        id: item.id || `shop_${Date.now()}_${idx}`,
        addedAt: item.addedAt || Date.now() + idx,
      });
    });
    tx.oncomplete = () => resolve(items);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteShoppingItem(id) {
  return withStore('shoppingList', 'readwrite', (store) => store.delete(id));
}

// --- Recettes Personnalisées ---
export async function getCustomRecipes() {
  const list = await withStore('customRecipes', 'readonly', (store) => store.getAll());
  return (list || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function saveCustomRecipe(recipe) {
  const record = {
    ...recipe,
    id: recipe.id || `crecipe_${Date.now()}`,
    isCustom: true,
    createdAt: recipe.createdAt || Date.now(),
  };
  await withStore('customRecipes', 'readwrite', (store) => store.put(record));
  return record;
}

export async function deleteCustomRecipe(id) {
  return withStore('customRecipes', 'readwrite', (store) => store.delete(id));
}

// --- Séances Personnalisées ---
export async function getCustomWorkouts() {
  const list = await withStore('customWorkouts', 'readonly', (store) => store.getAll());
  return (list || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function saveCustomWorkout(workout) {
  const record = {
    ...workout,
    id: workout.id || `cwk_${Date.now()}`,
    isCustom: true,
    createdAt: workout.createdAt || Date.now(),
  };
  await withStore('customWorkouts', 'readwrite', (store) => store.put(record));
  return record;
}

export async function deleteCustomWorkout(id) {
  return withStore('customWorkouts', 'readwrite', (store) => store.delete(id));
}

// --- Historique Chat Coach IA Local (Miroir synchrone localStorage + IndexedDB anti-perte) ---
export function loadCoachMessagesSync() {
  try {
    const raw = localStorage.getItem(LS_KEYS.COACH_HISTORY);
    const parsed = raw ? safeJsonParse(raw, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCoachMessagesSync(list) {
  try {
    const trimmed = (Array.isArray(list) ? list : []).slice(-80);
    localStorage.setItem(LS_KEYS.COACH_HISTORY, JSON.stringify(trimmed));
  } catch {
    // Ignore quota
  }
}

export async function getCoachMessages() {
  const syncList = loadCoachMessagesSync();
  try {
    const list = await withStore('coachMessages', 'readonly', (store) => store.getAll());
    const map = new Map();
    (list || []).forEach((m) => {
      if (m?.id) map.set(m.id, m);
    });
    syncList.forEach((m) => {
      if (m?.id) map.set(m.id, m);
    });
    const merged = Array.from(map.values()).sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );
    if (merged.length > 0) {
      saveCoachMessagesSync(merged);
    }
    return merged;
  } catch {
    return syncList;
  }
}

export async function addCoachMessage(message) {
  const record = {
    ...message,
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: message.timestamp || Date.now(),
  };

  // 1. Sauvegarde synchrone instantanée garantie (zéro disparition possible)
  const currentSync = loadCoachMessagesSync();
  const nextSync = [...currentSync.filter((m) => m.id !== record.id), record].sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
  );
  saveCoachMessagesSync(nextSync);

  // 2. Persistance IndexedDB non-bloquante en tâche de fond
  withStore('coachMessages', 'readwrite', (store) => store.put(record)).catch(() => {});
  return record;
}

export async function clearCoachMessages() {
  try {
    localStorage.removeItem(LS_KEYS.COACH_HISTORY);
  } catch {
    // Ignore
  }
  return withStore('coachMessages', 'readwrite', (store) => store.clear()).catch(() => {});
}

// --- Suivi Biométrique & Poids ---
export async function getBodyMetricsHistory() {
  const list = await withStore('bodyMetrics', 'readonly', (store) => store.getAll());
  return (list || []).sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveBodyMetricEntry(entry) {
  const record = {
    date: entry.date || getTodayDateString(),
    weightKg: Number(entry.weightKg),
    waistCm: entry.waistCm ? Number(entry.waistCm) : null,
    updatedAt: Date.now(),
  };
  await withStore('bodyMetrics', 'readwrite', (store) => store.put(record));
  return record;
}

// --- Aliments Externes Mis en Cache (Open Food Facts / Code-barres) ---
export async function getAllCachedFoods() {
  const list = await withStore('cachedFoods', 'readonly', (store) => store.getAll());
  return list || [];
}

export async function saveCachedFood(foodObj) {
  if (!foodObj?.id) return null;
  await withStore('cachedFoods', 'readwrite', (store) => store.put(foodObj));
  return foodObj;
}

// ==========================================
// SAUVEGARDE PORTABLE EXPORT / IMPORT JSON
// ==========================================

export async function exportFullBackupData() {
  const [
    workoutHistory,
    nutritionLogs,
    shoppingList,
    customRecipes,
    customWorkouts,
    coachMessages,
    bodyMetrics,
    cachedFoods,
  ] = await Promise.all([
    getAllWorkoutHistory(),
    getAllNutritionLogs(),
    getShoppingList(),
    getCustomRecipes(),
    getCustomWorkouts(),
    getCoachMessages(),
    getBodyMetricsHistory(),
    getAllCachedFoods(),
  ]);

  let hydrationMap = {};
  try {
    hydrationMap = JSON.parse(localStorage.getItem(LS_KEYS.HYDRATION) || '{}');
  } catch {
    hydrationMap = {};
  }

  return {
    app: 'PulseFit PWA',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    updatedAtMs: Date.now(),
    localStorage: {
      profile: loadProfile(),
      hydration: hydrationMap,
      theme: loadTheme(),
      lang: loadLanguage(),
    },
    indexedDB: {
      workoutHistory,
      nutritionLogs,
      shoppingList,
      customRecipes,
      customWorkouts,
      coachMessages,
      bodyMetrics,
      cachedFoods,
    },
  };
}

export async function importFullBackupData(payload) {
  if (!payload || typeof payload !== 'object' || !payload.indexedDB) {
    throw new Error('Fichier JSON de sauvegarde invalide ou non reconnu.');
  }

  if (payload.localStorage?.profile) {
    saveProfile({
      ...payload.localStorage.profile,
      onboardingCompleted: true,
    });
  }
  if (payload.localStorage?.hydration) {
    localStorage.setItem(LS_KEYS.HYDRATION, JSON.stringify(payload.localStorage.hydration));
  }
  if (payload.localStorage?.theme) {
    saveTheme(payload.localStorage.theme);
  }
  if (payload.localStorage?.lang) {
    saveLanguage(payload.localStorage.lang);
  }
  if (Array.isArray(payload.indexedDB?.coachMessages)) {
    saveCoachMessagesSync(payload.indexedDB.coachMessages);
  } else {
    saveCoachMessagesSync([]);
  }

  const db = await openDatabase();
  const storeNames = [
    'workoutHistory',
    'nutritionLogs',
    'shoppingList',
    'customRecipes',
    'customWorkouts',
    'coachMessages',
    'bodyMetrics',
    'cachedFoods',
  ];

  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    storeNames.forEach((name) => {
      const store = tx.objectStore(name);
      store.clear();
      const rows = payload.indexedDB[name];
      if (Array.isArray(rows)) {
        rows.forEach((row) => store.put(row));
      }
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });

  return true;
}

// ==========================================
// COFFRE MULTI-COMPTES CHIFFRÉS (AES-256-GCM)
// ==========================================

export async function getEncryptedAccountRecord(username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) return null;
  return withStore('accountsVault', 'readonly', (store) => store.get(clean));
}

export async function saveEncryptedAccountRecord(record) {
  if (!record?.username) throw new Error('Identifiant requis');
  await withStore('accountsVault', 'readwrite', (store) => store.put(record));
  return record;
}

export async function listEncryptedAccountUsernames() {
  const all = await withStore('accountsVault', 'readonly', (store) => store.getAll());
  return (all || []).map((r) => ({
    username: r.username,
    updatedAt: r.updatedAt,
  }));
}

export async function clearWorkingStoresOnLock() {
  localStorage.removeItem(LS_KEYS.PROFILE);
  localStorage.removeItem(LS_KEYS.HYDRATION);
  localStorage.removeItem(LS_KEYS.ACTIVE_WORKOUT);
  localStorage.removeItem(LS_KEYS.ACTIVE_ACCOUNT);
  localStorage.removeItem(LS_KEYS.COACH_HISTORY);

  const db = await openDatabase();
  const workingStores = [
    'workoutHistory',
    'nutritionLogs',
    'shoppingList',
    'customRecipes',
    'customWorkouts',
    'coachMessages',
    'bodyMetrics',
  ];

  await new Promise((resolve, reject) => {
    const tx = db.transaction(workingStores, 'readwrite');
    workingStores.forEach((name) => tx.objectStore(name).clear());
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

