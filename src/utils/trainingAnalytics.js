// Analyses sportives & métaboliques locales :
// 1. Récupération musculaire & volume effectif sur 7 jours (standard ISSN 10-20 séries)
// 2. Courbe de progression (1RM / charge) par exercice
// 3. Estimation adaptative de la dépense énergétique réelle (TDEE observé)

import { normalizeText } from './substitutionEngine.js';

const MUSCLE_ZONES = [
  {
    id: 'pecs',
    label: 'Pectoraux',
    optimalSets: [10, 18],
    keywords: ['pector', 'pec', 'push'],
  },
  {
    id: 'back',
    label: 'Dos & Trapèzes',
    optimalSets: [10, 20],
    keywords: ['dos', 'dorsal', 'dorsaux', 'rhombo', 'trap', 'tirage'],
  },
  {
    id: 'shoulders',
    label: 'Épaules',
    optimalSets: [8, 16],
    keywords: ['epaule', 'delto', 'coiffe'],
  },
  {
    id: 'arms',
    label: 'Biceps & Triceps',
    optimalSets: [8, 16],
    keywords: ['biceps', 'triceps', 'bras', 'avant-bras'],
  },
  {
    id: 'legs',
    label: 'Jambes & Fessiers',
    optimalSets: [10, 20],
    keywords: [
      'quadri',
      'ischio',
      'fessier',
      'jambe',
      'mollet',
      'adduct',
      'chaine posterieure',
    ],
  },
  {
    id: 'core',
    label: 'Abdos & Gainage',
    optimalSets: [6, 14],
    keywords: ['abdo', 'gainage', 'oblique', 'transverse', 'core', 'lombaire'],
  },
];

function classifyZonesFromMuscleString(muscleStr = '') {
  const norm = normalizeText(muscleStr);
  if (!norm) return [];
  const matched = MUSCLE_ZONES.filter((z) =>
    z.keywords.some((kw) => norm.includes(kw))
  ).map((z) => z.id);
  if (matched.length > 0) return matched;
  if (norm.includes('full body') || norm.includes('complet')) {
    return ['pecs', 'back', 'legs', 'core'];
  }
  return [];
}

/**
 * Analyse la récupération (heures depuis la dernière séance) et le volume effectif sur 7 jours
 */
export function computeMuscleRecoveryAndVolume(workoutHistory = []) {
  const nowMs = Date.now();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 3600 * 1000;

  const statsMap = Object.fromEntries(
    MUSCLE_ZONES.map((z) => [
      z.id,
      {
        ...z,
        weeklySets: 0,
        lastTrainedMs: null,
      },
    ])
  );

  for (const entry of workoutHistory) {
    const entryMs = entry.completedAt
      ? Number(entry.completedAt)
      : entry.date
      ? new Date(entry.date + 'T18:00:00').getTime()
      : 0;
    if (!entryMs) continue;

    const isWithin7d = entryMs >= sevenDaysAgoMs;

    if (Array.isArray(entry.exercises) && entry.exercises.length > 0) {
      for (const ex of entry.exercises) {
        const zones = classifyZonesFromMuscleString(ex.muscle || ex.name || '');
        if (zones.length === 0) continue;

        const effectiveSets = Array.isArray(ex.setRows)
          ? ex.setRows.filter((s) => s.completed && s.setType !== 'warmup').length
          : Number(ex.completedSets || ex.sets || 0);

        if (effectiveSets <= 0) continue;

        for (const zId of zones) {
          if (isWithin7d) {
            statsMap[zId].weeklySets += effectiveSets;
          }
          if (!statsMap[zId].lastTrainedMs || entryMs > statsMap[zId].lastTrainedMs) {
            statsMap[zId].lastTrainedMs = entryMs;
          }
        }
      }
    } else if (Array.isArray(entry.targetMuscles)) {
      const perZoneSets = Math.max(2, Math.round((entry.completedSets || 6) / Math.max(1, entry.targetMuscles.length)));
      for (const mStr of entry.targetMuscles) {
        const zones = classifyZonesFromMuscleString(mStr);
        for (const zId of zones) {
          if (isWithin7d) statsMap[zId].weeklySets += perZoneSets;
          if (!statsMap[zId].lastTrainedMs || entryMs > statsMap[zId].lastTrainedMs) {
            statsMap[zId].lastTrainedMs = entryMs;
          }
        }
      }
    }
  }

  return MUSCLE_ZONES.map((z) => {
    const st = statsMap[z.id];
    const hoursAgo = st.lastTrainedMs
      ? Math.max(0, Math.round((nowMs - st.lastTrainedMs) / 3600000))
      : null;

    let recoveryState = 'fresh'; // 'recovering' | 'ready' | 'fresh'
    let recoveryLabel = 'Frais';
    if (hoursAgo !== null) {
      if (hoursAgo < 36) {
        recoveryState = 'recovering';
        recoveryLabel = `Récup. (${hoursAgo}h)`;
      } else {
        recoveryState = 'ready';
        recoveryLabel = 'Prêt';
      }
    }

    const [minOpt, maxOpt] = z.optimalSets;
    const volumePct = Math.min(100, Math.round((st.weeklySets / maxOpt) * 100));

    return {
      id: z.id,
      label: z.label,
      weeklySets: st.weeklySets,
      minOptimal: minOpt,
      maxOptimal: maxOpt,
      volumePct,
      hoursAgo,
      recoveryState,
      recoveryLabel,
    };
  });
}

/**
 * Extrait l'historique de performance (1RM estimé & charge max) pour un exercice précis
 */
export function computeExerciseProgression(exercise, workoutHistory = []) {
  if (!exercise || !Array.isArray(workoutHistory) || workoutHistory.length === 0) {
    return null;
  }

  const targetNorm = normalizeText(exercise.name || '');
  const points = [];

  // Parcourt du plus ancien au plus récent
  const chronological = [...workoutHistory].reverse();

  for (const session of chronological) {
    if (!Array.isArray(session.exercises)) continue;
    const match = session.exercises.find(
      (ex) =>
        ex.id === exercise.id ||
        (targetNorm && normalizeText(ex.name || '') === targetNorm)
    );
    if (!match || !Array.isArray(match.setRows)) continue;

    const validSets = match.setRows.filter(
      (s) => s.completed && s.setType !== 'warmup' && Number(s.weightKg) > 0 && Number(s.reps) > 0
    );
    if (validSets.length === 0) continue;

    let best1RM = 0;
    let bestLabel = '';
    for (const s of validSets) {
      const w = Number(s.weightKg);
      const r = Number(s.reps);
      const e1rm = r === 1 ? w : w * (1 + r / 30);
      if (e1rm > best1RM) {
        best1RM = e1rm;
        bestLabel = `${w}kg × ${r}`;
      }
    }

    if (best1RM > 0) {
      points.push({
        date: session.date || '',
        est1RM: Math.round(best1RM * 10) / 10,
        bestLabel,
      });
    }
  }

  if (points.length === 0) return null;

  const recent = points.slice(-10);
  const vals = recent.map((p) => p.est1RM);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = Math.max(1, maxV - minV);

  const svgPoints =
    recent.length >= 2
      ? recent
          .map((p, idx) => {
            const x = Math.round((idx / (recent.length - 1)) * 100);
            const y = Math.round(28 - ((p.est1RM - minV) / span) * 22);
            return `${x},${y}`;
          })
          .join(' ')
      : null;

  const delta1RM =
    recent.length >= 2
      ? Math.round((recent[recent.length - 1].est1RM - recent[0].est1RM) * 10) / 10
      : 0;

  return {
    sessionsCount: points.length,
    best1RM: Math.round(Math.max(... points.map((p) => p.est1RM))),
    latestPerf: recent[recent.length - 1].bestLabel,
    delta1RM,
    svgPoints,
  };
}

/**
 * Calcule la dépense énergétique réelle observée (TDEE adaptatif type MacroFactor)
 * à partir de l'évolution du poids et des calories réellement journalisées
 */
export function computeAdaptiveTDEE(bodyMetrics = [], nutritionDailyKcalList = []) {
  const validWeights = (bodyMetrics || [])
    .filter((m) => m.date && Number(m.weightKg) >= 35)
    .sort((a, b) => a.date.localeCompare(b.date));

  const validNutrition = (nutritionDailyKcalList || []).filter(
    (n) => Number(n.kcal) >= 900 && Number(n.kcal) <= 6500
  );

  if (validWeights.length < 3 || validNutrition.length < 3) {
    return null;
  }

  const first = validWeights[Math.max(0, validWeights.length - 14)];
  const last = validWeights[validWeights.length - 1];
  const d1 = new Date(first.date + 'T12:00:00').getTime();
  const d2 = new Date(last.date + 'T12:00:00').getTime();
  const spanDays = Math.round((d2 - d1) / 86400000);
  if (spanDays < 4) return null;

  const avgKcal =
    validNutrition.slice(-14).reduce((s, x) => s + Number(x.kcal), 0) /
    Math.min(14, validNutrition.length);

  const weightDeltaKg = Number(last.weightKg) - Number(first.weightKg);
  const dailyEnergyBalance = (weightDeltaKg * 7700) / spanDays;
  const observedTdee = Math.round(avgKcal - dailyEnergyBalance);

  if (observedTdee < 1150 || observedTdee > 5000) return null;

  return {
    observedTdee,
    avgLoggedKcal: Math.round(avgKcal),
    weightDeltaKg: Math.round(weightDeltaKg * 10) / 10,
    spanDays,
  };
}
