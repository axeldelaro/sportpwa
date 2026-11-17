import React, { useState, useMemo, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { computeSubstitutions, normalizeText } from '../utils/substitutionEngine';

export default function SubstitutionModal({
  isOpen,
  sourceFoodId,
  initialGrams = 100,
  profile,
  onClose,
  onConfirmSwap,
}) {
  const [mode, setMode] = useState('dominant_macro');
  const [grams, setGrams] = useState(initialGrams || 100);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setGrams(initialGrams || 100);
      setSearchQuery('');
      setMode('dominant_macro');
    }
  }, [isOpen, sourceFoodId, initialGrams]);

  const result = useMemo(() => {
    if (!isOpen || !sourceFoodId) return null;
    return computeSubstitutions(sourceFoodId, grams, mode, profile, {
      includeRelatedGroups: true,
    });
  }, [isOpen, sourceFoodId, grams, mode, profile]);

  if (!isOpen || !result) return null;

  const { sourceFood, sourceGrams, sourceMacros, alternatives } = result;

  const filteredAlternatives = alternatives.filter((alt) => {
    if (!searchQuery.trim()) return true;
    return normalizeText(alt.food.name).includes(normalizeText(searchQuery));
  });

  const dominantNameMap = {
    protein: 'Mêmes protéines',
    carbs: 'Mêmes glucides',
    fat: 'Mêmes lipides',
    kcal: 'Mêmes calories',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[88vh] card-elevated rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Remplacer {sourceFood.name}
            </h2>
            <p className="text-xs text-[var(--text-muted)] tabular-nums mt-0.5">
              Référence : {sourceMacros.kcal} kcal · {sourceMacros.protein}g P ·{' '}
              {sourceMacros.carbs}g G · {sourceMacros.fat}g L
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border-subtle)] space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 flex-1 p-1 rounded-full bg-[var(--bg-subtle)]">
              <button
                type="button"
                onClick={() => setMode('dominant_macro')}
                className={`py-1.5 px-2.5 rounded-full text-xs font-medium transition-all ${
                  mode === 'dominant_macro'
                    ? 'bg-emerald-400 text-zinc-950 font-semibold'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {dominantNameMap[result.effectiveMacroKey] || 'Macro dominante'}
              </button>

              <button
                type="button"
                onClick={() => setMode('iso_kcal')}
                className={`py-1.5 px-2.5 rounded-full text-xs font-medium transition-all ${
                  mode === 'iso_kcal'
                    ? 'bg-emerald-400 text-zinc-950 font-semibold'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Iso-calorique
              </button>
            </div>

            <div className="inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-full px-3 py-1.5 shrink-0">
              <input
                type="number"
                min="5"
                max="1500"
                step="5"
                value={grams}
                onChange={(e) => setGrams(Math.max(5, Number(e.target.value) || 5))}
                className="w-12 bg-transparent text-right text-xs font-bold text-emerald-400 tabular-nums focus:outline-none"
              />
              <span className="text-xs text-[var(--text-muted)] ml-1">g</span>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer (ex: quinoa, patate douce, tofu...)"
              className="input-dark !pl-9 !py-2 text-xs"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-3 space-y-1.5 flex-1">
          {filteredAlternatives.length === 0 ? (
            <p className="text-center py-10 text-xs text-[var(--text-muted)]">
              Aucune alternative compatible avec tes filtres actifs.
            </p>
          ) : (
            filteredAlternatives.map((alt) => (
              <button
                key={alt.food.id}
                type="button"
                onClick={() => {
                  onConfirmSwap({
                    newFood: alt.food,
                    newGrams: alt.grams,
                    newMacros: alt.macros,
                    previousFood: sourceFood,
                    previousGrams: sourceGrams,
                  });
                  onClose();
                }}
                className="w-full text-left px-4 py-3 rounded-2xl hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-subtle)] transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      {alt.grams}g
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {alt.food.name}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      ({alt.food.state})
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5">
                    {alt.macros.kcal} kcal · {alt.macros.protein}g P · {alt.macros.carbs}g G ·{' '}
                    {alt.macros.fat}g L
                  </p>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <span className="text-xs font-medium text-[var(--text-secondary)] block">
                    {alt.deltaBadges.kcal}
                  </span>
                  <span className="text-[10.5px] text-[var(--text-muted)]">
                    {alt.deltaBadges.protein}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
