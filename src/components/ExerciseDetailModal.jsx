import React from 'react';
import { X, Check, Plus, RefreshCw, Info } from 'lucide-react';
import ExerciseMotionVisual, { MuscleAnatomyBadge } from './ExerciseMotionVisual';
import { EQUIPMENT_OPTIONS } from '../data/workoutsData';

const EQUIPMENT_LABEL_MAP = Object.fromEntries(
  EQUIPMENT_OPTIONS.map((eq) => [eq.id, eq.label])
);

export default function ExerciseDetailModal({
  exercise,
  onClose,
  onSelectExercise,
  isSelected = false,
}) {
  if (!exercise) return null;

  const eqLabels = (exercise.equipmentTags || []).map(
    (id) => EQUIPMENT_LABEL_MAP[id] || id
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] card-elevated rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div>
            <span className="section-eyebrow block">Détail du mouvement</span>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
              {exercise.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <ExerciseMotionVisual exercise={exercise} size="hero" animated showAnatomy={false} />

          {/* Carte Anatomie & Matériel */}
          <div className="rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] p-4 flex items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <span className="section-eyebrow block">Groupes sollicités</span>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {exercise.muscle}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {eqLabels.map((lbl) => (
                  <span
                    key={lbl}
                    className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shrink-0">
              <MuscleAnatomyBadge muscleText={exercise.muscle} size={44} />
            </div>
          </div>

          {/* Protocole de séries */}
          <div className="grid grid-cols-3 gap-2.5 text-center tabular-nums">
            <div className="rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] p-3">
              <span className="section-eyebrow block">Séries</span>
              <span className="text-base font-semibold text-[var(--text-primary)] mt-0.5 block">
                {exercise.sets || 3}
              </span>
            </div>
            <div className="rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] p-3">
              <span className="section-eyebrow block">
                {exercise.type === 'timed' ? 'Durée' : 'Répétitions'}
              </span>
              <span className="text-base font-semibold text-emerald-400 mt-0.5 block">
                {exercise.type === 'timed'
                  ? `${exercise.durationSeconds || 40}s`
                  : exercise.targetReps || 10}
              </span>
            </div>
            <div className="rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] p-3">
              <span className="section-eyebrow block">Repos</span>
              <span className="text-base font-semibold text-[var(--text-primary)] mt-0.5 block">
                {exercise.restSeconds || 60}s
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="rounded-xl bg-[var(--bg-subtle)]/45 border border-[var(--border-subtle)] p-4 space-y-1">
              <span className="section-eyebrow block">Consigne d’exécution</span>
              <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                {exercise.cue ||
                  'Contrôle la phase excentrique sur 2 secondes, marque un point stable sans élan et expire lors de la poussée ou du tirage.'}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--bg-subtle)]/30 border border-[var(--border-subtle)] p-3.5 flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
              <Info className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
              <span>
                Conserve <strong className="text-[var(--text-primary)] font-medium">1 à 2 répétitions en réserve (RIR 1–2)</strong> et une amplitude complète sans compensation lombaire.
              </span>
            </div>

            {exercise.alternative && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-1">
                <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <span>
                  Variante équivalente :{' '}
                  <strong className="text-[var(--text-primary)] font-medium">
                    {exercise.alternative}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {onSelectExercise && (
            <button
              type="button"
              onClick={() => {
                onSelectExercise(exercise);
                onClose();
              }}
              className="btn-primary w-full"
            >
              {isSelected ? (
                <>
                  <Check className="w-4 h-4" />
                  Retirer de ma sélection
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Ajouter à ma séance
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
