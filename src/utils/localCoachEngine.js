import {
  getAllFoods,
  isFoodCompatibleWithProfile,
  calculateFoodMacros,
} from '../data/foodDatabase.js';
import {
  RECIPES_DATA,
  computeRecipeMacros,
  isRecipeCompatibleWithProfile,
} from '../data/recipesData.js';
import {
  WORKOUT_PROGRAMS,
  EXERCISE_CATALOG,
  matchesSelectedEquipment,
} from '../data/workoutsData.js';
import { calculateNutritionalTargets } from '../db/database.js';
import {
  normalizeText,
  computeSubstitutions,
  findFoodByQuery,
  roundToNearest5g,
  getLiveAdaptedRecipe,
} from './substitutionEngine.js';
import {
  SCIENTIFIC_STUDIES,
  prewarmScientificIndex,
  retrieveScientificEvidence,
} from '../data/scientificKnowledge.js';

export const QUICK_COACH_SUGGESTIONS_BY_LANG = {
  fr: [
    'Crée-moi une séance Pecs & Triceps de 35 min',
    'Menu complet calibré sur mes macros du jour',
    'Macros de 3 œufs, 70g d’avoine et 1 banane',
    'Comment bien exécuter le Hip Thrust ?',
    'Par quoi remplacer 80g de riz basmati ?',
    'Repas du soir à 650 kcal riche en protéines',
    'Créatine & compléments dosés pour mon poids',
  ],
  en: [
    'Build a 35-min Chest & Triceps workout',
    'Full-day meal plan for my exact macros',
    'Macros in 3 eggs, 70g oats and 1 banana',
    'How to perform the Hip Thrust properly?',
    'Swap for 80g of basmati rice?',
    '650 kcal high-protein dinner idea',
  ],
  es: [
    'Créame una sesión de Pecho y Tríceps de 35 min',
    'Menú completo calibrado a mis macros',
    'Macros de 3 huevos, 70g avena y 1 plátano',
    '¿Cómo ejecutar bien el Hip Thrust?',
    '¿Por qué cambiar 80g de arroz?',
  ],
};

export const QUICK_COACH_SUGGESTIONS = QUICK_COACH_SUGGESTIONS_BY_LANG.fr;

const PRECACHE_MARKER_KEY = 'pulsefit_coach_offline_ready_v6';
let isEnginePrewarmed = false;

export function warmUpCoachEngine() {
  if (isEnginePrewarmed) return true;
  try {
    prewarmScientificIndex();
    getAllFoods();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        PRECACHE_MARKER_KEY,
        JSON.stringify({
          ready: true,
          studies: SCIENTIFIC_STUDIES.length,
          foods: getAllFoods().length,
          exercises: EXERCISE_CATALOG.length,
          cachedAt: Date.now(),
        })
      );
    }
    isEnginePrewarmed = true;
  } catch {
    isEnginePrewarmed = true;
  }
  return true;
}

const NATURAL_UNIT_WEIGHTS = [
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:oeufs?|œufs?|eggs?|huevos?)\b/i, gramsPerUnit: 60 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:bananes?|bananas?|platanos?)\b/i, gramsPerUnit: 120 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:pommes?|poires?|oranges?|peches?|apples?)\b/i, gramsPerUnit: 150 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:citrons?|limes?)\b/i, gramsPerUnit: 55 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:kiwis?|abricots?|figues?|clementines?)\b/i, gramsPerUnit: 75 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:avocats?)\b/i, gramsPerUnit: 140 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:tranches?|slices?)\b/i, gramsPerUnit: 38 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:cuilleres?\s*a?\s*soupe|cas|c\.a\.s|tbsp|cuilleres?)\b/i, gramsPerUnit: 12 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:cuilleres?\s*a?\s*cafe|cac|tsp)\b/i, gramsPerUnit: 5 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:pots?|yaourts?)\b/i, gramsPerUnit: 125 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:scoops?|doses?|shakers?)\b/i, gramsPerUnit: 30 },
  { regex: /\b(\d+(?:[.,]\d+)?)\s*(?:croissants?|pains?\s*au\s*chocolat|wraps?|tortillas?)\b/i, gramsPerUnit: 65 },
];

function extractGramsSmart(segmentText, foodObj) {
  const explicitMatch = String(segmentText).match(
    /(\d+(?:[.,]\d+)?)\s*(?:g|gr|grammes|grams|ml|cl)\b/i
  );
  if (explicitMatch) {
    const val = Number(explicitMatch[1].replace(',', '.'));
    return /cl\b/i.test(explicitMatch[0]) ? Math.round(val * 10) : Math.round(val);
  }

  for (const rule of NATURAL_UNIT_WEIGHTS) {
    const m = String(segmentText).match(rule.regex);
    if (m) {
      return Math.round(Number(m[1].replace(',', '.')) * rule.gramsPerUnit);
    }
  }

  const leadingCount = String(segmentText)
    .trim()
    .match(/^(\d{1,2})\s+[a-zA-ZÀ-ÿœŒ]/);
  if (leadingCount) {
    const count = Number(leadingCount[1]);
    if (count >= 1 && count <= 12) {
      return Math.round(count * (foodObj?.defaultGrams || 60));
    }
  }

  const bareGrams = String(segmentText).match(/\b(\d{2,4})\b/);
  if (bareGrams) return Number(bareGrams[1]);

  return foodObj?.defaultGrams || 100;
}

function cleanFoodSearchPhrase(rawSeg) {
  const stopWords = new Set([
    'combien', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'dans', 'avec',
    'pour', 'calories', 'calorie', 'kcal', 'proteines', 'proteine', 'macros', 'macro',
    'glucides', 'lipides', 'il', 'ya', 'a', 't', 'on', 'je', 'mange', 'pris',
    'cuillere', 'cuilleres', 'soupe', 'cafe', 'tranche', 'tranches', 'pot', 'pots',
    'grammes', 'gr', 'g', 'ml', 'cl', 'in', 'of', 'and', 'with', 'con', 'en',
  ]);

  return normalizeText(rawSeg)
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|gr|ml|cl)?\b/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .join(' ')
    .trim();
}

/**
 * 1. ANALYSEUR MULTI-ALIMENTS & CALCULATEUR DE REPAS EN LANGAGE NATUREL
 */
function tryParseMultiFoodNutritionQuery(userMessage, norm) {
  const isSwap =
    norm.includes('remplac') ||
    norm.includes('substitu') ||
    norm.includes('equivalen') ||
    norm.includes('swap') ||
    norm.includes('cambiar');
  if (isSwap) return null;

  const isMenuOrWorkout =
    norm.includes('menu complet') ||
    norm.includes('journee') ||
    norm.includes('seance') ||
    norm.includes('programme') ||
    norm.includes('exercice') ||
    norm.includes('1rm');
  if (isMenuOrWorkout) return null;

  const hasNutritionTrigger =
    norm.includes('macro') ||
    norm.includes('calori') ||
    norm.includes('kcal') ||
    norm.includes('combien') ||
    norm.includes('valeur') ||
    /,|\+|\bet\b|\bavec\b|\band\b/.test(norm);

  if (!hasNutritionTrigger && norm.length > 42) return null;

  const rawParts = String(userMessage)
    .split(/,|\+|\s+et\s+|\s+avec\s+|\s+and\s+|\s+y\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawParts.length === 0 || rawParts.length > 8) return null;

  const parsedItems = [];
  for (const seg of rawParts) {
    const cleaned = cleanFoodSearchPhrase(seg);
    if (!cleaned) continue;
    const food = findFoodByQuery(cleaned);
    if (food) {
      const grams = extractGramsSmart(seg, food);
      const macros = calculateFoodMacros(food, grams);
      parsedItems.push({ food, grams, macros });
    }
  }

  if (parsedItems.length === 0) return null;
  // Si un seul aliment sans chiffre ni mot clé nutritionnel, laisse passer les autres intentions si plus pertinentes
  if (
    parsedItems.length === 1 &&
    !hasNutritionTrigger &&
    !/\d/.test(userMessage) &&
    norm.split(' ').length > 4
  ) {
    return null;
  }

  const totals = parsedItems.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.macros.kcal,
      protein: Math.round((acc.protein + it.macros.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + it.macros.carbs) * 10) / 10,
      fat: Math.round((acc.fat + it.macros.fat) * 10) / 10,
      fiber: Math.round((acc.fiber + it.macros.fiber) * 10) / 10,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const lines = parsedItems.map(
    (it) =>
      `• **${it.grams}g ${it.food.name}** → **${it.macros.kcal} kcal** | ${it.macros.protein}g P · ${it.macros.carbs}g G · ${it.macros.fat}g L`
  );

  const title =
    parsedItems.length === 1
      ? `${parsedItems[0].grams}g ${parsedItems[0].food.name}`
      : ` Assiette (${parsedItems.map((p) => p.food.name.split(' ')[0]).slice(0, 3).join(' + ')})`;

  return {
    text:
      `**Calcul Nutritionnel de Précision (CIQUAL / USDA)** :\n\n` +
      lines.join('\n') +
      `\n\n**Total exact :** **${totals.kcal} kcal** · **${totals.protein}g Protéines** · **${totals.carbs}g Glucides** · **${totals.fat}g Lipides** *(Fibres : ${totals.fiber}g)*`,
    mealAction: {
      title: title.trim(),
      kcal: totals.kcal,
      protein: totals.protein,
      items: parsedItems.map((p) => ({ foodId: p.food.id, grams: p.grams })),
    },
    memory: {
      lastIntent: 'substitution',
      lastFoodId: parsedItems[0].food.id,
      lastGrams: parsedItems[0].grams,
    },
  };
}

/**
 * 2. GÉNÉRATEUR DE SÉANCE SUR-MESURE À LA DEMANDE DEPUIS LE LANGAGE NATUREL
 */
function tryComposeCustomWorkoutFromPrompt(userMessage, norm, profile) {
  const isWorkoutBuildRequest =
    (norm.includes('seance') ||
      norm.includes('entrainement') ||
      norm.includes('workout') ||
      norm.includes('routine') ||
      norm.includes('sesion')) &&
    (norm.includes('cree') ||
      norm.includes('creer') ||
      norm.includes('fais') ||
      norm.includes('prepare') ||
      norm.includes('donne') ||
      norm.includes('genere') ||
      norm.includes('compose') ||
      norm.includes('build') ||
      norm.includes('pec') ||
      norm.includes('dos') ||
      norm.includes('jambe') ||
      norm.includes('fessier') ||
      norm.includes('bras') ||
      norm.includes('abdo') ||
      norm.includes('epaule') ||
      norm.includes('callisthen') ||
      norm.includes('elastique') ||
      norm.includes('chaise romaine') ||
      norm.includes('sans materiel') ||
      norm.includes('haltere') ||
      /\d{2}\s*min/.test(norm));

  if (!isWorkoutBuildRequest) return null;

  // Extraction de la durée souhaitée
  const minMatch = norm.match(/(\d{2})\s*min/);
  const durationMin = minMatch
    ? Math.max(15, Math.min(90, Number(minMatch[1])))
    : 38;
  const targetCount =
    durationMin <= 22 ? 3 : durationMin <= 34 ? 4 : durationMin <= 48 ? 5 : 6;

  // Extraction des muscles demandés
  const requestedMuscles = [];
  if (norm.includes('pec') || norm.includes('poitrine') || norm.includes('push') || norm.includes('chest')) {
    requestedMuscles.push('pectoraux');
  }
  if (norm.includes('dos') || norm.includes('traction') || norm.includes('pull') || norm.includes('back')) {
    requestedMuscles.push('dos');
  }
  if (norm.includes('epaul') || norm.includes('delto') || norm.includes('shoulder')) {
    requestedMuscles.push('epaules');
  }
  if (norm.includes('bras') || norm.includes('biceps') || norm.includes('triceps') || norm.includes('arm')) {
    requestedMuscles.push('bras');
  }
  if (
    norm.includes('jambe') ||
    norm.includes('fessier') ||
    norm.includes('cuiss') ||
    norm.includes('quad') ||
    norm.includes('ischio') ||
    norm.includes('leg') ||
    norm.includes('glute')
  ) {
    requestedMuscles.push('jambes_fessiers');
  }
  if (norm.includes('abdo') || norm.includes('gainage') || norm.includes('core') || norm.includes('ventre')) {
    requestedMuscles.push('abdos');
  }

  // Extraction du matériel demandé dans la phrase (sinon préférences profil)
  const eqRequested = [];
  if (norm.includes('sans materiel') || norm.includes('poids du corps') || norm.includes('maison sans')) {
    eqRequested.push('none');
  }
  if (norm.includes('chaise romaine')) eqRequested.push('roman_chair', 'pullup_bar', 'dip_bars');
  if (norm.includes('elastique') || norm.includes('band')) eqRequested.push('bands');
  if (norm.includes('haltere') || norm.includes('dumbbell')) eqRequested.push('dumbbells', 'bench');
  if (norm.includes('kettlebell') || norm.includes('kb')) eqRequested.push('kettlebell');
  if (norm.includes('anneau') || norm.includes('trx') || norm.includes('sangle')) eqRequested.push('trx_rings');
  if (norm.includes('salle') || norm.includes('machine') || norm.includes('poulie')) {
    eqRequested.push('machines', 'cables', 'barbell', 'dumbbells', 'bench');
  }

  const activeEq =
    eqRequested.length > 0 ? eqRequested : profile?.preferredEquipment || [];

  const wantCalisthenics =
    norm.includes('callisthen') || norm.includes('calisthen') || norm.includes('street');

  let pool = EXERCISE_CATALOG.filter((ex) => {
    if (wantCalisthenics && ex.discipline !== 'calisthenics' && ex.discipline !== 'bodyweight') {
      return false;
    }
    if (activeEq.length > 0 && !matchesSelectedEquipment(ex.equipmentTags, activeEq)) {
      return false;
    }
    if (requestedMuscles.length > 0 && !requestedMuscles.includes(ex.muscleGroup)) {
      return false;
    }
    return true;
  });

  if (pool.length < targetCount) {
    pool = EXERCISE_CATALOG.filter((ex) =>
      requestedMuscles.length > 0 ? requestedMuscles.includes(ex.muscleGroup) : true
    );
  }

  // Sélection variée et équilibrée
  const selected = [];
  const usedIds = new Set();
  if (requestedMuscles.length > 1) {
    for (let i = 0; selected.length < targetCount && i < 12; i++) {
      const mKey = requestedMuscles[i % requestedMuscles.length];
      const candidate = pool.find((e) => e.muscleGroup === mKey && !usedIds.has(e.id));
      if (candidate) {
        usedIds.add(candidate.id);
        selected.push(candidate);
      }
    }
  }
  for (const ex of pool) {
    if (selected.length >= targetCount) break;
    if (!usedIds.has(ex.id)) {
      usedIds.add(ex.id);
      selected.push(ex);
    }
  }

  if (selected.length === 0) return null;

  const labelMap = {
    pectoraux: 'Pecs',
    dos: 'Dos',
    epaules: 'Épaules',
    bras: 'Bras',
    jambes_fessiers: 'Jambes & Fessiers',
    abdos: 'Core',
  };
  const focusTitle =
    requestedMuscles.length > 0
      ? requestedMuscles.map((k) => labelMap[k] || k).join(' & ')
      : wantCalisthenics
      ? 'Callisthénie'
      : 'Full Body Athlétique';

  const workoutObj = {
    id: `ai_wk_${Date.now()}`,
    title: `Séance IA — ${focusTitle} (${durationMin} min)`,
    durationMin,
    targetMuscles: Array.from(new Set(selected.map((s) => s.muscle))).slice(0, 4),
    equipment: activeEq.length > 0 ? 'Adapté à ton matériel' : 'Tous équipements',
    exercises: selected,
  };

  const lines = selected.map(
    (ex, idx) =>
      `${idx + 1}. **${ex.name}** — **${ex.sets} × ${ex.type === 'timed' ? `${ex.durationSeconds}s` : `${ex.targetReps} reps`}** *(Repos ${ex.restSeconds}s)*`
  );

  return {
    text:
      `**${workoutObj.title}** construite sur-mesure (${selected.length} mouvements ordonnés par priorité biomécanique) :\n\n` +
      lines.join('\n') +
      `\n\n*Conserve 1 à 2 répétitions en réserve (RIR 1–2) sur les premières séries pour tenir tout le volume avec une technique irréprochable.*`,
    workoutAction: workoutObj,
    exerciseDemo: selected[0],
    memory: { lastIntent: 'ai_workout_builder' },
  };
}

/**
 * 3. RECHERCHE TECHNIQUE PRÉCISE D'UN EXERCICE AVEC DÉMONSTRATION ANIMÉE
 */
function tryLookupSpecificExercise(norm) {
  const isTechQuestion =
    norm.includes('comment faire') ||
    norm.includes('comment bien') ||
    norm.includes('executer') ||
    norm.includes('execution') ||
    norm.includes('technique') ||
    norm.includes('posture') ||
    norm.includes('how to') ||
    norm.includes('como hacer');

  if (!isTechQuestion && norm.split(' ').length > 5) return null;

  let bestEx = null;
  let bestScore = 0;

  for (const ex of EXERCISE_CATALOG) {
    const exNorm = normalizeText(ex.name);
    const words = exNorm.split(' ').filter((w) => w.length >= 4);
    let score = 0;
    if (norm.includes(exNorm)) score += 90;
    for (const w of words) {
      if (norm.includes(w)) score += 22;
    }
    if (score > bestScore) {
      bestScore = score;
      bestEx = ex;
    }
  }

  if (!bestEx || bestScore < (isTechQuestion ? 22 : 44)) return null;

  return {
    text:
      `**Fiche Technique & Biomécanique — ${bestEx.name}** :\n\n` +
      `• **Muscles ciblés :** **${bestEx.muscle}**\n` +
      `• **Exécution stricte :** ${bestEx.cue}\n` +
      `• **Cadence idéale :** descente contrôlée sur **2 secondes** (phase excentrique), point stable sans rebond, puis poussée/tirage explosif en expirant.\n` +
      `• **Dosage recommandé :** **${bestEx.sets} séries × ${bestEx.type === 'timed' ? `${bestEx.durationSeconds}s` : `${bestEx.targetReps} reps`}** avec **${bestEx.restSeconds}s de repos**` +
      (bestEx.alternative ? `\n• **Alternative directe :** *${bestEx.alternative}*` : ''),
    exerciseDemo: bestEx,
    memory: { lastIntent: 'exercise_tech' },
  };
}

/**
 * 4. SOLVEUR DE REPAS CALIBRÉ À UNE CIBLE CALORIQUE PRÉCISE (EX: "REPAS À 650 KCAL")
 */
function tryComposeTargetedMealFromPrompt(userMessage, norm, profile) {
  const kcalMatch = String(userMessage).match(/(\d{3,4})\s*kcal/i);
  if (!kcalMatch) return null;

  const targetKcal = Math.max(200, Math.min(1600, Number(kcalMatch[1])));
  const adaptedPool = RECIPES_DATA.map((r) => getLiveAdaptedRecipe(r, profile)).filter((r) =>
    isRecipeCompatibleWithProfile(r, profile)
  );
  if (adaptedPool.length === 0) return null;

  // Vérifie si l'utilisateur mentionne un aliment ou moment précis
  let bestRec = adaptedPool[0];
  let bestScore = -1;
  for (const r of adaptedPool) {
    let score = 0;
    const rNorm = normalizeText(
      `${r.title} ${(r.ingredients || []).map((i) => i.foodId).join(' ')}`
    );
    norm
      .split(' ')
      .filter((w) => w.length >= 4)
      .forEach((tok) => {
        if (rNorm.includes(tok)) score += 15;
      });
    const baseM = computeRecipeMacros(r, 1);
    score -= Math.abs(baseM.kcal - targetKcal) * 0.02;
    if (score > bestScore) {
      bestScore = score;
      bestRec = r;
    }
  }

  const baseMacros = computeRecipeMacros(bestRec, 1);
  const ratio = targetKcal / Math.max(120, baseMacros.kcal);
  const scaledIngs = bestRec.ingredients.map((ing) => ({
    foodId: ing.foodId,
    grams: roundToNearest5g(ing.grams * ratio),
  }));

  const exactMacros = computeRecipeMacros({ ingredients: scaledIngs }, 1);
  const ingLines = scaledIngs.map((it) => {
    const f = getAllFoods().find((x) => x.id === it.foodId);
    const m = calculateFoodMacros(it.foodId, it.grams);
    return `• **${it.grams}g ${f?.name || it.foodId}** *(${m.kcal} kcal · ${m.protein}g P)*`;
  });

  return {
    text:
      `**Repas calibré au gramme près pour ${targetKcal} kcal** — **${bestRec.title}** :\n\n` +
      ingLines.join('\n') +
      `\n\n**Total exact :** **${exactMacros.kcal} kcal** · **${exactMacros.protein}g P** · **${exactMacros.carbs}g G** · **${exactMacros.fat}g L**`,
    mealAction: {
      title: `${bestRec.title} (${exactMacros.kcal} kcal)`,
      kcal: exactMacros.kcal,
      protein: exactMacros.protein,
      items: scaledIngs,
    },
    memory: { lastIntent: 'targeted_meal' },
  };
}

function getCompatibleProteinFoods(profile) {
  return getAllFoods().filter(
    (f) =>
      (f.swapGroup === 'proteines_maigres' || f.swapGroup === 'proteines_lipides') &&
      isFoodCompatibleWithProfile(f, profile)
  );
}

const MUSCLE_GUIDES = [
  {
    keys: ['pectoraux', 'pec', 'pecs', 'poitrine', 'chest', 'bench', 'developpe couche'],
    title: 'Pectoraux (Haut, Moyen & Étirement)',
    demoId: 'ex_club_incline_smith',
    exercises:
      '1. **Développé incliné haltères ou Smith (30°)** : 3–4 × 8–10 reps *(faisceau claviculaire en grande amplitude)*\n' +
      '2. **Presse convergente ou Développé couché** : 3 × 6–8 reps *(tension mécanique lourde, 2–3 min repos)*\n' +
      '3. **Écartés poulie vis-à-vis ou Dips buste penché** : 3 × 12–15 reps *(hypertrophie maximale en position étirée)*',
    tip: 'Resserre légèrement les omoplates en abaissant les épaules et garde un angle de coudes à ~45°.',
  },
  {
    keys: ['dos', 'largeur', 'epaisseur', 'traction', 'tractions', 'rowing', 'dorsaux', 'back', 'lats'],
    title: 'Dos (Largeur en V & Épaisseur)',
    demoId: 'ex_cali_chest_to_bar',
    exercises:
      '1. **Tractions pronation ou Tirage vertical prise neutre** : 3–4 × 6–10 reps *(tire les coudes vers les hanches)*\n' +
      '2. **Rowing T-Bar ou Rowing haltère unilatéral** : 3–4 × 8–12 reps *(trapèzes moyens & rhomboïdes)*\n' +
      '3. **Pull-over poulie haute ou Face Pull** : 3 × 15 reps *(finition grand dorsal & santé scapulaire)*',
    tip: 'Laisse tes omoplates s’étirer complètement en haut du mouvement avant chaque tirage (Wolf et al., 2023).',
  },
  {
    keys: ['bras', 'biceps', 'triceps', 'avant bras', 'arms', 'curl'],
    title: 'Bras (Biceps & Triceps — 3 chefs)',
    demoId: 'ex_ext_bayesian_cable_curl',
    exercises:
      '1. **Curl incliné haltères ou Bayesian Curl poulie** : 3 × 10–12 reps *(étire la longue portion du biceps)*\n' +
      '2. **Extensions triceps poulie au-dessus de la tête (Overhead)** : 3–4 × 10–12 reps *(+40 % d’hypertrophie de la longue portion du triceps)*\n' +
      '3. **Curl marteau corde + Dips serrés** : 3 × 12 reps *(brachial & vaste externe)*',
    tip: 'Verrouille les coudes fixes et vise 10 à 14 séries directes par semaine.',
  },
  {
    keys: ['epaule', 'epaules', 'deltoide', 'deltoides', 'shoulders', 'elevations laterales'],
    title: 'Épaules 3D (Antérieur, Latéral & Postérieur)',
    demoId: 'ex_club_machine_lateral_raise',
    exercises:
      '1. **Développé militaire haltères ou barre** : 3 × 6–10 reps\n' +
      '2. **Élévations latérales poulie basse ou machine** : 4 × 12–15 reps *(tension continue dès le bas)*\n' +
      '3. **Pec-Deck inversé (Oiseau) ou Face Pull** : 3 × 15 reps',
    tip: 'Monte dans le plan scapulaire (~20° vers l’avant) sans hausser les trapèzes.',
  },
  {
    keys: ['fessier', 'fessiers', 'glutes', 'hip thrust', 'fesses'],
    title: 'Fessiers (Grand, Moyen & Petit Glutéal)',
    demoId: 'ex_club_machine_hip_thrust',
    exercises:
      '1. **Hip Thrust barre ou machine (pause 1s en haut)** : 4 × 8–10 reps *(pic de contraction en extension)*\n' +
      '2. **Squat Bulgare buste penché ou RDL** : 3 × 8–10 reps *(étirement maximal sous charge)*\n' +
      '3. **Abduction fessiers machine ou poulie** : 3 × 15 reps *(moyen fessier)*',
    tip: 'En Squat Bulgare, penche légèrement le buste vers l’avant avec le tibia avant vertical.',
  },
  {
    keys: ['jambe', 'jambes', 'quadriceps', 'ischios', 'mollets', 'cuisses', 'squat', 'legs'],
    title: 'Jambes Complètes (Quadriceps, Ischios & Mollets)',
    demoId: 'ex_ext_hack_squat_machine',
    exercises:
      '1. **Hack Squat, Presse inclinée ou Squat profond** : 3–4 × 6–10 reps\n' +
      '2. **Soulevé de terre Roumain (RDL) + Leg Curl assis** : 3 × 8–12 reps\n' +
      '3. **Mollets debout ou assis (pause 2s en bas)** : 4 × 12–15 reps',
    tip: 'Le Leg Curl assis surpasse la version allongée grâce au pré-étirement des ischios à la hanche.',
  },
  {
    keys: ['abdo', 'abdos', 'abdominaux', 'ventre plat', 'gainage', 'six pack', 'core', 'abs'],
    title: 'Sangle Abdominale & Gainage Athlétique',
    demoId: 'ex_cali_roman_leg_raises',
    exercises:
      '1. **Relevés de jambes chaise romaine ou Crunch poulie haute** : 3 × 12–15 reps\n' +
      '2. **Ab Wheel Rollout ou Planche active RKC** : 3 × 10 reps / 45s\n' +
      '3. **Définition visuelle :** combine léger déficit (-15 %) et 8 500 pas/jour.',
    tip: 'Enroule réellement le bassin vers le sternum (et pas seulement les cuisses) pour recruter le grand droit.',
  },
];

const INTENT_RULES = [
  { id: 'greeting', keywords: ['bonjour', 'salut', 'coucou', 'hello', 'hey', 'hola'], weight: 3.1 },
  {
    id: 'full_day_menu',
    keywords: [
      'menu complet', 'plan repas', 'journee type', 'menu pour la journee',
      'plan alimentaire', 'full day meal', 'meal plan', 'menu completo',
    ],
    weight: 5.4,
  },
  {
    id: 'peri_workout',
    keywords: [
      'avant seance', 'apres seance', 'avant et apres', 'avant ma seance', 'apres ma seance',
      'avant le sport', 'apres le sport', 'fenetre anabolique', 'post workout', 'before and after',
    ],
    weight: 4.8,
  },
  { id: 'one_rm_calc', keywords: ['1rm', 'max au', 'reps a', 'repetitions a', 'force max'], weight: 4.7 },
  {
    id: 'cardio_zones',
    keywords: ['zone 2', 'fcmax', 'frequence cardiaque', 'vo2max', 'heart rate', 'zona 2'],
    weight: 4.6,
  },
  {
    id: 'steps_neat',
    keywords: ['combien de pas', '10000 pas', '8000 pas', 'neat', 'marche rapide', 'tapis incline', '12 3 30'],
    weight: 4.5,
  },
  {
    id: 'progressive_overload',
    keywords: [
      'surcharge progressive', 'double progression', 'augmenter les poids', 'augmenter les charges',
      'comment progresser', 'progressive overload',
    ],
    weight: 4.6,
  },
  {
    id: 'warmup_mobility',
    keywords: ['echauffement', 'echauffer', 'etirement', 'etirements', 'souplesse', 'mobilite', 'warmup'],
    weight: 4.3,
  },
  {
    id: 'cravings_cheat',
    keywords: [
      'fringale', 'faim', 'envie de sucre', 'grignotage', 'cheat meal', 'ecart', 'restaurant',
      'fast food', 'ballonnement', 'digestion', 'fibre', 'fibres',
    ],
    weight: 4.3,
  },
  {
    id: 'macros_calc',
    keywords: [
      'calculer mes calories', 'mes calories', 'mes macros', 'metabolisme', 'bmr', 'tdee', 'mifflin',
    ],
    weight: 4.4,
  },
  {
    id: 'muscle_anatomy',
    keywords: [
      'pectoraux', 'pecs', 'muscler le dos', 'largeur dos', 'biceps', 'triceps', 'prendre des bras',
      'epaules', 'deltoides', 'fessiers', 'quadriceps', 'ischios', 'mollets', 'abdos', 'abdominaux', 'ventre plat',
    ],
    weight: 4.4,
  },
  {
    id: 'substitution',
    keywords: [
      'remplacer', 'remplace', 'equivalent', 'equivalence', 'substituer',
      'alternative', 'echanger', 'swap', 'replace', 'cambiar', 'sustituir',
    ],
    weight: 4.6,
  },
  {
    id: 'supplements',
    keywords: [
      'creatine', 'creatina', 'cafeine', 'caffeine', 'bcaa', 'whey', 'caseine',
      'omega', 'magnesium', 'vitamine', 'collagene', 'complement', 'complements',
      'supplement', 'supplements', 'booster', 'preworkout',
    ],
    weight: 4.2,
  },
  {
    id: 'program_choice',
    keywords: [
      'quel programme', 'choisir programme', 'ppl', 'upper lower', 'full body',
      'combien de seances', 'combien de series', 'split', 'which program',
    ],
    weight: 4.0,
  },
  {
    id: 'protein_gap',
    keywords: ['proteine', 'proteines', 'combler', 'manque de prot', 'protein', 'proteina', 'quota'],
    weight: 3.7,
  },
  {
    id: 'meal_idea',
    keywords: [
      'que manger', 'quoi manger', 'idee repas', 'ce soir', 'diner', 'dejeuner',
      'petit dejeuner', 'collation', 'dinner', 'meal idea', 'cena',
    ],
    weight: 3.6,
  },
  {
    id: 'joint_pain',
    keywords: [
      'douleur', 'douleurs', 'mal a', 'mal au', 'mal aux', 'genou', 'genoux',
      'lombaire', 'lombaires', 'mal de dos', 'coude', 'poignet', 'tendinite', 'blessure',
    ],
    weight: 4.4,
  },
  {
    id: 'fatigue_sleep',
    keywords: [
      'fatigue', 'epuise', 'creve', 'mal dormi', 'sommeil', 'dormir', 'courbature',
      'courbatures', 'doms', 'deload', 'flemme', 'pas le temps',
    ],
    weight: 3.7,
  },
  {
    id: 'fatloss_bulk_science',
    keywords: [
      'seche', 'deficit', 'maigrir', 'perdre du gras', 'plateau', 'stagne',
      'prise de masse', 'surplus', 'grossir', 'jeune', 'intermittent', '16 8', 'alcool',
      'cardio', 'courir', 'etude', 'science',
    ],
    weight: 3.5,
  },
  {
    id: 'hydration',
    keywords: ['eau', 'hydratation', 'boire', 'crampe', 'electrolytes', 'water', 'hydration'],
    weight: 3.4,
  },
];

function detectTopIntent(normText, previousMemory) {
  if (previousMemory?.lastIntent === 'substitution' && previousMemory?.lastFoodId) {
    if (
      normText.includes('iso') ||
      normText.includes('calori') ||
      normText.includes('macro') ||
      /^\s*(et\s+|and\s+|y\s+)?(pour\s+|for\s+|para\s+)?\d+\s*(g|gr)?\s*\??$/.test(normText)
    ) {
      return 'substitution_followup';
    }
  }

  const padded = ` ${normText} `;
  let bestIntent = 'general';
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (kw.includes(' ')) {
        if (padded.includes(` ${kw} `)) score += rule.weight + 2.0;
      } else {
        const regex = new RegExp(`\\b${kw}s?\\b`);
        if (regex.test(normText)) score += rule.weight;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = rule.id;
    }
  }

  return bestIntent;
}

/**
 * Moteur IA Compositionnel Indépendant (0 quota externe, 0 ms, solveur nutritionnel & générateur de séances)
 */
export function generateCoachResponse(userMessage, context = {}) {
  warmUpCoachEngine();

  const {
    profile = {},
    todayMacros = { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    waterMl = 0,
    workoutHistory = [],
    previousMemory = null,
    lang = 'fr',
  } = context;

  const norm = normalizeText(userMessage);
  const targets = profile.targets || {
    kcal: 2200,
    protein: 140,
    carbs: 230,
    fat: 70,
    waterMl: 2800,
  };

  const weightKg = Number(profile.weight) || 74;
  const ageYears = Number(profile.age) || 28;
  const remKcal = Math.round(targets.kcal - (todayMacros.kcal || 0));
  const remProt = Math.round(targets.protein - (todayMacros.protein || 0));
  const remWater = Math.max(0, targets.waterMl - (waterMl || 0));
  const evidence = retrieveScientificEvidence(userMessage, lang, 2);
  const defaultSugs =
    QUICK_COACH_SUGGESTIONS_BY_LANG[lang] || QUICK_COACH_SUGGESTIONS_BY_LANG.fr;

  // PRIORITÉ A : Générateur de séance sur-mesure en langage naturel (ex: "Fais-moi une séance pecs haltères 35 min")
  const customWorkoutReply = tryComposeCustomWorkoutFromPrompt(userMessage, norm, profile);
  if (customWorkoutReply) {
    return {
      ...customWorkoutReply,
      sources: retrieveScientificEvidence('volume serie rir entrainement', lang, 2),
      suggestions: [
        'Que manger avant et après ma séance ?',
        'Comment appliquer la surcharge progressive ?',
        'Menu complet calibré sur mes macros du jour',
      ],
    };
  }

  // PRIORITÉ B : Solveur de repas à cible calorique précise (ex: "Repas du soir à 650 kcal")
  const targetedMealReply = tryComposeTargetedMealFromPrompt(userMessage, norm, profile);
  if (targetedMealReply) {
    return {
      ...targetedMealReply,
      sources: retrieveScientificEvidence('proteine repartition repas', lang, 2),
      suggestions: [
        'Menu complet calibré sur mes macros du jour',
        'Par quoi remplacer 80g de riz basmati ?',
        'Combler mes protéines du jour',
      ],
    };
  }

  // PRIORITÉ C : Recherche technique d'un exercice précis avec animation biomécanique (ex: "Comment bien exécuter le Hip Thrust ?")
  const techExerciseReply = tryLookupSpecificExercise(norm);
  if (techExerciseReply) {
    return {
      ...techExerciseReply,
      sources: retrieveScientificEvidence('amplitude etirement biomecanique', lang, 2),
      suggestions: [
        'Crée-moi une séance Pecs & Triceps de 35 min',
        'Comment appliquer la surcharge progressive ?',
        'Calculer mon 1RM pour 8 reps à 80 kg',
      ],
    };
  }

  // PRIORITÉ D : Calculateur multi-aliments & portions naturelles (ex: "Macros de 3 œufs, 70g d'avoine et 1 banane")
  const multiFoodReply = tryParseMultiFoodNutritionQuery(userMessage, norm);
  if (multiFoodReply) {
    return {
      ...multiFoodReply,
      sources: evidence,
      suggestions: [
        `Par quoi remplacer ${multiFoodReply.memory.lastGrams}g de cet aliment ?`,
        'Combler mes protéines du jour',
        'Menu complet calibré sur mes macros du jour',
      ],
    };
  }

  const intent = detectTopIntent(norm, previousMemory);

  if (intent === 'greeting' && norm.split(' ').length <= 6) {
    return {
      text:
        `Salut **${profile.name || 'Athlète'}** ! Je suis ton **Coach IA embarqué** (100 % autonome, sans quota ni limite).\n\n` +
        `Demande-moi avec précision ce dont tu as besoin :\n` +
        `• **« Crée-moi une séance dos & bras à la chaise romaine de 35 min »** *(lancement direct en 1 clic)*\n` +
        `• **« Macros de 3 œufs, 70g d'avoine et 1 banane »** *(calcul exact + ajout au journal)*\n` +
        `• **« Repas à 650 kcal »** ou **« Menu complet pour mes ${targets.kcal} kcal »**\n` +
        `• **« Comment exécuter le Hip Thrust / Soulevé de terre ? »** *(avec démonstration animée)*`,
      sources: [SCIENTIFIC_STUDIES[0], SCIENTIFIC_STUDIES[4]].map((s) => ({
        ...s,
        localizedSummary: s.summary[lang] || s.summary.fr,
      })),
      suggestions: defaultSugs.slice(0, 4),
      memory: { lastIntent: 'greeting' },
    };
  }

  if (intent === 'full_day_menu') {
    const compatible = RECIPES_DATA.map((r) => getLiveAdaptedRecipe(r, profile)).filter((r) =>
      isRecipeCompatibleWithProfile(r, profile)
    );
    const pickSlot = (slot, shareKcal) => {
      const pool = compatible.filter((r) => r.mealTypes.includes(slot));
      const list = pool.length > 0 ? pool : compatible;
      if (list.length === 0) return null;
      const chosen = list[Math.floor(Math.random() * Math.min(5, list.length))];
      const base = computeRecipeMacros(chosen, 1);
      const rawMult = shareKcal / Math.max(150, base.kcal);
      const mult = [0.5, 0.75, 1, 1.25, 1.5, 2].reduce((prev, curr) =>
        Math.abs(curr - rawMult) < Math.abs(prev - rawMult) ? curr : prev
      );
      return { recipe: chosen, mult, macros: computeRecipeMacros(chosen, mult) };
    };

    const b = pickSlot('breakfast', targets.kcal * 0.25);
    const l = pickSlot('lunch', targets.kcal * 0.35);
    const s = pickSlot('snack', targets.kcal * 0.12);
    const d = pickSlot('dinner', targets.kcal * 0.28);
    const plan = [
      { label: 'Petit-déjeuner', item: b },
      { label: 'Déjeuner', item: l },
      { label: 'Collation', item: s },
      { label: 'Dîner', item: d },
    ].filter((x) => x.item);

    const totalK = plan.reduce((acc, x) => acc + x.item.macros.kcal, 0);
    const totalP = Math.round(plan.reduce((acc, x) => acc + x.item.macros.protein, 0));

    const lines = plan.map(
      ({ label, item }) =>
        `• **${label}** : ${item.recipe.title} *(${item.mult}x)* → **${item.macros.kcal} kcal** · ${item.macros.protein}g P`
    );

    return {
      text:
        `**Journée alimentaire sur-mesure (${totalK} kcal · ${totalP}g P)** calibrée sur ta cible (${targets.kcal} kcal, adaptée à tes goûts) :\n\n` +
        lines.join('\n') +
        `\n\n*Consensus ISSN (Jäger et al., 2017) : 4 prises protéiques espacées de 3–4h maximisent la synthèse musculaire sur 24h.*`,
      sources: retrieveScientificEvidence('proteine repartition repas', lang, 2),
      suggestions: defaultSugs.slice(0, 4),
      memory: { lastIntent: 'full_day_menu' },
    };
  }

  if (intent === 'peri_workout') {
    const preCarbs = Math.round(weightKg * 0.8);
    const preProt = Math.round(weightKg * 0.35);
    const postProt = Math.round(weightKg * 0.4);
    const postCarbs = Math.round(weightKg * 1.0);

    return {
      text:
        `**Protocole Nutrition Avant & Après Séance (${weightKg} kg)** *(Aragon & Schoenfeld, 2013)* :\n\n` +
        `• **1h30–2h30 AVANT :** **~${preCarbs}g glucides digestes** + **~${preProt}g protéines** pauvres en graisses *(ex: avoine + Skyr/Whey + banane)*. Si <30 min : 1 banane ou compote.\n` +
        `• **Dans les 2h APRÈS :** **~${postProt}g protéines** + **~${postCarbs}g glucides** pour recharger le glycogène.\n` +
        `• **À retenir :** espacer le repas pré-séance et post-séance de **4h maximum** suffit à maximiser 100 % de l'anabolisme.`,
      sources: retrieveScientificEvidence('avant seance apres seance fenetre anabolique', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'peri_workout' },
    };
  }

  if (intent === 'muscle_anatomy') {
    const foundGuide =
      MUSCLE_GUIDES.find((g) => g.keys.some((k) => norm.includes(k))) || MUSCLE_GUIDES[0];
    const demoEx = EXERCISE_CATALOG.find((e) => e.id === foundGuide.demoId) || null;

    return {
      text:
        `**Protocole Hypertrophie — ${foundGuide.title}** *(10 à 16 séries/semaine)* :\n\n` +
        `${foundGuide.exercises}\n\n` +
        `**Clé biomécanique :** ${foundGuide.tip}`,
      exerciseDemo: demoEx,
      sources: retrieveScientificEvidence('amplitude etirement volume serie', lang, 2),
      suggestions: [
        `Crée-moi une séance ${foundGuide.title.split(' ')[0]} de 40 min`,
        'Comment appliquer la surcharge progressive ?',
        'Combler mes protéines du jour',
      ],
      memory: { lastIntent: 'muscle_anatomy' },
    };
  }

  if (intent === 'progressive_overload') {
    return {
      text:
        `**La Double Progression Scientifique** *(Plotkin et al., 2022 — PeerJ)* :\n\n` +
        `1. Fixe une fourchette, ex: **3 × 8 à 12 reps** à RIR 1–2.\n` +
        `2. Garde la **même charge** d'une séance à l'autre en gagnant +1 rep par série *(9-8-8 → 11-10-10 → 12-12-12)*.\n` +
        `3. Dès que **3 × 12** est validé proprement, monte de **+2,5 kg** *(+1 kg sur l'isolation)* et repars à 8 reps.`,
      sources: retrieveScientificEvidence('surcharge double progression rir', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'progressive_overload' },
    };
  }

  if (intent === 'warmup_mobility') {
    return {
      text:
        `**Échauffement Salle en 8 minutes** *(Behm et al., 2016)* :\n\n` +
        `• **3 min cardio progressif** (rameur/tapis incliné) + **2 min mobilité articulaire dynamique** *(aucun étirement statique long >60s avant les charges lourdes)*.\n` +
        `• **3 séries de chauffe sur ton 1er polyarticulaire :** **50 % × 8 reps** → **75 % × 4 reps** → **90 % × 1–2 reps explosives**, repos 2 min puis 1re série effective.`,
      sources: retrieveScientificEvidence('echauffement etirement mobilite', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'warmup_mobility' },
    };
  }

  if (intent === 'steps_neat') {
    const kcalPer8k = Math.round(weightKg * 4.2);
    return {
      text:
        `**Dépense NEAT & Pas Quotidiens (${weightKg} kg)** *(Paluch et al., 2022 — The Lancet)* :\n\n` +
        `• Viser **8 000 à 10 000 pas/jour** brûle **~${kcalPer8k} kcal/j** supplémentaires (~1,2 kg de gras/mois) sans creuser ta récupération nerveuse.\n` +
        `• En salle : protocole **Marche Inclinée Zone 2** *(pente 10–12 %, 4,8 km/h, 20–30 min après la muscu)*.`,
      sources: retrieveScientificEvidence('pas marche neat cardio', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'steps_neat' },
    };
  }

  if (intent === 'cravings_cheat') {
    return {
      text:
        `**Satiété & Gestion de Restaurant / Écart** *(Reynolds et al., 2019 — The Lancet)* :\n\n` +
        `• **Collation coupe-faim (~220 kcal) :** 200g Skyr 0 % + 100g fruits rouges + 10g amandes (protéines lentes + fibres).\n` +
        `• **Restaurant prévu ce soir :** fais un déjeuner riche en protéines maigres et légumes verts, profite sereinement de ton dîner, hydrate-toi bien et reprends ta routine normale demain matin.`,
      sources: retrieveScientificEvidence('faim fringale satiete fibre', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'cravings_cheat' },
    };
  }

  if (intent === 'macros_calc') {
    const calc = calculateNutritionalTargets(profile);
    return {
      text:
        `**Bilan Métabolique Exact (Mifflin-St Jeor)** :\n\n` +
        `• **Métabolisme au repos (BMR) :** **${calc.bmr} kcal/j** · **Maintien (TDEE) :** **${calc.tdee} kcal/j**\n` +
        `• **Cible active :** **${targets.kcal} kcal/j** → **${targets.protein}g P** *(${(targets.protein / weightKg).toFixed(1)} g/kg)* · **${targets.carbs}g G** · **${targets.fat}g L** · **${targets.waterMl} ml d'eau**.`,
      sources: retrieveScientificEvidence('metabolisme mifflin calorie proteine', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'macros_calc' },
    };
  }

  if (intent === 'one_rm_calc') {
    const nums =
      String(userMessage)
        .match(/\d+(?:[.,]\d+)?/g)
        ?.map((n) => Number(n.replace(',', '.'))) || [];
    const reps = nums.find((n) => n >= 2 && n <= 20) || 8;
    const load = nums.find((n) => n > 20) || 80;
    const est1Rm = Math.round(load * (1 + reps / 30));

    return {
      text:
        `**Force Max (Équation d'Epley)** pour **${reps} reps à ${load} kg** :\n\n` +
        `• **1RM théorique :** **${est1Rm} kg**\n` +
        `• **Force (85 % — 4–6 reps) :** **${Math.round(est1Rm * 0.85)} kg**\n` +
        `• **Hypertrophie (75 % — 8–12 reps) :** **${Math.round(est1Rm * 0.75)} kg**\n` +
        `• **Endurance / Technique (65 %) :** **${Math.round(est1Rm * 0.65)} kg**`,
      sources: retrieveScientificEvidence('repos force serie rir', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'one_rm_calc' },
    };
  }

  if (intent === 'cardio_zones') {
    const fcMax = Math.round(208 - 0.7 * ageYears);
    return {
      text:
        `**Zones Cardiaques Tanaka (${ageYears} ans → FCmax ≈ ${fcMax} bpm)** :\n\n` +
        `• **Zone 2 (Oxydation lipidique & mitochondries) :** **${Math.round(fcMax * 0.65)} à ${Math.round(fcMax * 0.75)} bpm**\n` +
        `• **Zone 4–5 (VO2max / HIIT) :** **${Math.round(fcMax * 0.85)} à ${Math.round(fcMax * 0.92)} bpm**`,
      sources: retrieveScientificEvidence('cardio zone 2 hiit', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'cardio_zones' },
    };
  }

  if (intent === 'substitution' || intent === 'substitution_followup') {
    const isIso = norm.includes('iso') || norm.includes('calori') || norm.includes('kcal');
    const mode = isIso ? 'iso_kcal' : 'dominant_macro';

    let targetFood = null;
    let grams = null;

    if (intent === 'substitution_followup' && previousMemory?.lastFoodId) {
      targetFood = getAllFoods().find((f) => f.id === previousMemory.lastFoodId);
      grams = extractGramsSmart(userMessage, targetFood);
    } else {
      const cleaned = cleanFoodSearchPhrase(
        norm.replace(/\b(remplacer|remplace|substituer|equivalent|par|quoi|swap|replace)\b/g, ' ')
      );
      targetFood = findFoodByQuery(cleaned) || findFoodByQuery(norm);
      if (targetFood) grams = extractGramsSmart(userMessage, targetFood);
    }

    if (targetFood) {
      const result = computeSubstitutions(targetFood, grams || 100, mode, profile);
      const topAlts = (result?.alternatives || []).slice(0, 4);

      if (topAlts.length > 0) {
        const lines = topAlts.map(
          (alt) =>
            `• **${alt.grams}g ${alt.food.name}** *(${alt.food.state})* → ${alt.macros.kcal} kcal | ${alt.macros.protein}g P · ${alt.macros.carbs}g G · ${alt.macros.fat}g L *(${alt.deltaBadges.kcal})*`
        );

        return {
          text:
            `Équivalences pour **${result.sourceGrams}g de ${targetFood.name}** *(${result.sourceMacros.kcal} kcal, ${result.sourceMacros.protein}g P, ${result.sourceMacros.carbs}g G)* en mode **${result.equivalenceLabel}** :\n\n` +
            lines.join('\n'),
          sources: evidence,
          suggestions: [
            mode === 'dominant_macro' ? 'Et en mode iso-calorique ?' : 'Et en macro dominante ?',
            `Et pour ${roundToNearest5g(result.sourceGrams * 1.5)}g ?`,
            'Combler mes protéines du jour',
          ],
          memory: {
            lastIntent: 'substitution',
            lastFoodId: targetFood.id,
            lastGrams: result.sourceGrams,
          },
        };
      }
    }
  }

  if (intent === 'supplements') {
    const creatDose = Math.max(3, Math.min(5, Math.round(weightKg * 0.05)));
    return {
      text:
        `**Compléments validés pour ${weightKg} kg (Consensus ISSN & CIO)** :\n\n` +
        `• **Créatine Monohydrate :** **${creatDose}g/jour** tous les jours au repas (Niveau A).\n` +
        `• **Caféine :** **${Math.round(weightKg * 3)}–${Math.round(weightKg * 5)} mg** 45 min pré-séance (éviter <6h avant sommeil).\n` +
        `• **Whey / Protéine végétale :** uniquement par praticité pour boucler tes **${targets.protein}g P/j**.\n` +
        `• **Santé :** Vitamine D3, Oméga-3 (1–2g EPA/DHA) & Magnésium bisglycinate. *(BCAA superflus si quota protéique atteint).*`,
      sources: retrieveScientificEvidence('creatine cafeine bcaa omega', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'supplements' },
    };
  }

  if (intent === 'program_choice') {
    return {
      text:
        `**Structure optimale selon ta fréquence (${WORKOUT_PROGRAMS.length} programmes prêts dans l'onglet Séances)** :\n\n` +
        `• **2–3x / sem :** *Full Body Poids du Corps*, *Anneaux/TRX* ou *Haltères Maison*\n` +
        `• **3–4x / sem :** *Callisthénie & Chaise Romaine*, *Full Élastiques* ou *Upper / Lower*\n` +
        `• **5–6x / sem :** *Push / Pull / Legs (PPL)*\n\n` +
        `*Tu peux aussi me dire : « Crée-moi une séance [muscles] avec [matériel] de [X] min » !*`,
      sources: retrieveScientificEvidence('volume serie programme entrainement', lang, 2),
      suggestions: [
        'Crée-moi une séance Pecs & Triceps de 35 min',
        'Crée-moi une séance Dos & Bras chaise romaine de 30 min',
        'Menu complet calibré sur mes macros du jour',
      ],
      memory: { lastIntent: 'program_choice' },
    };
  }

  if (intent === 'protein_gap') {
    if (remProt <= 5) {
      return {
        text: `Cible protéique atteinte (**${Math.round(todayMacros.protein)}g / ${targets.protein}g**) ! Il te reste **${remWater} ml d'eau** à boire d'ici ce soir.`,
        sources: evidence,
        suggestions: defaultSugs.slice(0, 3),
        memory: { lastIntent: 'protein_gap' },
      };
    }

    const protGap = Math.min(60, Math.max(20, remProt));
    const candidates = getCompatibleProteinFoods(profile);
    const picks = ['skyr_0', 'poulet_blanc', 'tofu_ferme', 'thon_naturel', 'whey_isolate', 'petit_suisse_faisselle_0']
      .map((id) => candidates.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, 3);

    const optLines = picks.map((food) => {
      const g = roundToNearest5g(Math.min(350, Math.max(25, (protGap / food.per100g.protein) * 100)));
      const m = calculateFoodMacros(food, g);
      return `• **${g}g ${food.name}** → **+${m.protein}g P** (${m.kcal} kcal)`;
    });

    return {
      text:
        `Il te manque **${remProt}g de protéines** aujourd'hui (${Math.max(0, remKcal)} kcal disponibles). Voici 3 options immédiates :\n\n` +
        optLines.join('\n'),
      mealAction: picks[0]
        ? (() => {
            const g = roundToNearest5g(
              Math.min(300, Math.max(30, (protGap / picks[0].per100g.protein) * 100))
            );
            const m = calculateFoodMacros(picks[0], g);
            return {
              title: `Boost Protéines (${picks[0].name})`,
              kcal: m.kcal,
              protein: m.protein,
              items: [{ foodId: picks[0].id, grams: g }],
            };
          })()
        : undefined,
      sources: evidence,
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'protein_gap' },
    };
  }

  if (intent === 'meal_idea') {
    const budget = remKcal > 240 ? Math.min(850, remKcal) : Math.round(targets.kcal * 0.32);
    return (
      tryComposeTargetedMealFromPrompt(`${budget} kcal ${userMessage}`, norm, profile) || {
        text: `Il te reste **${Math.max(0, remKcal)} kcal** et **${Math.max(0, remProt)}g P** aujourd'hui.`,
        sources: evidence,
        suggestions: defaultSugs.slice(0, 3),
      }
    );
  }

  if (intent === 'joint_pain') {
    return {
      text:
        `**Adaptation Biomécanique Sans Douleur** *(consulte un professionnel de santé si douleur aiguë)* :\n\n` +
        `• **Épaule :** privilégie la **prise neutre aux haltères** dans le plan scapulaire (coudes 35°), le *Floor Press* et le *Face Pull*.\n` +
        `• **Genou :** remplace les sauts/fentes avant par des **fentes arrière contrôlées** (tibia vertical), du **Hip Thrust** et de la **Chaise isométrique au mur**.\n` +
        `• **Lombaires :** **Rowing poitrine appuyée**, **Presse/Squat Bulgare** et protocole **Big 3 de McGill**.`,
      sources: retrieveScientificEvidence('douleur lombaire epaule genou mcgill', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'joint_pain' },
    };
  }

  if (intent === 'fatigue_sleep') {
    return {
      text:
        `**Autorégulation de la Séance (Fatigue / Sommeil court)** :\n\n` +
        `• Active le mode **« -25 % »** dans l'onglet Séances et arrête tes séries à **RIR 2** (*Refalo et al., 2023*) : tu préserves 100 % du signal musculaire sans épuiser ton système nerveux central.\n` +
        `• Si tu n'as que 20 min : dis-moi *« Crée-moi une séance de 20 min »* !`,
      sources: retrieveScientificEvidence('sommeil fatigue courbature rir', lang, 2),
      suggestions: ['Crée-moi une séance Full Body de 20 min', ...defaultSugs.slice(0, 2)],
      memory: { lastIntent: 'fatigue_sleep' },
    };
  }

  if (intent === 'fatloss_bulk_science' || intent === 'hydration') {
    const main = evidence[0];
    const sec = evidence[1];
    return {
      text:
        `**Réponse Scientifique Personnalisée (${weightKg} kg · ${targets.kcal} kcal/j) :**\n\n` +
        `• **${main.citation}** : ${main.localizedSummary}\n` +
        (sec ? `• **${sec.citation}** : ${sec.localizedSummary}\n` : '') +
        `\n**Aujourd'hui :** il te reste **${Math.max(0, remKcal)} kcal**, **${Math.max(0, remProt)}g P** et **${remWater} ml d'eau**.`,
      sources: evidence,
      suggestions: defaultSugs.slice(0, 4),
      memory: { lastIntent: intent },
    };
  }

  // Repli intelligent : vérifie d'abord si la question porte sur un aliment isolé
  const cleanedSingle = cleanFoodSearchPhrase(norm);
  const directFood = cleanedSingle ? findFoodByQuery(cleanedSingle) : null;
  if (directFood) {
    const g = extractGramsSmart(userMessage, directFood);
    const m = calculateFoodMacros(directFood, g);
    return {
      text:
        `**${g}g de ${directFood.name}** *(${directFood.state})* apportent :\n\n` +
        `• **${m.kcal} kcal** · **${m.protein}g Protéines** · **${m.carbs}g Glucides** · **${m.fat}g Lipides** *(Fibres : ${m.fiber}g)*`,
      mealAction: {
        title: directFood.name,
        kcal: m.kcal,
        protein: m.protein,
        items: [{ foodId: directFood.id, grams: g }],
      },
      sources: evidence,
      suggestions: [`Par quoi remplacer ${g}g de ${directFood.name} ?`, ...defaultSugs.slice(0, 2)],
      memory: { lastIntent: 'substitution', lastFoodId: directFood.id, lastGrams: g },
    };
  }

  return {
    text:
      `**Synthèse (${profile.name || 'Athlète'} · ${targets.kcal} kcal/j)**\n\n` +
      `• **Référence scientifique (${evidence[0].citation}) :** ${evidence[0].localizedSummary}\n\n` +
      `*Astuce : demande-moi précisément **« Crée une séance [muscles/matériel] de 35 min »**, **« Macros de [tes aliments] »**, **« Repas à [X] kcal »** ou **« Comment faire [nom d'exercice] »** !*`,
    sources: evidence,
    suggestions: defaultSugs.slice(0, 4),
    memory: { lastIntent: 'summary' },
  };
}
