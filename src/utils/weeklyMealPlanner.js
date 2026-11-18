// Générateur de Semaine (« Du Placard au Menu Complet ») :
// - Prend quelques ingrédients fournis par l'utilisateur
// - Compose des recettes sur-mesure sur 3 à 7 jours calées sur ses macros & exclusions
// - Combine en priorité ses ingrédients disponibles et calcule au gramme près CE QU'IL MANQUE

import {
  getAllFoods,
  getFoodById,
  calculateFoodMacros,
  isFoodCompatibleWithProfile,
  AISLE_CATEGORIES,
} from '../data/foodDatabase.js';
import { RECIPES_DATA, computeRecipeMacros } from '../data/recipesData.js';
import { normalizeText, roundToNearest5g } from './substitutionEngine.js';
import {
  resolveDynamicRecipe,
  getVariedRecipesForFood,
} from './foodRecipeSuggester.js';

const BASE_STAPLE_CANDIDATE_IDS = [
  'poulet_blanc',
  'oeufs_entiers',
  'riz_basmati_cru',
  'flocons_avoine',
  'skyr_0',
  'thon_naturel',
  'pates_completes_crues',
  'patate_douce_crue',
  'saumon_frais',
  'tofu_ferme',
  'lentilles_corail_crues',
  'courgette',
  'brocoli',
  'banane',
  'avocat',
  'pain_complet',
  'fromage_blanc_0',
  'steak_hache_5',
  'huile_olive',
];

const COMMON_SHORTHAND_ALIASES = {
  poulet: 'poulet_blanc',
  dinde: 'dinde_filet',
  oeuf: 'oeufs_entiers',
  oeufs: 'oeufs_entiers',
  riz: 'riz_basmati_cru',
  pate: 'pates_completes_crues',
  pates: 'pates_completes_crues',
  avoine: 'flocons_avoine',
  flocons: 'flocons_avoine',
  skyr: 'skyr_0',
  thon: 'thon_naturel',
  saumon: 'saumon_frais',
  cabillaud: 'cabillaud',
  patate: 'patate_douce_crue',
  'patate douce': 'patate_douce_crue',
  'pomme de terre': 'pomme_de_terre_crue',
  'pommes de terre': 'pomme_de_terre_crue',
  steak: 'steak_hache_5',
  boeuf: 'steak_hache_5',
  tofu: 'tofu_ferme',
  lentilles: 'lentilles_corail_crues',
  quinoa: 'quinoa_cru',
  pain: 'pain_complet',
  yaourt: 'yaourt_grec',
  'fromage blanc': 'fromage_blanc_0',
  fruits: 'myrtilles_fruits_rouges',
  'fruits rouges': 'myrtilles_fruits_rouges',
  myrtilles: 'myrtilles_fruits_rouges',
  huile: 'huile_olive',
  "huile d'olive": 'huile_olive',
  epinard: 'epinards_frais',
  epinards: 'epinards_frais',
  haricots: 'haricots_verts',
};

function cleanFoodShort(name = '') {
  return String(name)
    .split('(')[0]
    .split('·')[0]
    .replace(
      /\b(frais|fraîche|fraiches|cru|crue|crus|crues|cuit|cuite|cuits|nature|naturel|égoutté|sans peau|0%\s*MG|0%)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function shiftIsoDate(dateStr, deltaDays) {
  const [y, m, d] = String(dateStr || '').split('-').map(Number);
  const dt = y && m && d ? new Date(y, m - 1, d, 12, 0, 0) : new Date();
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function formatShortPlanDate(dateStr, lang = 'fr') {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
    const raw = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(dt);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return dateStr;
  }
}

/**
 * Retourne une sélection d'ingrédients de base compatibles avec le profil pour un ajout en 1 clic
 */
export function getQuickPantryStaples(profile, limit = 12) {
  const result = [];
  for (const id of BASE_STAPLE_CANDIDATE_IDS) {
    const f = getFoodById(id);
    if (f && isFoodCompatibleWithProfile(f, profile)) {
      result.push(f);
    }
    if (result.length >= limit) break;
  }
  if (result.length < limit) {
    for (const f of getAllFoods()) {
      if (result.some((r) => r.id === f.id)) continue;
      if (isFoodCompatibleWithProfile(f, profile)) {
        result.push(f);
      }
      if (result.length >= limit) break;
    }
  }
  return result;
}

/**
 * Analyse une saisie libre (ex: "poulet, riz, œufs, courgette et banane") et retrouve les aliments exacts
 */
export function parsePantryTextToFoods(rawText = '', profile) {
  const parts = String(rawText || '')
    .split(/[,;\n+/]+|\s+et\s+|\s*&\s*/i)
    .map((p) => p.replace(/^\d+\s*(g|kg|ml|l)?\s*(de\s+|d')?/i, '').trim())
    .filter((p) => p.length >= 2);

  if (parts.length === 0) return [];

  const compatibleFoods = getAllFoods().filter((f) =>
    isFoodCompatibleWithProfile(f, profile)
  );
  const matched = [];
  const seen = new Set();

  for (const rawPart of parts) {
    const norm = normalizeText(rawPart);
    if (!norm) continue;

    // 1. Alias direct fréquent ("riz", "poulet", "oeufs", "avoine"...)
    const aliasId = COMMON_SHORTHAND_ALIASES[norm];
    if (aliasId) {
      const aliasFood = getFoodById(aliasId);
      if (aliasFood && isFoodCompatibleWithProfile(aliasFood, profile) && !seen.has(aliasFood.id)) {
        seen.add(aliasFood.id);
        matched.push(aliasFood);
        continue;
      }
    }

    // 2. Recherche pondérée sur le catalogue compatible
    const singularNorm = norm.endsWith('s') && norm.length > 3 ? norm.slice(0, -1) : norm;
    let bestFood = null;
    let bestScore = 0;

    for (const f of compatibleFoods) {
      const fNorm = normalizeText(f.name);
      const fShort = normalizeText(cleanFoodShort(f.name));
      let sc = 0;
      if (fNorm === norm || fShort === norm || fShort === singularNorm) sc = 120;
      else if (fShort.startsWith(norm) || fShort.startsWith(singularNorm)) sc = 90;
      else if (
        fShort.split(' ').includes(norm) ||
        fShort.split(' ').includes(singularNorm)
      ) {
        sc = 75;
      } else if (fNorm.includes(norm) || fNorm.includes(singularNorm)) {
        sc = 45;
      }

      if (sc > bestScore) {
        bestScore = sc;
        bestFood = f;
      }
    }

    if (bestFood && bestScore >= 45 && !seen.has(bestFood.id)) {
      seen.add(bestFood.id);
      matched.push(bestFood);
    }
  }

  return matched;
}

function pickCompatibleFallback(preferredIds, swapGroup, profile, excludeIds = []) {
  for (const id of preferredIds) {
    if (excludeIds.includes(id)) continue;
    const f = getFoodById(id);
    if (f && isFoodCompatibleWithProfile(f, profile)) return f;
  }
  return (
    getAllFoods().find(
      (f) =>
        !excludeIds.includes(f.id) &&
        f.swapGroup === swapGroup &&
        isFoodCompatibleWithProfile(f, profile)
    ) || getFoodById(preferredIds[0])
  );
}

/**
 * Synthétise des recettes sur-mesure combinant DIRECTEMENT plusieurs des ingrédients fournis par l'utilisateur
 * en n'ajoutant que les 1 ou 2 ingrédients complémentaires manquants !
 */
function synthesizePantryComboRecipes(pantryFoods = [], profile) {
  if (!Array.isArray(pantryFoods) || pantryFoods.length === 0) return [];

  const isSweetDairyOrProtein = (f) =>
    f.swapGroup === 'laitiers_boissons' ||
    f.id.includes('whey') ||
    f.id.includes('skyr') ||
    f.id.includes('fromage_blanc') ||
    f.id.includes('yaourt');

  const savoryProteins = pantryFoods.filter(
    (f) =>
      (f.swapGroup === 'proteines_maigres' || f.swapGroup === 'proteines_lipides') &&
      !isSweetDairyOrProtein(f)
  );
  const breakfastProteins = pantryFoods.filter(
    (f) => isSweetDairyOrProtein(f) || f.id.includes('oeuf')
  );
  const breakfastCarbs = pantryFoods.filter(
    (f) =>
      (f.swapGroup === 'glucides_complexes' &&
        (f.id.includes('avoine') ||
          f.id.includes('sarrasin') ||
          f.id.includes('creme_de_riz') ||
          f.id.includes('pain') ||
          f.id.includes('muesli') ||
          f.id.includes('tartine'))) ||
      false
  );
  const savoryStarches = pantryFoods.filter(
    (f) =>
      (f.swapGroup === 'glucides_complexes' || f.swapGroup === 'legumineuses') &&
      !f.id.includes('avoine') &&
      !f.id.includes('muesli') &&
      !f.id.includes('creme_de_riz')
  );
  const veggies = pantryFoods.filter((f) => f.swapGroup === 'legumes');
  const fruits = pantryFoods.filter((f) => f.swapGroup === 'fruits');
  const fats = pantryFoods.filter((f) => f.swapGroup === 'lipides_sains');

  const combos = [];

  // 1. COMBOS DÉJEUNER & DÎNER autour des protéines/féculents/légumes du placard
  const protsToUse =
    savoryProteins.length > 0
      ? savoryProteins
      : [
          pickCompatibleFallback(
            ['poulet_blanc', 'oeufs_entiers', 'tofu_ferme', 'cabillaud'],
            'proteines_maigres',
            profile
          ),
        ].filter(Boolean);

  const starchesToUse =
    savoryStarches.length > 0
      ? savoryStarches
      : [
          pickCompatibleFallback(
            ['riz_basmati_cru', 'patate_douce_crue', 'pates_completes_crues', 'quinoa_cru'],
            'glucides_complexes',
            profile
          ),
        ].filter(Boolean);

  const vegsToUse =
    veggies.length > 0
      ? veggies
      : [
          pickCompatibleFallback(
            ['courgette', 'brocoli', 'haricots_verts', 'epinards_frais'],
            'legumes',
            profile
          ),
          pickCompatibleFallback(
            ['brocoli', 'epinards_frais', 'poivron', 'tomate'],
            'legumes',
            profile
          ),
        ].filter(Boolean);

  const cookingOil =
    fats.find((f) => f.id.includes('huile')) ||
    pickCompatibleFallback(['huile_olive', 'huile_colza'], 'lipides_sains', profile);

  protsToUse.slice(0, 4).forEach((prot, pIdx) => {
    const starch = starchesToUse[pIdx % starchesToUse.length];
    const veg = vegsToUse[pIdx % vegsToUse.length];
    if (!prot || !starch || !veg || !cookingOil) return;

    const pName = cleanFoodShort(prot.name);
    const sName = cleanFoodShort(starch.name);
    const vName = cleanFoodShort(veg.name);

    combos.push({
      id: `pantry_lunch_${prot.id}_${starch.id}_${veg.id}`,
      title: `Assiette ${pName}, ${sName} & ${vName}`,
      mealTypes: ['lunch', 'dinner'],
      prepMinutes: 15,
      goalTag: 'Sur-mesure Placard',
      isPantryCombo: true,
      ingredients: [
        { foodId: prot.id, grams: prot.defaultGrams || 150 },
        { foodId: starch.id, grams: starch.defaultGrams || 75 },
        { foodId: veg.id, grams: veg.defaultGrams || 160 },
        ...(cookingOil.id !== prot.id && cookingOil.id !== veg.id
          ? [{ foodId: cookingOil.id, grams: 10 }]
          : []),
      ],
      steps: [
        `Cuire ${sName.toLowerCase()} selon le temps indiqué.`,
        `Saisir ${pName.toLowerCase()} et ${vName.toLowerCase()} à la poêle avec un filet de ${cleanFoodShort(cookingOil.name).toLowerCase()} et herbes.`,
        'Dresser chaud et assaisonner selon tes goûts.',
      ],
    });

    // Seconde variante poêlée / bowl pour alterner midi et soir
    const veg2 = vegsToUse[(pIdx + 1) % vegsToUse.length] || veg;
    const starch2 = starchesToUse[(pIdx + 1) % starchesToUse.length] || starch;
    if (veg2.id !== veg.id || starch2.id !== starch.id) {
      const s2Name = cleanFoodShort(starch2.name);
      const v2Name = cleanFoodShort(veg2.name);
      combos.push({
        id: `pantry_dinner_${prot.id}_${starch2.id}_${veg2.id}`,
        title: `Poêlée ${pName}, ${v2Name} & ${s2Name}`,
        mealTypes: ['dinner', 'lunch'],
        prepMinutes: 14,
        goalTag: 'Sur-mesure Placard',
        isPantryCombo: true,
        ingredients: [
          { foodId: prot.id, grams: prot.defaultGrams || 150 },
          { foodId: veg2.id, grams: 180 },
          { foodId: starch2.id, grams: Math.max(50, roundToNearest5g((starch2.defaultGrams || 75) * 0.85)) },
          { foodId: cookingOil.id, grams: 10 },
        ],
        steps: [
          `Faire revenir ${v2Name.toLowerCase()} et ${pName.toLowerCase()} à feu moyen.`,
          `Accompagner de ${s2Name.toLowerCase()} et rectifier l'assaisonnement.`,
        ],
      });
    }
  });

  // 2. COMBOS PETIT-DÉJEUNER & COLLATION autour des ingrédients matinaux du placard
  if (breakfastProteins.length > 0 || breakfastCarbs.length > 0 || fruits.length > 0) {
    const bProt =
      breakfastProteins[0] ||
      pickCompatibleFallback(
        ['skyr_0', 'fromage_blanc_0', 'yaourt_soja_nature', 'oeufs_entiers'],
        'laitiers_boissons',
        profile
      );
    const bCarb =
      breakfastCarbs[0] ||
      pickCompatibleFallback(
        ['flocons_avoine', 'pain_complet', 'pain_levain'],
        'glucides_complexes',
        profile
      );
    const bFruit =
      fruits[0] ||
      pickCompatibleFallback(
        ['banane', 'myrtilles_fruits_rouges', 'pomme'],
        'fruits',
        profile
      );
    const bNut =
      fats.find((f) => !f.id.includes('huile')) ||
      pickCompatibleFallback(
        ['amandes', 'puree_amande', 'beurre_cacahuete', 'noix'],
        'lipides_sains',
        profile
      );

    if (bProt && bCarb && bFruit) {
      const isEggBreakfast = bProt.id.includes('oeuf');
      if (isEggBreakfast) {
        combos.push({
          id: `pantry_bfast_eggs_${bCarb.id}_${bFruit.id}`,
          title: `${cleanFoodShort(bProt.name)} brouillés, ${cleanFoodShort(bCarb.name)} & ${cleanFoodShort(bFruit.name)}`,
          mealTypes: ['breakfast'],
          prepMinutes: 8,
          goalTag: 'Matin Placard',
          isPantryCombo: true,
          ingredients: [
            { foodId: bProt.id, grams: 150 },
            { foodId: bCarb.id, grams: 70 },
            { foodId: bFruit.id, grams: 110 },
          ],
          steps: [
            `Cuire les ${cleanFoodShort(bProt.name).toLowerCase()} doux à la poêle et toaster ${cleanFoodShort(bCarb.name).toLowerCase()}.`,
            `Accompagner de ${cleanFoodShort(bFruit.name).toLowerCase()} en fin de repas.`,
          ],
        });
      } else {
        combos.push({
          id: `pantry_bfast_bowl_${bProt.id}_${bCarb.id}_${bFruit.id}`,
          title: `Bol ${cleanFoodShort(bProt.name)}, ${cleanFoodShort(bCarb.name)} & ${cleanFoodShort(bFruit.name)}`,
          mealTypes: ['breakfast', 'snack'],
          prepMinutes: 5,
          goalTag: 'Matin Placard',
          isPantryCombo: true,
          ingredients: [
            { foodId: bProt.id, grams: 150 },
            { foodId: bCarb.id, grams: 60 },
            { foodId: bFruit.id, grams: 110 },
            ...(bNut ? [{ foodId: bNut.id, grams: 15 }] : []),
          ],
          steps: [
            `Mélanger ${cleanFoodShort(bProt.name).toLowerCase()} et ${cleanFoodShort(bCarb.name).toLowerCase()} dans un bol.`,
            `Ajouter ${cleanFoodShort(bFruit.name).toLowerCase()} coupé${bNut ? ` et ${cleanFoodShort(bNut.name).toLowerCase()}` : ''}.`,
          ],
        });
      }
    }

    if (bProt && bFruit) {
      combos.push({
        id: `pantry_snack_${bProt.id}_${bFruit.id}`,
        title: `En-cas ${cleanFoodShort(bProt.name)} & ${cleanFoodShort(bFruit.name)}`,
        mealTypes: ['snack'],
        prepMinutes: 3,
        goalTag: 'Collation Placard',
        isPantryCombo: true,
        ingredients: [
          { foodId: bProt.id, grams: 140 },
          { foodId: bFruit.id, grams: 110 },
          ...(bNut ? [{ foodId: bNut.id, grams: 15 }] : []),
        ],
        steps: [
          `Assembler ${cleanFoodShort(bProt.name).toLowerCase()} et ${cleanFoodShort(bFruit.name).toLowerCase()} frais.`,
        ],
      });
    }
  }

  return combos;
}

/**
 * Construit le vivier complet de recettes candidates adaptées au profil et scorées selon le placard
 */
function buildScoredPoolBySlot(pantryFoodIds = [], profile, customRecipes = []) {
  const pantrySet = new Set(pantryFoodIds);
  const pantryFoods = pantryFoodIds.map((id) => getFoodById(id)).filter(Boolean);

  const rawRecipes = [
    ...synthesizePantryComboRecipes(pantryFoods, profile),
    ...(customRecipes || []),
    ...RECIPES_DATA,
  ];

  // Ajoute aussi des variantes chef autour des ingrédients spécifiques du placard
  for (const pf of pantryFoods.slice(0, 6)) {
    const varied = getVariedRecipesForFood(pf, profile, customRecipes, 4);
    for (const v of varied) {
      rawRecipes.push({
        id: v.id,
        title: v.title,
        mealTypes: v.mealTypes || [v.primarySlot || 'lunch'],
        prepMinutes: v.prepMinutes || 12,
        goalTag: v.goalTag || 'Idée Placard',
        ingredients: v.ingredients,
        steps: v.steps || [],
      });
    }
  }

  const seenIds = new Set();
  const seenTitles = new Set();
  const bySlot = {
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
  };

  for (const raw of rawRecipes) {
    if (!raw || seenIds.has(raw.id)) continue;
    const resolved = raw.isPantryCombo ? raw : resolveDynamicRecipe(raw, profile);
    if (!resolved || !Array.isArray(resolved.ingredients) || resolved.ingredients.length === 0) {
      continue;
    }

    const allCompatible = resolved.ingredients.every((ing) => {
      const f = getFoodById(ing.foodId);
      return f && isFoodCompatibleWithProfile(f, profile);
    });
    if (!allCompatible) continue;

    const normTitle = normalizeText(resolved.title);
    if (seenTitles.has(normTitle)) continue;

    const baseMacros = computeRecipeMacros(resolved, 1);
    if (baseMacros.kcal < 80) continue;

    seenIds.add(resolved.id);
    seenTitles.add(normTitle);

    const matchedIds = resolved.ingredients
      .filter((ing) => pantrySet.has(ing.foodId))
      .map((ing) => ing.foodId);
    const missingIds = resolved.ingredients
      .filter((ing) => !pantrySet.has(ing.foodId))
      .map((ing) => ing.foodId);

    const coverageRatio = matchedIds.length / resolved.ingredients.length;
    const pantryScore =
      matchedIds.length * 38 +
      Math.round(coverageRatio * 30) -
      missingIds.length * 4 +
      (raw.isPantryCombo && pantrySet.size > 0 ? 18 : 0) +
      ((profile?.favoriteRecipeIds || []).includes(resolved.id) ? 14 : 0);

    const candidate = {
      ...resolved,
      baseMacros,
      matchedPantryIds: matchedIds,
      missingFoodIds: missingIds,
      pantryScore,
    };

    const slots = Array.isArray(resolved.mealTypes) && resolved.mealTypes.length > 0
      ? resolved.mealTypes
      : ['lunch', 'dinner'];

    for (const s of slots) {
      if (bySlot[s]) {
        bySlot[s].push(candidate);
      }
    }
  }

  Object.keys(bySlot).forEach((s) => {
    bySlot[s].sort((a, b) => b.pantryScore - a.pantryScore);
  });

  return bySlot;
}

function scaleRecipeToTargetKcal(candidate, targetSlotKcal, pantrySet) {
  const rawMult = targetSlotKcal / Math.max(90, candidate.baseMacros.kcal);
  const clampedMult = Math.min(1.85, Math.max(0.55, Math.round(rawMult * 20) / 20));

  const scaledItems = candidate.ingredients.map((ing) => ({
    foodId: ing.foodId,
    grams: Math.max(5, roundToNearest5g(ing.grams * clampedMult)),
    inPantry: pantrySet.has(ing.foodId),
  }));

  const totals = scaledItems.reduce(
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

  return {
    recipeId: candidate.id,
    title: candidate.title,
    prepMinutes: candidate.prepMinutes || 12,
    portionMultiplier: clampedMult,
    steps: candidate.steps || [],
    items: scaledItems,
    macros: {
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
  };
}

function sumDayMealsMacros(dayMealsObj) {
  return Object.values(dayMealsObj).reduce(
    (acc, meal) => {
      if (!meal?.macros) return acc;
      acc.kcal += meal.macros.kcal;
      acc.protein += meal.macros.protein;
      acc.carbs += meal.macros.carbs;
      acc.fat += meal.macros.fat;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Calcule le bilan complet des ingrédients :
 * - Ceux que l'utilisateur possède déjà (pantryUsed)
 * - Ceux qu'il manque pour réaliser toutes les recettes de la semaine (missingItems)
 */
export function computePlanInventorySummary(days = [], pantryFoodIds = []) {
  const pantrySet = new Set(pantryFoodIds);
  const aggMap = new Map();

  for (const day of days) {
    Object.values(day.meals || {}).forEach((meal) => {
      if (!meal?.items) return;
      for (const it of meal.items) {
        const prev = aggMap.get(it.foodId) || {
          foodId: it.foodId,
          totalGrams: 0,
          usedInCount: 0,
          recipeTitles: new Set(),
        };
        prev.totalGrams += Number(it.grams) || 0;
        prev.usedInCount += 1;
        prev.recipeTitles.add(meal.title);
        aggMap.set(it.foodId, prev);
      }
    });
  }

  const pantryUsed = [];
  const missingItems = [];

  for (const entry of aggMap.values()) {
    const food = getFoodById(entry.foodId);
    if (!food) continue;
    const formatted = {
      foodId: entry.foodId,
      food,
      name: food.name,
      state: food.state,
      category: food.category || AISLE_CATEGORIES[4],
      totalGrams: Math.max(5, roundToNearest5g(entry.totalGrams)),
      usedInCount: entry.usedInCount,
      recipeTitles: Array.from(entry.recipeTitles),
    };

    if (pantrySet.has(entry.foodId)) {
      pantryUsed.push(formatted);
    } else {
      missingItems.push(formatted);
    }
  }

  pantryUsed.sort((a, b) => b.usedInCount - a.usedInCount || b.totalGrams - a.totalGrams);
  missingItems.sort((a, b) => {
    const catDiff =
      AISLE_CATEGORIES.indexOf(a.category) - AISLE_CATEGORIES.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return b.usedInCount - a.usedInCount || b.totalGrams - a.totalGrams;
  });

  const totalUnique = pantryUsed.length + missingItems.length;
  const pantryCoveragePct =
    totalUnique > 0 ? Math.round((pantryUsed.length / totalUnique) * 100) : 0;

  const avgDailyMacros =
    days.length > 0
      ? {
          kcal: Math.round(
            days.reduce((s, d) => s + (d.totals?.kcal || 0), 0) / days.length
          ),
          protein: Math.round(
            days.reduce((s, d) => s + (d.totals?.protein || 0), 0) / days.length
          ),
          carbs: Math.round(
            days.reduce((s, d) => s + (d.totals?.carbs || 0), 0) / days.length
          ),
          fat: Math.round(
            days.reduce((s, d) => s + (d.totals?.fat || 0), 0) / days.length
          ),
        }
      : { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  return {
    pantryUsed,
    missingItems,
    pantryCoveragePct,
    avgDailyMacros,
  };
}

/**
 * Génère un planning complet de 3 à 7 jours autour des ingrédients disponibles
 */
export function generateWeeklyMealPlan({
  pantryFoodIds = [],
  daysCount = 5,
  mealsPerDay = 4, // 3 (sans collation) ou 4 (avec collation)
  batchCooking = false, // true = un plat dure 2 jours consécutifs (moins de cuisine & moins d'achats)
  startDateStr,
  lang = 'fr',
  profile,
  customRecipes = [],
}) {
  const safeDays = Math.min(7, Math.max(1, Number(daysCount) || 5));
  const activeSlots =
    Number(mealsPerDay) === 3
      ? ['breakfast', 'lunch', 'dinner']
      : ['breakfast', 'lunch', 'snack', 'dinner'];

  const slotShares =
    activeSlots.length === 3
      ? { breakfast: 0.27, lunch: 0.39, dinner: 0.34 }
      : { breakfast: 0.24, lunch: 0.35, snack: 0.13, dinner: 0.28 };

  const targetKcal = profile?.targets?.kcal || 2200;
  const pantrySet = new Set(pantryFoodIds);
  const poolBySlot = buildScoredPoolBySlot(pantryFoodIds, profile, customRecipes);

  const usageCount = {};
  const prevDayChoice = {};
  const days = [];

  for (let d = 0; d < safeDays; d++) {
    const dateStr = shiftIsoDate(startDateStr, d);
    const dayMeals = {};

    for (const slotId of activeSlots) {
      const candidates = poolBySlot[slotId] || [];
      if (candidates.length === 0) continue;

      const targetSlotKcal = targetKcal * slotShares[slotId];

      // En mode Batch Cooking, les jours impairs réutilisent le repas de la veille (2 portions d'un coup)
      if (batchCooking && d % 2 === 1 && prevDayChoice[slotId]) {
        dayMeals[slotId] = scaleRecipeToTargetKcal(
          prevDayChoice[slotId],
          targetSlotKcal,
          pantrySet
        );
        continue;
      }

      let bestCand = candidates[0];
      let bestEffectiveScore = -Infinity;

      for (let idx = 0; idx < Math.min(candidates.length, 14); idx++) {
        const cand = candidates[idx];
        const usedTimes = usageCount[cand.id] || 0;
        const wasYesterday = prevDayChoice[slotId]?.id === cand.id;
        const usedTodayInOtherSlot = Object.values(dayMeals).some(
          (m) => m?.recipeId === cand.id
        );

        const varietyPenalty =
          usedTimes * 26 +
          (wasYesterday ? 45 : 0) +
          (usedTodayInOtherSlot ? 90 : 0);

        const eff = cand.pantryScore - varietyPenalty - idx * 1.5;
        if (eff > bestEffectiveScore) {
          bestEffectiveScore = eff;
          bestCand = cand;
        }
      }

      usageCount[bestCand.id] = (usageCount[bestCand.id] || 0) + 1;
      prevDayChoice[slotId] = bestCand;
      dayMeals[slotId] = scaleRecipeToTargetKcal(bestCand, targetSlotKcal, pantrySet);
    }

    days.push({
      dayIndex: d,
      dateStr,
      label: formatShortPlanDate(dateStr, lang),
      meals: dayMeals,
      totals: sumDayMealsMacros(dayMeals),
    });
  }

  const inventory = computePlanInventorySummary(days, pantryFoodIds);

  return {
    days,
    activeSlots,
    pantryFoodIds: [...pantryFoodIds],
    ...inventory,
  };
}

/**
 * Permet de remplacer un seul repas précis d'un jour donné par une autre idée compatible,
 * tout en recalculant instantanément la liste des ingrédients manquants de la semaine !
 */
export function swapPlannedMealInDay(
  currentPlan,
  dayIndex,
  slotId,
  profile,
  customRecipes = []
) {
  if (!currentPlan?.days?.[dayIndex]) return currentPlan;
  const pantryFoodIds = currentPlan.pantryFoodIds || [];
  const pantrySet = new Set(pantryFoodIds);
  const poolBySlot = buildScoredPoolBySlot(pantryFoodIds, profile, customRecipes);
  const candidates = poolBySlot[slotId] || [];
  if (candidates.length <= 1) return currentPlan;

  const currentMeal = currentPlan.days[dayIndex].meals?.[slotId];
  const currIdx = candidates.findIndex((c) => c.id === currentMeal?.recipeId);
  const nextCandidate = candidates[(currIdx + 1) % Math.min(candidates.length, 10)];

  const activeSlots = currentPlan.activeSlots || ['breakfast', 'lunch', 'snack', 'dinner'];
  const slotShares =
    activeSlots.length === 3
      ? { breakfast: 0.27, lunch: 0.39, dinner: 0.34 }
      : { breakfast: 0.24, lunch: 0.35, snack: 0.13, dinner: 0.28 };
  const targetSlotKcal = (profile?.targets?.kcal || 2200) * (slotShares[slotId] || 0.28);

  const nextMeal = scaleRecipeToTargetKcal(nextCandidate, targetSlotKcal, pantrySet);

  const nextDays = currentPlan.days.map((d, idx) => {
    if (idx !== dayIndex) return d;
    const updatedMeals = { ...d.meals, [slotId]: nextMeal };
    return {
      ...d,
      meals: updatedMeals,
      totals: sumDayMealsMacros(updatedMeals),
    };
  });

  const inventory = computePlanInventorySummary(nextDays, pantryFoodIds);

  return {
    ...currentPlan,
    days: nextDays,
    ...inventory,
  };
}
