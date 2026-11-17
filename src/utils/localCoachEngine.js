import {
  FOOD_DATABASE,
  isFoodCompatibleWithProfile,
  calculateFoodMacros,
} from '../data/foodDatabase.js';
import {
  RECIPES_DATA,
  computeRecipeMacros,
  isRecipeCompatibleWithProfile,
} from '../data/recipesData.js';
import {
  normalizeText,
  computeSubstitutions,
  findFoodByQuery,
  roundToNearest5g,
} from './substitutionEngine.js';

export const QUICK_COACH_SUGGESTIONS = [
  'Combler mes protéines du jour',
  'Je suis fatigué pour ma séance',
  'Idée repas rapide ce soir',
  'Par quoi remplacer 80g de riz ?',
  'J’ai seulement 20 min pour m’entraîner',
  'Bilan complet de ma journée',
];

function extractGramsFromText(rawText) {
  const match = String(rawText).match(/(\d{1,4})\s*(?:g|gr|grammes|ml)\b/i);
  if (match) return Number(match[1]);
  const bareNum = String(rawText).match(/\b(\d{2,3})\b/);
  if (bareNum) return Number(bareNum[1]);
  return null;
}

function extractCandidateFoodPhrase(normText) {
  // Supprime les mots outils de question pour isoler le nom de l'aliment
  const stopWords = new Set([
    'par', 'quoi', 'remplacer', 'substituer', 'echanger', 'equivalent', 'equivalences',
    'equivalence', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'd', 'l',
    'pour', 'avec', 'sans', 'en', 'mode', 'iso', 'calorique', 'calories', 'kcal',
    'macro', 'macros', 'grammes', 'gr', 'g', 'ml', 'alternative', 'alternatives',
    'au', 'aux', 'mon', 'ma', 'mes', 'quel', 'quelle', 'quels', 'quelles', 'est',
    'donne', 'moi', 'svp', 'coach', 'cru', 'crue', 'cuit', 'cuite',
  ]);

  const cleaned = normText
    .replace(/\b\d+\s*(g|gr|grammes|ml)?\b/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .join(' ')
    .trim();

  return cleaned;
}

function getCompatibleProteinFoods(profile) {
  return FOOD_DATABASE.filter(
    (f) =>
      (f.swapGroup === 'proteines_maigres' || f.swapGroup === 'proteines_lipides') &&
      isFoodCompatibleWithProfile(f, profile)
  );
}

function getCompatibleCarbFoods(profile) {
  return FOOD_DATABASE.filter(
    (f) =>
      (f.swapGroup === 'glucides_complexes' || f.swapGroup === 'fruits') &&
      isFoodCompatibleWithProfile(f, profile)
  );
}

const INTENT_RULES = [
  {
    id: 'substitution',
    keywords: [
      'remplacer', 'remplace', 'equivalent', 'equivalence', 'substituer',
      'alternative', 'echanger', 'place de', 'au lieu de',
    ],
    weight: 4,
  },
  {
    id: 'protein_gap',
    keywords: [
      'proteine', 'proteines', 'combler', 'manque de prot', 'atteindre mes prot',
      'quota proteine', 'collation proteinee',
    ],
    weight: 3.5,
  },
  {
    id: 'meal_idea',
    keywords: [
      'que manger', 'quoi manger', 'idee repas', 'ce soir', 'diner', 'dejeuner',
      'petit dejeuner', 'collation', 'faim', 'recette rapide', 'repas rapide',
    ],
    weight: 3,
  },
  {
    id: 'fatigue_workout',
    keywords: [
      'fatigue', 'epuise', 'creve', 'pas d energie', 'mal dormi', 'flemme',
      'lourd', 'baisse d energie', 'surentrainement',
    ],
    weight: 3.5,
  },
  {
    id: 'short_time',
    keywords: [
      'pas le temps', 'manque de temps', '20 min', '15 min', 'express',
      'seance courte', 'seance rapide', 'presse', 'emom', 'superset',
    ],
    weight: 3.5,
  },
  {
    id: 'joint_pain',
    keywords: [
      'douleur', 'mal a', 'mal au', 'mal aux', 'epaule', 'genou', 'genoux',
      'lombaire', 'dos', 'poignet', 'coude', 'gene', 'blessure', 'tendinite',
    ],
    weight: 4,
  },
  {
    id: 'doms_recovery',
    keywords: [
      'courbature', 'courbatures', 'recuperation', 'recuperer', 'sommeil',
      'dormir', 'repos', 'etirement', 'mobilite', 'jambes lourdes',
    ],
    weight: 3,
  },
  {
    id: 'hydration',
    keywords: ['eau', 'hydratation', 'boire', 'soif', 'crampe', 'crampes', 'electrolytes'],
    weight: 3,
  },
  {
    id: 'daily_summary',
    keywords: [
      'bilan', 'ou j en suis', 'point sur ma journee', 'resume', 'analyse ma journee',
      'mes macros', 'combien il me reste', 'restant',
    ],
    weight: 3,
  },
  {
    id: 'goal_plateau',
    keywords: [
      'stagne', 'plateau', 'perds plus', 'prends pas', 'seche', 'prise de masse',
      'deficit', 'creatine', 'complement',
    ],
    weight: 2.8,
  },
];

function detectTopIntent(normText, previousMemory) {
  // Gestion de la mémoire conversationnelle du tour précédent (ex: "et en iso-calorique ?" ou "et pour 150g ?")
  if (previousMemory?.lastIntent === 'substitution' && previousMemory?.lastFoodId) {
    if (
      normText.includes('iso') ||
      normText.includes('calori') ||
      normText.includes('macro') ||
      /^\s*(et\s+)?(pour\s+)?\d+\s*(g|gr)?\s*\??$/.test(normText)
    ) {
      return 'substitution_followup';
    }
  }

  let bestIntent = 'general';
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (normText.includes(kw)) {
        score += rule.weight + (kw.includes(' ') ? 1.5 : 0);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = rule.id;
    }
  }

  // Si l'utilisateur tape directement un grammage + aliment (ex: "120g flocons d'avoine")
  if (bestScore === 0 && extractGramsFromText(normText) && findFoodByQuery(extractCandidateFoodPhrase(normText))) {
    return 'substitution';
  }

  return bestIntent;
}

/**
 * Génère une réponse experte 100% locale, connectée en temps réel à l'état de l'utilisateur
 */
export function generateCoachResponse(userMessage, context = {}) {
  const {
    profile = {},
    todayMacros = { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    waterMl = 0,
    workoutHistory = [],
    previousMemory = null,
  } = context;

  const norm = normalizeText(userMessage);
  const targets = profile.targets || {
    kcal: 2200,
    protein: 140,
    carbs: 230,
    fat: 70,
    waterMl: 2800,
  };

  const remKcal = Math.round(targets.kcal - (todayMacros.kcal || 0));
  const remProt = Math.round(targets.protein - (todayMacros.protein || 0));
  const remCarbs = Math.round(targets.carbs - (todayMacros.carbs || 0));
  const remFat = Math.round(targets.fat - (todayMacros.fat || 0));
  const remWater = Math.max(0, targets.waterMl - (waterMl || 0));

  const lastWorkout = workoutHistory[0] || null;
  const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const workoutsLast7Days = workoutHistory.filter(
    (w) => new Date(w.timestamp).getTime() >= sevenDaysAgo
  ).length;

  const activeFiltersLabel = (() => {
    const list = [];
    if (profile.dietBase && profile.dietBase !== 'omnivore') list.push(profile.dietBase);
    if (Array.isArray(profile.restrictions) && profile.restrictions.length > 0) {
      list.push(...profile.restrictions.map((r) => r.replace(/_/g, ' ')));
    }
    return list.length > 0 ? list.join(', ') : 'aucune restriction active';
  })();

  const intent = detectTopIntent(norm, previousMemory);

  // =========================================================================
  // 1. SUBSTITUTION NUTRITIONNELLE DIRECTE PAR CHAT (+ MÉMOIRE TOUR PRÉCÉDENT)
  // =========================================================================
  if (intent === 'substitution' || intent === 'substitution_followup') {
    const isIsoRequested = norm.includes('iso') || norm.includes('calori') || norm.includes('kcal');
    const mode = isIsoRequested ? 'iso_kcal' : 'dominant_macro';

    let targetFood = null;
    let grams = extractGramsFromText(userMessage);

    if (intent === 'substitution_followup' && previousMemory?.lastFoodId) {
      targetFood = FOOD_DATABASE.find((f) => f.id === previousMemory.lastFoodId);
      if (!grams) grams = previousMemory.lastGrams || targetFood?.defaultGrams || 100;
    } else {
      const phrase = extractCandidateFoodPhrase(norm);
      targetFood = findFoodByQuery(phrase) || findFoodByQuery(norm);
      if (!grams && targetFood) grams = targetFood.defaultGrams || 100;
    }

    if (!targetFood) {
      return {
        text:
          "Je n'ai pas identifié l'aliment exact à remplacer. Dis-moi par exemple :\n" +
          "• *« Par quoi remplacer 100g de flocons d'avoine ? »*\n" +
          "• *« Équivalent de 150g de blanc de poulet »*\n" +
          "• *« Alternative à 140g de saumon »*",
        suggestions: [
          'Par quoi remplacer 100g de flocons d’avoine ?',
          'Équivalent de 150g de poulet',
          'Équivalent de 140g de saumon',
        ],
        memory: { lastIntent: 'substitution' },
      };
    }

    const result = computeSubstitutions(targetFood, grams, mode, profile);
    const topAlts = (result?.alternatives || []).slice(0, 4);

    if (topAlts.length === 0) {
      return {
        text: `Avec tes filtres alimentaires actuels (${activeFiltersLabel}), aucune alternative directe n'a été trouvée pour **${grams}g de ${targetFood.name}**. Tu peux ajuster tes filtres dans ton Profil en haut à droite.`,
        suggestions: ['Combler mes protéines du jour', 'Idée repas rapide ce soir'],
        memory: { lastIntent: 'substitution', lastFoodId: targetFood.id, lastGrams: grams },
      };
    }

    const lines = topAlts.map((alt) => {
      const deltaStr = `${alt.deltaBadges.kcal}, ${alt.deltaBadges.protein}`;
      return `• **${alt.grams}g de ${alt.food.name}** *(${alt.food.state})* → ${alt.macros.kcal} kcal | ${alt.macros.protein}g P · ${alt.macros.carbs}g G · ${alt.macros.fat}g L *(écart : ${deltaStr})*`;
    });

    return {
      text:
        `Voici les meilleures équivalences pour **${result.sourceGrams}g de ${targetFood.name}** *(${targetFood.state} : ${result.sourceMacros.kcal} kcal, ${result.sourceMacros.protein}g P, ${result.sourceMacros.carbs}g G, ${result.sourceMacros.fat}g L)* en mode **${result.equivalenceLabel}** :\n\n` +
        lines.join('\n') +
        `\n\n*(Filtré selon ton profil : ${activeFiltersLabel}.)*`,
      suggestions: [
        mode === 'dominant_macro' ? 'Et en mode iso-calorique ?' : 'Et en macro dominante ?',
        `Et pour ${roundToNearest5g(grams * 1.5)}g ?`,
        'Combler mes protéines du jour',
      ],
      memory: {
        lastIntent: 'substitution',
        lastFoodId: targetFood.id,
        lastGrams: result.sourceGrams,
        lastMode: mode,
      },
    };
  }

  // =========================================================================
  // 2. COMBLER SES PROTÉINES EN DIRECT
  // =========================================================================
  if (intent === 'protein_gap') {
    if (remProt <= 5) {
      return {
        text:
          `Bravo ${profile.name || 'Athlète'} ! Tu as déjà validé ton quota protéique du jour (**${Math.round(todayMacros.protein)}g / ${targets.protein}g**).\n\n` +
          (remKcal > 180
            ? `Il te reste **${remKcal} kcal** disponibles : privilégie des glucides digestes ou fruits frais (ex: **${roundToNearest5g((remKcal / 90) * 100)}g de banane** ou **flocons/riz**) et pense aux ${remWater} ml d'eau restants.`
            : `Tes calories du jour sont également bouclées (${todayMacros.kcal} / ${targets.kcal} kcal). Hydrate-toi bien et place à la récupération !`),
        suggestions: ['Bilan complet de ma journée', 'Conseil récupération & sommeil'],
        memory: { lastIntent: 'protein_gap' },
      };
    }

    const protGap = Math.min(65, Math.max(15, remProt));
    const proteinCandidates = getCompatibleProteinFoods(profile);

    // Sélection variée : 1 option rapide/laitière ou shaker, 1 option repas salée maigre, 1 option végétale ou alternative
    const picks = [];
    const quickIds = ['skyr_0', 'fromage_blanc_0', 'whey_isolate', 'proteine_vegan_poudre', 'yaourt_soja', 'tofu_fume'];
    const mealIds = ['poulet_blanc', 'dinde_filet', 'thon_naturel', 'tofu_ferme', 'tempeh', 'cabillaud', 'pst_rehydratees', 'oeufs_entiers'];

    const quickPick = proteinCandidates.find((f) => quickIds.includes(f.id));
    if (quickPick) picks.push(quickPick);

    for (const id of mealIds) {
      if (picks.length >= 3) break;
      const found = proteinCandidates.find((f) => f.id === id && !picks.some((p) => p.id === f.id));
      if (found) picks.push(found);
    }

    const formattedOptions = picks.map((food) => {
      const rawGrams = (protGap / food.per100g.protein) * 100;
      const clampedGrams = roundToNearest5g(Math.min(400, Math.max(25, rawGrams)));
      const m = calculateFoodMacros(food, clampedGrams);
      return `• **${clampedGrams}g de ${food.name}** *(${food.state})* → apporte **+${m.protein}g de protéines** pour seulement **${m.kcal} kcal** (${m.carbs}g G · ${m.fat}g L).`;
    });

    return {
      text:
        `Il te manque exactement **${remProt}g de protéines** aujourd'hui *(actuellement ${Math.round(todayMacros.protein)}g / ${targets.protein}g, avec ${Math.max(0, remKcal)} kcal restantes)*.\n\n` +
        `Voici **${formattedOptions.length} options précises** adaptées à ton profil (${activeFiltersLabel}) pour couvrir ~${protGap}g d'un coup :\n\n` +
        formattedOptions.join('\n') +
        `\n\nTu peux les ajouter en 1 clic dans l'onglet **Nutrition** !`,
      suggestions: [
        'Idée repas rapide ce soir',
        'Par quoi remplacer 150g de poulet ?',
        'Bilan complet de ma journée',
      ],
      memory: { lastIntent: 'protein_gap' },
    };
  }

  // =========================================================================
  // 3. QUE MANGER / IDÉE REPAS SELON MACROS RESTANTES
  // =========================================================================
  if (intent === 'meal_idea') {
    const budgetKcal = remKcal > 220 ? remKcal : Math.round(targets.kcal * 0.3);
    const compatibleRecipes = RECIPES_DATA.filter((r) => isRecipeCompatibleWithProfile(r, profile));

    const scoredRecipes = compatibleRecipes
      .map((r) => {
        const baseMacros = computeRecipeMacros(r, 1);
        // Cherche le multiplicateur (0.5, 1, 1.5) qui colle le mieux au budget restant
        const mults = [0.5, 1, 1.5, 2];
        let bestMult = 1;
        let minDiff = Infinity;
        for (const m of mults) {
          const diff = Math.abs(baseMacros.kcal * m - Math.min(budgetKcal, 850));
          if (diff < minDiff) {
            minDiff = diff;
            bestMult = m;
          }
        }
        const scaled = computeRecipeMacros(r, bestMult);
        return { recipe: r, mult: bestMult, macros: scaled, diff: minDiff };
      })
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);

    if (scoredRecipes.length === 0) {
      const pFood = getCompatibleProteinFoods(profile)[0];
      const cFood = getCompatibleCarbFoods(profile)[0];
      return {
        text:
          `Pour boucler ta journée (**${Math.max(0, remKcal)} kcal** et **${Math.max(0, remProt)}g P** restants), assemble une assiette simple :\n` +
          (pFood ? `• **160g de ${pFood.name}**\n` : '') +
          (cFood ? `• **80g de ${cFood.name}**\n` : '') +
          `• **200g de légumes verts** + **10g d'huile d'olive ou colza**.`,
        suggestions: ['Combler mes protéines du jour', 'Bilan complet de ma journée'],
        memory: { lastIntent: 'meal_idea' },
      };
    }

    const recipeLines = scoredRecipes.map(
      ({ recipe, mult, macros }) =>
        `• **${recipe.title}** *(portion ${mult}x • ${recipe.prepMinutes} min)* → **${macros.kcal} kcal** | **${macros.protein}g P** · ${macros.carbs}g G · ${macros.fat}g L`
    );

    return {
      text:
        `Au vu de ta journée, il te reste **${Math.max(0, remKcal)} kcal** *(dont ${Math.max(0, remProt)}g P · ${Math.max(0, remCarbs)}g G · ${Math.max(0, remFat)}g L)*.\n\n` +
        `Voici **3 recettes calibrées** 100% compatibles avec tes filtres (${activeFiltersLabel}) :\n\n` +
        recipeLines.join('\n') +
        `\n\nOuvre l'onglet **Nutrition** pour l'ajouter à ton repas et envoyer les ingrédients vers ta liste de courses !`,
      suggestions: [
        'Combler mes protéines du jour',
        'Par quoi remplacer 80g de riz ?',
        'Je suis fatigué pour ma séance',
      ],
      memory: { lastIntent: 'meal_idea' },
    };
  }

  // =========================================================================
  // 4. FATIGUE / BAISSE D'ÉNERGIE AVANT SÉANCE
  // =========================================================================
  if (intent === 'fatigue_workout') {
    const hydrationPct = Math.round((waterMl / Math.max(1, targets.waterMl)) * 100);
    return {
      text:
        `Écouter ses signaux nerveux fait partie de la progression, ${profile.name || 'Athlète'}. Pas besoin de culpabiliser ni de tout annuler !\n\n` +
        `**Mon plan d'adaptation immédiat en 3 points :**\n` +
        `1. **Passe en « Mode Énergie Basse (-25% volume) »** dans l'onglet **Entraînements** : tu conserves l'intensité technique sans creuser ta dette nerveuse, et tu valides ta régularité (${workoutsLast7Days} séance(s) sur les 7 derniers jours).\n` +
        `2. **Check Hydratation & Carburant** : tu es à **${waterMl} ml** d'eau (${hydrationPct}% de ta cible). Une déshydratation de 2% chute la force de 10%. Bois 350 ml d'eau maintenant${todayMacros.carbs < 60 ? ' + un fruit rapide (banane ou compote) 25 min avant' : ''}.\n` +
        `3. **Si fatigue > 8/10 ou manque de sommeil sévère (< 5h30)** : remplace la muscu lourde par la routine **Mobilité, Posture & Gainage McGill (16 min)**.`,
      suggestions: [
        'J’ai seulement 20 min pour m’entraîner',
        'Conseil récupération & sommeil',
        'Combler mes protéines du jour',
      ],
      memory: { lastIntent: 'fatigue_workout' },
    };
  }

  // =========================================================================
  // 5. MANQUE DE TEMPS (FORMAT EXPRESS EMOM / SUPERSET)
  // =========================================================================
  if (intent === 'short_time') {
    return {
      text:
        `20 minutes suffisent largement pour déclencher un vrai stimulus musculaire et métabolique si on coupe les temps morts !\n\n` +
        `**2 formats ultra-efficaces à lancer tout de suite :**\n` +
        `• **Option A — Superset Antagoniste (18 min)** : alterne sans repos un mouvement de poussée (*Pompes ou Développé*) et un tirage (*Rowing ou Tractions*), puis prends **60s de repos**. 4 tours = haut du corps complet plié !\n` +
        `• **Option B — EMOM 16 minutes** : chaque minute paire = *12 Squats ou Fentes*, chaque minute impaire = *10 Pompes + 30s Gainage*.\n\n` +
        `Tu as aussi le programme dédié **« HIIT Cardio & Core Express (20 min) »** prêt avec chronomètre automatique dans l'onglet **Entraînements**.`,
      suggestions: [
        'Je suis fatigué pour ma séance',
        'Combler mes protéines du jour',
        'Idée repas rapide ce soir',
      ],
      memory: { lastIntent: 'short_time' },
    };
  }

  // =========================================================================
  // 6. GÊNES ARTICULAIRES & VARIANTES D'EXERCICES
  // =========================================================================
  if (intent === 'joint_pain') {
    let specificAdvice =
      `• **Épaules** : remplace la barre droite par des **haltères en prise neutre** (paumes face à face) sur banc incliné à 15-30°, et ajoute du *Face Pull*.\n` +
      `• **Genoux** : privilégie les **Fentes arrière** (tibia vertical) ou le **Pont fessier / RDL** plutôt que les fentes avant ou squats sautés.\n` +
      `• **Bas du dos (Lombaires)** : remplace le rowing barre penché par du **Rowing unilatéral appuyé sur banc** et renforce ton caisson abdominal avec le **Protocole McGill Big 3** (Onglet Entraînements).`;

    if (norm.includes('epaule')) {
      specificAdvice =
        `**Adaptation spéciale Épaule :**\n` +
        `• Évite le développé couché barre coudes ouverts à 90° et le tirage nuque.\n` +
        `• Passe sur un **Développé haltères prise neutre** (coudes à 35-45° du buste) ou **Floor Press** (amplitude protégée au sol).\n` +
        `• Active ta coiffe des rotateurs en échauffement avec le *Nageur dorsal Y-T-W* ou *Face Pull léger*.`;
    } else if (norm.includes('genou')) {
      specificAdvice =
        `**Adaptation spéciale Genoux :**\n` +
        `• Remplace les sauts et fentes avant par des **Fentes arrière contrôlées** ou du **Hip Thrust / Soulevé roumain**.\n` +
        `• Ralentis le tempo excentrique (**3 secondes à la descente**) : tu stimuleras autant tes fibres avec moins de charge articulaire !`;
    } else if (norm.includes('dos') || norm.includes('lombaire')) {
      specificAdvice =
        `**Adaptation spéciale Bas du Dos :**\n` +
        `• Supprime temporairement la charge axiale lourde si tu ressens un pincement.\n` +
        `• Privilégie le **Squat Bulgare**, les **Tractions / Tirages verticaux** et le **Rowing poitrine appuyée**.\n` +
        `• Lance la séance **« Protocole Big 3 McGill »** dans l'onglet Entraînements pour blinder tes stabilisateurs profonds sans flexion lombaire.`;
    }

    return {
      text:
        `Règle d'or : **on contourne la douleur, on ne force jamais dessus** *(et si une douleur vive persiste au repos, consulte un médecin ou kiné du sport)*.\n\n` +
        specificAdvice +
        `\n\n*Astuce : dans le lecteur de séance active, chaque exercice affiche une variante biomécanique sécurisée !*`,
      suggestions: [
        'Je suis fatigué pour ma séance',
        'Conseil récupération & sommeil',
      ],
      memory: { lastIntent: 'joint_pain' },
    };
  }

  // =========================================================================
  // 7. COURBATURES (DOMS), SOMMEIL & RÉCUPÉRATION
  // =========================================================================
  if (intent === 'doms_recovery') {
    return {
      text:
        `Les courbatures (DOMS) culminent entre 24h et 48h après un nouveau stimulus, mais ne sont pas obligatoires pour progresser !\n\n` +
        `**Protocole Récupération Rapide :**\n` +
        `1. **Mouvement doux (Flux sanguin)** : 15-20 min de marche active ou la routine **Mobilité Hanches & Dos** accélère le drainage bien mieux que l'immobilité totale *(évite en revanche les étirements passifs intenses à froid sur un muscle très courbaturé)*.\n` +
        `2. **Synthèse protéique & Eau** : vise bien tes **${targets.protein}g de protéines** (il t'en reste ${Math.max(0, remProt)}g aujourd'hui) et tes **${(targets.waterMl / 1000).toFixed(1)} L d'eau**.\n` +
        `3. **Sommeil profond** : 7h30 à 8h30 dans une chambre fraîche (18-19°C), repas du soir pris 2h avant le coucher pour optimiser l'hormone de croissance.`,
      suggestions: [
        'Combler mes protéines du jour',
        'Idée repas rapide ce soir',
        'Bilan complet de ma journée',
      ],
      memory: { lastIntent: 'doms_recovery' },
    };
  }

  // =========================================================================
  // 8. HYDRATATION
  // =========================================================================
  if (intent === 'hydration') {
    const pct = Math.min(100, Math.round((waterMl / Math.max(1, targets.waterMl)) * 100));
    return {
      text:
        `Côté hydratation, tu es actuellement à **${waterMl} ml sur ${targets.waterMl} ml** (${pct}%).\n\n` +
        (remWater > 0
          ? `Il te reste **${remWater} ml** à boire d'ici ce soir — soit environ **${Math.ceil(remWater / 250)} grands verres de 250 ml**.\n`
          : `Objectif d'hydratation 100% atteint aujourd'hui, top discipline !\n`) +
        `\n**Repère terrain :** ajoute **+400 à 500 ml par demi-heure d'entraînement** si tu transpires beaucoup, avec une pincée de sel sur tes repas pour retenir les électrolytes.`,
      suggestions: ['Bilan complet de ma journée', 'Combler mes protéines du jour'],
      memory: { lastIntent: 'hydration' },
    };
  }

  // =========================================================================
  // 9. PLATEAU / OBJECTIF / CRÉATINE
  // =========================================================================
  if (intent === 'goal_plateau') {
    const goalLabels = {
      cut: 'Perte de gras (Déficit contrôlé)',
      maintain: 'Maintien / Recomposition corporelle',
      bulk: 'Prise de muscle (Surplus propre)',
    };
    const creatineGrams = Math.max(3, Math.min(5, Math.round((profile.weight || 74) * 0.05)));

    return {
      text:
        `Ton profil est actuellement réglé sur **${goalLabels[profile.goal] || 'Maintien'}** avec une cible de **${targets.kcal} kcal/j** et **${targets.protein}g de protéines** (pour ${profile.weight || 74} kg).\n\n` +
        `**Pour débloquer un plateau :**\n` +
        `• **Régularité sur 14 jours** : le poids fluctue de ±1 kg selon le glycogène et l'eau. Fie-toi à la moyenne glissante sur 2 semaines.\n` +
        `• **NEAT caché** : garde 7 500 à 10 000 pas/jour — en déficit, le corps réduit inconsciemment nos mouvements quotidiens.\n` +
        `• **Côté compléments utiles** : seuls la **Créatine Monohydrate Creapure (${creatineGrams}g/jour tous les jours avec un repas)**, la **Vitamine D3** en hiver et les **Oméga-3** (ou 2 poissons gras/semaine) ont un consensus scientifique fort.`,
      suggestions: ['Bilan complet de ma journée', 'Combler mes protéines du jour'],
      memory: { lastIntent: 'goal_plateau' },
    };
  }

  // =========================================================================
  // 10. BILAN COMPLET DE LA JOURNÉE OU ACCUEIL CONTEXTUEL INTELLIGENT
  // =========================================================================
  const kcalPct = Math.round(((todayMacros.kcal || 0) / Math.max(1, targets.kcal)) * 100);
  const protPct = Math.round(((todayMacros.protein || 0) / Math.max(1, targets.protein)) * 100);

  return {
    text:
      `Salut **${profile.name || 'Athlète'}** ! Voici ton point de situation en direct :\n\n` +
      `• **Énergie du jour :** **${todayMacros.kcal || 0} / ${targets.kcal} kcal** (${kcalPct}%) → reste **${Math.max(0, remKcal)} kcal**\n` +
      `• **Protéines :** **${Math.round(todayMacros.protein || 0)}g / ${targets.protein}g** (${protPct}%) → ${remProt > 0 ? `reste **${remProt}g** à combler` : 'cible atteinte !'}\n` +
      `• **Hydratation :** **${(waterMl / 1000).toFixed(2)} L / ${(targets.waterMl / 1000).toFixed(2)} L**\n` +
      `• **Régularité sport (7j) :** **${workoutsLast7Days} séance(s)** validée(s)${lastWorkout ? ` *(dernière : ${lastWorkout.title})*` : ''}\n\n` +
      `Dis-moi ce dont tu as besoin : **trouver un repas calibré**, **calculer l'équivalent d'un aliment**, ou **adapter ta séance du jour** !`,
    suggestions: [
      remProt > 15 ? 'Combler mes protéines du jour' : 'Idée repas rapide ce soir',
      'Par quoi remplacer 80g de riz ?',
      'Je suis fatigué pour ma séance',
    ],
    memory: { lastIntent: 'daily_summary' },
  };
}
