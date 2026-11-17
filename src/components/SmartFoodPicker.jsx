import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ScanBarcode,
  Globe,
  Loader2,
  X,
  Plus,
  Ban,
} from 'lucide-react';
import {
  getAllFoods,
  calculateFoodMacros,
  isFoodCompatibleWithProfile,
  isFoodDislikedByProfile,
} from '../data/foodDatabase';
import { normalizeText } from '../utils/substitutionEngine';
import {
  searchOpenFoodFacts,
  fetchProductByBarcode,
} from '../utils/openFoodFactsService';

const FOOD_GROUP_PILLS = [
  { id: 'all', label: 'Tout' },
  { id: 'proteines', label: 'Protéines', groups: ['proteines_maigres', 'proteines_lipides'] },
  { id: 'fruits_legumes', label: 'Fruits & Légumes', groups: ['fruits', 'legumes'] },
  { id: 'feculents', label: 'Féculents & Farines', groups: ['glucides_complexes', 'legumineuses'] },
  { id: 'laitages', label: 'Laitages & Fromages', groups: ['laitiers_boissons'] },
  { id: 'condiments', label: 'Condiments & Sauces', groups: ['condiments_epicerie'] },
  { id: 'lipides', label: 'Oléagineux & Lipides', groups: ['lipides_sains'] },
];

const QUICK_GRAM_PRESETS = [15, 30, 50, 100, 150, 200];

export default function SmartFoodPicker({
  profile,
  lang = 'fr',
  onSelectFoodWithGrams,
  onCacheExternalFood,
  onToggleDislikedFood,
  actionLabel = 'Ajouter',
  compact = false,
}) {
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [remoteFoods, setRemoteFoods] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeVal, setBarcodeVal] = useState('');

  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState(100);

  // Recherche temps réel automatique Open Food Facts (3M+ produits) dès 2 lettres
  useEffect(() => {
    if (query.trim().length < 2) {
      setRemoteFoods([]);
      setRemoteLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setRemoteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchOpenFoodFacts(query.trim(), lang, controller.signal);
        setRemoteFoods(
          found.filter((f) => isFoodCompatibleWithProfile(f, profile)).slice(0, 12)
        );
      } catch {
        // Repli silencieux hors-ligne sur les 250+ aliments locaux
      } finally {
        setRemoteLoading(false);
      }
    }, 360);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, lang, profile]);

  const localFoods = useMemo(() => {
    const all = getAllFoods().filter((f) =>
      isFoodCompatibleWithProfile(f, profile, { ignoreDislikes: Boolean(query.trim()) })
    );

    const activePill = FOOD_GROUP_PILLS.find((p) => p.id === groupFilter);
    const byGroup =
      activePill && activePill.groups
        ? all.filter((f) => activePill.groups.includes(f.swapGroup))
        : all;

    if (!query.trim()) {
      return byGroup.slice(0, 80);
    }

    const q = normalizeText(query);
    const tokens = q.split(' ').filter((t) => t.length >= 2);

    return byGroup
      .map((f) => {
        const normName = normalizeText(f.name);
        let score = 0;
        if (normName === q) score += 100;
        else if (normName.startsWith(q)) score += 75;
        else if (normName.includes(q)) score += 50;
        tokens.forEach((t) => {
          if (normName.includes(t)) score += 20;
        });
        return { f, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.f);
  }, [profile, groupFilter, query]);

  const activeFood = selectedFood || localFoods[0] || remoteFoods[0] || null;

  useEffect(() => {
    if (!selectedFood && localFoods[0]) {
      setGrams(localFoods[0].defaultGrams || 100);
    }
  }, [localFoods, selectedFood]);

  const previewMacros = useMemo(
    () => calculateFoodMacros(activeFood, grams),
    [activeFood, grams]
  );

  const handleBarcodeLookup = async (e) => {
    e.preventDefault();
    if (!barcodeVal.trim()) return;
    setRemoteLoading(true);
    try {
      const prod = await fetchProductByBarcode(barcodeVal.trim());
      if (prod) {
        if (onCacheExternalFood) await onCacheExternalFood(prod);
        setSelectedFood(prod);
        setGrams(prod.defaultGrams || 100);
        setBarcodeOpen(false);
        setBarcodeVal('');
      } else {
        alert('Aucun produit trouvé pour ce code-barres.');
      }
    } catch {
      alert('Recherche code-barres indisponible hors-ligne.');
    } finally {
      setRemoteLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!activeFood) return;
    if (activeFood.sourceRef === 'Open Food Facts' && onCacheExternalFood) {
      await onCacheExternalFood(activeFood);
    }
    const cleanGrams = Math.max(1, Math.round(Number(grams) || activeFood.defaultGrams || 100));
    onSelectFoodWithGrams(activeFood, cleanGrams);
  };

  return (
    <div className="space-y-3">
      {/* Barre de recherche universelle + Code-barres */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedFood(null);
            }}
            placeholder="Chercher un ingrédient (citron, poulet, farine, yaourt...)"
            className="input-dark !pl-10 !pr-8 !py-2.5 text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedFood(null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setBarcodeOpen((v) => !v)}
          className="btn-secondary !py-2.5 !px-3 !text-xs shrink-0"
          title="Code-barres EAN"
        >
          <ScanBarcode className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {barcodeOpen && (
        <form onSubmit={handleBarcodeLookup} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={barcodeVal}
            onChange={(e) => setBarcodeVal(e.target.value)}
            placeholder="Code-barres EAN-13 (ex: 3017620422003)"
            className="input-dark !py-2 text-xs tabular-nums"
          />
          <button type="submit" className="btn-accent !py-2 !px-3.5 !text-xs shrink-0">
            OK
          </button>
        </form>
      )}

      {/* Catégories prédéfinies glissables au pouce */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {FOOD_GROUP_PILLS.map((pill) => {
          const active = groupFilter === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setGroupFilter(pill.id);
                setSelectedFood(null);
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-emerald-400 text-zinc-950 font-semibold'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Liste combinée : Base Locale Instantanée (250+) + Base Mondiale Open Food Facts (3M+) */}
      <div className={`${compact ? 'max-h-44' : 'max-h-56'} overflow-y-auto space-y-2 pr-1`}>
        {localFoods.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10.5px] font-semibold text-[var(--text-muted)] px-1">
              Panel hors-ligne certifié ({localFoods.length} aliments)
            </p>
            {localFoods.map((f) => {
              const isSelected = activeFood?.id === f.id;
              const isDisliked = isFoodDislikedByProfile(f, profile);
              return (
                <div
                  key={f.id}
                  className={`w-full px-3 py-2 rounded-2xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-400/15 border border-emerald-400/40 text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                  onClick={() => {
                    setSelectedFood(f);
                    setGrams(f.defaultGrams || 100);
                  }}
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span>{f.name}</span>
                    <span className="text-[10.5px] text-[var(--text-muted)] ml-1.5">
                      ({f.state})
                    </span>
                    {isDisliked && (
                      <span className="ml-1.5 text-[10px] text-rose-400">(Exclu)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                      {f.per100g.kcal} kcal · {f.per100g.protein}g P
                    </span>
                    {onToggleDislikedFood && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDislikedFood(f.id);
                        }}
                        className={`p-1 rounded-full transition-colors ${
                          isDisliked
                            ? 'text-rose-400 bg-rose-500/15'
                            : 'text-[var(--text-muted)] hover:text-rose-400'
                        }`}
                        title={
                          isDisliked
                            ? 'Réautoriser cet ingrédient'
                            : 'Je ne mange pas cet ingrédient (exclure)'
                        }
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(remoteLoading || remoteFoods.length > 0) && (
          <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-[10.5px] font-semibold text-emerald-400 px-1 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              <span>Détection en direct (3M+ Open Food Facts)</span>
              {remoteLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            </p>
            {remoteFoods.map((f) => {
              const isSelected = activeFood?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFood(f);
                    setGrams(f.defaultGrams || 100);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-2xl text-xs flex items-center justify-between gap-2 transition-all ${
                    isSelected
                      ? 'bg-emerald-400/15 border border-emerald-400/40 text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    {f.nutriscore && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-400">
                        {f.nutriscore}
                      </span>
                    )}
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">
                    {f.per100g.kcal} kcal · {f.per100g.protein}g P
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {localFoods.length === 0 && !remoteLoading && remoteFoods.length === 0 && (
          <p className="text-center py-6 text-xs text-[var(--text-muted)]">
            Aucun ingrédient trouvé. Essaie un mot plus simple (ex: citron, fromage, riz).
          </p>
        )}
      </div>

      {/* Panneau d'ajustement rapide spécial Smartphone (Grammages rapides + Macros live) */}
      {activeFood && (
        <div className="rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {activeFood.name}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5">
                <strong className="text-emerald-400">{previewMacros.kcal} kcal</strong> ·{' '}
                {previewMacros.protein}g P · {previewMacros.carbs}g G · {previewMacros.fat}g L
              </p>
            </div>

            <div className="inline-flex items-center bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1 shrink-0">
              <input
                type="number"
                min="1"
                max="2000"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="w-14 bg-transparent text-right text-xs font-bold text-[var(--text-primary)] tabular-nums focus:outline-none"
              />
              <span className="text-[11px] text-[var(--text-muted)] ml-1">g</span>
            </div>
          </div>

          {/* Boutons grammage 1-tap ergonomiques au pouce */}
          <div className="flex items-center justify-between gap-1">
            {QUICK_GRAM_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setGrams(preset)}
                className={`flex-1 py-1 rounded-lg text-[11px] font-medium tabular-nums transition-colors ${
                  Number(grams) === preset
                    ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/40 font-semibold'
                    : 'bg-[var(--bg-app)]/60 text-[var(--text-secondary)]'
                }`}
              >
                {preset}g
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="btn-accent w-full !py-2.5 !text-xs"
          >
            <Plus className="w-4 h-4" />
            {actionLabel} ({Math.max(1, Math.round(Number(grams) || 100))}g)
          </button>
        </div>
      )}
    </div>
  );
}
