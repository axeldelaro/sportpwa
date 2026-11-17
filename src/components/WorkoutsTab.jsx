import React, { useState, useMemo } from 'react';
import {
  Play,
  ChevronDown,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import {
  WORKOUT_PROGRAMS,
  INTENSITY_MODES,
  EXERCISE_CATALOG,
} from '../data/workoutsData';

export default function WorkoutsTab({
  customWorkouts = [],
  workoutHistory = [],
  activeWorkoutSession,
  onStartWorkout,
  onResumeWorkout,
  onCreateCustomWorkout,
  onDeleteCustomWorkout,
  onDeleteHistoryEntry,
}) {
  const [subView, setSubView] = useState('programs'); // 'programs' | 'custom' | 'history'
  const [intensityMode, setIntensityMode] = useState('normal');
  const [expandedProgId, setExpandedProgId] = useState(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);

  const [showBuilder, setShowBuilder] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDuration, setCustomDuration] = useState(35);
  const [customExercises, setCustomExercises] = useState([]);
  const [newExForm, setNewExForm] = useState({
    name: '',
    type: 'reps',
    sets: 3,
    targetReps: 10,
    durationSeconds: 45,
    defaultWeightKg: 0,
    restSeconds: 60,
    muscle: 'Full Body',
    cue: 'Exécution contrôlée.',
  });

  const [rmWeight, setRmWeight] = useState(60);
  const [rmReps, setRmReps] = useState(8);

  const estimated1RM = useMemo(() => {
    const w = Number(rmWeight) || 0;
    const r = Math.max(1, Math.min(30, Number(rmReps) || 1));
    return r === 1 ? Math.round(w) : Math.round(w * (1 + r / 30));
  }, [rmWeight, rmReps]);

  const addExerciseFromCatalog = (catalogEx) => {
    setCustomExercises((prev) => [
      ...prev,
      {
        ...catalogEx,
        id: `cex_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      },
    ]);
  };

  const handleAddManualExercise = () => {
    if (!newExForm.name.trim()) return;
    setCustomExercises((prev) => [
      ...prev,
      {
        ...newExForm,
        id: `cex_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        sets: Math.max(1, Number(newExForm.sets) || 3),
        targetReps: Math.max(1, Number(newExForm.targetReps) || 10),
        durationSeconds: Math.max(10, Number(newExForm.durationSeconds) || 40),
        defaultWeightKg: Math.max(0, Number(newExForm.defaultWeightKg) || 0),
        restSeconds: Math.max(10, Number(newExForm.restSeconds) || 60),
      },
    ]);
    setNewExForm((prev) => ({ ...prev, name: '' }));
  };

  const handleSaveNewWorkout = async (e) => {
    e.preventDefault();
    if (!customTitle.trim() || customExercises.length === 0) return;
    const muscles = Array.from(new Set(customExercises.map((ex) => ex.muscle))).slice(0, 4);
    await onCreateCustomWorkout({
      title: customTitle.trim(),
      durationMin: Math.max(10, Number(customDuration) || 35),
      targetMuscles: muscles,
      equipment: 'Personnalisé',
      exercises: customExercises,
    });
    setCustomTitle('');
    setCustomExercises([]);
    setShowBuilder(false);
  };

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {activeWorkoutSession && (
        <div className="card-surface p-4 flex items-center justify-between gap-3 border-emerald-500/25">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-emerald-400">Session en pause</p>
            <p className="text-sm font-semibold text-zinc-50 truncate">
              {activeWorkoutSession.workoutTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onResumeWorkout}
            className="btn-accent !py-2 !px-4 !text-xs shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />
            Reprendre
          </button>
        </div>
      )}

      {/* Contrôle segmenté épuré */}
      <div className="grid grid-cols-3 p-1 rounded-full bg-zinc-900/90 border border-white/[0.06]">
        {[
          { id: 'programs', label: 'Programmes' },
          { id: 'custom', label: `Sur-mesure (${customWorkouts.length})` },
          { id: 'history', label: 'Historique' },
        ].map((tab) => {
          const active = subView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`py-2 px-2 rounded-full text-xs font-medium transition-all ${
                active
                  ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sélecteur d'intensité discret en 1 ligne */}
      {subView !== 'history' && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-zinc-500">Intensité</span>
          <div className="inline-flex items-center gap-1 bg-zinc-900/80 p-1 rounded-full border border-white/[0.05]">
            {INTENSITY_MODES.map((m) => {
              const selected = intensityMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setIntensityMode(m.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                    selected
                      ? 'bg-emerald-400 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={m.description}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 1 : LES 7 PROGRAMMES UNIVERSELS                        */}
      {/* ========================================================= */}
      {subView === 'programs' && (
        <div className="space-y-3">
          {WORKOUT_PROGRAMS.map((prog) => {
            const isExpanded = expandedProgId === prog.id;

            return (
              <div key={prog.id} className="card-surface overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedProgId(isExpanded ? null : prog.id)}
                  className="w-full p-5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="text-emerald-400 font-medium">
                        {prog.category}
                      </span>
                      <span>·</span>
                      <span>{prog.frequency}</span>
                      <span>·</span>
                      <span>{prog.workouts.length} séances</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-zinc-50 mt-1">
                      {prog.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{prog.subtitle}</p>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-zinc-200' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t border-white/[0.04] pt-3">
                    {prog.workouts.map((wk) => {
                      const detailsOpen = expandedWorkoutId === wk.id;
                      return (
                        <div
                          key={wk.id}
                          className="rounded-2xl bg-zinc-950/70 border border-white/[0.06] p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-zinc-100">
                                {wk.title}
                              </h4>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {wk.durationMin} min · {wk.exercises.length} exercices
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onStartWorkout(
                                  { ...wk, programId: prog.id, programTitle: prog.title },
                                  intensityMode
                                )
                              }
                              className="btn-primary !py-2 !px-4 !text-xs shrink-0"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Démarrer
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <p className="text-[11px] text-zinc-500 truncate">
                              {wk.targetMuscles.join(' · ')}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedWorkoutId(detailsOpen ? null : wk.id)
                              }
                              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 shrink-0 ml-3"
                            >
                              {detailsOpen ? 'Masquer' : 'Aperçu'}
                            </button>
                          </div>

                          {detailsOpen && (
                            <div className="pt-2.5 border-t border-white/[0.05] space-y-1.5">
                              {wk.exercises.map((ex, idx) => (
                                <div
                                  key={ex.id}
                                  className="py-1.5 flex items-center justify-between gap-3 text-xs"
                                >
                                  <span className="text-zinc-300 truncate">
                                    <span className="text-zinc-500 mr-1.5">{idx + 1}.</span>
                                    {ex.name}
                                  </span>
                                  <span className="shrink-0 text-zinc-400 tabular-nums font-medium">
                                    {ex.sets} ×{' '}
                                    {ex.type === 'timed'
                                      ? `${ex.durationSeconds}s`
                                      : `${ex.targetReps}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 2 : SÉANCES SUR-MESURE                                 */}
      {/* ========================================================= */}
      {subView === 'custom' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowBuilder((v) => !v)}
            className="btn-primary w-full"
          >
            <Plus className="w-4 h-4" />
            {showBuilder ? 'Fermer l’éditeur' : 'Nouvelle séance sur-mesure'}
          </button>

          {showBuilder && (
            <form
              onSubmit={handleSaveNewWorkout}
              className="card-surface p-5 space-y-4"
            >
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: Full Body Maison"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="input-dark tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Choisir dans le catalogue ({EXERCISE_CATALOG.length} exercices)
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const ex = EXERCISE_CATALOG.find((item) => item.id === e.target.value);
                    if (ex) addExerciseFromCatalog(ex);
                    e.target.value = '';
                  }}
                  className="input-dark"
                >
                  <option value="" disabled>
                    Sélectionner un exercice...
                  </option>
                  {EXERCISE_CATALOG.map((ex) => (
                    <option key={ex.id} value={ex.id} className="bg-zinc-900">
                      {ex.name} — {ex.muscle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/[0.06] space-y-2.5">
                <p className="text-xs font-medium text-zinc-400">
                  Ou créer un exercice libre
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newExForm.name}
                    onChange={(e) => setNewExForm({ ...newExForm, name: e.target.value })}
                    placeholder="Nom de l'exercice"
                    className="input-dark !py-2 text-xs"
                  />
                  <select
                    value={newExForm.type}
                    onChange={(e) => setNewExForm({ ...newExForm, type: e.target.value })}
                    className="input-dark !py-2 text-xs"
                  >
                    <option value="reps" className="bg-zinc-900">
                      Répétitions
                    </option>
                    <option value="timed" className="bg-zinc-900">
                      Chronométré (sec)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newExForm.sets}
                    onChange={(e) => setNewExForm({ ...newExForm, sets: e.target.value })}
                    placeholder="Séries"
                    className="input-dark !py-2 text-xs tabular-nums"
                  />
                  {newExForm.type === 'reps' ? (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newExForm.targetReps}
                      onChange={(e) =>
                        setNewExForm({ ...newExForm, targetReps: e.target.value })
                      }
                      placeholder="Reps"
                      className="input-dark !py-2 text-xs tabular-nums"
                    />
                  ) : (
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="5"
                      value={newExForm.durationSeconds}
                      onChange={(e) =>
                        setNewExForm({ ...newExForm, durationSeconds: e.target.value })
                      }
                      placeholder="Sec"
                      className="input-dark !py-2 text-xs tabular-nums"
                    />
                  )}
                  <input
                    type="number"
                    min="10"
                    max="300"
                    step="5"
                    value={newExForm.restSeconds}
                    onChange={(e) =>
                      setNewExForm({ ...newExForm, restSeconds: e.target.value })
                    }
                    placeholder="Repos"
                    className="input-dark !py-2 text-xs tabular-nums"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddManualExercise}
                  className="btn-secondary w-full !py-1.5 !text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter l’exercice
                </button>
              </div>

              {customExercises.length > 0 && (
                <div className="space-y-1.5">
                  {customExercises.map((ex, i) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-zinc-900 border border-white/[0.06] text-xs"
                    >
                      <span className="text-zinc-200 truncate">
                        {i + 1}. {ex.name} ({ex.sets} ×{' '}
                        {ex.type === 'timed' ? `${ex.durationSeconds}s` : ex.targetReps})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomExercises((prev) => prev.filter((item) => item.id !== ex.id))
                        }
                        className="text-zinc-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={!customTitle.trim() || customExercises.length === 0}
                className="btn-accent w-full"
              >
                <Check className="w-4 h-4" />
                Enregistrer la séance
              </button>
            </form>
          )}

          {customWorkouts.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <p className="text-sm font-medium text-zinc-300">
                Aucune séance sur-mesure
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Crée tes propres routines à partir de plus de {EXERCISE_CATALOG.length} exercices.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {customWorkouts.map((wk) => (
                <div
                  key={wk.id}
                  className="card-surface p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-100 truncate">
                      {wk.title}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {wk.exercises?.length || 0} exercices · {wk.durationMin} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDeleteCustomWorkout(wk.id)}
                      className="p-2 rounded-full text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartWorkout(wk, intensityMode)}
                      className="btn-primary !py-2 !px-4 !text-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Démarrer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 3 : HISTORIQUE & ESTIMATEUR 1RM                        */}
      {/* ========================================================= */}
      {subView === 'history' && (
        <div className="space-y-4">
          <div className="card-surface p-5 space-y-3.5">
            <span className="text-xs font-medium text-zinc-400">
              Estimateur 1RM (Force max)
            </span>
            <div className="grid grid-cols-3 gap-2.5 items-end">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Charge (kg)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={rmWeight}
                  onChange={(e) => setRmWeight(e.target.value)}
                  className="input-dark !py-2 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Reps</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={rmReps}
                  onChange={(e) => setRmReps(e.target.value)}
                  className="input-dark !py-2 tabular-nums"
                />
              </div>
              <div className="bg-zinc-950/80 border border-white/[0.08] rounded-2xl p-2 text-center">
                <span className="block text-[10px] text-zinc-500">1RM</span>
                <span className="text-base font-bold text-emerald-400 tabular-nums">
                  {estimated1RM} kg
                </span>
              </div>
            </div>
          </div>

          {workoutHistory.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <p className="text-sm font-medium text-zinc-300">Historique vide</p>
              <p className="text-xs text-zinc-500 mt-1">
                Tes séances validées apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {workoutHistory.map((item) => (
                <div
                  key={item.id}
                  className="card-surface p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-500">
                      {item.date} · {Math.max(1, Math.round((item.durationSec || 60) / 60))} min
                    </p>
                    <h4 className="text-sm font-semibold text-zinc-100 truncate mt-0.5">
                      {item.title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                      {item.completedSets} séries
                      {item.totalVolumeKg > 0
                        ? ` · ${item.totalVolumeKg.toLocaleString('fr-FR')} kg soulevés`
                        : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteHistoryEntry(item.id)}
                    className="p-2 rounded-full text-zinc-500 hover:text-rose-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
