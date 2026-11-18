// Résolveur universel d'aliments (100 % hors-ligne + compatible Open Food Facts) :
// 1. Normalisation singulier/pluriel multi-mots ("cordons bleus" <-> "cordon bleu", "poireaux" <-> "poireau")
// 2. Synthèse nutritionnelle intelligente à la volée pour TOUT aliment non pré-enregistré afin qu'il puisse
//    toujours générer des recettes variées, être ajouté au journal ou planifié sur la semaine !

import {
  AISLE_CATEGORIES,
  getAllFoods,
  getFoodById,
  isFoodCompatibleWithProfile,
  registerExternalFoods,
} from '../data/foodDatabase.js';
import { normalizeText } from './substitutionEngine.js';

const INVARIANT_SINGULAR_WORDS = new Set([
  'riz',
  'mais',
  'pois',
  'noix',
  'radis',
  'coulis',
  'houmous',
  'couscous',
  'ananas',
  'cassis',
  'jus',
  'frais',
  'brebis',
  'anchois',
  'epices',
  'tapas',
]);

export function singularizeFrenchWord(word = '') {
  if (!word || word.length <= 3 || INVARIANT_SINGULAR_WORDS.has(word)) {
    return word;
  }
  if (word.endsWith('eaux')) return word.slice(0, -1); // poireaux -> poireau, gateaux -> gateau
  if (word.endsWith('aux') && word.length > 4) return word.slice(0, -3) + 'al';
  if (word.endsWith('choux')) return word.slice(0, -1);
  if (word.endsWith('bleux')) return 'bleu';
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function normalizeFoodSingular(str = '') {
  const base = normalizeText(str);
  if (!base) return '';
  return base
    .split(' ')
    .map((w) => singularizeFrenchWord(w))
    .join(' ');
}

function cleanDisplayFoodTitle(raw = '') {
  const trimmed = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Aliment personnalisé';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Calcule un score de pertinence entre un aliment et une requête utilisateur (insensible aux pluriels et accents)
 */
export function scoreFoodMatch(food, rawQuery = '') {
  const qSing = normalizeFoodSingular(rawQuery);
  if (!qSing) return 0;

  const fSing = normalizeFoodSingular(food?.name || '');
  const fShortSing = normalizeFoodSingular(
    String(food?.name || '').split('(')[0].split('·')[0]
  );

  if (fSing === qSing || fShortSing === qSing) return 120;
  if (fShortSing.startsWith(qSing) || fSing.startsWith(qSing)) return 95;

  const qTokens = qSing.split(' ').filter((t) => t.length >= 2);
  const fTokens = fSing.split(' ');

  if (qTokens.length > 0 && qTokens.every((qt) => fTokens.includes(qt))) {
    return 88;
  }
  if (qTokens.length > 0 && qTokens.every((qt) => fSing.includes(qt))) {
    return 72;
  }

  let partial = 0;
  for (const qt of qTokens) {
    if (fTokens.some((ft) => ft.startsWith(qt))) partial += 26;
    else if (fSing.includes(qt)) partial += 15;
  }
  return partial;
}

/**
 * Recherche universelle dans tous les aliments locaux + mis en cache (gère singulier/pluriel sur chaque mot)
 */
export function searchLocalFoodsUniversal(
  rawQuery = '',
  profile = null,
  { ignoreDislikes = false, limit = 60 } = {}
) {
  const all = getAllFoods().filter((f) =>
    profile ? isFoodCompatibleWithProfile(f, profile, { ignoreDislikes }) : true
  );
  if (!String(rawQuery || '').trim()) {
    return all.slice(0, limit);
  }

  return all
    .map((f) => ({ f, score: scoreFoodMatch(f, rawQuery) }))
    .filter((x) => x.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.f);
}

/**
 * Estime intelligemment le profil nutritionnel CIQUAL (pour 100g) et la famille culinaire
 * de N'IMPORTE QUEL aliment ou plat saisi librement par l'utilisateur lorsqu'il n'est pas pré-enregistré !
 */
export function estimateNutritionForUnknownFood(rawName = '') {
  const s = normalizeFoodSingular(rawName);
  const tags = [];

  if (/\b(porc|lardon|jambon|chorizo|chipolata|saucisson|bacon|boudin)\b/.test(s)) {
    tags.push('viande', 'porc');
  } else if (
    /\b(poulet|dinde|volaille|boeuf|veau|agneau|canard|steak|viande|merguez|kefta|boulette|cordon|nugget|tender|escalope)\b/.test(
      s
    )
  ) {
    tags.push('viande');
  }
  if (/\b(poisson|saumon|thon|cabillaud|colin|morue|crevette|calamar|accra|surimi|hareng|sardine)\b/.test(s)) {
    tags.push('poisson');
  }
  if (/\b(pane|cordon|beignet|tarte|quiche|pizza|brioche|croissant|biscuit|gateau|pate|ravioli|lasagne|pain|sandwich|burger|wrap|nugget|tender|samoussa)\b/.test(s)) {
    tags.push('gluten');
  }
  if (/\b(fromage|comte|emmental|mozzarella|chevre|creme|beurre|yaourt|lait|cordon|quiche|gratin|aligot)\b/.test(s)) {
    tags.push('produit_laitier', 'lactose');
  }
  if (/\b(oeuf|omelette|quiche|mayonnaise|brioche|gateau|crepe)\b/.test(s)) {
    tags.push('oeuf');
  }

  // 1. Protéines panées / farcies / plats protéiques gourmands (ex: cordon bleu, escalope savoyarde, nuggets, accras, beignets crevettes)
  if (/\b(cordon|pane|milanaise|savoyarde|nugget|tender|accra|beignet|frit|croustillant)\b/.test(s)) {
    return {
      swapGroup: 'proteines_lipides',
      category: AISLE_CATEGORIES[0],
      defaultGrams: 110,
      per100g: { kcal: 228, protein: 15.2, carbs: 15.4, fat: 11.5, fiber: 0.9 },
      tags,
    };
  }

  // 2. Saucisses, boulettes, kefta, viandes mijotées ou charcuterie
  if (/\b(saucisse|merguez|chipolata|kefta|boulette|farci|paupiette|brochette|confit|rillettes|pate en croute)\b/.test(s)) {
    return {
      swapGroup: 'proteines_lipides',
      category: AISLE_CATEGORIES[0],
      defaultGrams: 120,
      per100g: { kcal: 235, protein: 16.8, carbs: 3.2, fat: 17.2, fiber: 0.4 },
      tags,
    };
  }

  // 3. Viandes maigres / volailles / poissons grillés ou rôtis
  if (/\b(filet|escalope|blanc|rote|roti|grille|vapeur|pave|dos|volaille|poisson|crevette|seiche|poulpe)\b/.test(s)) {
    return {
      swapGroup: 'proteines_maigres',
      category: AISLE_CATEGORIES[0],
      defaultGrams: 150,
      per100g: { kcal: 125, protein: 22.0, carbs: 0.8, fat: 3.4, fiber: 0.0 },
      tags,
    };
  }

  // 4. Quiches, tartes salées, pizzas, burgers, feuilletés, bouchées
  if (/\b(quiche|pizza|tarte|flambee|flammekueche|burger|sandwich|panini|croque|feuillet|bouchee|friand|empanada)\b/.test(s)) {
    return {
      swapGroup: 'glucides_complexes',
      category: AISLE_CATEGORIES[2],
      defaultGrams: 160,
      per100g: { kcal: 256, protein: 10.2, carbs: 26.5, fat: 12.2, fiber: 1.8 },
      tags,
    };
  }

  // 5. Pâtes farcies, gratins, aligot, pommes de terre cuisinées, plats complets
  if (/\b(ravioli|tortellini|lasagne|gratin|aligot|tartiflette|hachis|parmentier|risotto|paella|couscous|tajine|rougail|curry)\b/.test(s)) {
    return {
      swapGroup: 'glucides_complexes',
      category: AISLE_CATEGORIES[2],
      defaultGrams: 220,
      per100g: { kcal: 164, protein: 8.4, carbs: 18.2, fat: 6.4, fiber: 1.8 },
      tags,
    };
  }

  // 6. Galettes végétales, légumineuses, tofu/soja préparés, panisses
  if (/\b(vegetal|soja|seitan|falafel|panisse|lentille|pois|haricot|feve)\b/.test(s)) {
    return {
      swapGroup: 'legumineuses',
      category: AISLE_CATEGORIES[2],
      defaultGrams: 130,
      per100g: { kcal: 175, protein: 11.2, carbs: 18.0, fat: 6.2, fiber: 4.8 },
      tags,
    };
  }

  // 7. Légumes, poêlées, soupes, salades, crudités
  if (/\b(salade|soupe|veloute|bouillon|poelee|legume|ratatouille|julienne|champignon|courge|chou|epinard|tomate|carotte)\b/.test(s)) {
    return {
      swapGroup: 'legumes',
      category: AISLE_CATEGORIES[1],
      defaultGrams: 200,
      per100g: { kcal: 52, protein: 1.8, carbs: 6.4, fat: 2.0, fiber: 2.4 },
      tags,
    };
  }

  // 8. Fruits, compotes, sorbets, smoothies
  if (/\b(fruit|compote|pomme|poire|peche|abricot|cerise|fraise|framboise|melon|pasteque|raisin|sorbet|smoothie)\b/.test(s)) {
    return {
      swapGroup: 'fruits',
      category: AISLE_CATEGORIES[1],
      defaultGrams: 130,
      per100g: { kcal: 64, protein: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.0 },
      tags,
    };
  }

  // 9. Pâtisseries, biscuits, viennoiseries, gâteaux, desserts sucrés
  if (/\b(gateau|biscuit|cookie|brownie|muffin|crepe|gaufre|brioche|croissant|tiramisu|mousse|flan|clafoutis|chocolat|caramel|confiture)\b/.test(s)) {
    return {
      swapGroup: 'glucides_complexes',
      category: AISLE_CATEGORIES[2],
      defaultGrams: 65,
      per100g: { kcal: 365, protein: 6.4, carbs: 52.0, fat: 14.5, fiber: 1.8 },
      tags,
    };
  }

  // 10. Laitages, yaourts, fromages frais, crèmes
  if (/\b(yaourt|fromage|skyr|faisselle|petit suisse|ricotta|creme|lait)\b/.test(s)) {
    return {
      swapGroup: 'laitiers_boissons',
      category: AISLE_CATEGORIES[3],
      defaultGrams: 125,
      per100g: { kcal: 118, protein: 7.5, carbs: 5.2, fat: 7.4, fiber: 0.0 },
      tags,
    };
  }

  // 11. Sauces, huiles, oléagineux, pâtes à tartiner
  if (/\b(sauce|huile|beurre|pesto|mayo|vinaigrette|amande|noisette|cacahuete|noix|pistache|tahini)\b/.test(s)) {
    return {
      swapGroup: 'lipides_sains',
      category: AISLE_CATEGORIES[4],
      defaultGrams: 20,
      per100g: { kcal: 460, protein: 6.0, carbs: 10.0, fat: 44.0, fiber: 2.5 },
      tags,
    };
  }

  // 12. Par défaut : aliment polyvalent équilibré (accompagnement / plat courant)
  return {
    swapGroup: 'glucides_complexes',
    category: AISLE_CATEGORIES[2],
    defaultGrams: 120,
    per100g: { kcal: 175, protein: 8.0, carbs: 22.0, fat: 6.0, fiber: 2.0 },
    tags,
  };
}

/**
 * Crée et enregistre immédiatement un aliment sur-mesure dans le registre actif
 * pour qu'il fonctionne partout (Recettes, Semaine, Courses, Journal, Équivalences)
 */
export function synthesizeSmartFoodFromName(rawName = '', customPer100g = null) {
  const slug = normalizeFoodSingular(rawName).replace(/\s+/g, '_').slice(0, 44);
  if (!slug) return null;

  const id = `custom_auto_${slug}`;
  const existing = getFoodById(id);
  if (existing && !customPer100g) {
    return existing;
  }

  const estimated = estimateNutritionForUnknownFood(rawName);
  const foodObj = {
    id,
    name: cleanDisplayFoodTitle(rawName),
    category: estimated.category,
    swapGroup: estimated.swapGroup,
    state: 'portion prête',
    defaultGrams: estimated.defaultGrams,
    sourceRef: 'Estimation nutritionnelle auto',
    isAutoSynthesized: true,
    per100g: customPer100g || estimated.per100g,
    tags: estimated.tags,
  };

  registerExternalFoods([foodObj]);
  return foodObj;
}

/**
 * Trouve le meilleur aliment local/caché (insensible aux pluriels) OU le synthétise instantanément s'il n'existe pas !
 */
export function resolveOrSynthesizeFood(rawQuery = '', profile = null) {
  const cleaned = String(rawQuery || '').trim();
  if (cleaned.length < 2) return null;

  const matches = searchLocalFoodsUniversal(cleaned, profile, {
    ignoreDislikes: true,
    limit: 5,
  });

  if (matches.length > 0 && scoreFoodMatch(matches[0], cleaned) >= 65) {
    return matches[0];
  }

  return synthesizeSmartFoodFromName(cleaned);
}
