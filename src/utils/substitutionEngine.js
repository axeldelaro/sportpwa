import {
  FOOD_DATABASE,
  SWAP_GROUP_META,
  getAllFoods,
  getFoodById,
  calculateFoodMacros,
  isFoodCompatibleWithProfile,
} from '../data/foodDatabase.js';

export function normalizeText(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Arrondit un grammage à 5g près (avec minimum 5g, ou 2g pour les huiles très concentrées si < 6g)
 */
export function roundToNearest5g(grams) {
  if (!Number.isFinite(grams) || grams <= 0) return 5;
  if (grams < 7.5) return 5;
  return Math.max(5, Math.round(grams / 5) * 5);
}

function resolveDominantMacroKey(sourceFood) {
  const groupMeta = SWAP_GROUP_META[sourceFood.swapGroup];
  if (!groupMeta) return 'kcal';

  if (sourceFood.swapGroup === 'laitiers_boissons') {
    // Pour un yaourt grec, ricotta ou fromage (>= 6g P/100g), on cale sur les protéines.
    // Pour une boisson liquide (lait, boisson soja/avoine/amande), on cale sur les Kcal/volume.
    return sourceFood.per100g.protein >= 6 ? 'protein' : 'kcal';
  }

  return groupMeta.dominantMacro || 'kcal';
}

function formatSigned(val, suffix = '', decimals = 0) {
  const rounded = decimals > 0 ? Math.round(val * 10) / 10 : Math.round(val);
  if (Math.abs(rounded) < (decimals > 0 ? 0.2 : 1)) return `0${suffix}`;
  return `${rounded > 0 ? '+' : ''}${rounded}${suffix}`;
}

/**
 * Calcule toutes les équivalences nutritionnelles d'un aliment donné pour un grammage précis
 * @param {string|object} foodOrId - ID ou objet aliment source
 * @param {number} sourceGrams - Grammage de départ (ex: 80 pour 80g de riz cru)
 * @param {'dominant_macro'|'iso_kcal'} mode - Mode mathématique d'équivalence
 * @param {object} profile - Profil utilisateur (allergies & filtres alimentaires)
 * @param {object} options - Options supplémentaires (includeRelatedGroups)
 */
export function computeSubstitutions(
  foodOrId,
  sourceGrams = 100,
  mode = 'dominant_macro',
  profile = null,
  options = { includeRelatedGroups: true }
) {
  const sourceFood = typeof foodOrId === 'string' ? getFoodById(foodOrId) : foodOrId;
  if (!sourceFood) return null;

  const validSourceGrams = Math.max(5, Number(sourceGrams) || sourceFood.defaultGrams || 100);
  const sourceMacros = calculateFoodMacros(sourceFood, validSourceGrams);
  const groupMeta = SWAP_GROUP_META[sourceFood.swapGroup] || {
    label: 'Équivalences nutritionnelles',
    dominantMacro: 'kcal',
    macroLabel: 'Calories',
    relatedGroups: [],
  };

  const dominantMacroKey = resolveDominantMacroKey(sourceFood);
  const effectiveMacroKey = mode === 'iso_kcal' ? 'kcal' : dominantMacroKey;

  const allowedGroups = new Set([sourceFood.swapGroup]);
  if (options.includeRelatedGroups && Array.isArray(groupMeta.relatedGroups)) {
    groupMeta.relatedGroups.forEach((g) => allowedGroups.add(g));
  }

  const candidates = getAllFoods().filter((candidate) => {
    if (candidate.id === sourceFood.id) return false;
    if (!allowedGroups.has(candidate.swapGroup)) return false;
    if (!isFoodCompatibleWithProfile(candidate, profile)) return false;
    return true;
  });

  const alternatives = [];

  for (const candidate of candidates) {
    const candidatePer100 = candidate.per100g[effectiveMacroKey];
    const targetAmount = sourceMacros[effectiveMacroKey];

    let rawGrams;

    if (candidatePer100 > 0.4 && targetAmount > 0.4) {
      rawGrams = (targetAmount / candidatePer100) * 100;
    } else if (candidate.per100g.kcal > 0 && sourceMacros.kcal > 0) {
      // Repli intelligent sur l'iso-calorique si la macro dominante est quasi nulle (ex: lait d'amande)
      rawGrams = (sourceMacros.kcal / candidate.per100g.kcal) * 100;
    } else {
      rawGrams = validSourceGrams;
    }

    // Garde-fou réaliste pour les légumes très riches en eau ou boissons très légères (ex: lait d'amande 18 kcal/100ml)
    if (sourceFood.swapGroup === 'legumes') {
      rawGrams = Math.min(500, Math.max(50, rawGrams));
    } else if (sourceFood.swapGroup === 'laitiers_boissons' && candidate.per100g.kcal <= 25) {
      rawGrams = Math.min(450, Math.max(100, rawGrams));
    } else {
      rawGrams = Math.min(850, Math.max(5, rawGrams));
    }

    const roundedGrams = roundToNearest5g(rawGrams);
    const newMacros = calculateFoodMacros(candidate, roundedGrams);

    const delta = {
      kcal: Math.round(newMacros.kcal - sourceMacros.kcal),
      protein: Math.round((newMacros.protein - sourceMacros.protein) * 10) / 10,
      carbs: Math.round((newMacros.carbs - sourceMacros.carbs) * 10) / 10,
      fat: Math.round((newMacros.fat - sourceMacros.fat) * 10) / 10,
    };

    const isExactGroup = candidate.swapGroup === sourceFood.swapGroup;

    // Score de proximité globale pour classer les meilleures alternatives culinaires en tête
    const kcalDiffPenalty = Math.abs(delta.kcal) * 0.6;
    const macroDiffPenalty =
      Math.abs(delta.protein) * 3 + Math.abs(delta.carbs) * 1.5 + Math.abs(delta.fat) * 3;
    const groupPenalty = isExactGroup ? 0 : 120;
    const corePreferencePenalty = String(candidate.id).startsWith('ciq_') ? 22 : 0;
    const relevanceScore =
      groupPenalty + corePreferencePenalty + kcalDiffPenalty + macroDiffPenalty;

    alternatives.push({
      food: candidate,
      grams: roundedGrams,
      macros: newMacros,
      delta,
      isExactGroup,
      relevanceScore,
      deltaBadges: {
        kcal: formatSigned(delta.kcal, ' kcal', 0),
        protein: formatSigned(delta.protein, 'g P', 1),
        carbs: formatSigned(delta.carbs, 'g G', 1),
        fat: formatSigned(delta.fat, 'g L', 1),
      },
    });
  }

  alternatives.sort((a, b) => a.relevanceScore - b.relevanceScore);

  const macroLabelsMap = {
    protein: 'Protéines égales',
    carbs: 'Glucides égaux',
    fat: 'Lipides égaux',
    kcal: 'Calories égales',
  };

  return {
    sourceFood,
    sourceGrams: validSourceGrams,
    sourceMacros,
    mode,
    effectiveMacroKey,
    equivalenceLabel: macroLabelsMap[effectiveMacroKey] || 'Calories égales',
    swapGroupLabel: groupMeta.label,
    alternatives,
  };
}

/**
 * Recherche intelligente d'un aliment par texte libre (pour le chat Coach ou la barre de recherche)
 */
export function findFoodByQuery(rawQuery) {
  const q = normalizeText(rawQuery);
  if (!q || q.length < 2) return null;

  // Synonymes courants rapides pour une UX conversationnelle naturelle
  const directAliases = {
    riz: 'riz_basmati_cru',
    'riz cru': 'riz_basmati_cru',
    'riz cuit': 'riz_basmati_cuit',
    avoine: 'flocons_avoine',
    flocons: 'flocons_avoine',
    pates: 'pates_ble_crues',
    poulet: 'poulet_blanc',
    dinde: 'dinde_filet',
    saumon: 'saumon_frais',
    thon: 'thon_naturel',
    boeuf: 'faux_filet_boeuf',
    steak: 'steak_hache_5',
    porc: 'filet_mignon_porc',
    oeuf: 'oeufs_entiers',
    oeufs: 'oeufs_entiers',
    'blanc d oeuf': 'blancs_oeufs',
    tofu: 'tofu_ferme',
    skyr: 'skyr_0',
    'fromage blanc': 'fromage_blanc_0',
    patate: 'patate_douce_crue',
    'patate douce': 'patate_douce_crue',
    'pomme de terre': 'pomme_de_terre_crue',
    quinoa: 'quinoa_cru',
    lentilles: 'lentilles_vertes_crues',
    'pois chiches': 'pois_chiches_cuit',
    beurre: 'beurre_cacahuete',
    cacahuete: 'beurre_cacahuete',
    amande: 'amandes',
    amandes: 'amandes',
    avocat: 'avocat',
    huile: 'huile_olive',
    banane: 'banane',
    pomme: 'pomme',
    pain: 'pain_complet',
    lait: 'lait_demi_ecreme',
    whey: 'whey_isolate',
    brocoli: 'brocoli',
    citron: 'citron_jaune',
    'jus de citron': 'jus_citron',
    ail: 'ail_frais',
    oignon: 'oignon_jaune',
    semoule: 'semoule_couscous_crue',
    wrap: 'tortilla_wrap_ble',
    tortilla: 'tortilla_wrap_ble',
    parmesan: 'parmesan_reggiano',
    comte: 'comte_emmental',
    'cordon bleu': 'cordon_bleu_volaille',
    'cordons bleus': 'cordon_bleu_volaille',
    nuggets: 'nuggets_volaille',
    tenders: 'tenders_poulet',
    gnocchi: 'gnocchis_pomme_de_terre',
    gnocchis: 'gnocchis_pomme_de_terre',
    ravioli: 'raviolis_frais_ricotta',
    raviolis: 'raviolis_frais_ricotta',
    lardons: 'lardons_volaille_fumes',
    knacki: 'saucisse_volaille_knacki',
    saucisse: 'saucisse_volaille_knacki',
  };

  if (directAliases[q]) {
    return getFoodById(directAliases[q]);
  }

  const singToken = (w) => {
    if (!w || w.length <= 3 || ['mais', 'pois', 'noix', 'radis', 'frais', 'houmous', 'couscous', 'ananas'].includes(w)) {
      return w;
    }
    if (w.endsWith('eaux')) return w.slice(0, -1);
    if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  };

  const qSing = q.split(' ').map(singToken).join(' ');
  const queryTokens = qSing.split(' ').filter((t) => t.length >= 2);

  let bestMatch = null;
  let bestScore = 0;

  for (const food of getAllFoods()) {
    if (food._singNorm === undefined) {
      Object.defineProperty(food, '_singNorm', {
        value: normalizeText(food.name).split(' ').map(singToken).join(' '),
        enumerable: false,
      });
      Object.defineProperty(food, '_singShort', {
        value: normalizeText(food.name.split('(')[0].split(',')[0]).split(' ').map(singToken).join(' '),
        enumerable: false,
      });
    }
    const normName = food._singNorm;
    const shortName = food._singShort;
    const coreBonus = String(food.id).startsWith('ciq_') ? 0 : 4;
    let score = 0;

    if (normName === qSing || shortName === qSing) {
      score = 110 + coreBonus;
    } else if (shortName.startsWith(qSing) || normName.startsWith(qSing)) {
      score = 90 + coreBonus;
    } else if (normName.includes(qSing)) {
      score = 75 + coreBonus;
    } else if (queryTokens.length > 0 && queryTokens.every((qt) => normName.includes(qt))) {
      score = 68 + coreBonus;
    } else if (qSing.includes(shortName.split(' ')[0]) && shortName.split(' ')[0].length >= 4) {
      score = 52 + coreBonus;
    }

    for (const token of queryTokens) {
      if (normName.includes(token)) {
        score += 18;
      }
    }

    if (score > 0 && food.state === 'cru') {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = food;
    }
  }

  return bestScore >= 25 ? bestMatch : null;
}

/**
 * Adapte automatiquement une recette aux restrictions ET aux exclusions gustatives ("Je ne mange pas") du profil
 * en substituant tout ingrédient non désiré par la meilleure alternative compatible !
 */
export function adaptRecipeIngredientsToProfile(ingredients, profile) {
  return (ingredients || []).map((ing) => {
    const food = getFoodById(ing.foodId);
    if (!food) return ing;
    if (isFoodCompatibleWithProfile(food, profile)) {
      return ing;
    }
    const subResult = computeSubstitutions(food, ing.grams, 'dominant_macro', profile);
    if (subResult && subResult.alternatives.length > 0) {
      const best = subResult.alternatives[0];
      return {
        foodId: best.food.id,
        grams: best.grams,
        swappedFrom: food.name,
        swappedTo: best.food.name,
      };
    }
    return ing;
  });
}

/**
 * Retourne une version dynamique auto-mise-à-jour d'une recette selon les goûts & exclusions du profil
 */
export function getLiveAdaptedRecipe(recipe, profile) {
  if (!recipe) return null;
  const adaptedIngs = adaptRecipeIngredientsToProfile(recipe.ingredients || [], profile);
  const swaps = adaptedIngs.filter((it) => Boolean(it.swappedFrom));
  return {
    ...recipe,
    ingredients: adaptedIngs,
    swapsMade: swaps,
    hasAutoSwaps: swaps.length > 0,
  };
}
