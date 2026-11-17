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
import { WORKOUT_PROGRAMS } from '../data/workoutsData.js';
import { calculateNutritionalTargets } from '../db/database.js';
import {
  normalizeText,
  computeSubstitutions,
  findFoodByQuery,
  roundToNearest5g,
} from './substitutionEngine.js';
import {
  SCIENTIFIC_STUDIES,
  prewarmScientificIndex,
  retrieveScientificEvidence,
} from '../data/scientificKnowledge.js';

export const QUICK_COACH_SUGGESTIONS_BY_LANG = {
  fr: [
    'Génère-moi un menu complet pour la journée',
    'Combler mes protéines du jour',
    'Par quoi remplacer 80g de riz ?',
    'Créatine & compléments vraiment utiles ?',
    'Que manger avant et après ma séance ?',
    'Quel programme choisir pour mon objectif ?',
    'Calculer ma Zone 2 cardio & VO2max',
    'Comment appliquer la surcharge progressive ?',
  ],
  en: [
    'Generate a full-day meal plan for my macros',
    'Fill my remaining protein today',
    'Swap for 80g of basmati rice?',
    'Which supplements actually work (science)?',
    'What to eat before and after training?',
    'Which workout split fits my goal?',
    'Calculate my Zone 2 heart rate',
  ],
  es: [
    'Genera un menú completo para mis macros',
    'Cubrir mis proteínas restantes hoy',
    '¿Por qué cambiar 80g de arroz?',
    '¿Qué suplementos funcionan según la ciencia?',
    '¿Qué comer antes y después de entrenar?',
    '¿Qué programa elegir para mi objetivo?',
    'Calcular mi Zona 2 cardiovascular',
  ],
};

export const QUICK_COACH_SUGGESTIONS = QUICK_COACH_SUGGESTIONS_BY_LANG.fr;

const PRECACHE_MARKER_KEY = 'pulsefit_coach_offline_ready_v4';
let isEnginePrewarmed = false;

/**
 * Pré-charge et indexe l'intégralité du moteur IA + base scientifique + 151 aliments + 40 recettes
 * dès la milliseconde d'ouverture du site (0 ms d'attente au clic sur Coach IA, 100% hors-ligne).
 */
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
          recipes: RECIPES_DATA.length,
          programs: WORKOUT_PROGRAMS.length,
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

function extractGramsFromText(rawText) {
  const match = String(rawText).match(/(\d{1,4})\s*(?:g|gr|grammes|grams|gramos|ml)\b/i);
  if (match) return Number(match[1]);
  const bareNum = String(rawText).match(/\b(\d{2,3})\b/);
  if (bareNum) return Number(bareNum[1]);
  return null;
}

function extractCandidateFoodPhrase(normText) {
  const stopWords = new Set([
    'par', 'quoi', 'remplacer', 'substituer', 'echanger', 'equivalent', 'equivalences',
    'equivalence', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'd', 'l',
    'pour', 'avec', 'sans', 'en', 'mode', 'iso', 'calorique', 'calories', 'kcal',
    'macro', 'macros', 'grammes', 'gr', 'g', 'ml', 'alternative', 'alternatives',
    'what', 'can', 'swap', 'replace', 'of', 'for', 'por', 'que', 'cambiar', 'sustituir',
  ]);

  return normText
    .replace(/\b\d+\s*(g|gr|grammes|grams|ml)?\b/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .join(' ')
    .trim();
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
    exercises:
      '1. **Développé incliné haltères (30°)** : 3–4 × 8–10 reps *(cible le faisceau claviculaire avec grande amplitude)*\n' +
      '2. **Développé couché ou Presse convergente** : 3 × 6–8 reps *(tension mécanique lourde, 2–3 min repos)*\n' +
      '3. **Écartés poulie vis-à-vis ou Dips buste penché** : 3 × 12–15 reps *(hypertrophie maximale en position étirée)*',
    tip: 'Resserre légèrement les omoplates en abaissant les épaules et garde un angle de coudes à ~45° pour protéger la coiffe des rotateurs.',
  },
  {
    keys: ['dos', 'largeur', 'epaisseur', 'traction', 'tractions', 'rowing', 'dorsaux', 'back', 'lats'],
    title: 'Dos (Largeur en V & Épaisseur)',
    exercises:
      '1. **Tractions pronation ou Tirage vertical prise neutre** : 3–4 × 6–10 reps *(grand dorsal — tire les coudes vers les hanches)*\n' +
      '2. **Rowing haltère unilatéral ou Rowing poitrine appuyée** : 3–4 × 8–12 reps *(trapèzes moyens & rhomboïdes sans stress lombaire)*\n' +
      '3. **Face Pull à la corde** : 3 × 15 reps *(santé scapulaire et deltoïde postérieur)*',
    tip: 'Laisse tes omoplates s’étirer complètement en haut du mouvement avant chaque tirage (Wolf et al., 2023).',
  },
  {
    keys: ['bras', 'biceps', 'triceps', 'avant bras', 'arms', 'curl'],
    title: 'Bras (Biceps & Triceps — 3 chefs)',
    exercises:
      '1. **Curl incliné haltères (banc 45°) ou Bayesian Curl poulie** : 3 × 10–12 reps *(étire la longue portion du biceps)*\n' +
      '2. **Extensions triceps poulie au-dessus de la tête (Overhead)** : 3–4 × 10–12 reps *(+40 % d’hypertrophie de la longue portion du triceps selon Maeo et al., 2022)*\n' +
      '3. **Curl marteau + Pushdown barre droite** : 3 × 12 reps *(brachial & vaste externe)*',
    tip: 'Verrouille les coudes fixes le long du buste (ou près des oreilles en overhead) et vise 10 à 14 séries directes par semaine.',
  },
  {
    keys: ['epaule', 'epaules', 'deltoide', 'deltoides', 'shoulders', 'elevations laterales'],
    title: 'Épaules 3D (Antérieur, Latéral & Postérieur)',
    exercises:
      '1. **Développé militaire haltères ou barre** : 3 × 6–10 reps *(force globale de poussée verticale)*\n' +
      '2. **Élévations latérales à la poulie basse (câble hauteur poignet)** : 4 × 12–15 reps *(tension maximale dès le bas du mouvement)*\n' +
      '3. **Oiseau poulie ou Face Pull** : 3 × 15 reps *(arrière d’épaule & posture)*',
    tip: 'Sur les élévations latérales, monte dans le plan scapulaire (~20° vers l’avant) sans hausser les trapèzes.',
  },
  {
    keys: ['fessier', 'fessiers', 'glutes', 'hip thrust', 'fesses'],
    title: 'Fessiers (Grand, Moyen & Petit Glutéal)',
    exercises:
      '1. **Hip Thrust barre ou haltère (pause 1s en haut)** : 4 × 8–10 reps *(pic de contraction maximal en extension de hanche)*\n' +
      '2. **Squat Bulgare buste penché ou Soulevé de terre Roumain (RDL)** : 3 × 8–10 reps *(étirement maximal sous charge)*\n' +
      '3. **Abduction hanche poulie ou élastique** : 3 × 15 reps *(moyen fessier & galbe latéral)*',
    tip: 'En Squat Bulgare, penche légèrement le buste vers l’avant avec le tibia avant vertical pour cibler les fessiers plutôt que les quadriceps.',
  },
  {
    keys: ['jambe', 'jambes', 'quadriceps', 'ischios', 'mollets', 'cuisses', 'squat', 'legs'],
    title: 'Jambes Complètes (Quadriceps, Ischios & Mollets)',
    exercises:
      '1. **Squat / Hack Squat ou Goblet Squat profond** : 3–4 × 6–10 reps *(flexion complète du genou)*\n' +
      '2. **Soulevé de terre Roumain (RDL) + Leg Curl assis** : 3 × 8–12 reps *(le Leg Curl assis surpasse le couché grâce à l’étirement des ischios à la hanche)*\n' +
      '3. **Mollets debout jambes tendues (pause 2s en bas)** : 4 × 10–15 reps',
    tip: 'Prends 2min30 à 3min de repos sur tes séries de Squat et RDL pour maintenir un recrutement moteur optimal.',
  },
  {
    keys: ['abdo', 'abdos', 'abdominaux', 'ventre plat', 'gainage', 'six pack', 'core', 'abs'],
    title: 'Sangle Abdominale & Définition Visuelle',
    exercises:
      '1. **Crunch à la poulie haute ou Relevé de bassin enroulé** : 3 × 10–15 reps *(flexion vertébrale avec surcharge progressive)*\n' +
      '2. **Gainage McGill (Planche RKC + Pallof Press anti-rotation)** : 3 × 30–45s *(transverse & stabilité lombaire)*\n' +
      '3. **Visibilité :** la définition des abdos dépend avant tout du taux de masse grasse (~10–14 % homme, ~18–22 % femme) via un léger déficit calorique.',
    tip: 'On ne peut pas perdre du gras localement sur le ventre : combine déficit modéré (-15 %), 8 500 pas/jour et renforcement lourd.',
  },
];

const INTENT_RULES = [
  {
    id: 'greeting',
    keywords: ['bonjour', 'salut', 'coucou', 'hello', 'hey', 'hola', 'que sais tu faire', 'aide moi'],
    weight: 3.1,
  },
  {
    id: 'full_day_menu',
    keywords: [
      'menu complet', 'plan repas', 'journee type', 'menu pour la journee',
      'plan alimentaire', 'full day meal', 'meal plan', 'menu completo', 'plan de comidas',
    ],
    weight: 5.2,
  },
  {
    id: 'peri_workout',
    keywords: [
      'avant seance', 'apres seance', 'avant et apres', 'avant ma seance', 'apres ma seance',
      'avant le sport', 'apres le sport', 'fenetre anabolique', 'collation pre', 'post workout',
      'before and after', 'antes y despues',
    ],
    weight: 4.8,
  },
  {
    id: 'one_rm_calc',
    keywords: ['1rm', 'max au', 'reps a', 'repetitions a', 'force max'],
    weight: 4.6,
  },
  {
    id: 'cardio_zones',
    keywords: [
      'zone 2', 'fcmax', 'frequence cardiaque', 'vo2max', 'heart rate', 'zona 2',
    ],
    weight: 4.6,
  },
  {
    id: 'steps_neat',
    keywords: ['combien de pas', '10000 pas', '8000 pas', 'neat', 'marche rapide', 'tapis incline', 'daily steps'],
    weight: 4.5,
  },
  {
    id: 'progressive_overload',
    keywords: [
      'surcharge progressive', 'double progression', 'augmenter les poids', 'augmenter les charges',
      'comment progresser', 'stagne en force', 'progressive overload',
    ],
    weight: 4.6,
  },
  {
    id: 'warmup_mobility',
    keywords: ['echauffement', 'echauffer', 'etirement', 'etirements', 'souplesse', 'mobilite', 'warmup', 'stretching'],
    weight: 4.3,
  },
  {
    id: 'cravings_cheat',
    keywords: [
      'fringale', 'faim', 'envie de sucre', 'grignotage', 'cheat meal', 'ecart', 'restaurant',
      'fast food', 'pizza', 'burger', 'ballonnement', 'digestion', 'fibre', 'fibres',
    ],
    weight: 4.3,
  },
  {
    id: 'macros_calc',
    keywords: [
      'calculer mes calories', 'mes calories', 'mes macros', 'metabolisme', 'bmr', 'tdee',
      'mifflin', 'combien de calories', 'repartition macro',
    ],
    weight: 4.3,
  },
  {
    id: 'muscle_anatomy',
    keywords: [
      'pectoraux', 'pecs', 'muscler le dos', 'largeur dos', 'biceps', 'triceps', 'prendre des bras',
      'epaules', 'deltoides', 'fessiers', 'hip thrust', 'quadriceps', 'ischios', 'mollets',
      'abdos', 'abdominaux', 'ventre plat',
    ],
    weight: 4.4,
  },
  {
    id: 'substitution',
    keywords: [
      'remplacer', 'remplace', 'equivalent', 'equivalence', 'substituer',
      'alternative', 'echanger', 'swap', 'replace', 'cambiar', 'sustituir',
    ],
    weight: 4.4,
  },
  {
    id: 'supplements',
    keywords: [
      'creatine', 'creatina', 'cafeine', 'caffeine', 'bcaa', 'whey', 'caseine',
      'omega', 'magnesium', 'vitamine', 'collagene', 'complement', 'complements',
      'supplement', 'supplements', 'suplemento', 'suplementos', 'booster', 'preworkout',
    ],
    weight: 4.1,
  },
  {
    id: 'program_choice',
    keywords: [
      'quel programme', 'choisir programme', 'ppl', 'upper lower', 'full body',
      'combien de seances', 'combien de series', 'split', 'which workout', 'which program',
      'que programa', 'rutina',
    ],
    weight: 4.0,
  },
  {
    id: 'protein_gap',
    keywords: [
      'proteine', 'proteines', 'combler', 'manque de prot', 'protein', 'proteina',
      'proteinas', 'quota',
    ],
    weight: 3.7,
  },
  {
    id: 'meal_idea',
    keywords: [
      'que manger', 'quoi manger', 'idee repas', 'ce soir', 'diner', 'dejeuner',
      'petit dejeuner', 'collation', 'dinner', 'meal idea', 'eat tonight', 'cena', 'comer',
    ],
    weight: 3.6,
  },
  {
    id: 'joint_pain',
    keywords: [
      'douleur', 'douleurs', 'mal a', 'mal au', 'mal aux', 'genou', 'genoux',
      'lombaire', 'lombaires', 'mal de dos', 'coude', 'poignet', 'tendinite', 'blessure',
      'shoulder pain', 'knee pain', 'back pain', 'joint pain', 'injury',
      'dolor', 'lesion', 'hombro', 'rodilla', 'espalda',
    ],
    weight: 4.4,
  },
  {
    id: 'fatigue_sleep',
    keywords: [
      'fatigue', 'epuise', 'creve', 'mal dormi', 'sommeil', 'dormir', 'courbature',
      'courbatures', 'doms', 'deload', 'flemme', 'pas le temps', '20 min', 'emom',
      'tired', 'sleep', 'sore', 'cansado', 'sueno', 'agujetas',
    ],
    weight: 3.7,
  },
  {
    id: 'fatloss_bulk_science',
    keywords: [
      'seche', 'deficit', 'maigrir', 'perdre du gras', 'plateau', 'stagne',
      'prise de masse', 'surplus', 'grossir', 'jeune', 'intermittent', '16 8', 'alcool',
      'cardio', 'courir', 'etude', 'science', 'scientifique', 'pubmed', 'issn',
      'cut', 'bulk', 'fasting', 'study', 'definicion', 'volumen', 'ayuno',
    ],
    weight: 3.5,
  },
  {
    id: 'hydration',
    keywords: ['eau', 'hydratation', 'boire', 'crampe', 'electrolytes', 'water', 'hydration', 'agua'],
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
 * Moteur IA Conversationnel Hors-Ligne Pré-Caché (0 ms, illimité, 20 modules experts, ancré PubMed/ISSN)
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

  const intent = detectTopIntent(norm, previousMemory);

  // =========================================================================
  // 0. SALUTATION & CAPACITÉS DU COACH HORS-LIGNE
  // =========================================================================
  if (intent === 'greeting' && norm.split(' ').length <= 6) {
    return {
      text:
        `Salut **${profile.name || 'Athlète'}** ! Mon moteur scientifique est **100 % pré-chargé hors-ligne** (25 méta-analyses ISSN/ACSM/PubMed, 151 aliments certifiés, 40 recettes et 7 programmes).\n\n` +
        `Aujourd'hui il te reste **${Math.max(0, remKcal)} kcal** et **${Math.max(0, remProt)}g de protéines**. Tu peux me demander :\n` +
        `• Un **menu complet** calibré sur tes macros\n` +
        `• Par quoi **remplacer n'importe quel aliment** au gramme près\n` +
        `• Quels exercices cibler (**pecs, dos, bras, fessiers, abdos**), ton **1RM** ou ta **Zone 2 cardio**\n` +
        `• Quoi manger **avant/après séance** ou quels **compléments** choisir !`,
      sources: [SCIENTIFIC_STUDIES[0], SCIENTIFIC_STUDIES[4]].map((s) => ({
        ...s,
        localizedSummary: s.summary[lang] || s.summary.fr,
      })),
      suggestions: defaultSugs.slice(0, 4),
      memory: { lastIntent: 'greeting' },
    };
  }

  // =========================================================================
  // 1. GÉNÉRATEUR DE JOURNÉE ALIMENTAIRE COMPLÈTE CALIBRÉE SUR LES MACROS
  // =========================================================================
  if (intent === 'full_day_menu') {
    const compatible = RECIPES_DATA.filter((r) =>
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
        `**Journée alimentaire sur-mesure (${totalK} kcal · ${totalP}g P)** calibrée sur ta cible (${targets.kcal} kcal, filtrée selon tes préférences) :\n\n` +
        lines.join('\n') +
        `\n\n*Selon le consensus ISSN (Jäger et al., 2017), répartir tes protéines sur ces 4 prises maximise l'anabolisme musculaire sur 24h.*`,
      sources: retrieveScientificEvidence('proteine repartition repas', lang, 2),
      suggestions: [
        'Génère-moi un menu complet pour la journée',
        'Que manger avant et après ma séance ?',
        'Par quoi remplacer 80g de riz ?',
      ],
      memory: { lastIntent: 'full_day_menu' },
    };
  }

  // =========================================================================
  // 2. NUTRITION PÉRI-TRAINING (AVANT & APRÈS SÉANCE)
  // =========================================================================
  if (intent === 'peri_workout') {
    const preCarbs = Math.round(weightKg * 0.8);
    const preProt = Math.round(weightKg * 0.35);
    const postProt = Math.round(weightKg * 0.4);
    const postCarbs = Math.round(weightKg * 1.0);

    return {
      text:
        `**Protocole Nutrition Avant & Après Séance pour ${weightKg} kg** *(Aragon & Schoenfeld, 2013 — JISSN)* :\n\n` +
        `• **1h30 à 2h30 AVANT séance :** vise **~${preCarbs}g de glucides digestes** + **~${preProt}g de protéines** faibles en lipides/fibres *(ex: flocons d'avoine + Skyr/Whey + banane, ou riz basmati + poulet/tofu)*. Si séance dans <30 min : 1 banane mûre ou compote + café.\n` +
        `• **Dans les 2h APRÈS séance :** vise **~${postProt}g de protéines riches en leucine** + **~${postCarbs}g de glucides** pour recharger le glycogène et stopper le catabolisme.\n` +
        `• **Règle d'or :** inutile de courir boire un shaker dans les 5 minutes — l'essentiel est de ne pas dépasser **4 à 5h** entre ton repas pré-séance et ton repas post-séance !`,
      sources: retrieveScientificEvidence('avant seance apres seance fenetre anabolique', lang, 2),
      suggestions: [
        'Combler mes protéines du jour',
        'Créatine & compléments vraiment utiles ?',
        'Génère-moi un menu complet pour la journée',
      ],
      memory: { lastIntent: 'peri_workout' },
    };
  }

  // =========================================================================
  // 3. COACHING ANATOMIQUE PAR GROUPE MUSCULAIRE
  // =========================================================================
  if (intent === 'muscle_anatomy') {
    const foundGuide =
      MUSCLE_GUIDES.find((g) => g.keys.some((k) => norm.includes(k))) || MUSCLE_GUIDES[0];

    return {
      text:
        `**Protocole Hypertrophie — ${foundGuide.title}** *(10 à 16 séries/semaine réparties en 2 séances)* :\n\n` +
        `${foundGuide.exercises}\n\n` +
        `**Clé biomécanique :** ${foundGuide.tip}`,
      sources: retrieveScientificEvidence('amplitude etirement volume serie', lang, 2),
      suggestions: [
        'Comment appliquer la surcharge progressive ?',
        'Quel programme choisir pour mon objectif ?',
        'Combler mes protéines du jour',
      ],
      memory: { lastIntent: 'muscle_anatomy' },
    };
  }

  // =========================================================================
  // 4. SURCHARGE PROGRESSIVE & DÉBLOCAGE DE PLATEAU EN MUSCULATION
  // =========================================================================
  if (intent === 'progressive_overload') {
    return {
      text:
        `**La méthode scientifique n°1 : La Double Progression** *(Plotkin et al., 2022 — PeerJ)* :\n\n` +
        `1. **Choisis une fourchette de répétitions**, par exemple **3 séries de 8 à 12 reps** avec une charge où il te reste 1 à 2 reps en réserve (RIR 1–2).\n` +
        `2. **Séance après séance, garde le MÊME poids** et essaie de gagner +1 répétition par série *(ex: 9-8-8 → 10-10-9 → 12-12-12)*.\n` +
        `3. **Dès que tu valides le haut de la fourchette** sur toutes tes séries *(3 × 12 propres)*, augmente la charge de **+2,5 kg** *(ou +1 kg sur les élévations/bras)* à la séance suivante et repars à 8 reps !\n\n` +
        `*Si tu bloques 3 semaines de suite sur un exercice : vérifie tes temps de repos (2–3 min), ton sommeil, ou change de variante pendant 6 semaines.*`,
      sources: retrieveScientificEvidence('surcharge double progression rir', lang, 2),
      suggestions: [
        'Calculer mon 1RM pour 8 reps à 80 kg',
        'Quel programme choisir pour mon objectif ?',
        'Que manger avant et après ma séance ?',
      ],
      memory: { lastIntent: 'progressive_overload' },
    };
  }

  // =========================================================================
  // 5. ÉCHAUFFEMENT & MOBILITÉ PRÉ-SÉANCE
  // =========================================================================
  if (intent === 'warmup_mobility') {
    return {
      text:
        `**Échauffement Optimal en 8 minutes avant Musculation** *(Behm et al., 2016)* :\n\n` +
        `• **1. Thermogenèse (3 min) :** rameur, vélo ou marche inclinée légère pour monter la température synoviale.\n` +
        `• **2. Mobilité dynamique (2 min) :** dislocations d'épaules élastique, ouverture thoracique, squats poids du corps *(zéro étirement statique long >60s avant de pousser lourd, cela réduit la force de ~5 % !)*.\n` +
        `• **3. Gammes montantes sur ton 1er exercice (3 min) :**\n` +
        `  – Série 1 : **50 %** de ta charge de travail × 8 reps\n` +
        `  – Série 2 : **75 %** × 4 reps\n` +
        `  – Série 3 : **90 %** × 1 à 2 reps explosives → Repos 2 min puis attaque ta 1re vraie série !`,
      sources: retrieveScientificEvidence('echauffement etirement mobilite', lang, 2),
      suggestions: [
        'Comment appliquer la surcharge progressive ?',
        'J’ai une gêne à l’épaule ou aux lombaires',
        'Quel programme choisir pour mon objectif ?',
      ],
      memory: { lastIntent: 'warmup_mobility' },
    };
  }

  // =========================================================================
  // 6. PAS QUOTIDIENS (NEAT) & DÉPENSE CALORIQUE DOUCE
  // =========================================================================
  if (intent === 'steps_neat') {
    const kcalPer8k = Math.round(weightKg * 4.2);
    return {
      text:
        `**Le levier secret de la sèche : le NEAT (Pas quotidiens)** *(Paluch et al., 2022 — The Lancet)* :\n\n` +
        `• À ton poids (**${weightKg} kg**), marcher **8 000 à 10 000 pas/jour** brûle environ **~${kcalPer8k} kcal supplémentaires** chaque jour, soit l'équivalent de **~1,2 kg de tissu adipeux par mois** sans aucune fatigue nerveuse ni faim rebond !\n` +
        `• **Astuce gain de temps :** 10 minutes de marche digestive après chacun des 3 repas lissent le pic glycémique de ~22 % et ajoutent déjà **3 500 pas** sans effort.\n` +
        `• **En salle :** la marche sur tapis incliné *(pente 10–12 %, vitesse 4,8 km/h, sans se tenir)* est idéale en fin de séance (20 min).`,
      sources: retrieveScientificEvidence('pas marche neat cardio', lang, 2),
      suggestions: [
        'Calculer ma Zone 2 cardio & VO2max',
        'Génère-moi un menu complet pour la journée',
        'Comment gérer une fringale ou un restaurant ?',
      ],
      memory: { lastIntent: 'steps_neat' },
    };
  }

  // =========================================================================
  // 7. GESTION DES FRINGALES, CHEAT MEAL, RESTAURANT & SATIÉTÉ
  // =========================================================================
  if (intent === 'cravings_cheat') {
    return {
      text:
        `**Protocole Anti-Fringale & Gestion d'Écart Sans Culpabilité** *(Reynolds et al., 2019 — The Lancet)* :\n\n` +
        `• **1. En cas de faim le soir :** combine **protéines lentes + fibres volumineuses** *(ex: 200g Skyr 0 % ou Yaourt grec + 100g fruits rouges surgelés + 10g amandes = ~230 kcal, satiété maximale)*.\n` +
        `• **2. Les 3 champions de l'indice de satiété (Holt, 1995) :** la **pomme de terre vapeur/four** (3,2x plus rassasiante que le pain blanc à calories égales !), les **flocons d'avoine** et le **poisson blanc / blanc de volaille**.\n` +
        `• **3. Restaurant / Cheat Meal prévu :** ne saute jamais tous tes repas de la journée (risque de compulsion). Fais un déjeuner **riche en protéines et légumes** (léger en graisses), profite pleinement de ton repas le soir, bois 500 ml d'eau et reprends ton plan normal dès le lendemain matin *(le poids en plus le lendemain est à 90 % de l'eau liée au glycogène et au sel, pas du gras !)*`,
      sources: retrieveScientificEvidence('faim fringale satiete fibre', lang, 2),
      suggestions: [
        'Par quoi remplacer 80g de riz ?',
        'Combler mes protéines du jour',
        'Génère-moi un menu complet pour la journée',
      ],
      memory: { lastIntent: 'cravings_cheat' },
    };
  }

  // =========================================================================
  // 8. EXPLICATION DÉTAILLÉE DU MÉTABOLISME & DES MACROS DU PROFIL
  // =========================================================================
  if (intent === 'macros_calc') {
    const calc = calculateNutritionalTargets(profile);
    return {
      text:
        `**Ton Bilan Métabolique Exact (Équation de Mifflin-St Jeor)** :\n\n` +
        `• **Métabolisme de base au repos (BMR) :** **${calc.bmr} kcal/j**\n` +
        `• **Dépense totale de maintien (TDEE) :** **${calc.tdee} kcal/j**\n` +
        `• **Ta cible active (${profile.goal === 'cut' ? 'Sèche -18 %' : profile.goal === 'bulk' ? 'Prise de muscle +12 %' : 'Maintien / Recomp.'}) :** **${targets.kcal} kcal/j**\n` +
        `  – **Protéines :** **${targets.protein}g** *(${(targets.protein / weightKg).toFixed(1)} g/kg — construction musculaire)*\n` +
        `  – **Lipides :** **${targets.fat}g** *(${(targets.fat / weightKg).toFixed(1)} g/kg — équilibre hormonal)*\n` +
        `  – **Glucides :** **${targets.carbs}g** *(carburant d'entraînement)*\n` +
        `  – **Hydratation :** **${targets.waterMl} ml/j**`,
      sources: retrieveScientificEvidence('metabolisme mifflin calorie proteine', lang, 2),
      suggestions: [
        'Génère-moi un menu complet pour la journée',
        'Combler mes protéines du jour',
        'Combien de pas par jour (NEAT) ?',
      ],
      memory: { lastIntent: 'macros_calc' },
    };
  }

  // =========================================================================
  // 9. CALCULATEUR 1RM PAR CHAT
  // =========================================================================
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
        `**Calcul de Force Max (Formule d'Epley)** pour **${reps} reps à ${load} kg** :\n\n` +
        `• **1RM estimé :** **${est1Rm} kg**\n` +
        `• **Zone Force (85 % — 4 à 6 reps) :** **${Math.round(est1Rm * 0.85)} kg**\n` +
        `• **Zone Hypertrophie (75 % — 8 à 12 reps) :** **${Math.round(est1Rm * 0.75)} kg**\n` +
        `• **Zone Technique / Tempo (65 %) :** **${Math.round(est1Rm * 0.65)} kg**\n\n` +
        `*Garde 1 à 2 répétitions en réserve (RIR 1–2) et 2 à 3 min de repos sur tes polyarticulaires.*`,
      sources: retrieveScientificEvidence('repos force serie rir', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'one_rm_calc' },
    };
  }

  // =========================================================================
  // 10. ZONES CARDIAQUES (TANAKA) & CARDIO + MUSCULATION
  // =========================================================================
  if (intent === 'cardio_zones') {
    const fcMax = Math.round(208 - 0.7 * ageYears);
    const z2Low = Math.round(fcMax * 0.65);
    const z2High = Math.round(fcMax * 0.75);
    const z4Low = Math.round(fcMax * 0.85);
    const z4High = Math.round(fcMax * 0.92);

    return {
      text:
        `**Tes Zones Cardiaques Personnalisées** *(équation de Tanaka : FCmax ≈ **${fcMax} bpm** à ${ageYears} ans)* :\n\n` +
        `• **Zone 2 (Endurance fondamentale & Oxydation des lipides) :** **${z2Low} à ${z2High} bpm** *(tu dois pouvoir parler en phrases complètes — idéal 2 à 3x 30–45 min/sem)*\n` +
        `• **Zone 4–5 (VO2max / HIIT) :** **${z4Low} à ${z4High} bpm** *(intervalles courts type 30s/30s ou 4x4 min)*\n\n` +
        `**Musculation + Cardio :** selon la méta-analyse de *Schumann et al. (2022)*, faire ton cardio **après** la musculation ou un autre jour n'entrave aucunement la prise de muscle !`,
      sources: retrieveScientificEvidence('cardio zone 2 hiit', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'cardio_zones' },
    };
  }

  // =========================================================================
  // 11. SUBSTITUTION MATHÉMATIQUE D'ALIMENTS
  // =========================================================================
  if (intent === 'substitution' || intent === 'substitution_followup') {
    const isIso = norm.includes('iso') || norm.includes('calori') || norm.includes('kcal');
    const mode = isIso ? 'iso_kcal' : 'dominant_macro';

    let targetFood = null;
    let grams = extractGramsFromText(userMessage);

    if (intent === 'substitution_followup' && previousMemory?.lastFoodId) {
      targetFood = getAllFoods().find((f) => f.id === previousMemory.lastFoodId);
      if (!grams) grams = previousMemory.lastGrams || targetFood?.defaultGrams || 100;
    } else {
      const phrase = extractCandidateFoodPhrase(norm);
      targetFood = findFoodByQuery(phrase) || findFoodByQuery(norm);
      if (!grams && targetFood) grams = targetFood.defaultGrams || 100;
    }

    if (targetFood) {
      const result = computeSubstitutions(targetFood, grams, mode, profile);
      const topAlts = (result?.alternatives || []).slice(0, 4);

      if (topAlts.length > 0) {
        const lines = topAlts.map(
          (alt) =>
            `• **${alt.grams}g ${alt.food.name}** *(${alt.food.state})* → ${alt.macros.kcal} kcal | ${alt.macros.protein}g P · ${alt.macros.carbs}g G · ${alt.macros.fat}g L *(${alt.deltaBadges.kcal})*`
        );

        return {
          text:
            `Équivalences exactes pour **${result.sourceGrams}g de ${targetFood.name}** *(${result.sourceMacros.kcal} kcal, ${result.sourceMacros.protein}g P, ${result.sourceMacros.carbs}g G)* en mode **${result.equivalenceLabel}** :\n\n` +
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

  // =========================================================================
  // 12. COMPLÉMENTS ALIMENTAIRES (CRÉATINE, CAFÉINE, WHEY, BCAA, OMÉGA-3...)
  // =========================================================================
  if (intent === 'supplements') {
    const creatDose = Math.max(3, Math.min(5, Math.round(weightKg * 0.05)));
    const caffLow = Math.round(weightKg * 3);
    const caffHigh = Math.round(weightKg * 5);

    return {
      text:
        `**Hiérarchie scientifique des compléments pour ton poids (${weightKg} kg)** *(Consensus ISSN & CIO)* :\n\n` +
        `**1. Preuve scientifique maximale (Niveau A) :**\n` +
        `• **Créatine Monohydrate :** **${creatDose}g/jour** tous les jours au cours d'un repas (aucune phase de charge requise, sûre à long terme).\n` +
        `• **Protéine en poudre (Whey Isolate ou Pois/Riz) :** pratique uniquement pour atteindre tes **${targets.protein}g P/j**.\n` +
        `• **Caféine :** **${caffLow} à ${caffHigh} mg** 45 min avant une grosse séance (éviter après 16h pour protéger ton sommeil profond).\n\n` +
        `**2. Santé & Récupération :** **Vitamine D3** (en automne/hiver), **Oméga-3** (1–2g EPA/DHA si <2 poissons gras/sem) et **Magnésium bisglycinate** le soir.\n` +
        `**3. Inutiles si ton alimentation est carrée :** *BCAA isolés* et *brûleurs de graisse* (Wolfe, 2017).`,
      sources: retrieveScientificEvidence('creatine cafeine bcaa omega', lang, 2),
      suggestions: [
        'Combler mes protéines du jour',
        'Que manger avant et après ma séance ?',
        'Quel programme choisir pour mon objectif ?',
      ],
      memory: { lastIntent: 'supplements' },
    };
  }

  // =========================================================================
  // 13. CHOIX DE PROGRAMME & STRUCTURE D'ENTRAÎNEMENT
  // =========================================================================
  if (intent === 'program_choice') {
    return {
      text:
        `**Quel programme choisir selon tes disponibilités** *(Schoenfeld et al., 2017 : viser 10–20 séries/muscle/semaine en stimulant chaque muscle 2x/sem)* :\n\n` +
        `• **2 à 3 séances/semaine → Full Body Poids du Corps** ou **Haltères & Kettlebell Maison** *(chaque muscle est stimulé 3x/semaine, rendement maximal)*.\n` +
        `• **4 séances/semaine → Upper / Lower (Haut / Bas)** *(le meilleur compromis force, hypertrophie et récupération nerveuse)*.\n` +
        `• **5 à 6 séances/semaine → Push / Pull / Legs (PPL)** *(idéal pour spécialiser le volume d'hypertrophie en salle)*.\n` +
        `• **Jours chargés ou récupération → HIIT & Core (20 min)** ou **Mobilité & Big 3 McGill** *(tous disponibles dans l'onglet Séances : ${WORKOUT_PROGRAMS.length} programmes prêts !)*`,
      sources: retrieveScientificEvidence('volume serie programme entrainement', lang, 2),
      suggestions: [
        'Comment appliquer la surcharge progressive ?',
        'Quels exercices pour muscler les pectoraux ?',
        'Quels exercices pour muscler le dos ?',
      ],
      memory: { lastIntent: 'program_choice' },
    };
  }

  // =========================================================================
  // 14. COMBLER LES PROTÉINES DU JOUR
  // =========================================================================
  if (intent === 'protein_gap') {
    if (remProt <= 5) {
      return {
        text:
          `Objectif protéique atteint (**${Math.round(todayMacros.protein)}g / ${targets.protein}g**) ! Ta synthèse protéique musculaire est pleinement stimulée. Pense simplement aux **${remWater} ml d'eau** restants d'ici ce soir.`,
        sources: evidence,
        suggestions: defaultSugs.slice(2, 5),
        memory: { lastIntent: 'protein_gap' },
      };
    }

    const protGap = Math.min(60, Math.max(18, remProt));
    const candidates = getCompatibleProteinFoods(profile);
    const picks = [
      'skyr_0',
      'poulet_blanc',
      'tofu_ferme',
      'thon_naturel',
      'whey_isolate',
      'proteine_vegan_poudre',
    ]
      .map((id) => candidates.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, 3);

    const optLines = picks.map((food) => {
      const g = roundToNearest5g(
        Math.min(350, Math.max(25, (protGap / food.per100g.protein) * 100))
      );
      const m = calculateFoodMacros(food, g);
      return `• **${g}g ${food.name}** → **+${m.protein}g P** (${m.kcal} kcal)`;
    });

    return {
      text:
        `Il te reste **${remProt}g de protéines** à couvrir aujourd'hui (${Math.max(0, remKcal)} kcal disponibles). Selon le seuil de leucine **ISSN (20–40g P/prise)**, voici 3 options immédiates adaptées à tes filtres :\n\n` +
        optLines.join('\n'),
      sources: evidence,
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'protein_gap' },
    };
  }

  // =========================================================================
  // 15. IDÉES REPAS / COLLATIONS
  // =========================================================================
  if (intent === 'meal_idea') {
    const budget = remKcal > 220 ? remKcal : Math.round(targets.kcal * 0.3);
    const compatible = RECIPES_DATA.filter((r) => isRecipeCompatibleWithProfile(r, profile));
    const topRecs = compatible
      .map((r) => {
        const m = computeRecipeMacros(r, 1);
        return { r, m, diff: Math.abs(m.kcal - Math.min(budget, 750)) };
      })
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);

    const lines = topRecs.map(
      ({ r, m }) =>
        `• **${r.title}** *(${r.prepMinutes} min)* → **${m.kcal} kcal** | **${m.protein}g P** · ${m.carbs}g G · ${m.fat}g L`
    );

    return {
      text:
        `Avec **${Math.max(0, remKcal)} kcal** et **${Math.max(0, remProt)}g P** restants aujourd'hui, voici 3 recettes équilibrées prêtes dans ton onglet **Repas** :\n\n` +
        lines.join('\n'),
      sources: evidence,
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'meal_idea' },
    };
  }

  // =========================================================================
  // 16. DOULEURS ARTICULAIRES & BIOMÉCANIQUE
  // =========================================================================
  if (intent === 'joint_pain') {
    return {
      text:
        `**Adaptation biomécanique immédiate** *(sans forcer sur une douleur aiguë — consulte un kiné/médecin si gêne persistante au repos)* :\n\n` +
        `• **Épaule :** remplace la barre droite par des **haltères prise neutre** dans le plan scapulaire (coudes à 35°) ou du **Floor Press**, et intègre du *Face Pull*.\n` +
        `• **Genou :** remplace les sauts et fentes avant par des **fentes arrière contrôlées** (tibia vertical), du **Hip Thrust** ou un tempo lent (3s descente).\n` +
        `• **Bas du dos (Lombaires) :** privilégie le **Rowing appuyé sur banc**, le **Squat Bulgare** et le protocole **Big 3 de McGill** disponible dans l'onglet Séances.`,
      sources: retrieveScientificEvidence('douleur lombaire epaule genou mcgill', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'joint_pain' },
    };
  }

  // =========================================================================
  // 17. FATIGUE, SOMMEIL, COURBATURES & MANQUE DE TEMPS
  // =========================================================================
  if (intent === 'fatigue_sleep') {
    return {
      text:
        `**Autorégulation intelligente de ta séance :**\n\n` +
        `• **Si tu es fatigué ou as peu dormi :** active le bouton **« Énergie basse (-25 %) »** dans l'onglet Séances et reste à 2 répétitions de l'échec (*Refalo et al., 2023*). Tu maintiens 100 % de tes acquis sans creuser ta fatigue nerveuse.\n` +
        `• **Si tu n'as que 15–20 min :** enchaîne en **Superset antagoniste** (1 série Poussée + 1 série Tirage, 60s repos) ou lance la séance **HIIT & Core 20 min**.\n` +
        `• **Courbatures (DOMS) :** 20 min de marche active + **${targets.protein}g P** + **${(targets.waterMl / 1000).toFixed(1)} L d'eau** accélèrent la récupération bien mieux que l'immobilité.`,
      sources: retrieveScientificEvidence('sommeil fatigue courbature rir', lang, 2),
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'fatigue_sleep' },
    };
  }

  // =========================================================================
  // 18. SÈCHE, PRISE DE MASSE, JEÛNE, HYDRATATION & ÉTUDES SCIENTIFIQUES
  // =========================================================================
  if (intent === 'fatloss_bulk_science' || intent === 'hydration') {
    const main = evidence[0];
    const sec = evidence[1];
    return {
      text:
        `**Synthèse scientifique appliquée à ton profil (${weightKg} kg · cible ${targets.kcal} kcal) :**\n\n` +
        `• **${main.citation}** : ${main.localizedSummary}\n` +
        (sec ? `• **${sec.citation}** : ${sec.localizedSummary}\n` : '') +
        `\n**En pratique aujourd'hui :** il te reste **${Math.max(0, remKcal)} kcal**, **${Math.max(0, remProt)}g de protéines** et **${remWater} ml d'eau** à répartir sereinement.`,
      sources: evidence,
      suggestions: defaultSugs.slice(0, 4),
      memory: { lastIntent: intent },
    };
  }

  // =========================================================================
  // 19. TENTATIVE DE DÉTECTION D'ALIMENT MÊME SANS MOT "REMPLACER"
  // =========================================================================
  const directFoodHit = findFoodByQuery(extractCandidateFoodPhrase(norm));
  if (directFoodHit && norm.length <= 45) {
    const g = extractGramsFromText(userMessage) || directFoodHit.defaultGrams || 100;
    const macros = calculateFoodMacros(directFoodHit, g);
    const swap = computeSubstitutions(directFoodHit, g, 'dominant_macro', profile);
    const top2 = (swap?.alternatives || []).slice(0, 2);

    return {
      text:
        `**Valeurs nutritionnelles pour ${g}g de ${directFoodHit.name}** *(${directFoodHit.state})* :\n\n` +
        `• **Énergie :** **${macros.kcal} kcal**\n` +
        `• **Macros :** **${macros.protein}g Protéines** · **${macros.carbs}g Glucides** · **${macros.fat}g Lipides**\n` +
        (top2.length > 0
          ? `\n**Équivalences directes :** ${top2.map((a) => `**${a.grams}g ${a.food.name}** (${a.macros.kcal} kcal)`).join(' ou ')}.`
          : ''),
      sources: evidence,
      suggestions: [
        `Par quoi remplacer ${g}g de ${directFoodHit.name} ?`,
        'Combler mes protéines du jour',
        'Génère-moi un menu complet pour la journée',
      ],
      memory: {
        lastIntent: 'substitution',
        lastFoodId: directFoodHit.id,
        lastGrams: g,
      },
    };
  }

  // =========================================================================
  // 20. RÉPONSE OUVERTE SCIENTIFIQUE CONTEXTUALISÉE (0 MS)
  // =========================================================================
  const workouts7d = workoutHistory.filter(
    (w) => Date.now() - new Date(w.timestamp).getTime() <= 7 * 86400 * 1000
  ).length;

  return {
    text:
      `**Analyse Coach (${profile.name || 'Athlète'} · ${targets.kcal} kcal/j)**\n\n` +
      `• **Point science (${evidence[0].citation}) :** ${evidence[0].localizedSummary}\n` +
      (evidence[1]
        ? `• **Complément (${evidence[1].citation}) :** ${evidence[1].localizedSummary}\n`
        : '') +
      `\n**Ton suivi aujourd'hui :** **${Math.max(0, remKcal)} kcal** et **${Math.max(0, remProt)}g P** restants · **${waterMl}/${targets.waterMl} ml** d'eau · **${workouts7d}** séance(s) sur 7 jours.`,
    sources: evidence,
    suggestions: defaultSugs.slice(0, 5),
    memory: { lastIntent: 'summary' },
  };
}
