import React, { useMemo, useState } from 'react';
import {
  Play,
  Plus,
  Minus,
  ChevronRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { WORKOUT_PROGRAMS } from '../data/workoutsData';
import { getTodayDateString } from '../db/database';
import { tr } from '../i18n/translations';

function getDynamicCoachNote(lang, hour, todayMacros, targets, waterMl, workouts7dCount) {
  const protRem = Math.round(targets.protein - (todayMacros.protein || 0));
  const waterPct = Math.round((waterMl / Math.max(1, targets.waterMl)) * 100);

  if (lang === 'en') {
    if (hour < 11) {
      return (todayMacros.protein || 0) < 20
        ? 'ISSN Tip: Start with 25–35g protein and 350 ml water to trigger morning muscle protein synthesis.'
        : 'Great morning start. Spread hydration evenly before lunch.';
    }
    if (hour < 18) {
      return waterPct < 40
        ? `Hydration is at ${waterPct}%. ACSM studies show >2% dehydration drops strength and focus.`
        : 'Solid pacing today. Prioritize complex carbs around your workout.';
    }
    return protRem > 25
      ? `${protRem}g protein remaining tonight — tap here to ask the Science AI Coach for a dinner idea.`
      : 'Targets well managed today. Prioritize 7.5–8.5h sleep for optimal recovery.';
  }

  if (lang === 'es') {
    if (hour < 11) {
      return (todayMacros.protein || 0) < 20
        ? 'Consejo ISSN: empieza con 25–35g de proteína y un vaso de agua para activar la síntesis muscular.'
        : 'Buen comienzo de mañana. Mantén una hidratación constante.';
    }
    if (hour < 18) {
      return waterPct < 40
        ? `Estás al ${waterPct}% de agua. Según ACSM, >2% de deshidratación reduce el rendimiento.`
        : 'Buen ritmo hoy. Prioriza carbohidratos complejos alrededor del entreno.';
    }
    return protRem > 25
      ? `Te faltan ${protRem}g de proteína hoy — toca aquí para pedir una cena al Coach IA.`
      : 'Objetivos cumplidos hoy. Prioriza un sueño reparador.';
  }

  if (hour < 11) {
    return (todayMacros.protein || 0) < 20
      ? 'Consensus ISSN : vise 25–35g de protéines dès le matin et 350 ml d’eau pour activer la synthèse protéique.'
      : 'Premier apport validé. Pense à répartir ton hydratation régulièrement avant midi.';
  }
  if (hour < 18) {
    return waterPct < 40
      ? `Hydratation à ${waterPct}%. Selon l’ACSM, >2% de déficit hydrique réduit la force et la vigilance.`
      : workouts7dCount === 0
      ? 'Créneau idéal cet après-midi pour lancer ta première séance de la semaine.'
      : 'Bonne dynamique aujourd’hui. Garde une source protéique à chaque repas.';
  }
  return protRem > 25
    ? `Il te manque ${protRem}g de protéines ce soir : touche ici pour une idée de dîner calibré par l’IA.`
    : 'Objectifs bien tenus aujourd’hui. Un sommeil de 7h30+ maximisera ta récupération (Saner et al., 2020).';
}

export default function DashboardTab({
  profile,
  lang = 'fr',
  todayMacros,
  waterMl,
  onUpdateWater,
  workoutHistory,
  activeWorkoutSession,
  onStartWorkout,
  onResumeWorkout,
  onNavigateTab,
  bodyMetrics,
  onLogWeight,
}) {
  const [weightEditOpen, setWeightEditOpen] = useState(false);
  const [newWeight, setNewWeight] = useState(profile?.weight || 74);

  const targets = profile?.targets || {
    kcal: 2200,
    protein: 140,
    carbs: 230,
    fat: 70,
    waterMl: 2800,
  };

  const consumedKcal = Math.round(todayMacros?.kcal || 0);
  const remainingKcal = targets.kcal - consumedKcal;
  const kcalRatio = Math.min(1, Math.max(0, consumedKcal / Math.max(1, targets.kcal)));

  const ringRadius = 64;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference - kcalRatio * ringCircumference;

  const suggestedWorkout = useMemo(() => {
    const allWorkouts = WORKOUT_PROGRAMS.flatMap((prog) =>
      prog.workouts.map((w) => ({ ...w, programTitle: prog.title, programId: prog.id }))
    );
    if (!workoutHistory || workoutHistory.length === 0) return allWorkouts[0];
    const lastDoneId = workoutHistory[0]?.workoutId;
    const lastIdx = allWorkouts.findIndex((w) => w.id === lastDoneId);
    if (lastIdx >= 0) {
      const sameProg = allWorkouts.filter(
        (w) => w.programId === allWorkouts[lastIdx].programId
      );
      const idxInProg = sameProg.findIndex((w) => w.id === lastDoneId);
      return sameProg[(idxInProg + 1) % sameProg.length];
    }
    return allWorkouts[0];
  }, [workoutHistory]);

  const last7Days = useMemo(() => {
    const dayLetters =
      lang === 'en'
        ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        : ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const workoutDates = new Set((workoutHistory || []).map((w) => w.date));
    const days = [];
    for (let offset = -6; offset <= 0; offset++) {
      const dateStr = getTodayDateString(offset);
      const dObj = new Date(dateStr + 'T12:00:00');
      days.push({
        date: dateStr,
        label: dayLetters[dObj.getDay()],
        isToday: offset === 0,
        done: workoutDates.has(dateStr),
      });
    }
    return days;
  }, [workoutHistory, lang]);

  const workouts7dCount = last7Days.filter((d) => d.done).length;
  const waterPct = Math.min(100, Math.round((waterMl / Math.max(1, targets.waterMl)) * 100));
  const protPct = Math.min(
    100,
    Math.round(((todayMacros?.protein || 0) / Math.max(1, targets.protein)) * 100)
  );

  // Indice d'équilibre scientifique global (0-100)
  const readinessScore = useMemo(() => {
    const sportScore = Math.min(100, (workouts7dCount / 3) * 100) * 0.35;
    const hydrationScore = waterPct * 0.3;
    const nutritionScore = (protPct * 0.6 + Math.round(kcalRatio * 100) * 0.4) * 0.35;
    return Math.min(100, Math.max(15, Math.round(sportScore + hydrationScore + nutritionScore)));
  }, [workouts7dCount, waterPct, protPct, kcalRatio]);

  const coachNote = useMemo(
    () =>
      getDynamicCoachNote(
        lang,
        new Date().getHours(),
        todayMacros || {},
        targets,
        waterMl,
        workouts7dCount
      ),
    [lang, todayMacros, targets, waterMl, workouts7dCount]
  );

  const macros = [
    {
      key: 'protein',
      label: tr(lang, 'macro_protein'),
      current: Math.round(todayMacros?.protein || 0),
      target: targets.protein,
      color: 'bg-sky-400',
    },
    {
      key: 'carbs',
      label: tr(lang, 'macro_carbs'),
      current: Math.round(todayMacros?.carbs || 0),
      target: targets.carbs,
      color: 'bg-amber-400',
    },
    {
      key: 'fat',
      label: tr(lang, 'macro_fat'),
      current: Math.round(todayMacros?.fat || 0),
      target: targets.fat,
      color: 'bg-rose-400',
    },
  ];

  const localeCode = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
  const todayFormatted = new Date().toLocaleDateString(localeCode, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleSaveWeight = (e) => {
    e.preventDefault();
    const val = Number(newWeight);
    if (val >= 35 && val <= 250) {
      onLogWeight(val);
      setWeightEditOpen(false);
    }
  };

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Salutation sobre */}
      <div className="flex items-end justify-between px-1 pt-1">
        <div>
          <p className="text-xs text-[var(--text-muted)] capitalize">{todayFormatted}</p>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] mt-0.5">
            {tr(lang, 'greeting_hello')}, {profile?.name || 'Athlète'}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('nutrition')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          {tr(lang, 'add_meal_short')}
        </button>
      </div>

      {/* 1. HERO ÉNERGIE & MACROS */}
      <section className="card-surface p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 148 148">
              <circle
                cx="74"
                cy="74"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                className="text-zinc-500/15"
                strokeWidth="10"
              />
              <circle
                cx="74"
                cy="74"
                r={ringRadius}
                fill="none"
                stroke={remainingKcal < -120 ? '#fbbf24' : '#34d399'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                {Math.abs(remainingKcal)}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                {remainingKcal >= 0
                  ? tr(lang, 'kcal_remaining')
                  : tr(lang, 'kcal_surplus')}
              </span>
            </div>
          </div>

          <div className="w-full flex-1 space-y-3.5">
            {macros.map((m) => {
              const pct = Math.min(100, Math.round((m.current / Math.max(1, m.target)) * 100));
              return (
                <div key={m.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] font-medium">{m.label}</span>
                    <span className="tabular-nums text-[var(--text-primary)] font-semibold">
                      {m.current}
                      <span className="text-[var(--text-muted)] font-normal"> / {m.target}g</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-500/15 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${m.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-0.5 tabular-nums">
              <span>
                {tr(lang, 'consumed_of')} {consumedKcal} / {targets.kcal} kcal
              </span>
              <span className="text-emerald-400 font-semibold">
                {tr(lang, 'readiness_score')} {readinessScore}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HYDRATATION & POIDS */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
        <div className="sm:col-span-7 card-surface p-5 flex flex-col justify-between space-y-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {tr(lang, 'hydration')}
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
              {(waterMl / 1000).toFixed(2)}{' '}
              <span className="text-[var(--text-muted)] font-normal">
                / {(targets.waterMl / 1000).toFixed(1)} L
              </span>
            </span>
          </div>

          <div className="h-1.5 w-full bg-zinc-500/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${waterPct}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateWater(Math.max(0, waterMl - 250))}
              className="w-9 h-8 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center active:scale-95 transition-all"
              aria-label="-250 ml"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateWater(waterMl + 250)}
              className="flex-1 h-8 rounded-full bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-primary)] active:scale-95 transition-all tabular-nums"
            >
              +250 ml
            </button>
            <button
              type="button"
              onClick={() => onUpdateWater(waterMl + 500)}
              className="flex-1 h-8 rounded-full bg-sky-400/15 text-xs font-semibold text-sky-400 active:scale-95 transition-all tabular-nums"
            >
              +500 ml
            </button>
          </div>
        </div>

        <div className="sm:col-span-5 card-surface p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {tr(lang, 'weight')}
            </span>
            <button
              type="button"
              onClick={() => {
                setNewWeight(profile?.weight || 74);
                setWeightEditOpen((v) => !v);
              }}
              className="text-[11px] font-medium text-emerald-400"
            >
              {weightEditOpen ? tr(lang, 'close') : tr(lang, 'update')}
            </button>
          </div>

          {!weightEditOpen ? (
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
                {profile?.weight || 74}{' '}
                <span className="text-sm font-normal text-[var(--text-muted)]">kg</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {bodyMetrics?.length || 0} {tr(lang, 'weighed_entries')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveWeight} className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="35"
                max="250"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="input-dark !py-1.5 !px-2.5 text-xs tabular-nums"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-full bg-emerald-400 text-zinc-950 flex items-center justify-center shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 3. SÉANCE DU JOUR */}
      <section className="card-surface p-5">
        {activeWorkoutSession ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-emerald-400">
                {tr(lang, 'session_paused')}
              </span>
              <h2 className="text-base font-semibold text-[var(--text-primary)] truncate mt-0.5">
                {activeWorkoutSession.workoutTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onResumeWorkout}
              className="btn-accent shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {tr(lang, 'resume')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {tr(lang, 'next_workout')}
                </span>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
                  {suggestedWorkout.title}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {suggestedWorkout.durationMin} min ·{' '}
                  {(suggestedWorkout.targetMuscles || []).slice(0, 3).join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('workouts')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5 shrink-0"
              >
                {tr(lang, 'program')}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onStartWorkout(suggestedWorkout, 'normal')}
              className="btn-primary w-full"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {tr(lang, 'start_workout')}
            </button>
          </div>
        )}
      </section>

      {/* 4. RÉGULARITÉ 7 JOURS & NOTE SCIENTIFIQUE */}
      <section className="card-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {tr(lang, 'last_7_days')}
          </span>
          <span className="text-xs text-[var(--text-primary)] font-medium tabular-nums">
            {workouts7dCount} {tr(lang, 'sessions_count')}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {last7Days.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-[var(--text-muted)]">{d.label}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                  d.done
                    ? 'bg-emerald-400 text-zinc-950 font-bold'
                    : d.isToday
                    ? 'border border-emerald-400/50 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                }`}
              >
                {d.done ? <Check className="w-3.5 h-3.5 stroke-[2.6]" /> : '·'}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('coach')}
          className="w-full pt-3 border-t border-[var(--border-subtle)] flex items-start justify-between gap-3 text-left group"
        >
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">
              {coachNote}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
        </button>
      </section>
    </div>
  );
}
