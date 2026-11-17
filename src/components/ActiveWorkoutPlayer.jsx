import React, { useState, useEffect } from 'react';
import {
  X,
  Minimize2,
  Check,
  Play,
  Pause,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';
import {
  playTickBeep,
  playRestFinishedAlert,
  playSetValidatedPop,
  playWorkoutCompleteFanfare,
} from '../utils/soundEffects';

function formatClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ActiveWorkoutPlayer({
  session,
  onPersistSession,
  onMinimize,
  onCancelSession,
  onCompleteWorkout,
}) {
  const [currentExIdx, setCurrentExIdx] = useState(session?.currentExIdx || 0);
  const [elapsedSec, setElapsedSec] = useState(session?.elapsedSec || 0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

  const [restTimer, setRestTimer] = useState({
    active: false,
    paused: false,
    remaining: 0,
    total: 60,
  });

  const [effortTimer, setEffortTimer] = useState({
    active: false,
    paused: false,
    setIndex: null,
    remaining: 0,
    total: 40,
  });

  const exercises = session?.exercises || [];
  const currentExercise = exercises[currentExIdx] || exercises[0];

  useEffect(() => {
    if (showSummary) return;
    const id = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [showSummary]);

  useEffect(() => {
    if (!session || showSummary) return;
    onPersistSession({
      ...session,
      currentExIdx,
      elapsedSec,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExIdx, Math.floor(elapsedSec / 5)]);

  useEffect(() => {
    if (!restTimer.active || restTimer.paused) return;
    const id = setInterval(() => {
      setRestTimer((prev) => {
        if (prev.remaining <= 1) {
          if (soundEnabled) playRestFinishedAlert();
          return { ...prev, active: false, remaining: 0 };
        }
        if (prev.remaining <= 4 && soundEnabled) playTickBeep();
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restTimer.active, restTimer.paused, soundEnabled]);

  useEffect(() => {
    if (!effortTimer.active || effortTimer.paused) return;
    const id = setInterval(() => {
      setEffortTimer((prev) => {
        if (prev.remaining <= 1) {
          if (soundEnabled) playRestFinishedAlert();
          if (prev.setIndex !== null) {
            handleToggleSetComplete(currentExIdx, prev.setIndex, true);
          }
          return { active: false, paused: false, setIndex: null, remaining: 0, total: 40 };
        }
        if (prev.remaining <= 4 && soundEnabled) playTickBeep();
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => clearInterval(id);
  }, [effortTimer.active, effortTimer.paused, soundEnabled, currentExIdx]);

  if (!session || !currentExercise) return null;

  const updateExercises = (updatedList) => {
    onPersistSession({
      ...session,
      exercises: updatedList,
      currentExIdx,
      elapsedSec,
    });
  };

  const handleUpdateSetField = (exIndex, setIndex, field, value) => {
    const next = exercises.map((ex, i) => {
      if (i !== exIndex) return ex;
      return {
        ...ex,
        setRows: ex.setRows.map((row, sIdx) =>
          sIdx === setIndex ? { ...row, [field]: Number(value) || 0 } : row
        ),
      };
    });
    updateExercises(next);
  };

  const handleToggleSetComplete = (exIndex, setIndex, forceTrue = false) => {
    const targetEx = exercises[exIndex];
    const currentRow = targetEx.setRows[setIndex];
    const nextCompleted = forceTrue ? true : !currentRow.completed;

    const next = exercises.map((ex, i) => {
      if (i !== exIndex) return ex;
      return {
        ...ex,
        setRows: ex.setRows.map((row, sIdx) =>
          sIdx === setIndex ? { ...row, completed: nextCompleted } : row
        ),
      };
    });
    updateExercises(next);

    if (nextCompleted) {
      if (soundEnabled && !forceTrue) playSetValidatedPop();
      const restDur = Number(targetEx.restSeconds) || 60;
      setRestTimer({
        active: true,
        paused: false,
        remaining: restDur,
        total: restDur,
      });
    }
  };

  const handleSwapToAlternative = () => {
    if (!currentExercise.alternative) return;
    const next = exercises.map((ex, i) => {
      if (i !== currentExIdx) return ex;
      return {
        ...ex,
        name: ex.alternative.split('(')[0].trim(),
        alternative: ex.name,
      };
    });
    updateExercises(next);
  };

  const startEffortCountdown = (setIndex, seconds) => {
    const dur = Math.max(5, Number(seconds) || 40);
    setRestTimer((r) => ({ ...r, active: false }));
    setEffortTimer({
      active: true,
      paused: false,
      setIndex,
      remaining: dur,
      total: dur,
    });
  };

  const totalSetsCount = exercises.reduce((acc, ex) => acc + ex.setRows.length, 0);
  const completedSetsCount = exercises.reduce(
    (acc, ex) => acc + ex.setRows.filter((s) => s.completed).length,
    0
  );
  const totalVolumeKg = exercises.reduce((acc, ex) => {
    return (
      acc +
      ex.setRows
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weightKg) || 0), 0)
    );
  }, 0);

  const progressPct = Math.round(
    (completedSetsCount / Math.max(1, totalSetsCount)) * 100
  );

  const handleFinishSession = () => {
    setRestTimer((r) => ({ ...r, active: false }));
    setEffortTimer((e) => ({ ...e, active: false }));
    if (soundEnabled) playWorkoutCompleteFanfare();
    setShowSummary(true);
  };

  const handleSaveAndCloseSummary = () => {
    onCompleteWorkout({
      programId: session.programId || 'custom',
      workoutId: session.workoutId,
      title: session.workoutTitle,
      intensityMode: session.intensityMode || 'normal',
      durationSec: elapsedSec,
      completedSets: completedSetsCount,
      totalSets: totalSetsCount,
      totalVolumeKg: Math.round(totalVolumeKg),
      exercises,
    });
  };

  if (showSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-sm card-elevated p-7 text-center space-y-6">
          <div>
            <span className="text-xs font-medium text-emerald-400">Séance validée</span>
            <h2 className="text-xl font-bold text-zinc-50 mt-1">
              {session.workoutTitle}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-zinc-950/80 rounded-2xl p-3 border border-white/[0.06]">
              <span className="block text-[10px] text-zinc-500">Durée</span>
              <span className="text-base font-bold text-zinc-100 tabular-nums">
                {formatClock(elapsedSec)}
              </span>
            </div>
            <div className="bg-zinc-950/80 rounded-2xl p-3 border border-white/[0.06]">
              <span className="block text-[10px] text-zinc-500">Séries</span>
              <span className="text-base font-bold text-emerald-400 tabular-nums">
                {completedSetsCount}/{totalSetsCount}
              </span>
            </div>
            <div className="bg-zinc-950/80 rounded-2xl p-3 border border-white/[0.06]">
              <span className="block text-[10px] text-zinc-500">Volume</span>
              <span className="text-base font-bold text-zinc-100 tabular-nums">
                {Math.round(totalVolumeKg)} kg
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveAndCloseSummary}
            className="btn-accent w-full py-3"
          >
            Enregistrer et fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col pt-safe pb-safe overflow-hidden animate-fade-in">
      {/* Top Bar minimaliste */}
      <div className="px-4 py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onMinimize}
            className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-100"
            title="Réduire"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-100 truncate">
              {session.workoutTitle}
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {formatClock(elapsedSec)} · {completedSetsCount}/{totalSetsCount} séries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-600" />
            )}
          </button>

          <button
            type="button"
            onClick={handleFinishSession}
            className="px-3.5 py-1.5 rounded-full bg-zinc-100 text-zinc-950 text-xs font-semibold"
          >
            Terminer
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Abandonner la séance ?')) onCancelSession();
            }}
            className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-rose-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ligne de progression */}
      <div className="h-[2px] w-full bg-zinc-900 shrink-0">
        <div
          className="h-full bg-emerald-400 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Pilules exercices */}
      <div className="px-4 py-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {exercises.map((ex, idx) => {
          const allDone = ex.setRows.every((s) => s.completed);
          const isCurrent = idx === currentExIdx;
          return (
            <button
              key={ex.id || idx}
              type="button"
              onClick={() => setCurrentExIdx(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isCurrent
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : allDone
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              <span>{idx + 1}</span>
              <span className="max-w-[110px] truncate">{ex.name}</span>
            </button>
          );
        })}
      </div>

      {/* Corps central */}
      <div className="flex-1 overflow-y-auto px-5 py-3 max-w-lg w-full mx-auto space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{currentExercise.muscle}</span>
            <span className="tabular-nums">Repos {currentExercise.restSeconds || 60}s</span>
          </div>
          <h3 className="text-xl font-bold text-zinc-50 tracking-tight">
            {currentExercise.name}
          </h3>
          {currentExercise.cue && (
            <p className="text-xs text-zinc-400 leading-relaxed">
              {currentExercise.cue}
            </p>
          )}
          {currentExercise.alternative && (
            <button
              type="button"
              onClick={handleSwapToAlternative}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 pt-0.5"
            >
              <RefreshCw className="w-3 h-3" />
              Variante : {currentExercise.alternative}
            </button>
          )}
        </div>

        {/* Chronomètre d'Effort */}
        {effortTimer.active && (
          <div className="card-surface p-4 flex items-center justify-between gap-3 border-emerald-400/30">
            <div>
              <p className="text-[11px] text-emerald-400">
                Effort — Série {effortTimer.setIndex + 1}
              </p>
              <p className="text-3xl font-bold text-zinc-50 tabular-nums">
                {formatClock(effortTimer.remaining)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setEffortTimer((prev) => ({ ...prev, paused: !prev.paused }))
                }
                className="btn-secondary !p-2.5"
              >
                {effortTimer.paused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = effortTimer.setIndex;
                  setEffortTimer({
                    active: false,
                    paused: false,
                    setIndex: null,
                    remaining: 0,
                    total: 40,
                  });
                  if (idx !== null) handleToggleSetComplete(currentExIdx, idx, true);
                }}
                className="btn-accent !py-2 !px-4 !text-xs"
              >
                Valider
              </button>
            </div>
          </div>
        )}

        {/* Séries */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 px-2 text-[11px] text-zinc-500">
            <span className="col-span-2">Série</span>
            {currentExercise.type === 'timed' ? (
              <>
                <span className="col-span-4 text-center">Secondes</span>
                <span className="col-span-3 text-center">Chrono</span>
              </>
            ) : (
              <>
                <span className="col-span-4 text-center">kg</span>
                <span className="col-span-3 text-center">Reps</span>
              </>
            )}
            <span className="col-span-3 text-right">État</span>
          </div>

          {currentExercise.setRows.map((row, sIdx) => (
            <div
              key={row.setNumber}
              className={`grid grid-cols-12 items-center gap-2 p-2.5 rounded-2xl border transition-all ${
                row.completed
                  ? 'bg-emerald-400/10 border-emerald-400/30'
                  : 'bg-zinc-900/60 border-white/[0.06]'
              }`}
            >
              <div className="col-span-2 pl-1.5 text-xs font-semibold text-zinc-400 tabular-nums">
                #{row.setNumber}
              </div>

              {currentExercise.type === 'timed' ? (
                <>
                  <div className="col-span-4">
                    <input
                      type="number"
                      min="5"
                      max="600"
                      step="5"
                      value={row.durationSeconds || 40}
                      onChange={(e) =>
                        handleUpdateSetField(
                          currentExIdx,
                          sIdx,
                          'durationSeconds',
                          e.target.value
                        )
                      }
                      className="w-full bg-zinc-950/80 border border-white/[0.07] rounded-xl py-1.5 px-2 text-center text-sm font-semibold text-zinc-100 tabular-nums focus:outline-none"
                    />
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        startEffortCountdown(sIdx, row.durationSeconds || 40)
                      }
                      className="px-3 py-1.5 rounded-full bg-zinc-800 text-xs font-medium text-zinc-200 inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Go
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-4">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      step="0.5"
                      value={row.weightKg}
                      onChange={(e) =>
                        handleUpdateSetField(currentExIdx, sIdx, 'weightKg', e.target.value)
                      }
                      className="w-full bg-zinc-950/80 border border-white/[0.07] rounded-xl py-1.5 px-2 text-center text-sm font-semibold text-zinc-100 tabular-nums focus:outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={row.reps}
                      onChange={(e) =>
                        handleUpdateSetField(currentExIdx, sIdx, 'reps', e.target.value)
                      }
                      className="w-full bg-zinc-950/80 border border-white/[0.07] rounded-xl py-1.5 px-2 text-center text-sm font-semibold text-zinc-100 tabular-nums focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleToggleSetComplete(currentExIdx, sIdx)}
                  className={`w-full py-2 rounded-full font-semibold text-xs flex items-center justify-center transition-all active:scale-95 ${
                    row.completed
                      ? 'bg-emerald-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation bas */}
        <div className="flex items-center justify-between gap-3 pt-3">
          <button
            type="button"
            disabled={currentExIdx === 0}
            onClick={() => setCurrentExIdx((i) => Math.max(0, i - 1))}
            className="btn-secondary flex-1 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>

          {currentExIdx < exercises.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentExIdx((i) => Math.min(exercises.length - 1, i + 1))}
              className="btn-primary flex-1"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishSession}
              className="btn-accent flex-1"
            >
              Terminer
            </button>
          )}
        </div>
      </div>

      {/* Timer de Repos flottant épuré */}
      {restTimer.active && (
        <div className="border-t border-white/[0.07] bg-zinc-900/95 backdrop-blur-2xl px-5 py-4 shrink-0 animate-slide-up">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-emerald-400 font-medium block">
                Repos
              </span>
              <span className="text-2xl font-bold text-zinc-50 tabular-nums">
                {formatClock(restTimer.remaining)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setRestTimer((prev) => ({
                    ...prev,
                    remaining: Math.max(0, prev.remaining - 15),
                  }))
                }
                className="btn-secondary !py-1.5 !px-3 !text-xs tabular-nums"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() =>
                  setRestTimer((prev) => ({ ...prev, paused: !prev.paused }))
                }
                className="btn-secondary !p-2"
              >
                {restTimer.paused ? (
                  <Play className="w-3.5 h-3.5" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  setRestTimer((prev) => ({
                    ...prev,
                    remaining: prev.remaining + 15,
                    total: Math.max(prev.total, prev.remaining + 15),
                  }))
                }
                className="btn-secondary !py-1.5 !px-3 !text-xs tabular-nums"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={() => setRestTimer((prev) => ({ ...prev, active: false }))}
                className="btn-primary !py-1.5 !px-3.5 !text-xs"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Passer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
