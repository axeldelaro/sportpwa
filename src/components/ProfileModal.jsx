import React, { useState, useMemo } from 'react';
import { X, Check } from 'lucide-react';
import {
  ACTIVITY_LEVELS,
  FITNESS_GOALS,
  DIETARY_FILTERS,
  calculateNutritionalTargets,
} from '../db/database';
import { FOOD_DATABASE, isFoodCompatibleWithProfile } from '../data/foodDatabase';

export default function ProfileModal({ isOpen, profile, onClose, onSaveProfile }) {
  const [form, setForm] = useState(() => ({
    ...profile,
    restrictions: Array.isArray(profile?.restrictions) ? [...profile.restrictions] : [],
    targets: { ...(profile?.targets || {}) },
  }));

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
    () => FOOD_DATABASE.filter((f) => isFoodCompatibleWithProfile(f, form)).length,
    [form]
  );

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] bg-zinc-950 border border-white/[0.09] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              {isFirstOnboarding ? 'Bienvenue sur PulseFit' : 'Profil & Objectifs'}
            </h2>
            <p className="text-xs text-zinc-500">
              Calcul Mifflin-St Jeor · Stockage local uniquement
            </p>
          </div>
          {!isFirstOnboarding && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-6">
          {/* Biométrie */}
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Prénom</label>
                <input
                  type="text"
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Athlète"
                  className="input-dark"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Sexe</label>
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-900 border border-white/[0.06]">
                  {[
                    { id: 'male', label: 'Homme' },
                    { id: 'female', label: 'Femme' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm({ ...form, sex: s.id })}
                      className={`py-1.5 rounded-xl text-xs font-medium transition-all ${
                        form.sex === s.id
                          ? 'bg-zinc-100 text-zinc-950 font-semibold'
                          : 'text-zinc-400'
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
                <label className="block text-xs text-zinc-500 mb-1">Âge</label>
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
                <label className="block text-xs text-zinc-500 mb-1">Taille (cm)</label>
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
                <label className="block text-xs text-zinc-500 mb-1">Poids (kg)</label>
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
              <label className="block text-xs text-zinc-500 mb-1">Activité</label>
              <select
                value={form.activityLevel}
                onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
                className="input-dark"
              >
                {ACTIVITY_LEVELS.map((act) => (
                  <option key={act.id} value={act.id} className="bg-zinc-900">
                    {act.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Objectif */}
          <section className="space-y-2">
            <span className="text-xs text-zinc-500">Objectif</span>
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
                        ? 'bg-zinc-900 border-emerald-400/60 text-zinc-50'
                        : 'bg-zinc-900/40 border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-xs font-semibold block">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cibles */}
          <section className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">
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

            {!form.manualTargets ? (
              <div className="grid grid-cols-5 gap-2 text-center tabular-nums">
                {[
                  { val: effectiveTargets.kcal, lbl: 'kcal' },
                  { val: `${effectiveTargets.protein}g`, lbl: 'Prot.' },
                  { val: `${effectiveTargets.carbs}g`, lbl: 'Gluc.' },
                  { val: `${effectiveTargets.fat}g`, lbl: 'Lip.' },
                  { val: `${(effectiveTargets.waterMl / 1000).toFixed(1)}L`, lbl: 'Eau' },
                ].map((c) => (
                  <div key={c.lbl} className="bg-zinc-950/70 rounded-xl py-2 px-1">
                    <div className="text-xs font-bold text-zinc-100">{c.val}</div>
                    <div className="text-[10px] text-zinc-500">{c.lbl}</div>
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
                    <label className="block text-[10px] text-zinc-500 mb-1">
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
              <span className="text-xs text-zinc-500">Régime & Exclusions</span>
              <span className="text-[11px] text-zinc-500 tabular-nums">
                {compatibleFoodsCount} aliments actifs
              </span>
            </div>

            <div className="grid grid-cols-3 p-1 rounded-full bg-zinc-900 border border-white/[0.06]">
              {dietBases.map((d) => {
                const active = (form.dietBase || 'omnivore') === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setForm({ ...form, dietBase: d.id })}
                    className={`py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'text-zinc-400'
                    }`}
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      checked
                        ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40'
                        : 'bg-zinc-900/60 text-zinc-400 border-white/[0.06] hover:text-zinc-200'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </section>

          <button type="submit" className="btn-accent w-full py-3">
            <Check className="w-4 h-4" />
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}
