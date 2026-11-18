import React, { useMemo, useState } from 'react';
import {
  Play,
  Plus,
  Minus,
  ChevronRight,
  MessageSquare,
  Check,
  Droplets,
  Scale,
} from 'lucide-react';
import { WORKOUT_PROGRAMS } from '../data/workoutsData';
import { getTodayDateString } from '../db/database';
import { tr } from '../i18n/translations';
import ExerciseMotionVisual from './ExerciseMotionVisual';

function formatTodayHeaderDate(lang) {
  try {
    const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
    const raw = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return '';
  }
}

function getDynamicCoachNote(lang, hour, todayMacros, targets, waterMl) {
  const protRem = Math.round(targets.protein - (todayMacros.protein || 0));
  const waterPct = Math.round((waterMl / Math.max(1, targets.waterMl)) * 100);

  if (lang === 'en') {
    return protRem > 25
      ? `${protRem}g protein remaining today — ask your Coach for a balanced meal.`
      : `Hydration at ${waterPct}%. Ask your Coach to adapt today's session.`;
  }
  if (lang === 'es') {
    return protRem > 25
      ? `Faltan ${protRem}g de proteína hoy — pide una comida exacta al Coach.`
      : `Hidratación al ${waterPct}%. Habla con tu Coach para ajustar tu sesión.`;
  }
  if (hour < 12 && (todayMacros.protein || 0) < 20) {
    return 'Vise ~30g de protéines ce matin pour optimiser la récupération musculaire.';
  }
  if (protRem > 25) {
    return `Il reste ${protRem}g de protéines à couvrir — demande une idée de repas au Coach.`;
  }
  return 'Objectifs bien engagés. Ouvre le Coach pour ajuster ta séance ou tes macros.';
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

  const ringRadius = 46;
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
    },
    {
      key: 'carbs',
      label: tr(lang, 'macro_carbs'),
      current: Math.round(todayMacros?.carbs || 0),
      target: targets.carbs,
      barColor: 'bg-amber-400',
    },
    {
      key: 'fat',
      label: tr(lang, 'macro_fat'),
      current: Math.round(todayMacros?.fat || 0),
      target: targets.fat,
      barColor: 'bg-rose-400',
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

  const todayHeaderDate = useMemo(() => formatTodayHeaderDate(lang), [lang]);

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* En-tête éditorial sobre */}
      <div className="flex items-end justify-between px-0.5 pt-0.5">
        <div>
          {todayHeaderDate && (
            <span className="text-xs text-[var(--text-muted)] block">
              {todayHeaderDate}
            </span>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] mt-0.5">
            {profile?.name || 'Athlète'}
          </h1>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          <span>Forme {readinessScore}%</span>
        </div>
      </div>

      {/* 1. BILAN ÉNERGÉTIQUE & MACRONUTRIMENTS (Grille épurée sans boîtes imbriquées) */}
      <section className="card-surface p-5 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="section-eyebrow block">
              {remainingKcal >= 0 ? 'Énergie restante' : 'Surplus calorique'}
            </span>
            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="text-[32px] font-semibold tracking-tight text-[var(--text-primary)] leading-none">
                {Math.abs(remainingKcal)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">kcal</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] tabular-nums pt-0.5">
              {consumedKcal} consommées sur {targets.kcal} kcal
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('nutrition')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                Ajouter un repas
              </button>
            </div>
          </div>

          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
              <circle
                cx="56"
                cy="56"
                r={ringRadius}
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="6.5"
              />
              <circle
                cx="56"
                cy="56"
                r={ringRadius}
                fill="none"
                stroke={remainingKcal < -120 ? 'var(--macro-c)' : 'var(--accent)'}
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {Math.round(kcalRatio * 100)}%
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">objectif</span>
            </div>
          </div>
        </div>

        {/* 3 colonnes séparées par un filet fin */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] pt-4 border-t border-[var(--border-subtle)]">
          {macros.map((m, idx) => {
            const pct = Math.min(100, Math.round((m.current / Math.max(1, m.target)) * 100));
            return (
              <div
                key={m.key}
                className={`space-y-1.5 ${
                  idx === 0 ? 'pr-3' : idx === 1 ? 'px-3' : 'pl-3'
                }`}
              >
                <span className="text-xs text-[var(--text-muted)] block truncate">
                  {m.label}
                </span>
                <div className="tabular-nums text-sm font-semibold text-[var(--text-primary)]">
                  {m.current}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    /{m.target}g
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
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

      {/* 2. PROCHAINE SÉANCE */}
      <section className="card-surface p-5 space-y-4">
        {activeWorkoutSession ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-xs font-medium text-emerald-400 block">
                {tr(lang, 'session_paused')}
              </span>
              <h2 className="text-base font-semibold text-[var(--text-primary)] truncate mt-0.5">
                {activeWorkoutSession.workoutTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onResumeWorkout}
              className="btn-primary shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
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
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-0.5 transition-colors"
              >
                Programmes
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3.5">
              <ExerciseMotionVisual
                exercise={suggestedWorkout?.exercises?.[0]}
                size="thumb"
                animated
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug truncate">
                  {suggestedWorkout.title}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 tabular-nums">
                  {suggestedWorkout.durationMin} min · {suggestedWorkout.exercises.length} exercices
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartWorkout(suggestedWorkout, 'normal')}
              className="btn-primary w-full"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {tr(lang, 'start_workout')}
            </button>
          </>
        )}
      </section>

      {/* 3. HYDRATATION & POIDS CORPOREL */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card-surface p-4 flex flex-col justify-between space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="section-eyebrow">Hydratation</span>
            <Droplets className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </div>

          <div>
            <div className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">
              {(waterMl / 1000).toFixed(2)}
              <span className="text-xs font-normal text-[var(--text-muted)] ml-1">
                / {(targets.waterMl / 1000).toFixed(1)} L
              </span>
            </div>
            <div className="h-1 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mt-2">
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
              className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center active:scale-95 transition-colors"
              aria-label="-250 ml"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateWater(waterMl + 250)}
              className="flex-1 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[11px] font-medium text-[var(--text-primary)] active:scale-95 tabular-nums transition-colors"
            >
              +250
            </button>
            <button
              type="button"
              onClick={() => onUpdateWater(waterMl + 500)}
              className="flex-1 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[11px] font-medium text-[var(--text-primary)] active:scale-95 tabular-nums transition-colors"
            >
              +500
            </button>
          </div>
        </div>

        <div className="card-surface p-4 flex flex-col justify-between space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="section-eyebrow">{tr(lang, 'weight')}</span>
            <Scale className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </div>

          {!weightEditOpen ? (
            <>
              <div>
                <div className="flex items-baseline justify-between gap-1 tabular-nums">
                  <div className="text-xl font-semibold text-[var(--text-primary)]">
                    {profile?.weight || 74}
                    <span className="text-xs font-normal text-[var(--text-muted)] ml-1">kg</span>
                  </div>
                  {weightTrend && (
                    <span className="text-[11px] font-medium text-emerald-400">
                      {weightTrend.deltaLabel}
                    </span>
                  )}
                </div>

                {weightTrend && (
                  <svg viewBox="0 0 100 26" className="w-full h-5 mt-1.5 overflow-visible">
                    <polyline
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.75"
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
                className="w-full h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] transition-colors"
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
                className="input-dark !py-1.5 !px-2.5 text-xs tabular-nums"
              />
              <button type="submit" className="btn-primary w-full !py-1.5 !text-xs">
                Enregistrer
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 4. RÉGULARITÉ 7 JOURS & NOTE DU COACH */}
      <section className="card-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="section-eyebrow">{tr(lang, 'last_7_days')}</span>
          <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
            {workouts7dCount} {tr(lang, 'sessions_count')}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {last7Days.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium text-[var(--text-muted)]">
                {d.label}
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                  d.done
                    ? 'bg-[var(--accent)] text-white'
                    : d.isToday
                    ? 'border border-[var(--border-strong)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                }`}
              >
                {d.done ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : '·'}
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
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
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
