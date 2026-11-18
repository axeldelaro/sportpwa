import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ScanBarcode,
  Camera,
  Globe,
  Loader2,
  X,
  Plus,
  Ban,
  ChefHat,
  ChevronDown,
} from 'lucide-react';
import {
  getAllFoods,
  getFoodById,
  calculateFoodMacros,
  isFoodCompatibleWithProfile,
  isFoodDislikedByProfile,
  registerExternalFoods,
} from '../data/foodDatabase';
import { normalizeText } from '../utils/substitutionEngine';
import { getVariedRecipesForFood } from '../utils/foodRecipeSuggester';
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
  customRecipes = [],
  lang = 'fr',
  onSelectFoodWithGrams,
  onSelectRecipeSuggestion,
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
  const [cameraScanning, setCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState(100);
  const [showRecipeIdeas, setShowRecipeIdeas] = useState(false);

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
        const compatible = found
          .filter((f) => isFoodCompatibleWithProfile(f, profile))
          .slice(0, 12);
        if (compatible.length > 0) {
          registerExternalFoods(compatible);
        }
        setRemoteFoods(compatible);
      } catch {
        // Repli silencieux hors-ligne sur les 302+ aliments locaux
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
      return byGroup.slice(0, 90);
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

  // 4 suggestions de recettes variées par type de repas (Matin, Midi, Collation, Soir) pour l'aliment actif !
  const foodRecipeSuggestions = useMemo(() => {
    if (!activeFood || !onSelectRecipeSuggestion) return [];
    registerExternalFoods([activeFood]);
    return getVariedRecipesForFood(activeFood, profile, customRecipes, 4);
  }, [activeFood, profile, customRecipes, onSelectRecipeSuggestion]);

  const stopCameraScanner = useCallback(() => {
    if (scanLoopRef.current) {
      clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraScanning(false);
  }, []);

  useEffect(() => {
    return () => stopCameraScanner();
  }, [stopCameraScanner]);

  const lookupBarcodeCode = useCallback(
    async (rawCode) => {
      const code = String(rawCode || '').trim();
      if (!code) return;
      stopCameraScanner();
      setRemoteLoading(true);
      try {
        const prod = await fetchProductByBarcode(code);
        if (prod) {
          registerExternalFoods([prod]);
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
    },
    [onCacheExternalFood, stopCameraScanner]
  );

  const startCameraScanner = async () => {
    setCameraError('');
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Caméra non disponible sur cet appareil — saisis le code ci-dessous.');
      return;
    }
    if (!('BarcodeDetector' in window)) {
      setCameraError('Lecture optique directe non supportée par ce navigateur — saisis le code EAN.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraScanning(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);

      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
      });

      scanLoopRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            if (navigator.vibrate) navigator.vibrate(40);
            lookupBarcodeCode(codes[0].rawValue);
          }
        } catch {
          // Frame ignorée
        }
      }, 280);
    } catch {
      setCameraError('Accès caméra refusé — utilise la saisie manuelle.');
      stopCameraScanner();
    }
  };

  const handleBarcodeLookup = async (e) => {
    e.preventDefault();
    await lookupBarcodeCode(barcodeVal);
  };

  const handleConfirm = async () => {
    if (!activeFood) return;
    if (activeFood.sourceRef === 'Open Food Facts' && onCacheExternalFood) {
      await onCacheExternalFood(activeFood);
    }
    const cleanGrams = Math.max(1, Math.round(Number(grams) || activeFood.defaultGrams || 100));
    onSelectFoodWithGrams(activeFood, cleanGrams);
  };

  const handlePickSuggestedRecipe = async (sugRec) => {
    if (!sugRec || !onSelectRecipeSuggestion) return;
    if (activeFood?.sourceRef === 'Open Food Facts' && onCacheExternalFood) {
      await onCacheExternalFood(activeFood);
    }
    onSelectRecipeSuggestion(sugRec);
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
            placeholder="Chercher un aliment (citron, saumon, avocat, farine...)"
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
          onClick={() => {
            if (barcodeOpen) stopCameraScanner();
            setBarcodeOpen((v) => !v);
          }}
          className="btn-secondary !py-2.5 !px-3 !text-xs shrink-0"
          title="Scanner ou saisir un code-barres EAN"
        >
          <ScanBarcode className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      {barcodeOpen && (
        <div className="rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] p-3 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Code-barres produit (EAN)
            </span>
            <button
              type="button"
              onClick={() => (cameraScanning ? stopCameraScanner() : startCameraScanner())}
              className="btn-secondary !py-1 !px-2.5 !text-[11px]"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{cameraScanning ? 'Arrêter caméra' : 'Scanner via caméra'}</span>
            </button>
          </div>

          {cameraScanning && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-40">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--accent)]/80 absolute pointer-events-none" />
            </div>
          )}

          {cameraError && (
            <p className="text-[11px] text-[var(--text-muted)]">{cameraError}</p>
          )}

          <form onSubmit={handleBarcodeLookup} className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={barcodeVal}
              onChange={(e) => setBarcodeVal(e.target.value)}
              placeholder="Ou saisir l'EAN-13 (ex: 3017620422003)"
              className="input-dark !py-2 text-xs tabular-nums !bg-[var(--bg-card)]"
            />
            <button type="submit" className="btn-primary !py-2 !px-3.5 !text-xs shrink-0">
              OK
            </button>
          </form>
        </div>
      )}

      {/* Catégories prédéfinies glissables */}
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
              className={active ? 'chip-active !py-1 !px-2.5 !text-[11px]' : 'chip !py-1 !px-2.5 !text-[11px]'}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Liste d'aliments */}
      <div className={`${compact ? 'max-h-40' : 'max-h-48'} overflow-y-auto space-y-2 pr-1`}>
        {localFoods.length > 0 && (
          <div className="space-y-0.5">
            <p className="section-eyebrow px-1 pb-1">
              Catalogue hors-ligne ({localFoods.length})
            </p>
            {localFoods.map((f) => {
              const isSelected = activeFood?.id === f.id;
              const isDisliked = isFoodDislikedByProfile(f, profile);
              return (
                <div
                  key={f.id}
                  className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-subtle)] border border-[var(--border-strong)] text-[var(--text-primary)] font-medium'
                      : 'border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/60'
                  }`}
                  onClick={() => {
                    setSelectedFood(f);
                    setGrams(f.defaultGrams || 100);
                  }}
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span>{f.name}</span>
                    {isDisliked && (
                      <span className="ml-1.5 text-[10px] text-rose-400">(Exclu)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {f.per100g.kcal} kcal
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
                            : 'Je ne mange pas cet ingrédient'
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
            <p className="text-[10.5px] font-bold text-emerald-400 px-1 flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              <span>Base mondiale Open Food Facts (3M+)</span>
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
                      ? 'bg-emerald-400/15 border border-emerald-400/40 text-[var(--text-primary)] font-bold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono shrink-0">
                    {f.per100g.kcal} kcal
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Panneau aliment actif + Suggestions de 4 Recettes Variées par type de repas */}
      {activeFood && (
        <div className="rounded-xl bg-[var(--bg-subtle)]/75 border border-[var(--border-subtle)] p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {activeFood.name}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5">
                <strong className="font-semibold text-[var(--text-primary)]">
                  {previewMacros.kcal} kcal
                </strong>{' '}
                · {previewMacros.protein}g P · {previewMacros.carbs}g G · {previewMacros.fat}g L
              </p>
            </div>

            <div className="inline-flex items-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 shrink-0">
              <input
                type="number"
                min="1"
                max="2000"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="w-14 bg-transparent text-right text-xs font-semibold tabular-nums text-[var(--text-primary)] focus:outline-none"
              />
              <span className="text-[11px] text-[var(--text-muted)] ml-1">g</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            {QUICK_GRAM_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setGrams(preset)}
                className={`flex-1 py-1 rounded-md text-[11px] tabular-nums font-medium transition-colors ${
                  Number(grams) === preset
                    ? 'bg-[var(--text-primary)] text-[var(--bg-app)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                {preset}g
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary flex-1 !py-2 !text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {actionLabel} ({Math.max(1, Math.round(Number(grams) || 100))}g)
            </button>

            {foodRecipeSuggestions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRecipeIdeas((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
                  showRecipeIdeas
                    ? 'bg-[var(--bg-card)] border-[var(--border-strong)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Voir 4 recettes variées utilisant cet aliment"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>{foodRecipeSuggestions.length} idées</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showRecipeIdeas ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}
          </div>

          {/* Tiroir dépliable : 4 recettes variées (Matin, Midi, Collation, Soir) autour de cet aliment */}
          {showRecipeIdeas && foodRecipeSuggestions.length > 0 && (
            <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-2 animate-fade-in">
              <div className="flex items-center justify-between px-0.5">
                <span className="section-eyebrow">
                  Suggestions par repas avec cet aliment
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-0.5">
                {foodRecipeSuggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                        <span>{sug.slotBadge}</span>
                        <span className="text-[var(--text-muted)]">· {sug.prepMinutes} min</span>
                      </div>
                      <h5 className="text-xs font-semibold text-[var(--text-primary)] mt-0.5 line-clamp-1">
                        {sug.title}
                      </h5>
                      <p className="text-[11px] tabular-nums text-[var(--text-secondary)] mt-0.5">
                        <strong className="font-semibold text-[var(--text-primary)]">
                          {sug.macros.kcal} kcal
                        </strong>{' '}
                        · {sug.macros.protein}g P · {sug.macros.carbs}g G · {sug.macros.fat}g L
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                        {sug.ingredients
                          .map((ing) => {
                            const f = getFoodById(ing.foodId);
                            return f ? `${ing.grams}g ${f.name.split('(')[0].trim()}` : '';
                          })
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePickSuggestedRecipe(sug)}
                      className="btn-secondary !py-1.5 !px-3 !text-xs shrink-0"
                    >
                      Choisir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
