// Moteur culinaire intelligent :
// 1. Mise à jour dynamique intégrale des recettes (Titre + Étapes + Ingrédients + Macros) lors d'un changement d'aliment
// 2. Génération de 3 à 5 suggestions de recettes variées par type de repas (Matin, Midi, Collation, Soir) pour TOUT aliment

import {
  getAllFoods,
  getFoodById,
  isFoodCompatibleWithProfile,
} from '../data/foodDatabase.js';
import { RECIPES_DATA, computeRecipeMacros } from '../data/recipesData.js';
import {
  normalizeText,
  adaptRecipeIngredientsToProfile,
  roundToNearest5g,
} from './substitutionEngine.js';

const MEAL_TYPE_META = {
  breakfast: { id: 'breakfast', badge: 'Petit-déjeuner', order: 1 },
  lunch: { id: 'lunch', badge: 'Déjeuner', order: 2 },
  snack: { id: 'snack', badge: 'Collation', order: 3 },
  dinner: { id: 'dinner', badge: 'Dîner', order: 4 },
};

function cleanShortFoodLabel(name = '') {
  return String(name)
    .split('(')[0]
    .split('·')[0]
    .replace(/\b(frais|fraîche|fraiches|cru|crue|crus|crues|cuit|cuite|cuits|nature|naturel|égoutté|sans peau|0%\s*MG|0%)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Réécrit intelligemment le titre et les étapes d'une recette lorsque un ou plusieurs aliments ont changé
 */
export function rewriteRecipeTextForSwaps(baseTitle = '', baseSteps = [], swaps = []) {
  if (!Array.isArray(swaps) || swaps.length === 0) {
    return { title: baseTitle, steps: baseSteps };
  }

  let updatedTitle = baseTitle;
  let updatedSteps = Array.isArray(baseSteps) ? [...baseSteps] : [];

  for (const sw of swaps) {
    const fromShort = cleanShortFoodLabel(sw.swappedFrom || '');
    const toShort = cleanShortFoodLabel(sw.swappedTo || '');
    if (!fromShort || !toShort) continue;

    // Cherche le mot racine principal de l'ancien aliment (ex: "Saumon", "Riz", "Poulet", "Skyr")
    const mainTokens = fromShort
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['blanc', 'filet', 'pavé', 'pave', 'flocons', 'purée', 'puree'].includes(w.toLowerCase()));
    const primaryWord = mainTokens[0] || fromShort;

    const titleRegex = new RegExp(fromShort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const wordRegex = new RegExp(`\\b${primaryWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'gi');

    if (titleRegex.test(updatedTitle)) {
      updatedTitle = updatedTitle.replace(titleRegex, toShort);
    } else if (wordRegex.test(updatedTitle)) {
      updatedTitle = updatedTitle.replace(wordRegex, toShort);
    }

    updatedSteps = updatedSteps.map((step) => {
      let s = step;
      if (titleRegex.test(s)) {
        s = s.replace(titleRegex, toShort.toLowerCase());
      } else if (wordRegex.test(s)) {
        s = s.replace(wordRegex, toShort.toLowerCase());
      }
      return s;
    });
  }

  return { title: updatedTitle, steps: updatedSteps };
}

/**
 * Applique à la fois :
 * 1) Les remplacements manuels choisis par l'utilisateur sur la recette (profile.recipeOverrides[recipe.id])
 * 2) L'auto-adaptation aux exclusions/allergies du profil (dislikedFoodIds & restrictions)
 * Et met à jour en direct le titre, les étapes, les ingrédients et les macros !
 */
export function resolveDynamicRecipe(recipe, profile) {
  if (!recipe) return null;

  const manualOverride = profile?.recipeOverrides?.[recipe.id];
  const startingIngredients = Array.isArray(manualOverride?.ingredients)
    ? manualOverride.ingredients
    : recipe.ingredients || [];

  const manualSwaps = Array.isArray(manualOverride?.swaps) ? manualOverride.swaps : [];

  // Auto-adaptation aux exclusions gustatives & allergies
  const autoAdaptedIngredients = adaptRecipeIngredientsToProfile(startingIngredients, profile);
  const autoSwaps = autoAdaptedIngredients.filter((it) => Boolean(it.swappedFrom));

  const allSwaps = [...manualSwaps, ...autoSwaps];
  const { title, steps } = rewriteRecipeTextForSwaps(
    recipe.title,
    recipe.steps || [],
    allSwaps
  );

  return {
    ...recipe,
    originalTitle: recipe.title,
    title,
    steps,
    ingredients: autoAdaptedIngredients,
    swapsMade: allSwaps,
    hasAutoSwaps: autoSwaps.length > 0,
    hasManualOverride: Boolean(manualOverride),
  };
}

/**
 * Met à jour dynamiquement le titre d'un plat déjà enregistré dans le journal lorsqu'on remplace un ingrédient
 */
export function updateLoggedMealTitleOnSwap(currentTitle = '', oldFoodName = '', newFoodName = '') {
  if (!currentTitle || !oldFoodName || !newFoodName) return currentTitle;
  const { title } = rewriteRecipeTextForSwaps(currentTitle, [], [
    { swappedFrom: oldFoodName, swappedTo: newFoodName },
  ]);
  if (title !== currentTitle) return title;
  const toShort = cleanShortFoodLabel(newFoodName);
  if (currentTitle.toLowerCase().includes(toShort.toLowerCase())) return currentTitle;
  return `${currentTitle.replace(/\s*·\s*avec\s+.+$/i, '')} · avec ${toShort}`;
}

// ============================================================================
// GÉNÉRATEUR DE 3 À 5 SUGGESTIONS DE RECETTES VARIÉES PAR ALIMENT & PAR REPAS
// ============================================================================

function pickSafePartner(preferredIds, fallbackGroup, profile, excludeId) {
  for (const id of preferredIds) {
    if (id === excludeId) continue;
    const f = getFoodById(id);
    if (f && isFoodCompatibleWithProfile(f, profile)) return f;
  }
  const candidate = getAllFoods().find(
    (f) =>
      f.id !== excludeId &&
      f.swapGroup === fallbackGroup &&
      isFoodCompatibleWithProfile(f, profile)
  );
  return candidate || getFoodById(preferredIds[0]);
}

/**
 * Construit des archétypes culinaires variés (Petit-déjeuner, Déjeuner, Collation, Dîner)
 * autour de N'IMPORTE QUEL ingrédient (citron, poulet, avocat, chocolat, fromage, produit Open Food Facts...)
 */
function buildChefArchetypesForFood(targetFood, profile) {
  const shortName = cleanShortFoodLabel(targetFood.name);
  const gBase = targetFood.defaultGrams || 100;
  const group = targetFood.swapGroup;

  const leanProt = pickSafePartner(
    ['poulet_blanc', 'cabillaud', 'tofu_ferme', 'oeufs_entiers', 'thon_naturel'],
    'proteines_maigres',
    profile,
    targetFood.id
  );
  const fishOrAlt = pickSafePartner(
    ['saumon_frais', 'cabillaud', 'dorade_bar', 'tempeh', 'crevettes'],
    'proteines_maigres',
    profile,
    targetFood.id
  );
  const dairyOrVegan = pickSafePartner(
    ['skyr_0', 'fromage_blanc_0', 'yaourt_grec', 'yaourt_soja_nature', 'ricotta'],
    'laitiers_boissons',
    profile,
    targetFood.id
  );
  const carbLunch = pickSafePartner(
    ['riz_basmati_cru', 'quinoa_cru', 'pates_completes_crues', 'semoule_couscous_crue'],
    'glucides_complexes',
    profile,
    targetFood.id
  );
  const carbDinner = pickSafePartner(
    ['patate_douce_crue', 'pomme_de_terre_crue', 'lentilles_corail_crues', 'pain_complet'],
    'glucides_complexes',
    profile,
    targetFood.id
  );
  const oatOrBread = pickSafePartner(
    ['flocons_avoine', 'pain_complet', 'farine_avoine', 'tartines_craquantes_wasa'],
    'glucides_complexes',
    profile,
    targetFood.id
  );
  const greenVeg = pickSafePartner(
    ['courgette', 'brocoli', 'haricots_verts', 'epinards_frais', 'roquette_mache'],
    'legumes',
    profile,
    targetFood.id
  );
  const freshFruit = pickSafePartner(
    ['myrtilles_fruits_rouges', 'banane', 'pomme', 'mangue', 'framboises'],
    'fruits',
    profile,
    targetFood.id
  );
  const healthyFat = pickSafePartner(
    ['huile_olive', 'avocat', 'amandes', 'noix_cajou', 'puree_amande'],
    'lipides_sains',
    profile,
    targetFood.id
  );
  const oliveOil = pickSafePartner(['huile_olive', 'huile_colza'], 'lipides_sains', profile, targetFood.id);

  const generated = [];

  // CAS 1 : PROTÉINES SALÉES (Viandes, Poissons, Tofu, Œufs, Fromages salés)
  if (group === 'proteines_maigres' || group === 'proteines_lipides') {
    const isSweetFriendly =
      targetFood.id.includes('whey') ||
      targetFood.id.includes('skyr') ||
      targetFood.id.includes('fromage_blanc') ||
      targetFood.id.includes('suisse') ||
      targetFood.id.includes('barre');

    if (isSweetFriendly) {
      generated.push(
        {
          slot: 'breakfast',
          title: `Bowl Matinal ${shortName}, ${cleanShortFoodLabel(oatOrBread.name)} & Fruits`,
          prepMinutes: 5,
          goalTag: 'Petit-déj Protéiné',
          ingredients: [
            { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
            { foodId: oatOrBread.id, grams: 60 },
            { foodId: freshFruit.id, grams: 100 },
            { foodId: healthyFat.id, grams: 15 },
          ],
          steps: [
            `Disposer ${shortName.toLowerCase()} dans un bol avec ${cleanShortFoodLabel(oatOrBread.name).toLowerCase()}.`,
            `Garnir de ${cleanShortFoodLabel(freshFruit.name).toLowerCase()} et d'une touche de ${cleanShortFoodLabel(healthyFat.name).toLowerCase()}.`,
          ],
        },
        {
          slot: 'snack',
          title: `Collation Express ${shortName} & ${cleanShortFoodLabel(freshFruit.name)}`,
          prepMinutes: 3,
          goalTag: 'Post-Séance',
          ingredients: [
            { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
            { foodId: freshFruit.id, grams: 120 },
          ],
          steps: [
            `Associer ${shortName.toLowerCase()} avec ${cleanShortFoodLabel(freshFruit.name).toLowerCase()} frais pour une assimilation rapide.`,
          ],
        }
      );
    } else {
      const isRichItem = (targetFood.per100g?.fat || 0) >= 9;
      generated.push({
        slot: 'breakfast',
        title: `Brunch Salé : ${shortName} & ${cleanShortFoodLabel(oatOrBread.name)}`,
        prepMinutes: 8,
        goalTag: 'Matin Salé',
        ingredients: [
          { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
          { foodId: oatOrBread.id, grams: 60 },
          ...(isRichItem ? [{ foodId: greenVeg.id, grams: 80 }] : [{ foodId: oliveOil.id, grams: 8 }]),
        ],
        steps: [
          `Dorer ${shortName.toLowerCase()} à la poêle antiadhésive ou au four.`,
          `Servir avec ${cleanShortFoodLabel(oatOrBread.name).toLowerCase()} toasté.`,
        ],
      });
    }

    const isRichProt = (targetFood.per100g?.fat || 0) >= 9;
    generated.push(
      {
        slot: 'lunch',
        title: `Assiette Équilibrée ${shortName}, ${cleanShortFoodLabel(carbLunch.name)} & ${cleanShortFoodLabel(greenVeg.name)}`,
        prepMinutes: 14,
        goalTag: 'Déjeuner Complet',
        ingredients: [
          { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
          { foodId: carbLunch.id, grams: 75 },
          { foodId: greenVeg.id, grams: 190 },
          ...(isRichProt ? [] : [{ foodId: oliveOil.id, grams: 10 }]),
        ],
        steps: [
          `Cuire ${cleanShortFoodLabel(carbLunch.name).toLowerCase()} puis dorer ${shortName.toLowerCase()} sans excès de matière grasse.`,
          `Accompagner d'une belle portion de ${cleanShortFoodLabel(greenVeg.name).toLowerCase()} croquants.`,
        ],
      },
      {
        slot: 'dinner',
        title: `Dîner Léger : ${shortName}, ${cleanShortFoodLabel(greenVeg.name)} & ${cleanShortFoodLabel(carbDinner.name)}`,
        prepMinutes: 15,
        goalTag: 'Dîner Équilibré',
        ingredients: [
          { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
          { foodId: greenVeg.id, grams: 220 },
          { foodId: carbDinner.id, grams: isRichProt ? 120 : 165 },
          ...(isRichProt ? [] : [{ foodId: oliveOil.id, grams: 8 }]),
        ],
        steps: [
          `Cuire vapeur ou rôtir ${cleanShortFoodLabel(greenVeg.name).toLowerCase()} et ${cleanShortFoodLabel(carbDinner.name).toLowerCase()}.`,
          `Dresser avec ${shortName.toLowerCase()} doré au four ou à la poêle.`,
        ],
      }
    );

    if (!isSweetFriendly) {
      const wrapOrBread = pickSafePartner(
        ['tortilla_wrap_ble', 'galette_sarrasin_bretonne', 'pain_complet'],
        'glucides_complexes',
        profile,
        targetFood.id
      );
      generated.push({
        slot: 'snack',
        title: `Wrap Croustillant au ${shortName} & Crudités`,
        prepMinutes: 6,
        goalTag: 'Repas Express',
        ingredients: [
          { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
          { foodId: wrapOrBread.id, grams: 65 },
          { foodId: greenVeg.id, grams: 90 },
        ],
        steps: [
          `Émincer ${shortName.toLowerCase()} chaud, garnir ${cleanShortFoodLabel(wrapOrBread.name).toLowerCase()} avec ${cleanShortFoodLabel(greenVeg.name).toLowerCase()} et rouler serré.`,
        ],
      });
    }
  } else if (group === 'fruits' || group === 'laitiers_boissons') {
    // CAS 2 : FRUITS (dont Citron, Banane, Baies...) & LAITAGES
    const isCitrus = targetFood.id.includes('citron') || targetFood.id.includes('pamplemousse');

    generated.push(
      {
        slot: 'breakfast',
        title: `Porridge Onctueux ${cleanShortFoodLabel(dairyOrVegan.name)} & ${shortName}`,
        prepMinutes: 6,
        goalTag: 'Petit-déjeuner',
        ingredients: [
          { foodId: oatOrBread.id, grams: 60 },
          { foodId: dairyOrVegan.id, grams: 140 },
          { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
          { foodId: 'amandes', grams: 15 },
        ],
        steps: [
          `Mélanger ${cleanShortFoodLabel(oatOrBread.name).toLowerCase()} et ${cleanShortFoodLabel(dairyOrVegan.name).toLowerCase()}.`,
          `Incorporer ${shortName.toLowerCase()} et parsemer d'amandes concassées.`,
        ],
      },
      {
        slot: 'lunch',
        title: isCitrus
          ? `Émincé de ${cleanShortFoodLabel(leanProt.name)} Mariné au ${shortName} & ${cleanShortFoodLabel(carbLunch.name)}`
          : `Poke Bowl Fraîcheur ${cleanShortFoodLabel(leanProt.name)}, ${cleanShortFoodLabel(carbLunch.name)} & ${shortName}`,
        prepMinutes: 14,
        goalTag: 'Déjeuner Fraîcheur',
        ingredients: [
          { foodId: leanProt.id, grams: 150 },
          { foodId: carbLunch.id, grams: 75 },
          { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
          { foodId: greenVeg.id, grams: 150 },
          { foodId: oliveOil.id, grams: 10 },
        ],
        steps: [
          `Cuire ${cleanShortFoodLabel(carbLunch.name).toLowerCase()} et dorer ${cleanShortFoodLabel(leanProt.name).toLowerCase()}.`,
          `Relever l'assiette avec ${shortName.toLowerCase()} et ${cleanShortFoodLabel(greenVeg.name).toLowerCase()}.`,
        ],
      },
      {
        slot: 'snack',
        title: `Collation Énergie : ${shortName}, ${cleanShortFoodLabel(dairyOrVegan.name)} & Oléagineux`,
        prepMinutes: 3,
        goalTag: 'Collation Satiété',
        ingredients: [
          { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
          { foodId: dairyOrVegan.id, grams: 150 },
          { foodId: healthyFat.id, grams: 15 },
        ],
        steps: [
          `Dresser ${cleanShortFoodLabel(dairyOrVegan.name).toLowerCase()} bien frais avec ${shortName.toLowerCase()}.`,
        ],
      },
      {
        slot: 'dinner',
        title: isCitrus
          ? `Pavé de ${cleanShortFoodLabel(fishOrAlt.name)} Rôti au ${shortName} & ${cleanShortFoodLabel(carbDinner.name)}`
          : `Assiette Légère du Soir : ${cleanShortFoodLabel(fishOrAlt.name)}, Légumes & ${shortName}`,
        prepMinutes: 16,
        goalTag: 'Dîner Digeste',
        ingredients: [
          { foodId: fishOrAlt.id, grams: 160 },
          { foodId: carbDinner.id, grams: 150 },
          { foodId: greenVeg.id, grams: 180 },
          { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
        ],
        steps: [
          `Cuire ${cleanShortFoodLabel(fishOrAlt.name).toLowerCase()} au four ou à la poêle avec ${cleanShortFoodLabel(greenVeg.name).toLowerCase()}.`,
          `Finaliser au dressage avec ${shortName.toLowerCase()}.`,
        ],
      }
    );
  } else {
    // CAS 3 : FÉCULENTS, LÉGUMES, CONDIMENTS (Jus de citron, Ail, Sauce soja...), OLÉAGINEUX
    generated.push(
      {
        slot: 'breakfast',
        title:
          group === 'condiments_epicerie' || group === 'legumes'
            ? `Œufs Brouillés Minute, Pain Complet & Touche de ${shortName}`
            : `Petit-Déjeuner Énergie : ${shortName} & ${cleanShortFoodLabel(dairyOrVegan.name)}`,
        prepMinutes: 7,
        goalTag: 'Matin Équilibré',
        ingredients:
          group === 'condiments_epicerie' || group === 'legumes'
            ? [
                { foodId: leanProt.id, grams: 130 },
                { foodId: 'pain_complet', grams: 65 },
                { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
              ]
            : [
                { foodId: targetFood.id, grams: roundToNearest5g(gBase) },
                { foodId: dairyOrVegan.id, grams: 160 },
                { foodId: freshFruit.id, grams: 110 },
              ],
        steps: [
          `Assembler les ingrédients chauds ou frais en intégrant ${shortName.toLowerCase()} en finition.`,
        ],
      },
      {
        slot: 'lunch',
        title: `Wok Athlétique ${cleanShortFoodLabel(leanProt.name)}, ${cleanShortFoodLabel(greenVeg.name)} & ${shortName}`,
        prepMinutes: 14,
        goalTag: 'Déjeuner Sportif',
        ingredients: [
          { foodId: leanProt.id, grams: 150 },
          {
            foodId: group === 'glucides_complexes' || group === 'legumineuses' ? targetFood.id : carbLunch.id,
            grams: group === 'glucides_complexes' || group === 'legumineuses' ? roundToNearest5g(gBase) : 75,
          },
          ...(group !== 'glucides_complexes' && group !== 'legumineuses'
            ? [{ foodId: targetFood.id, grams: roundToNearest5g(gBase) }]
            : []),
          { foodId: greenVeg.id, grams: 170 },
          { foodId: oliveOil.id, grams: 8 },
        ],
        steps: [
          `Faire sauter ${cleanShortFoodLabel(leanProt.name).toLowerCase()} avec ${cleanShortFoodLabel(greenVeg.name).toLowerCase()}.`,
          `Lier l'ensemble avec ${shortName.toLowerCase()} et servir bien chaud.`,
        ],
      },
      {
        slot: 'snack',
        title: `Tartine & Collation Minute autour de ${shortName}`,
        prepMinutes: 4,
        goalTag: 'Collation Rapide',
        ingredients: [
          { foodId: dairyOrVegan.id, grams: 130 },
          { foodId: oatOrBread.id, grams: 45 },
          { foodId: targetFood.id, grams: roundToNearest5g(Math.min(gBase, 60)) },
        ],
        steps: [
          `Préparer une collation équilibrée associant protéines et ${shortName.toLowerCase()}.`,
        ],
      },
      {
        slot: 'dinner',
        title: `Assiette du Soir : ${cleanShortFoodLabel(fishOrAlt.name)} Rôti & ${shortName}`,
        prepMinutes: 16,
        goalTag: 'Dîner Récupération',
        ingredients: [
          { foodId: fishOrAlt.id, grams: 160 },
          {
            foodId: group === 'legumes' ? targetFood.id : greenVeg.id,
            grams: group === 'legumes' ? 200 : 180,
          },
          ...(group !== 'legumes'
            ? [{ foodId: targetFood.id, grams: roundToNearest5g(gBase) }]
            : [{ foodId: carbDinner.id, grams: 140 }]),
          { foodId: oliveOil.id, grams: 8 },
        ],
        steps: [
          `Cuire délicatement ${cleanShortFoodLabel(fishOrAlt.name).toLowerCase()} et sa garniture, puis intégrer ${shortName.toLowerCase()}.`,
        ],
      }
    );
  }

  return generated.map((item, idx) => {
    // Dédoublonne d'éventuels foodId identiques dans la même recette générée
    const mergedMap = new Map();
    item.ingredients.forEach((ing) => {
      if (!ing?.foodId) return;
      mergedMap.set(ing.foodId, (mergedMap.get(ing.foodId) || 0) + ing.grams);
    });
    const cleanIngs = Array.from(mergedMap.entries()).map(([foodId, grams]) => ({
      foodId,
      grams,
    }));

    return {
      id: `sug_${targetFood.id}_${item.slot}_${idx}`,
      title: item.title,
      mealTypes: [item.slot],
      primarySlot: item.slot,
      slotBadge: MEAL_TYPE_META[item.slot]?.badge || 'Repas',
      prepMinutes: item.prepMinutes,
      goalTag: item.goalTag,
      ingredients: cleanIngs,
      steps: item.steps,
      macros: computeRecipeMacros({ ingredients: cleanIngs }, 1),
      isGeneratedSuggestion: true,
    };
  });
}

/**
 * Retourne entre 3 et 5 recettes VARIÉES suivant le type de repas (Petit-déj, Déjeuner, Collation, Dîner)
 * contenant exactement `foodOrId`, 100% compatibles avec le profil utilisateur !
 */
export function getVariedRecipesForFood(foodOrId, profile, customRecipes = [], maxCount = 4) {
  const targetFood = typeof foodOrId === 'string' ? getFoodById(foodOrId) : foodOrId;
  if (!targetFood) return [];

  const allCurated = [...customRecipes, ...RECIPES_DATA].map((r) =>
    resolveDynamicRecipe(r, profile)
  );

  // 1. Recettes existantes contenant déjà directement cet aliment
  const directMatches = allCurated.filter((r) =>
    (r.ingredients || []).some((ing) => ing.foodId === targetFood.id)
  );

  // 2. Recettes existantes de même groupe où l'on injecte dynamiquement cet aliment (ex: Dorade remplace Saumon)
  const adaptedFromCurated = [];
  if (directMatches.length < maxCount) {
    for (const r of allCurated) {
      if (directMatches.some((d) => d.id === r.id)) continue;
      const sameGroupIdx = (r.ingredients || []).findIndex((ing) => {
        const f = getFoodById(ing.foodId);
        return f && f.swapGroup === targetFood.swapGroup;
      });
      if (sameGroupIdx >= 0) {
        const replacedIng = r.ingredients[sameGroupIdx];
        const oldFood = getFoodById(replacedIng.foodId);
        const ratio =
          oldFood && targetFood.per100g.kcal > 15 && oldFood.per100g.kcal > 15
            ? oldFood.per100g.kcal / targetFood.per100g.kcal
            : 1;
        const newGrams = roundToNearest5g(
          Math.min(320, Math.max(10, replacedIng.grams * ratio))
        );
        const nextIngs = r.ingredients.map((it, idx) =>
          idx === sameGroupIdx ? { foodId: targetFood.id, grams: newGrams } : it
        );
        const { title, steps } = rewriteRecipeTextForSwaps(r.title, r.steps, [
          { swappedFrom: oldFood?.name || '', swappedTo: targetFood.name },
        ]);
        adaptedFromCurated.push({
          ...r,
          id: `adapt_${r.id}_${targetFood.id}`,
          title,
          steps,
          ingredients: nextIngs,
        });
      }
      if (adaptedFromCurated.length >= 6) break;
    }
  }

  // 3. Archétypes culinaires garantissant une couverture complète des 4 types de repas
  const chefGenerated = buildChefArchetypesForFood(targetFood, profile);

  // Sélection diversifiée : 1 recette par créneau (Petit-déjeuner, Déjeuner, Collation, Dîner) en priorité !
  const targetSlots = ['breakfast', 'lunch', 'snack', 'dinner'];
  const finalSelection = [];
  const usedTitles = new Set();

  const candidatePool = [
    ...directMatches.map((r) => ({
      ...r,
      primarySlot: r.mealTypes?.[0] || 'lunch',
      slotBadge: MEAL_TYPE_META[r.mealTypes?.[0] || 'lunch']?.badge || 'Repas',
      macros: computeRecipeMacros(r, 1),
    })),
    ...chefGenerated,
    ...adaptedFromCurated.map((r) => ({
      ...r,
      primarySlot: r.mealTypes?.[0] || 'lunch',
      slotBadge: MEAL_TYPE_META[r.mealTypes?.[0] || 'lunch']?.badge || 'Repas',
      macros: computeRecipeMacros(r, 1),
    })),
  ];

  // Passe 1 : assure la variété maximale en prenant 1 recette pour chaque type de repas
  for (const slot of targetSlots) {
    if (finalSelection.length >= maxCount) break;
    const match = candidatePool.find(
      (c) =>
        (c.primarySlot === slot || c.mealTypes?.includes(slot)) &&
        !usedTitles.has(normalizeText(c.title))
    );
    if (match) {
      usedTitles.add(normalizeText(match.title));
      finalSelection.push({
        ...match,
        primarySlot: slot,
        slotBadge: MEAL_TYPE_META[slot]?.badge || match.slotBadge,
      });
    }
  }

  // Passe 2 : complète jusqu'à maxCount (entre 3 et 5) si besoin
  for (const cand of candidatePool) {
    if (finalSelection.length >= maxCount) break;
    const key = normalizeText(cand.title);
    if (!usedTitles.has(key)) {
      usedTitles.add(key);
      finalSelection.push(cand);
    }
  }

  return finalSelection.sort(
    (a, b) =>
      (MEAL_TYPE_META[a.primarySlot]?.order || 9) -
      (MEAL_TYPE_META[b.primarySlot]?.order || 9)
  );
}
