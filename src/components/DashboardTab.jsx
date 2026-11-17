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

function getDynamicCoachNote(hour, todayMacros, targets, waterMl, workouts7dCount) {
  const protRem = Math.round(targets.protein - (todayMacros.protein || 0));
  const waterPct = Math.round((waterMl / Math.max(1, targets.waterMl)) * 100);

  if (hour < 11) {
    return (todayMacros.protein || 0) < 20
      ? 'Démarre avec 25–30g de protéines et un grand verre d’eau pour stabiliser ton énergie matinale.'
      : 'Premier repas validé. Pense à répartir ton hydratation régulièrement avant midi.';
  }
  if (hour < 15) {
    return waterPct < 35
      ? `Tu es à ${waterPct}% de ton eau du jour. Boire 500 ml maintenant soutiendra ta vigilance cet après-midi.`
      : 'Bonne dynamique à mi-journée. Privilégie légumes et glucides complexes pour ta séance.';
  }
  if (hour < 19) {
    return workouts7dCount === 0
      ? 'Fin d’après-midi idéale pour lancer ta première séance de la semaine.'
      : protRem > 45
      ? `Il reste ${protRem}g de protéines à couvrir : une collation légère soulagera le dîner.`
      : 'Tes apports de la journée avancent de façon fluide et régulière.';
  }
  return protRem > 25
    ? `Il te manque ${protRem}g de protéines ce soir : ouvre le Coach pour une idée de dîner sur-mesure.`
    : 'Objectifs bien tenus aujourd’hui. Place au calme et à un sommeil réparateur.';
}

export default function DashboardTab({
  profile,
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
    const dayLetters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
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
  }, [workoutHistory]);

  const workouts7dCount = last7Days.filter((d) => d.done).length;
  const coachNote = useMemo(
    () =>
      getDynamicCoachNote(
        new Date().getHours(),
        todayMacros || {},
        targets,
        waterMl,
        workouts7dCount
      ),
    [todayMacros, targets, waterMl, workouts7dCount]
  );

  const macros = [
    {
      key: 'protein',
      label: 'Protéines',
      current: Math.round(todayMacros?.protein || 0),
      target: targets.protein,
      color: 'bg-sky-400',
    },
    {
      key: 'carbs',
      label: 'Glucides',
      current: Math.round(todayMacros?.carbs || 0),
      target: targets.carbs,
      color: 'bg-amber-400',
    },
    {
      key: 'fat',
      label: 'Lipides',
      current: Math.round(todayMacros?.fat || 0),
      target: targets.fat,
      color: 'bg-rose-400',
    },
  ];

  const waterPct = Math.min(100, Math.round((waterMl / Math.max(1, targets.waterMl)) * 100));

  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
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
          <p className="text-xs text-zinc-500 capitalize">{todayFormatted}</p>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50 mt-0.5">
            Bonjour, {profile?.name || 'Athlète'}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('nutrition')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/[0.07] text-xs font-medium text-zinc-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          Repas
        </button>
      </div>

      {/* 1. HERO ÉNERGIE & MACROS — ÉPURÉ */}
      <section className="card-surface p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Anneau minimaliste */}
          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 148 148">
              <circle
                cx="74"
                cy="74"
                r={ringRadius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.06)"
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
              <span className="text-2xl font-bold tracking-tight text-zinc-50 tabular-nums">
                {Math.abs(remainingKcal)}
              </span>
              <span className="text-[11px] text-zinc-400">
                {remainingKcal >= 0 ? 'kcal restantes' : 'kcal surplus'}
              </span>
            </div>
          </div>

          {/* 3 jauges fines */}
          <div className="w-full flex-1 space-y-3.5">
            {macros.map((m) => {
              const pct = Math.min(100, Math.round((m.current / Math.max(1, m.target)) * 100));
              return (
                <div key={m.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">{m.label}</span>
                    <span className="tabular-nums text-zinc-200 font-semibold">
                      {m.current}
                      <span className="text-zinc-500 font-normal"> / {m.target}g</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${m.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-zinc-500 pt-0.5 tabular-nums">
              Consommé : {consumedKcal} sur {targets.kcal} kcal
            </p>
          </div>
        </div>
      </section>

      {/* 2. HYDRATATION & POIDS EN DUO COMPACT */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
        {/* Hydratation */}
        <div className="sm:col-span-7 card-surface p-5 flex flex-col justify-between space-y-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-zinc-400">Hydratation</span>
            <span className="text-sm font-semibold text-zinc-100 tabular-nums">
              {(waterMl / 1000).toFixed(2)}{' '}
              <span className="text-zinc-500 font-normal">
                / {(targets.waterMl / 1000).toFixed(1)} L
              </span>
            </span>
          </div>

          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${waterPct}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateWater(Math.max(0, waterMl - 250))}
              className="w-9 h-8 rounded-full bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 flex items-center justify-center active:scale-95 transition-all"
              aria-label="Retirer 250 ml"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateWater(waterMl + 250)}
              className="flex-1 h-8 rounded-full bg-zinc-800/70 hover:bg-zinc-800 text-xs font-medium text-zinc-200 active:scale-95 transition-all tabular-nums"
            >
              +250 ml
            </button>
            <button
              type="button"
              onClick={() => onUpdateWater(waterMl + 500)}
              className="flex-1 h-8 rounded-full bg-sky-400/15 hover:bg-sky-400/25 text-xs font-semibold text-sky-300 active:scale-95 transition-all tabular-nums"
            >
              +500 ml
            </button>
          </div>
        </div>

        {/* Poids */}
        <div className="sm:col-span-5 card-surface p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-zinc-400">Poids</span>
            <button
              type="button"
              onClick={() => {
                setNewWeight(profile?.weight || 74);
                setWeightEditOpen((v) => !v);
              }}
              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
            >
              {weightEditOpen ? 'Fermer' : 'Actualiser'}
            </button>
          </div>

          {!weightEditOpen ? (
            <div>
              <div className="text-2xl font-bold text-zinc-50 tabular-nums tracking-tight">
                {profile?.weight || 74}{' '}
                <span className="text-sm font-normal text-zinc-500">kg</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {bodyMetrics?.length || 0} pesée{(bodyMetrics?.length || 0) > 1 ? 's' : ''} suivie
                {(bodyMetrics?.length || 0) > 1 ? 's' : ''}
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
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 3. SÉANCE DU JOUR — CARTE ÉPURÉE */}
      <section className="card-surface p-5">
        {activeWorkoutSession ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-emerald-400">
                Séance en pause
              </span>
              <h2 className="text-base font-semibold text-zinc-50 truncate mt-0.5">
                {activeWorkoutSession.workoutTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onResumeWorkout}
              className="btn-accent shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Reprendre
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-zinc-400">
                  Prochaine séance
                </span>
                <h2 className="text-base font-semibold text-zinc-50 mt-0.5">
                  {suggestedWorkout.title}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {suggestedWorkout.durationMin} min •{' '}
                  {(suggestedWorkout.targetMuscles || []).slice(0, 3).join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('workouts')}
                className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-0.5 shrink-0"
              >
                Programme
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onStartWorkout(suggestedWorkout, 'normal')}
              className="btn-primary w-full"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Démarrer la séance
            </button>
          </div>
        )}
      </section>

      {/* 4. RÉGULARITÉ 7 JOURS & NOTE DU COACH */}
      <section className="card-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">7 derniers jours</span>
          <span className="text-xs text-zinc-300 font-medium tabular-nums">
            {workouts7dCount} séance{workouts7dCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {last7Days.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">{d.label}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                  d.done
                    ? 'bg-emerald-400 text-zinc-950 font-bold'
                    : d.isToday
                    ? 'border border-white/25 text-zinc-200'
                    : 'bg-white/[0.04] text-zinc-600'
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
          className="w-full pt-3 border-t border-white/[0.05] flex items-start justify-between gap-3 text-left group"
        >
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300 leading-relaxed group-hover:text-zinc-100 transition-colors">
              {coachNote}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 shrink-0 mt-0.5" />
        </button>
      </section>
    </div>
  );
}
