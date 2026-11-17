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
  normalizeText,
  computeSubstitutions,
  findFoodByQuery,
  roundToNearest5g,
} from './substitutionEngine.js';
import { retrieveScientificEvidence } from '../data/scientificKnowledge.js';

export const QUICK_COACH_SUGGESTIONS_BY_LANG = {
  fr: [
    'Combler mes protéines du jour',
    'Étude sur le quota protéique idéal ?',
    'Par quoi remplacer 80g de riz ?',
    'Je suis fatigué pour ma séance',
    'Idée repas rapide ce soir',
    'Créatine : dosage selon la science ?',
  ],
  en: [
    'Fill my remaining protein today',
    'What do studies say on protein intake?',
    'Swap for 80g of basmati rice?',
    'I feel tired before my workout',
    'Quick dinner idea for tonight',
    'Creatine dosage according to science?',
  ],
  es: [
    'Cubrir mis proteínas restantes hoy',
    '¿Qué dice la ciencia sobre proteínas?',
    '¿Por qué cambiar 80g de arroz?',
    'Estoy cansado para entrenar hoy',
    'Idea de cena rápida esta noche',
    '¿Dosis científica de creatina?',
  ],
};

export const QUICK_COACH_SUGGESTIONS = QUICK_COACH_SUGGESTIONS_BY_LANG.fr;

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

const INTENT_RULES = [
  {
    id: 'substitution',
    keywords: [
      'remplacer', 'remplace', 'equivalent', 'equivalence', 'substituer',
      'alternative', 'echanger', 'swap', 'replace', 'cambiar', 'sustituir',
    ],
    weight: 4,
  },
  {
    id: 'science_question',
    keywords: [
      'etude', 'etudes', 'science', 'scientifique', 'pubmed', 'issn', 'meta analyse',
      'creatine', 'creatina', 'study', 'studies', 'research', 'evidence', 'ciencia',
    ],
    weight: 3.8,
  },
  {
    id: 'protein_gap',
    keywords: [
      'proteine', 'proteines', 'combler', 'manque de prot', 'protein', 'proteina',
      'proteinas', 'quota',
    ],
    weight: 3.5,
  },
  {
    id: 'meal_idea',
    keywords: [
      'que manger', 'quoi manger', 'idee repas', 'ce soir', 'diner', 'dejeuner',
      'dinner', 'meal idea', 'eat tonight', 'cena', 'comer',
    ],
    weight: 3,
  },
  {
    id: 'fatigue_workout',
    keywords: [
      'fatigue', 'epuise', 'creve', 'mal dormi', 'flemme', 'tired', 'exhausted',
      'sleep', 'cansado', 'fatiga',
    ],
    weight: 3.5,
  },
  {
    id: 'short_time',
    keywords: [
      'pas le temps', 'manque de temps', '20 min', '15 min', 'express', 'emom',
      'superset', 'short workout', 'no time', 'poco tiempo',
    ],
    weight: 3.5,
  },
  {
    id: 'joint_pain',
    keywords: [
      'douleur', 'mal a', 'mal au', 'epaule', 'genou', 'lombaire', 'dos',
      'pain', 'shoulder', 'knee', 'back', 'dolor', 'hombro', 'rodilla', 'espalda',
    ],
    weight: 4,
  },
  {
    id: 'hydration',
    keywords: ['eau', 'hydratation', 'boire', 'water', 'hydration', 'agua', 'hidratacion'],
    weight: 3,
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

  return bestIntent;
}

/**
 * Construit le contexte RAG ancré scientifiquement pour le LLM Neural (Qwen2.5-0.5B-Instruct)
 */
export function buildGroundedLLMMessages(userMessage, context = {}, chatHistory = []) {
  const {
    profile = {},
    todayMacros = { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    waterMl = 0,
    lang = 'fr',
  } = context;

  const targets = profile.targets || { kcal: 2200, protein: 140, carbs: 230, fat: 70, waterMl: 2800 };
  const remKcal = Math.round(targets.kcal - (todayMacros.kcal || 0));
  const remProt = Math.round(targets.protein - (todayMacros.protein || 0));
  const evidence = retrieveScientificEvidence(userMessage, lang, 2);

  // Vérifie s'il y a un calcul mathématique d'aliment à injecter exactement pour éviter toute hallucination
  const norm = normalizeText(userMessage);
  const candidateFood = findFoodByQuery(extractCandidateFoodPhrase(norm));
  let mathFact = '';
  if (candidateFood) {
    const g = extractGramsFromText(userMessage) || candidateFood.defaultGrams || 100;
    const sub = computeSubstitutions(candidateFood, g, 'dominant_macro', profile);
    const top3 = (sub?.alternatives || [])
      .slice(0, 3)
      .map((a) => `${a.grams}g ${a.food.name} (${a.macros.kcal} kcal, ${a.macros.protein}g P)`)
      .join(' ; ');
    if (top3) {
      mathFact = `\nCalcul exact d'équivalence pour ${g}g ${candidateFood.name} : ${top3}.`;
    }
  }

  const langInstruction =
    lang === 'en'
      ? 'Always reply concisely and warmly in English.'
      : lang === 'es'
      ? 'Responde siempre de forma concisa, cálida y estructurada en español.'
      : 'Réponds toujours en français de façon concise, structurée, directe et bienveillante.';

  const systemContent =
    `Tu es le Coach IA Scientifique de PulseFit. ${langInstruction}\n` +
    `Profil athlète : ${profile.name || 'Athlète'}, ${profile.weight || 74}kg, objectif=${profile.goal || 'maintain'}, régime=${profile.dietBase || 'omnivore'}.\n` +
    `État aujourd'hui : Reste ${remKcal} kcal et ${remProt}g de protéines à consommer. Eau bue : ${waterMl}/${targets.waterMl} ml.${mathFact}\n` +
    `Études scientifiques de référence à citer brièvement : ` +
    evidence.map((e) => `${e.citation} (${e.localizedSummary})`).join(' | ');

  const recentTurns = (chatHistory || [])
    .slice(-4)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '').slice(0, 380),
    }));

  return {
    messages: [
      { role: 'system', content: systemContent },
      ...recentTurns,
      { role: 'user', content: userMessage },
    ],
    sources: evidence,
  };
}

/**
 * Moteur RAG Scientifique Instantané (0 Mo, <5 ms, multilingue FR/EN/ES, avec citations PubMed/ISSN)
 */
export function generateCoachResponse(userMessage, context = {}) {
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

  const remKcal = Math.round(targets.kcal - (todayMacros.kcal || 0));
  const remProt = Math.round(targets.protein - (todayMacros.protein || 0));
  const remWater = Math.max(0, targets.waterMl - (waterMl || 0));
  const evidence = retrieveScientificEvidence(userMessage, lang, 2);
  const defaultSugs = QUICK_COACH_SUGGESTIONS_BY_LANG[lang] || QUICK_COACH_SUGGESTIONS_BY_LANG.fr;

  const intent = detectTopIntent(norm, previousMemory);

  // 1. SUBSTITUTION MATHÉMATIQUE
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

        const headerByLang = {
          fr: `Équivalences calculées pour **${result.sourceGrams}g de ${targetFood.name}** (${result.sourceMacros.kcal} kcal, ${result.sourceMacros.protein}g P, ${result.sourceMacros.carbs}g G) en mode **${result.equivalenceLabel}** :`,
          en: `Calculated swaps for **${result.sourceGrams}g ${targetFood.name}** (${result.sourceMacros.kcal} kcal, ${result.sourceMacros.protein}g P, ${result.sourceMacros.carbs}g C) — **${result.equivalenceLabel}**:`,
          es: `Equivalencias exactas para **${result.sourceGrams}g de ${targetFood.name}** (${result.sourceMacros.kcal} kcal, ${result.sourceMacros.protein}g P, ${result.sourceMacros.carbs}g C) — **${result.equivalenceLabel}**:`,
        };

        return {
          text: `${headerByLang[lang] || headerByLang.fr}\n\n${lines.join('\n')}`,
          sources: evidence,
          suggestions: [
            mode === 'dominant_macro'
              ? lang === 'en'
                ? 'And in iso-caloric mode?'
                : lang === 'es'
                ? '¿Y en modo isocalórico?'
                : 'Et en mode iso-calorique ?'
              : defaultSugs[0],
            defaultSugs[1],
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

  // 2. QUESTION SCIENTIFIQUE PURE (CRÉATINE, PROTÉINES, VOLUME, SOMMEIL...)
  if (intent === 'science_question') {
    const mainStudy = evidence[0];
    const secondStudy = evidence[1];

    const intro =
      lang === 'en'
        ? `Here is what international peer-reviewed sports science shows:`
        : lang === 'es'
        ? `Esto es lo que demuestra la evidencia científica internacional:`
        : `Voici ce que montrent les méta-analyses et consensus internationaux :`;

    const practicalWeight = profile.weight || 74;
    const protRange = `${Math.round(practicalWeight * 1.6)}–${Math.round(practicalWeight * 2.2)}g`;
    const personalLine =
      lang === 'en'
        ? `\n\n**Applied to your ${practicalWeight} kg profile:** aim for **${protRange} protein/day** and **3–5g creatine monohydrate daily** if supplementing.`
        : lang === 'es'
        ? `\n\n**Aplicado a tu peso (${practicalWeight} kg):** apunta a **${protRange} de proteína/día** y **3–5g de creatina monohidrato** si suplementas.`
        : `\n\n**Appliqué à ton profil (${practicalWeight} kg) :** la zone optimale se situe à **${protRange} de protéines/jour** (cible actuelle : ${targets.protein}g) et **3 à 5g/j de créatine monohydrate** si tu te supplémentes.`;

    return {
      text:
        `${intro}\n\n` +
        `• **${mainStudy.citation}** : ${mainStudy.localizedSummary}` +
        (secondStudy ? `\n• **${secondStudy.citation}** : ${secondStudy.localizedSummary}` : '') +
        personalLine,
      sources: evidence,
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'science_question' },
    };
  }

  // 3. COMBLER LES PROTÉINES DU JOUR
  if (intent === 'protein_gap') {
    if (remProt <= 5) {
      return {
        text:
          lang === 'en'
            ? `Great consistency! You already hit your protein target (**${Math.round(todayMacros.protein)}g / ${targets.protein}g**). Focus on hydration (${remWater} ml left) and sleep.`
            : lang === 'es'
            ? `¡Excelente! Ya alcanzaste tu meta de proteínas (**${Math.round(todayMacros.protein)}g / ${targets.protein}g**). Prioriza los ${remWater} ml de agua restantes.`
            : `Quota protéique validé (**${Math.round(todayMacros.protein)}g / ${targets.protein}g**) ! Selon le consensus **ISSN (Jäger et al., 2017)**, ta synthèse protéique est pleinement couverte. Il te reste **${remWater} ml d'eau** à boire.`,
        sources: evidence,
        suggestions: defaultSugs.slice(1, 4),
        memory: { lastIntent: 'protein_gap' },
      };
    }

    const protGap = Math.min(60, Math.max(18, remProt));
    const candidates = getCompatibleProteinFoods(profile);
    const picks = ['skyr_0', 'poulet_blanc', 'tofu_ferme', 'thon_naturel', 'whey_isolate', 'proteine_vegan_poudre']
      .map((id) => candidates.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, 3);

    const optLines = picks.map((food) => {
      const g = roundToNearest5g(Math.min(350, Math.max(25, (protGap / food.per100g.protein) * 100)));
      const m = calculateFoodMacros(food, g);
      return `• **${g}g ${food.name}** → **+${m.protein}g P** (${m.kcal} kcal)`;
    });

    const lead =
      lang === 'en'
        ? `You have **${remProt}g protein** left today (${Math.max(0, remKcal)} kcal remaining). Per **ISSN guidelines (0.25–0.40 g/kg per meal)**, here are 3 exact options:`
        : lang === 'es'
        ? `Te faltan **${remProt}g de proteína** hoy (${Math.max(0, remKcal)} kcal restantes). Según el **consenso ISSN**, aquí tienes 3 opciones exactas:`
        : `Il te reste **${remProt}g de protéines** à couvrir aujourd'hui (${Math.max(0, remKcal)} kcal disponibles). Selon le seuil de leucine **ISSN (20–40g P/prise)**, voici 3 options calibrées :`;

    return {
      text: `${lead}\n\n${optLines.join('\n')}`,
      sources: evidence,
      suggestions: defaultSugs.slice(2, 5),
      memory: { lastIntent: 'protein_gap' },
    };
  }

  // 4. IDÉE REPAS RAPIDE
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
        (lang === 'en'
          ? `With **${Math.max(0, remKcal)} kcal** and **${Math.max(0, remProt)}g P** remaining today, here are 3 balanced meals:`
          : lang === 'es'
          ? `Con **${Math.max(0, remKcal)} kcal** y **${Math.max(0, remProt)}g P** restantes hoy, aquí tienes 3 comidas equilibradas:`
          : `Avec **${Math.max(0, remKcal)} kcal** et **${Math.max(0, remProt)}g P** restants aujourd'hui, voici 3 recettes calibrées pour ton profil :`) +
        `\n\n${lines.join('\n')}`,
      sources: evidence,
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: 'meal_idea' },
    };
  }

  // 5. FATIGUE / MANQUE DE TEMPS / DOULEURS / HYDRATATION
  if (intent === 'fatigue_workout' || intent === 'short_time' || intent === 'joint_pain') {
    const studyNote = evidence[0]
      ? `\n\n*Référence : ${evidence[0].citation} — ${evidence[0].localizedSummary}*`
      : '';

    if (intent === 'joint_pain') {
      return {
        text:
          (lang === 'en'
            ? `Never push through sharp joint pain. Switch barbell presses to **neutral-grip dumbbells (30° scapular plane)**, front lunges to **controlled reverse lunges**, and use the **McGill Big 3** protocol for spinal stability.`
            : lang === 'es'
            ? `Nunca fuerces sobre un dolor articular agudo. Pasa a **mancuernas con agarre neutro**, **zancadas traseras controladas** y el protocolo **Big 3 de McGill** para proteger la espalda.`
            : `Ne force jamais sur une douleur vive : privilégie les **haltères en prise neutre** (plan scapulaire 30°) pour l'épaule, les **fentes arrière contrôlées** pour les genoux et le protocole **Big 3 de McGill** pour blinder le rachis lombaire.`) +
          studyNote,
        sources: evidence,
        suggestions: defaultSugs.slice(0, 3),
        memory: { lastIntent: intent },
      };
    }

    return {
      text:
        (lang === 'en'
          ? `Adapt smartly instead of skipping: select **Low Energy Mode (-25% volume)** in the Workouts tab, drink **350 ml water** now, and keep 2–3 min rest on compound lifts to maintain quality without central nervous burnout.`
          : lang === 'es'
          ? `Adapta la sesión en lugar de saltarla: activa el **Modo Energía Baja (-25% volumen)** en Entrenos, bebe **350 ml de agua** y prioriza la técnica sin llegar al fallo nervioso.`
          : `Adapte intelligemment sans couper ton élan : active le mode **Énergie basse (-25 % de volume)** dans l'onglet Séances, bois **350 ml d'eau** maintenant, et garde 1 à 2 répétitions de réserve (RIR 2) pour stimuler le muscle sans épuiser le système nerveux.`) +
        studyNote,
      sources: evidence,
      suggestions: defaultSugs.slice(0, 3),
      memory: { lastIntent: intent },
    };
  }

  // RÉPONSE PAR DÉFAUT — BILAN SCIENTIFIQUE PERSONNALISÉ
  const workouts7d = workoutHistory.filter(
    (w) => Date.now() - new Date(w.timestamp).getTime() <= 7 * 86400 * 1000
  ).length;

  return {
    text:
      lang === 'en'
        ? `**Live Athlete Telemetry (${profile.name || 'Athlete'})**\n• Remaining today: **${Math.max(0, remKcal)} kcal** & **${Math.max(0, remProt)}g protein**\n• Hydration: **${waterMl} / ${targets.waterMl} ml**\n• Last 7 days: **${workouts7d} workout(s)**\n\nAsk me for food swaps, meal ideas, training adjustments, or peer-reviewed studies (ISSN/ACSM/BJSM) — or toggle **Neural LLM** above for open-ended generative coaching!`
        : lang === 'es'
        ? `**Estado en vivo (${profile.name || 'Atleta'})**\n• Restante hoy: **${Math.max(0, remKcal)} kcal** y **${Math.max(0, remProt)}g proteína**\n• Hidratación: **${waterMl} / ${targets.waterMl} ml**\n• Últimos 7 días: **${workouts7d} sesión(es)**\n\nPregúntame sobre equivalencias, comidas, ajustes o estudios científicos — ¡o activa **LLM Neural** arriba para generación libre ilimitada!`
        : `**Point en direct (${profile.name || 'Athlète'})**\n• Reste aujourd'hui : **${Math.max(0, remKcal)} kcal** et **${Math.max(0, remProt)}g de protéines**\n• Hydratation : **${waterMl} / ${targets.waterMl} ml**\n• Régularité (7j) : **${workouts7d} séance(s)**\n\nPose-moi n'importe quelle question nutrition, équivalence ou étude scientifique — ou active le bouton **LLM Neural** en haut pour discuter librement en illimité avec le modèle IA embarqué !`,
    sources: evidence,
    suggestions: defaultSugs.slice(0, 4),
    memory: { lastIntent: 'summary' },
  };
}
