import React, { useMemo, useState } from 'react';
import {
  Play,
  Plus,
  Minus,
  ChevronRight,
  Sparkles,
  Check,
  Droplets,
  Scale,
} from 'lucide-react';
import { WORKOUT_PROGRAMS } from '../data/workoutsData';
import { getTodayDateString } from '../db/database';
import { tr } from '../i18n/translations';
import ExerciseMotionVisual from './ExerciseMotionVisual';

function getDynamicCoachNote(lang, hour, todayMacros, targets, waterMl) {
  const protRem = Math.round(targets.protein - (todayMacros.protein || 0));
  const waterPct = Math.round((waterMl / Math.max(1, targets.waterMl)) * 100);

  if (lang === 'en') {
    return protRem > 25
      ? `${protRem}g protein left today — ask the AI Coach for an exact meal.`
      : `Hydration at ${waterPct}%. Tap to build a custom workout or meal with AI.`;
  }
  if (lang === 'es') {
    return protRem > 25
      ? `Faltan ${protRem}g de proteína hoy — pide una cena exacta al Coach IA.`
      : `Hidratación al ${waterPct}%. Toca para hablar con tu Coach IA.`;
  }
  if (hour < 12 && (todayMacros.protein || 0) < 20) {
    return 'Vise 30g de protéines ce matin pour déclencher la synthèse musculaire.';
  }
  if (protRem > 25) {
    return `Il te reste ${protRem}g de protéines : demande un repas sur-mesure au Coach IA.`;
  }
  return 'Objectifs maîtrisés. Touche ici pour générer ta prochaine séance par IA.';
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
  bodyMetrics = [],
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

  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference - kcalRatio * ringCircumference;

  const suggestedWorkout = useMemo(() => {
    const allWorkouts = WORKOUT_PROGRAMS.flatMap((prog) =>
      prog.workouts.map((w) => ({
        ...w,
        programTitle: prog.title,
        programId: prog.id,
        category: prog.category,
      }))
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

  const readinessScore = useMemo(() => {
    const sportScore = Math.min(100, (workouts7dCount / 3) * 100) * 0.35;
    const hydrationScore = waterPct * 0.3;
    const nutritionScore = (protPct * 0.6 + Math.round(kcalRatio * 100) * 0.4) * 0.35;
    return Math.min(100, Math.max(18, Math.round(sportScore + hydrationScore + nutritionScore)));
  }, [workouts7dCount, waterPct, protPct, kcalRatio]);

  const coachNote = useMemo(
    () =>
      getDynamicCoachNote(
        lang,
        new Date().getHours(),
        todayMacros || {},
        targets,
        waterMl
      ),
    [lang, todayMacros, targets, waterMl]
  );

  const macros = [
    {
      key: 'protein',
      label: tr(lang, 'macro_protein'),
      current: Math.round(todayMacros?.protein || 0),
      target: targets.protein,
      barColor: 'bg-sky-400',
      textColor: 'text-sky-400',
    },
    {
      key: 'carbs',
      label: tr(lang, 'macro_carbs'),
      current: Math.round(todayMacros?.carbs || 0),
      target: targets.carbs,
      barColor: 'bg-amber-400',
      textColor: 'text-amber-400',
    },
    {
      key: 'fat',
      label: tr(lang, 'macro_fat'),
      current: Math.round(todayMacros?.fat || 0),
      target: targets.fat,
      barColor: 'bg-rose-400',
      textColor: 'text-rose-400',
    },
  ];

  const handleSaveWeight = (e) => {
    e.preventDefault();
    const val = Number(newWeight);
    if (val >= 35 && val <= 250) {
      onLogWeight(val);
      setWeightEditOpen(false);
    }
  };

  const weightTrend = useMemo(() => {
    const pts = (bodyMetrics || []).filter((m) => Number(m.weightKg) > 0).slice(-8);
    if (pts.length < 2) return null;
    const vals = pts.map((p) => Number(p.weightKg));
    const minW = Math.min(...vals);
    const maxW = Math.max(...vals);
    const span = Math.max(0.5, maxW - minW);
    const svgPoints = vals
      .map((v, idx) => {
        const x = Math.round((idx / (vals.length - 1)) * 100);
        const y = Math.round(22 - ((v - minW) / span) * 18);
        return `${x},${y}`;
      })
      .join(' ');
    const delta = Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10;
    return {
      svgPoints,
      deltaLabel: `${delta > 0 ? '+' : ''}${delta} kg`,
    };
  }, [bodyMetrics]);

  return (
    <div className="space-y-5 pb-10 animate-fade-in">
      {/* En-tête Athlète aéré */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <span className="section-eyebrow block">Synthèse Quotidienne</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] mt-0.5">
            {profile?.name || 'Athlète'}
          </h1>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/35 text-xs font-bold text-emerald-400 font-mono">
          SCORE {readinessScore}%
        </div>
      </div>

      {/* 1. COCKPIT ÉNERGÉTIQUE ÉPURÉ (Hiérarchie visuelle nette, zéro surcharge) */}
      <section className="card-surface p-6 space-y-6">
        <div className="flex items-center justify-between gap-5">
          <div className="space-y-1.5">
            <span className="section-eyebrow block">Budget Calorique</span>
            <div className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] font-mono leading-none">
              {Math.abs(remainingKcal)}
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              {remainingKcal >= 0 ? tr(lang, 'kcal_remaining') : tr(lang, 'kcal_surplus')} ·{' '}
              <span className="text-[var(--text-muted)]">
                {consumedKcal}/{targets.kcal}
              </span>
            </p>

            <button
              type="button"
              onClick={() => onNavigateTab('nutrition')}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] hover:border-emerald-400/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              Journaliser un repas
            </button>
          </div>

          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 132 132">
              <circle
                cx="66"
                cy="66"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                className="text-slate-500/15"
                strokeWidth="10"
              />
              <circle
                cx="66"
                cy="66"
                r={ringRadius}
                fill="none"
                stroke={remainingKcal < -120 ? '#fbbf24' : 'var(--accent)'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">
                {Math.round(kcalRatio * 100)}%
              </span>
              <span className="text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                Cible
              </span>
            </div>
          </div>
        </div>

        {/* 3 Colonnes Macronutriments spacieuses */}
        <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
          {macros.map((m) => {
            const pct = Math.min(100, Math.round((m.current / Math.max(1, m.target)) * 100));
            return (
              <div
                key={m.key}
                className="rounded-2xl bg-[var(--bg-subtle)]/55 p-3 space-y-2"
              >
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] block truncate">
                  {m.label}
                </span>
                <div className="font-mono text-sm font-extrabold text-[var(--text-primary)]">
                  {m.current}
                  <span className="text-[11px] font-normal text-[var(--text-muted)]">
                    /{m.target}g
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-500/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${m.barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. SÉANCE VEDETTE AVEC APERÇU BIOMÉCANIQUE ANIMÉ */}
      <section className="card-surface p-5 space-y-4">
        {activeWorkoutSession ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="section-eyebrow !text-emerald-400 block">
                {tr(lang, 'session_paused')}
              </span>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)] truncate mt-1">
                {activeWorkoutSession.workoutTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onResumeWorkout}
              className="btn-accent shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              {tr(lang, 'resume')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="section-eyebrow">{tr(lang, 'next_workout')}</span>
              <button
                type="button"
                onClick={() => onNavigateTab('workouts')}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5"
              >
                Catalogue
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <ExerciseMotionVisual
                exercise={suggestedWorkout?.exercises?.[0]}
                size="thumb"
                animated
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold text-[var(--text-primary)] leading-snug truncate">
                  {suggestedWorkout.title}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {suggestedWorkout.durationMin} min · {suggestedWorkout.exercises.length} mouvements
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartWorkout(suggestedWorkout, 'normal')}
              className="btn-accent w-full"
            >
              <Play className="w-4 h-4 fill-current" />
              {tr(lang, 'start_workout')}
            </button>
          </>
        )}
      </section>

      {/* 3. BENTO TÉLÉMÉTRIE : HYDRATATION & POIDS CORPOREL */}
      <section className="grid grid-cols-2 gap-3.5">
        <div className="card-surface p-4 flex flex-col justify-between space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="section-eyebrow">Eau</span>
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>

          <div>
            <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">
              {(waterMl / 1000).toFixed(2)}
              <span className="text-xs font-normal text-[var(--text-muted)] ml-1">
                /{(targets.waterMl / 1000).toFixed(1)}L
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-500/15 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-sky-400 rounded-full transition-all duration-500"
                style={{ width: `${waterPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateWater(Math.max(0, waterMl - 250))}
              className="w-8 h-8 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center active:scale-95"
              aria-label="-250 ml"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateWater(waterMl + 250)}
              className="flex-1 h-8 rounded-xl bg-sky-400/15 text-xs font-bold text-sky-400 active:scale-95 font-mono"
            >
              +250ml
            </button>
          </div>
        </div>

        <div className="card-surface p-4 flex flex-col justify-between space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="section-eyebrow">{tr(lang, 'weight')}</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>

          {!weightEditOpen ? (
            <>
              <div>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">
                    {profile?.weight || 74}
                    <span className="text-xs font-normal text-[var(--text-muted)] ml-1">kg</span>
                  </div>
                  {weightTrend && (
                    <span className="text-[10.5px] font-mono font-bold text-emerald-400">
                      {weightTrend.deltaLabel}
                    </span>
                  )}
                </div>

                {weightTrend && (
                  <svg viewBox="0 0 100 26" className="w-full h-5 mt-1.5 overflow-visible">
                    <polyline
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={weightTrend.svgPoints}
                    />
                  </svg>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewWeight(profile?.weight || 74);
                  setWeightEditOpen(true);
                }}
                className="w-full h-8 rounded-xl bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)]"
              >
                {tr(lang, 'update')}
              </button>
            </>
          ) : (
            <form onSubmit={handleSaveWeight} className="space-y-2">
              <input
                type="number"
                step="0.1"
                min="35"
                max="250"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="input-dark !py-1.5 !px-2.5 text-xs font-mono"
              />
              <button type="submit" className="btn-accent w-full !py-1.5 !text-xs">
                Valider
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 4. ASSIDUITÉ 7 JOURS & ACCÈS RAPIDE COACH IA */}
      <section className="card-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="section-eyebrow">{tr(lang, 'last_7_days')}</span>
          <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
            {workouts7dCount} {tr(lang, 'sessions_count')}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {last7Days.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                {d.label}
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs transition-all ${
                  d.done
                    ? 'bg-emerald-400 text-zinc-950 font-extrabold'
                    : d.isToday
                    ? 'border border-emerald-400/50 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                }`}
              >
                {d.done ? <Check className="w-4 h-4 stroke-[2.8]" /> : '·'}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('coach')}
          className="w-full pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-400/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-snug group-hover:text-[var(--text-primary)] transition-colors">
              {coachNote}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        </button>
      </section>
    </div>
  );
}
