import React, { useState, useMemo } from 'react';
import {
  Play,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  SlidersHorizontal,
  Search,
  X,
  BookmarkPlus,
} from 'lucide-react';
import {
  WORKOUT_PROGRAMS,
  INTENSITY_MODES,
  EXERCISE_CATALOG,
  EQUIPMENT_OPTIONS,
  DISCIPLINE_CATEGORIES,
  MUSCLE_FILTER_GROUPS,
  matchesSelectedEquipment,
} from '../data/workoutsData';
import { normalizeText } from '../utils/substitutionEngine';
import { tr } from '../i18n/translations';
import ExerciseMotionVisual from './ExerciseMotionVisual';
import ExerciseDetailModal from './ExerciseDetailModal';

const EQUIPMENT_LABEL_MAP = Object.fromEntries(
  EQUIPMENT_OPTIONS.map((eq) => [eq.id, eq.label])
);

export default function WorkoutsTab({
  lang = 'fr',
  profile,
  onUpdatePreferredEquipment,
  customWorkouts = [],
  workoutHistory = [],
  activeWorkoutSession,
  onStartWorkout,
  onResumeWorkout,
  onCreateCustomWorkout,
  onDeleteCustomWorkout,
  onDeleteHistoryEntry,
}) {
  const [subView, setSubView] = useState('programs'); // 'programs' | 'exercises' | 'custom' | 'history'
  const [intensityMode, setIntensityMode] = useState('normal');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [equipmentDrawerOpen, setEquipmentDrawerOpen] = useState(false);

  const [expandedProgId, setExpandedProgId] = useState(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);
  const [inspectedExercise, setInspectedExercise] = useState(null);

  // Sélection rapide d'exercices au pouce depuis l'onglet "Exercices"
  const [quickPickIds, setQuickPickIds] = useState([]);

  // Éditeur séance sur-mesure
  const [showBuilder, setShowBuilder] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDuration, setCustomDuration] = useState(35);
  const [customExercises, setCustomExercises] = useState([]);
  const [builderSearch, setBuilderSearch] = useState('');
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

  const selectedEquipment = profile?.preferredEquipment || [];

  const toggleEquipmentId = (eqId) => {
    if (!onUpdatePreferredEquipment) return;
    const exists = selectedEquipment.includes(eqId);
    const next = exists
      ? selectedEquipment.filter((id) => id !== eqId)
      : [...selectedEquipment, eqId];
    onUpdatePreferredEquipment(next);
  };

  const applyEquipmentPreset = (ids) => {
    if (onUpdatePreferredEquipment) onUpdatePreferredEquipment(ids);
  };

  const estimated1RM = useMemo(() => {
    const w = Number(rmWeight) || 0;
    const r = Math.max(1, Math.min(30, Number(rmReps) || 1));
    return r === 1 ? Math.round(w) : Math.round(w * (1 + r / 30));
  }, [rmWeight, rmReps]);

  // Filtrage intelligent des Programmes selon Discipline + Matériel sélectionné
  const filteredPrograms = useMemo(() => {
    return WORKOUT_PROGRAMS.filter((prog) => {
      if (disciplineFilter !== 'all' && prog.discipline !== disciplineFilter) {
        return false;
      }
      if (!matchesSelectedEquipment(prog.equipmentTags, selectedEquipment)) {
        return false;
      }
      return true;
    });
  }, [disciplineFilter, selectedEquipment]);

  // Filtrage intelligent du Catalogue d'Exercices (Discipline + Matériel + Muscle + Recherche)
  const filteredExercises = useMemo(() => {
    const q = normalizeText(exerciseSearch);
    return EXERCISE_CATALOG.filter((ex) => {
      if (disciplineFilter !== 'all' && ex.discipline !== disciplineFilter) {
        return false;
      }
      if (muscleFilter !== 'all' && ex.muscleGroup !== muscleFilter) {
        return false;
      }
      if (!matchesSelectedEquipment(ex.equipmentTags, selectedEquipment)) {
        return false;
      }
      if (q) {
        const hay = normalizeText(`${ex.name} ${ex.muscle} ${ex.cue || ''}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [disciplineFilter, muscleFilter, selectedEquipment, exerciseSearch]);

  const builderCatalogMatches = useMemo(() => {
    const q = normalizeText(builderSearch);
    return EXERCISE_CATALOG.filter((ex) => {
      if (!matchesSelectedEquipment(ex.equipmentTags, selectedEquipment)) return false;
      if (!q) return true;
      return normalizeText(`${ex.name} ${ex.muscle}`).includes(q);
    }).slice(0, 35);
  }, [builderSearch, selectedEquipment]);

  const toggleQuickPickExercise = (exId) => {
    setQuickPickIds((prev) =>
      prev.includes(exId) ? prev.filter((id) => id !== exId) : [...prev, exId]
    );
  };

  const handleLaunchQuickPickWorkout = () => {
    const picked = quickPickIds
      .map((id) => EXERCISE_CATALOG.find((ex) => ex.id === id))
      .filter(Boolean);
    if (picked.length === 0) return;

    onStartWorkout(
      {
        id: `quick_${Date.now()}`,
        title: `Séance Express (${picked.length} ex.)`,
        durationMin: picked.length * 7,
        targetMuscles: Array.from(new Set(picked.map((p) => p.muscle))).slice(0, 3),
        exercises: picked,
      },
      intensityMode
    );
    setQuickPickIds([]);
  };

  const handleSaveQuickPickToCustom = async () => {
    const picked = quickPickIds
      .map((id) => EXERCISE_CATALOG.find((ex) => ex.id === id))
      .filter(Boolean);
    if (picked.length === 0) return;

    const title = window.prompt(
      'Nom de cette séance personnalisée :',
      `Ma séance (${picked.length} ex.)`
    );
    if (!title || !title.trim()) return;

    await onCreateCustomWorkout({
      title: title.trim(),
      durationMin: Math.max(15, picked.length * 7),
      targetMuscles: Array.from(new Set(picked.map((p) => p.muscle))).slice(0, 4),
      equipment: 'Sur-mesure',
      exercises: picked.map((ex, idx) => ({
        ...ex,
        id: `cex_${Date.now()}_${idx}`,
      })),
    });
    setQuickPickIds([]);
    setSubView('custom');
  };

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
    <div className="space-y-3.5 pb-12 animate-fade-in">
      {activeWorkoutSession && (
        <div className="card-surface p-4 flex items-center justify-between gap-3 border-emerald-400/30">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-emerald-400">
              {tr(lang, 'session_paused')}
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {activeWorkoutSession.workoutTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onResumeWorkout}
            className="btn-accent !py-2 !px-4 !text-xs shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />
            {tr(lang, 'resume')}
          </button>
        </div>
      )}

      {/* Navigation segmentée tactile à 4 vues */}
      <div className="grid grid-cols-4 seg-control">
        {[
          { id: 'programs', label: tr(lang, 'tab_programs') },
          { id: 'exercises', label: 'Exercices' },
          {
            id: 'custom',
            label: customWorkouts.length > 0 ? `Perso (${customWorkouts.length})` : 'Perso',
          },
          { id: 'history', label: tr(lang, 'tab_history') },
        ].map((tab) => {
          const active = subView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`py-2 px-1.5 truncate seg-item ${
                active ? 'seg-item-active' : ''
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Barre compacte : Disciplines + Bouton Matériel */}
      {(subView === 'programs' || subView === 'exercises') && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {DISCIPLINE_CATEGORIES.map((cat) => {
                const active = disciplineFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDisciplineFilter(cat.id)}
                    className={active ? 'chip-active' : 'chip'}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setEquipmentDrawerOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition-colors ${
                selectedEquipment.length > 0
                  ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-400'
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
              title="Filtrer selon ton matériel disponible"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                Matériel{selectedEquipment.length > 0 ? ` (${selectedEquipment.length})` : ''}
              </span>
            </button>
          </div>

          {/* Sélecteur discret d'intensité / énergie du jour */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {subView === 'programs'
                ? `${filteredPrograms.length} programmes`
                : `${filteredExercises.length} exercices`}
            </span>

            <div className="inline-flex items-center gap-0.5 seg-control">
              {INTENSITY_MODES.map((m) => {
                const selected = intensityMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setIntensityMode(m.id)}
                    className={`px-2.5 py-1 !text-[11px] seg-item ${
                      selected ? 'seg-item-active' : ''
                    }`}
                    title={m.description}
                  >
                    {m.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VUE 1 : PROGRAMMES COMPLETS FILTRÉS PAR DISCIPLINE & MATÉRIEL       */}
      {/* =================================================================== */}
      {subView === 'programs' && (
        <div className="space-y-3">
          {filteredPrograms.length === 0 ? (
            <div className="card-surface p-6 text-center space-y-2.5">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Aucun programme pour cette combinaison
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Ajuste ton matériel ou passe sur l’onglet « Exercices » pour composer ta séance en 1 clic.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDisciplineFilter('all');
                  applyEquipmentPreset([]);
                }}
                className="btn-secondary !py-1.5 !px-4 !text-xs"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            filteredPrograms.map((prog) => {
              const isExpanded = expandedProgId === prog.id;

              return (
                <div key={prog.id} className="card-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedProgId(isExpanded ? null : prog.id)}
                    className="w-full p-5 flex items-center justify-between gap-3 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] flex-wrap">
                        <span className="text-emerald-400 font-medium">{prog.category}</span>
                        <span>·</span>
                        <span>{prog.frequency}</span>
                        <span>·</span>
                        <span>{prog.workouts.length} séances</span>
                      </div>
                      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mt-1">
                        {prog.title}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {prog.subtitle}
                      </p>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-[var(--text-primary)]' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                      {prog.workouts.map((wk) => {
                        const detailsOpen = expandedWorkoutId === wk.id;
                        return (
                          <div
                            key={wk.id}
                            className="rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] p-4 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                                  {wk.title}
                                </h4>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                  {wk.durationMin} min · {wk.exercises.length} ex. ·{' '}
                                  <span className="text-[var(--text-secondary)]">
                                    {wk.equipment}
                                  </span>
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
                                {tr(lang, 'start')}
                              </button>
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                              <p className="text-[11px] text-[var(--text-muted)] truncate">
                                {wk.targetMuscles.join(' · ')}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedWorkoutId(detailsOpen ? null : wk.id)
                                }
                                className="text-[11px] font-medium text-[var(--text-secondary)] underline shrink-0 ml-3"
                              >
                                {detailsOpen ? tr(lang, 'hide') : tr(lang, 'preview')}
                              </button>
                            </div>

                            {detailsOpen && (
                              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                                {wk.exercises.map((ex, idx) => (
                                  <div
                                    key={ex.id}
                                    onClick={() => setInspectedExercise(ex)}
                                    className="py-1.5 px-2 rounded-xl hover:bg-[var(--bg-app)]/60 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <ExerciseMotionVisual
                                        exercise={ex}
                                        size="thumb"
                                        animated={false}
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-[var(--text-primary)] truncate">
                                          {idx + 1}. {ex.name}
                                        </p>
                                        <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                                          {ex.muscle} · Toucher pour voir l’exécution
                                        </p>
                                      </div>
                                    </div>
                                    <span className="shrink-0 text-[var(--text-secondary)] font-mono font-bold">
                                      {ex.sets}×
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
            })
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VUE 2 : EXPLORATEUR D'EXERCICES PAR CATÉGORIE, MUSCLE & MATÉRIEL    */}
      {/* =================================================================== */}
      {subView === 'exercises' && (
        <div className="space-y-3">
          {/* Recherche + Filtre Groupe Musculaire */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Chercher un exercice (tractions, dips, élastique, squat...)"
              className="input-dark !pl-10 !pr-8 !py-2.5 text-xs"
            />
            {exerciseSearch && (
              <button
                type="button"
                onClick={() => setExerciseSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {MUSCLE_FILTER_GROUPS.map((m) => {
              const active = muscleFilter === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMuscleFilter(m.id)}
                  className={active ? 'chip-active !py-1 !px-2.5 !text-[11px]' : 'chip !py-1 !px-2.5 !text-[11px]'}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {filteredExercises.length === 0 ? (
            <div className="card-surface p-6 text-center space-y-2">
              <p className="text-xs text-[var(--text-muted)]">
                Aucun exercice ne correspond à ces filtres.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDisciplineFilter('all');
                  setMuscleFilter('all');
                  setExerciseSearch('');
                  applyEquipmentPreset([]);
                }}
                className="btn-secondary !py-1.5 !px-3.5 !text-xs"
              >
                Tout réafficher
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 pb-14">
              {filteredExercises.map((ex) => {
                const picked = quickPickIds.includes(ex.id);
                const eqLabels = (ex.equipmentTags || [])
                  .slice(0, 1)
                  .map((id) => EQUIPMENT_LABEL_MAP[id] || id)
                  .join('');

                return (
                  <div
                    key={ex.id}
                    onClick={() => setInspectedExercise(ex)}
                    className={`card-surface p-3.5 flex items-center justify-between gap-3.5 cursor-pointer transition-all ${
                      picked ? 'border-emerald-400/50 bg-emerald-400/5' : ''
                    }`}
                  >
                    <ExerciseMotionVisual exercise={ex} size="thumb" animated />

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-1">
                        {ex.name}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                        {ex.muscle}
                        {eqLabels ? ` · ${eqLabels}` : ''}
                      </p>
                      <span className="inline-block text-[11px] tabular-nums font-medium text-[var(--text-muted)] mt-0.5">
                        {ex.sets} × {ex.type === 'timed' ? `${ex.durationSeconds}s` : `${ex.targetReps} reps`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleQuickPickExercise(ex.id);
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        picked
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                      aria-label="Sélectionner l'exercice"
                    >
                      {picked ? <Check className="w-4 h-4 stroke-[2.4]" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barre flottante ergonomique dès qu'on coche des exercices */}
          {quickPickIds.length > 0 && (
            <div className="fixed bottom-[4.25rem] left-4 right-4 max-w-md mx-auto z-30 card-elevated p-2.5 pl-3.5 flex items-center justify-between gap-2 animate-slide-up">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                  {quickPickIds.length}
                </span>
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                  sélectionné{quickPickIds.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveQuickPickToCustom}
                  className="btn-secondary !py-2 !px-3 !text-xs"
                  title="Enregistrer dans mes séances perso"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xs:inline">Sauver</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchQuickPickWorkout}
                  className="btn-accent !py-2 !px-3.5 !text-xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Démarrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VUE 3 : SÉANCES SUR-MESURE                                          */}
      {/* =================================================================== */}
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
            <form onSubmit={handleSaveNewWorkout} className="card-surface p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: Callisthénie & Élastiques"
                    className="input-dark !py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="input-dark !py-2 text-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Recherche rapide dans le catalogue filtré par ton matériel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[var(--text-secondary)] font-medium">
                    Ajouter depuis le catalogue ({EXERCISE_CATALOG.length} ex.)
                  </label>
                  <button
                    type="button"
                    onClick={() => setEquipmentDrawerOpen(true)}
                    className="text-[11px] text-emerald-400 underline"
                  >
                    Filtrer matériel
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={builderSearch}
                    onChange={(e) => setBuilderSearch(e.target.value)}
                    placeholder="Chercher (chaise romaine, élastique, dips, curl...)"
                    className="input-dark !pl-9 !py-2 text-xs"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-2xl bg-[var(--bg-subtle)]/70 p-1.5 space-y-1">
                  {builderCatalogMatches.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => addExerciseFromCatalog(ex)}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-xs hover:bg-[var(--bg-app)] flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-[var(--text-primary)]">{ex.name}</span>
                      <span className="text-[11px] text-emerald-400 font-medium shrink-0">
                        + Ajouter
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-2.5">
                <p className="text-xs font-medium text-[var(--text-secondary)]">
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
                    <option value="reps" className="bg-zinc-900 text-white">
                      Répétitions
                    </option>
                    <option value="timed" className="bg-zinc-900 text-white">
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
                  Ajouter l’exercice libre
                </button>
              </div>

              {customExercises.length > 0 && (
                <div className="space-y-1.5">
                  {customExercises.map((ex, i) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[var(--bg-subtle)] text-xs"
                    >
                      <span className="text-[var(--text-primary)] truncate">
                        {i + 1}. {ex.name} ({ex.sets} ×{' '}
                        {ex.type === 'timed' ? `${ex.durationSeconds}s` : ex.targetReps})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomExercises((prev) =>
                            prev.filter((item) => item.id !== ex.id)
                          )
                        }
                        className="text-[var(--text-muted)] hover:text-rose-400 p-1"
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
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Aucune séance sur-mesure
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Coche des mouvements dans l’onglet « Exercices » ou utilise l’éditeur ci-dessus.
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
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {wk.title}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {wk.exercises?.length || 0} exercices · {wk.durationMin} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDeleteCustomWorkout(wk.id)}
                      className="p-2 rounded-full text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartWorkout(wk, intensityMode)}
                      className="btn-primary !py-2 !px-4 !text-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {tr(lang, 'start')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VUE 4 : HISTORIQUE & CALCULATEUR 1RM                                */}
      {/* =================================================================== */}
      {subView === 'history' && (
        <div className="space-y-4">
          <div className="card-surface p-5 space-y-3.5">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Estimateur 1RM (Formule d’Epley)
            </span>
            <div className="grid grid-cols-3 gap-2.5 items-end">
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  Charge (kg)
                </label>
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
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  Reps
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={rmReps}
                  onChange={(e) => setRmReps(e.target.value)}
                  className="input-dark !py-2 tabular-nums"
                />
              </div>
              <div className="bg-[var(--bg-subtle)] rounded-2xl p-2 text-center">
                <span className="block text-[10px] text-[var(--text-muted)]">1RM</span>
                <span className="text-base font-bold text-emerald-400 tabular-nums">
                  {estimated1RM} kg
                </span>
              </div>
            </div>
          </div>

          {workoutHistory.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Historique vide
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
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
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {item.date} · {Math.max(1, Math.round((item.durationSec || 60) / 60))} min
                    </p>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate mt-0.5">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
                      {item.completedSets} séries
                      {item.totalVolumeKg > 0
                        ? ` · ${item.totalVolumeKg.toLocaleString('fr-FR')} kg soulevés`
                        : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteHistoryEntry(item.id)}
                    className="p-2 rounded-full text-[var(--text-muted)] hover:text-rose-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TIROIR MATÉRIEL DISPONIBLE (14 ÉQUIPEMENTS MÉMORISÉS SUR LE PROFIL) */}
      {/* =================================================================== */}
      {equipmentDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md max-h-[86vh] card-elevated rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Matériel disponible
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Mémorisé sur ton profil · Filtre programmes & exercices
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEquipmentDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {/* Préréglages 1 clic */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => applyEquipmentPreset([])}
                  className={selectedEquipment.length === 0 ? 'chip-active' : 'chip'}
                >
                  Tout afficher
                </button>
                <button
                  type="button"
                  onClick={() => applyEquipmentPreset(['none'])}
                  className="chip"
                >
                  Sans matériel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyEquipmentPreset([
                      'none',
                      'bands',
                      'roman_chair',
                      'pullup_bar',
                      'dip_bars',
                      'trx_rings',
                    ])
                  }
                  className="chip"
                >
                  Parc / Élastiques
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyEquipmentPreset([
                      'none',
                      'dumbbells',
                      'kettlebell',
                      'bands',
                      'bench',
                    ])
                  }
                  className="chip"
                >
                  Maison
                </button>
              </div>

              {/* Grille épurée des 14 équipements */}
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const checked = selectedEquipment.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => toggleEquipmentId(eq.id)}
                      className={`p-3 rounded-xl border text-left text-xs font-medium flex items-center justify-between gap-2 transition-all ${
                        checked
                          ? 'bg-emerald-400/15 border-emerald-400/40 text-[var(--text-primary)]'
                          : 'bg-[var(--bg-subtle)]/50 border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <span className="leading-snug">{eq.label}</span>
                      {checked && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setEquipmentDrawerOpen(false)}
                className="btn-primary w-full"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODALE FICHE BIOMÉCANIQUE & EXÉCUTION ANIMÉE */}
      {inspectedExercise && (
        <ExerciseDetailModal
          exercise={inspectedExercise}
          onClose={() => setInspectedExercise(null)}
          isSelected={quickPickIds.includes(inspectedExercise.id)}
          onSelectExercise={(ex) => toggleQuickPickExercise(ex.id)}
        />
      )}
    </div>
  );
}
