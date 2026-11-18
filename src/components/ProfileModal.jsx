import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, Lock } from 'lucide-react';
import {
  ACTIVITY_LEVELS,
  FITNESS_GOALS,
  DIETARY_FILTERS,
  calculateNutritionalTargets,
} from '../db/database';
import {
  getAllFoods,
  isFoodCompatibleWithProfile,
  calculateFoodMacros,
} from '../data/foodDatabase';
import { computeAdaptiveTDEE } from '../utils/trainingAnalytics';

export default function ProfileModal({
  isOpen,
  profile,
  bodyMetrics = [],
  allNutritionLogs = [],
  onClose,
  onSaveProfile,
  onSwitchToCloudRestore,
}) {
  const [form, setForm] = useState(() => ({
    ...profile,
    restrictions: Array.isArray(profile?.restrictions) ? [...profile.restrictions] : [],
    targets: { ...(profile?.targets || {}) },
  }));

  useEffect(() => {
    if (isOpen && profile) {
      setForm({
        ...profile,
        restrictions: Array.isArray(profile.restrictions) ? [...profile.restrictions] : [],
        targets: { ...(profile.targets || {}) },
      });
    }
  }, [isOpen, profile]);

  const autoComputed = useMemo(
    () =>
      calculateNutritionalTargets({
        sex: form.sex,
        age: form.age,
        height: form.height,
        weight: form.weight,
        activityLevel: form.activityLevel,
        goal: form.goal,
      }),
    [form.sex, form.age, form.height, form.weight, form.activityLevel, form.goal]
  );

  const effectiveTargets = form.manualTargets
    ? form.targets
    : {
        kcal: autoComputed.kcal,
        protein: autoComputed.protein,
        carbs: autoComputed.carbs,
        fat: autoComputed.fat,
        waterMl: autoComputed.waterMl,
      };

  const compatibleFoodsCount = useMemo(
    () => getAllFoods().filter((f) => isFoodCompatibleWithProfile(f, form)).length,
    [form]
  );

  const adaptiveTdee = useMemo(() => {
    const dailyKcals = (allNutritionLogs || []).map((log) => {
      let kcal = 0;
      Object.values(log.meals || {}).forEach((entries) => {
        (entries || []).forEach((e) => {
          (e.items || []).forEach((it) => {
            kcal += calculateFoodMacros(it.foodId, it.grams).kcal;
          });
        });
      });
      return { date: log.date, kcal: Math.round(kcal) };
    });
    return computeAdaptiveTDEE(bodyMetrics, dailyKcals);
  }, [bodyMetrics, allNutritionLogs]);

  if (!isOpen) return null;

  const isFirstOnboarding = !profile?.onboardingCompleted;

  const toggleRestriction = (id) => {
    setForm((prev) => {
      const exists = prev.restrictions.includes(id);
      return {
        ...prev,
        restrictions: exists
          ? prev.restrictions.filter((r) => r !== id)
          : [...prev.restrictions, id],
      };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const finalProfile = {
      ...form,
      age: Math.max(14, Math.min(100, Number(form.age) || 28)),
      height: Math.max(120, Math.min(230, Number(form.height) || 176)),
      weight: Math.max(35, Math.min(250, Number(form.weight) || 74)),
      targets: {
        kcal: Math.max(1000, Math.round(Number(effectiveTargets.kcal) || 2000)),
        protein: Math.max(40, Math.round(Number(effectiveTargets.protein) || 130)),
        carbs: Math.max(30, Math.round(Number(effectiveTargets.carbs) || 200)),
        fat: Math.max(30, Math.round(Number(effectiveTargets.fat) || 65)),
        waterMl: Math.max(1000, Math.round(Number(effectiveTargets.waterMl) || 2500)),
      },
      onboardingCompleted: true,
    };
    onSaveProfile(finalProfile);
    onClose();
  };

  const dietBases = DIETARY_FILTERS.filter((f) => f.isDietBase);
  const allergyTags = DIETARY_FILTERS.filter((f) => !f.isDietBase);

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] card-elevated rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {isFirstOnboarding ? 'Bienvenue sur Pulse' : 'Profil & objectifs'}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Formule Mifflin-St Jeor (ISSN) · Synchronisation chiffrée
            </p>
          </div>
          {!isFirstOnboarding && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-5">
          {onSwitchToCloudRestore && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToCloudRestore();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Déjà un compte ? Se connecter avec mon identifiant & mot de passe
            </button>
          )}

          {/* Biométrie */}
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Prénom</label>
                <input
                  type="text"
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Athlète"
                  className="input-dark"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Sexe</label>
                <div className="grid grid-cols-2 seg-control">
                  {[
                    { id: 'male', label: 'Homme' },
                    { id: 'female', label: 'Femme' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm({ ...form, sex: s.id })}
                      className={`py-1.5 seg-item ${
                        form.sex === s.id ? 'seg-item-active' : ''
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Âge</label>
                <input
                  type="number"
                  min="14"
                  max="100"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="input-dark tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Taille (cm)</label>
                <input
                  type="number"
                  min="120"
                  max="230"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                  className="input-dark tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Poids (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="35"
                  max="250"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="input-dark tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Activité</label>
              <select
                value={form.activityLevel}
                onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
                className="input-dark"
              >
                {ACTIVITY_LEVELS.map((act) => (
                  <option key={act.id} value={act.id} className="bg-zinc-900 text-white">
                    {act.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Objectif */}
          <section className="space-y-2">
            <span className="text-xs text-[var(--text-muted)]">Objectif</span>
            <div className="grid grid-cols-3 gap-2">
              {FITNESS_GOALS.map((g) => {
                const selected = form.goal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setForm({ ...form, goal: g.id })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selected
                        ? 'bg-emerald-400/15 border-emerald-400/50 text-[var(--text-primary)]'
                        : 'bg-[var(--bg-subtle)]/60 border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="text-xs font-semibold block">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cibles */}
          <section className="rounded-2xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Cibles quotidiennes (Maintien : {autoComputed.tdee} kcal)
              </span>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    manualTargets: !prev.manualTargets,
                    targets: !prev.manualTargets
                      ? {
                          kcal: autoComputed.kcal,
                          protein: autoComputed.protein,
                          carbs: autoComputed.carbs,
                          fat: autoComputed.fat,
                          waterMl: autoComputed.waterMl,
                        }
                      : prev.targets,
                  }))
                }
                className="text-xs font-medium text-emerald-400 hover:underline"
              >
                {form.manualTargets ? 'Calcul auto' : 'Ajuster'}
              </button>
            </div>

            {adaptiveTdee && (
              <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-medium text-[var(--text-primary)] block">
                    Maintien réel observé : {adaptiveTdee.observedTdee} kcal/j
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                    Sur {adaptiveTdee.spanDays}j ({adaptiveTdee.weightDeltaKg > 0 ? '+' : ''}
                    {adaptiveTdee.weightDeltaKg} kg · moy. {adaptiveTdee.avgLoggedKcal} kcal)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const goalMult =
                      form.goal === 'cut' ? 0.83 : form.goal === 'bulk' ? 1.12 : 1;
                    const calibratedKcal = Math.round((adaptiveTdee.observedTdee * goalMult) / 10) * 10;
                    const prot = autoComputed.protein;
                    const fat = autoComputed.fat;
                    const carbs = Math.max(
                      40,
                      Math.round((calibratedKcal - prot * 4 - fat * 9) / 4)
                    );
                    setForm((prev) => ({
                      ...prev,
                      manualTargets: true,
                      targets: {
                        kcal: calibratedKcal,
                        protein: prot,
                        carbs,
                        fat,
                        waterMl: autoComputed.waterMl,
                      },
                    }));
                  }}
                  className="btn-secondary !py-1 !px-2.5 !text-[11px] shrink-0"
                >
                  Appliquer
                </button>
              </div>
            )}

            {!form.manualTargets ? (
              <div className="grid grid-cols-5 gap-2 text-center tabular-nums">
                {[
                  { val: effectiveTargets.kcal, lbl: 'kcal' },
                  { val: `${effectiveTargets.protein}g`, lbl: 'Prot.' },
                  { val: `${effectiveTargets.carbs}g`, lbl: 'Gluc.' },
                  { val: `${effectiveTargets.fat}g`, lbl: 'Lip.' },
                  { val: `${(effectiveTargets.waterMl / 1000).toFixed(1)}L`, lbl: 'Eau' },
                ].map((c) => (
                  <div key={c.lbl} className="bg-[var(--bg-app)]/70 rounded-xl py-2 px-1">
                    <div className="text-xs font-bold text-[var(--text-primary)]">{c.val}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{c.lbl}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { key: 'kcal', label: 'Kcal' },
                  { key: 'protein', label: 'Prot. (g)' },
                  { key: 'carbs', label: 'Gluc. (g)' },
                  { key: 'fat', label: 'Lip. (g)' },
                  { key: 'waterMl', label: 'Eau (ml)' },
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-1">
                      {item.label}
                    </label>
                    <input
                      type="number"
                      value={form.targets[item.key] ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          targets: { ...form.targets, [item.key]: e.target.value },
                        })
                      }
                      className="input-dark !py-1.5 !px-2.5 text-xs tabular-nums"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Filtres & Allergies */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Régime & Exclusions</span>
              <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                {compatibleFoodsCount} réf. locales + 3M+ en ligne
              </span>
            </div>

            <div className="grid grid-cols-3 seg-control">
              {dietBases.map((d) => {
                const active = (form.dietBase || 'omnivore') === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setForm({ ...form, dietBase: d.id })}
                    className={`py-1.5 seg-item ${active ? 'seg-item-active' : ''}`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {allergyTags.map((tag) => {
                const checked = form.restrictions.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleRestriction(tag.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      checked
                        ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/40'
                        : 'bg-[var(--bg-subtle)]/60 text-[var(--text-secondary)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </section>

          <button type="submit" className="btn-primary w-full py-3">
            <Check className="w-4 h-4" />
            Enregistrer mon profil
          </button>
        </form>
      </div>
    </div>
  );
}
