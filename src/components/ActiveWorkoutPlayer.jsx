import React, { useState, useEffect, useCallback } from 'react';
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
  Trophy,
  Disc,
} from 'lucide-react';
import {
  playTickBeep,
  playRestFinishedAlert,
  playSetValidatedPop,
  playWorkoutCompleteFanfare,
} from '../utils/soundEffects';
import ExerciseMotionVisual from './ExerciseMotionVisual';

function formatClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function computePlatesPerSide(totalKg, barKg = 20) {
  const num = Number(totalKg) || 0;
  if (num <= barKg) return [];
  let rem = Math.round(((num - barKg) / 2) * 100) / 100;
  const standardPlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const out = [];
  for (const p of standardPlates) {
    while (rem >= p - 0.01) {
      out.push(p);
      rem = Math.round((rem - p) * 100) / 100;
    }
  }
  return out;
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
  const [showPlatesHelper, setShowPlatesHelper] = useState(false);

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

  const [completedEffortSetSignal, setCompletedEffortSetSignal] = useState(null);

  const exercises = session?.exercises || [];
  const currentExercise = exercises[currentExIdx] || exercises[0];

  useEffect(() => {
    if (showSummary) return;
    const id = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [showSummary]);

  // Maintien automatique de l'écran allumé en séance (Screen Wake Lock API)
  useEffect(() => {
    if (showSummary || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return undefined;
    }
    let sentinel = null;
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Non supporté ou batterie faible
      }
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (sentinel) sentinel.release().catch(() => {});
    };
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

  // Timer de repos (effets sonores hors du setter pur)
  useEffect(() => {
    if (!restTimer.active || restTimer.paused) return;
    const id = setInterval(() => {
      setRestTimer((prev) => {
        if (prev.remaining <= 1) {
          return { ...prev, active: false, remaining: 0, justFinished: true };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restTimer.active, restTimer.paused]);

  useEffect(() => {
    if (restTimer.justFinished) {
      if (soundEnabled) playRestFinishedAlert();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([110, 55, 110]);
      }
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden' &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification('Pulse — Repos terminé', {
            body: `Prêt pour la suite : ${currentExercise?.name || 'Série suivante'}`,
          });
        } catch {
          // Notification ignorée
        }
      }
      setRestTimer((prev) => ({ ...prev, justFinished: false }));
    } else if (
      soundEnabled &&
      restTimer.active &&
      !restTimer.paused &&
      restTimer.remaining > 0 &&
      restTimer.remaining <= 3
    ) {
      playTickBeep();
    }
  }, [restTimer.remaining, restTimer.justFinished, restTimer.active, restTimer.paused, soundEnabled, currentExercise]);

  // Timer d'effort (sans appel d'état parent dans l'updater React)
  useEffect(() => {
    if (!effortTimer.active || effortTimer.paused) return;
    const id = setInterval(() => {
      setEffortTimer((prev) => {
        if (prev.remaining <= 1) {
          setCompletedEffortSetSignal(prev.setIndex);
          return { active: false, paused: false, setIndex: null, remaining: 0, total: 40 };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [effortTimer.active, effortTimer.paused]);

  useEffect(() => {
    if (soundEnabled && effortTimer.active && !effortTimer.paused && effortTimer.remaining > 0 && effortTimer.remaining <= 3) {
      playTickBeep();
    }
  }, [effortTimer.remaining, effortTimer.active, effortTimer.paused, soundEnabled]);

  const updateExercises = useCallback(
    (updatedList) => {
      if (!session) return;
      onPersistSession({
        ...session,
        exercises: updatedList,
        currentExIdx,
        elapsedSec,
      });
    },
    [session, onPersistSession, currentExIdx, elapsedSec]
  );

  const handleToggleSetComplete = useCallback(
    (exIndex, setIndex, forceTrue = false) => {
      const targetEx = exercises[exIndex];
      if (!targetEx) return;
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
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(18);
        }
        if (soundEnabled) {
          if (forceTrue) playRestFinishedAlert();
          else playSetValidatedPop();
        }
        const restDur = Number(targetEx.restSeconds) || 60;
        setRestTimer({
          active: true,
          paused: false,
          remaining: restDur,
          total: restDur,
          justFinished: false,
        });
      }
    },
    [exercises, updateExercises, soundEnabled]
  );

  useEffect(() => {
    if (completedEffortSetSignal !== null) {
      const sIdx = completedEffortSetSignal;
      setCompletedEffortSetSignal(null);
      handleToggleSetComplete(currentExIdx, sIdx, true);
    }
  }, [completedEffortSetSignal, currentExIdx, handleToggleSetComplete]);

  if (!session || !currentExercise) return null;

  const handleCycleSetType = (exIndex, setIndex) => {
    const order = ['normal', 'warmup', 'dropset'];
    const next = exercises.map((ex, i) => {
      if (i !== exIndex) return ex;
      return {
        ...ex,
        setRows: ex.setRows.map((row, sIdx) => {
          if (sIdx !== setIndex) return row;
          const cur = row.setType || 'normal';
          const nextType = order[(order.indexOf(cur) + 1) % order.length];
          return { ...row, setType: nextType };
        }),
      };
    });
    updateExercises(next);
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
    const prAchievedList = exercises.filter((ex) => {
      if (!ex.bestPast1RM || ex.bestPast1RM <= 0) return false;
      const bestToday = Math.max(
        0,
        ...ex.setRows
          .filter(
            (s) =>
              s.completed &&
              s.setType !== 'warmup' &&
              Number(s.weightKg) > 0 &&
              Number(s.reps) > 0
          )
          .map((s) => Number(s.weightKg) * (1 + Number(s.reps) / 30))
      );
      return bestToday > ex.bestPast1RM + 0.5;
    });

    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg-app)] flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-sm card-elevated p-7 text-center space-y-6">
          <div>
            <span className="section-eyebrow !text-emerald-400">Séance validée</span>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
              {session.workoutTitle}
            </h2>
            {prAchievedList.length > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/40 text-xs font-bold text-emerald-400">
                <Trophy className="w-3.5 h-3.5" />
                <span>{prAchievedList.length} Nouveau(x) Record(s) Personnel(s) !</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[var(--bg-subtle)] rounded-2xl p-3">
              <span className="block text-[10px] text-[var(--text-muted)]">Durée</span>
              <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                {formatClock(elapsedSec)}
              </span>
            </div>
            <div className="bg-[var(--bg-subtle)] rounded-2xl p-3">
              <span className="block text-[10px] text-[var(--text-muted)]">Séries</span>
              <span className="text-base font-bold text-emerald-400 tabular-nums">
                {completedSetsCount}/{totalSetsCount}
              </span>
            </div>
            <div className="bg-[var(--bg-subtle)] rounded-2xl p-3">
              <span className="block text-[10px] text-[var(--text-muted)]">Volume</span>
              <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
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
    <div className="fixed inset-0 z-50 bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col pt-safe pb-safe overflow-hidden animate-fade-in">
      <div className="px-4 py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onMinimize}
            className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
            title="Réduire"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {session.workoutTitle}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {formatClock(elapsedSec)} · {completedSetsCount}/{totalSetsCount} séries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </button>

          <button
            type="button"
            onClick={handleFinishSession}
            className="btn-primary !py-1.5 !px-3.5 !text-xs"
          >
            Terminer
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Abandonner la séance ?')) onCancelSession();
            }}
            className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-[2px] w-full bg-[var(--bg-subtle)] shrink-0">
        <div
          className="h-full bg-emerald-400 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="px-4 py-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {exercises.map((ex, idx) => {
          const allDone = ex.setRows.every((s) => s.completed);
          const isCurrent = idx === currentExIdx;
          return (
            <button
              key={ex.id || idx}
              type="button"
              onClick={() => setCurrentExIdx(idx)}
              className={
                isCurrent
                  ? 'chip-active'
                  : allDone
                  ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-emerald-400/15 border border-emerald-400/30 text-emerald-400'
                  : 'chip'
              }
            >
              <span>{idx + 1}</span>
              <span className="max-w-[110px] truncate">{ex.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 max-w-lg w-full mx-auto space-y-5">
        {/* Démonstration biomécanique animée temps réel sur le plateau */}
        <ExerciseMotionVisual exercise={currentExercise} size="hero" animated showAnatomy />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <span className="font-semibold text-emerald-400 truncate">
              {currentExercise.muscle}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {currentExercise.lastPerfLabel && (
                <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                  Dern. {currentExercise.lastPerfLabel}
                </span>
              )}
              <span className="font-mono">Repos {currentExercise.restSeconds || 60}s</span>
              {currentExercise.type !== 'timed' &&
                Number(currentExercise.setRows?.[0]?.weightKg || 0) >= 22.5 && (
                  <button
                    type="button"
                    onClick={() => setShowPlatesHelper((v) => !v)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[10.5px] font-bold text-emerald-400"
                    title="Calculateur de disques par côté (barre olympique 20 kg)"
                  >
                    <Disc className="w-3 h-3" />
                    Disques
                  </button>
                )}
            </div>
          </div>

          {showPlatesHelper &&
            currentExercise.type !== 'timed' &&
            Number(currentExercise.setRows?.[0]?.weightKg || 0) >= 22.5 && (
              <div className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between gap-2 animate-fade-in">
                <span>Par côté (barre 20 kg) :</span>
                <span className="font-mono font-bold text-emerald-400">
                  {computePlatesPerSide(currentExercise.setRows[0].weightKg)
                    .map((p) => `[${p}]`)
                    .join(' ') || 'Barre nue'}
                </span>
              </div>
            )}

          <h3 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {currentExercise.name}
          </h3>
          {currentExercise.cue && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {currentExercise.cue}
            </p>
          )}
          {currentExercise.alternative && (
            <button
              type="button"
              onClick={handleSwapToAlternative}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 pt-0.5"
            >
              <RefreshCw className="w-3 h-3" />
              Variante : {currentExercise.alternative}
            </button>
          )}
        </div>

        {effortTimer.active && (
          <div className="card-surface p-4 flex items-center justify-between gap-3 border-emerald-400/30">
            <div>
              <p className="text-[11px] text-emerald-400">
                Effort — Série {(effortTimer.setIndex ?? 0) + 1}
              </p>
              <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
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

        <div className="space-y-2">
          <div className="grid grid-cols-12 px-2 text-[11px] text-[var(--text-muted)]">
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
                  : 'card-surface !rounded-2xl'
              }`}
            >
              <button
                type="button"
                onClick={() => handleCycleSetType(currentExIdx, sIdx)}
                title="Toucher pour basculer : Série normale (#) · Échauffement (E) · Drop-set (D)"
                className={`col-span-2 py-1 rounded-lg text-xs font-semibold tabular-nums text-center transition-colors ${
                  row.setType === 'warmup'
                    ? 'bg-amber-400/15 text-amber-400'
                    : row.setType === 'dropset'
                    ? 'bg-sky-400/15 text-sky-400'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {row.setType === 'warmup'
                  ? 'E'
                  : row.setType === 'dropset'
                  ? 'D'
                  : `#${row.setNumber}`}
              </button>

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
                      className="input-dark !py-1.5 !px-2 text-center font-semibold tabular-nums"
                    />
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        startEffortCountdown(sIdx, row.durationSeconds || 40)
                      }
                      className="btn-secondary !py-1.5 !px-3 !text-xs"
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
                      className="input-dark !py-1.5 !px-2 text-center font-semibold tabular-nums"
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
                      className="input-dark !py-1.5 !px-2 text-center font-semibold tabular-nums"
                    />
                  </div>
                </>
              )}

              <div className="col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleToggleSetComplete(currentExIdx, sIdx)}
                  className={`w-full py-2 rounded-xl font-medium text-xs flex items-center justify-center transition-all active:scale-95 ${
                    row.completed
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

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

      {restTimer.active && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 backdrop-blur-2xl px-5 py-4 shrink-0 animate-slide-up">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-emerald-400 font-medium block">
                Repos
              </span>
              <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
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
