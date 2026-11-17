import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  MoreHorizontal,
  Check,
  Moon,
  SunMedium,
  Smartphone,
} from 'lucide-react';

export default function Header({
  profile,
  onOpenProfile,
  onExportJson,
  onImportJson,
  theme,
  onToggleTheme,
  installPromptEvent,
  onTriggerInstall,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusToast, setStatusToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2800);
  };

  const handleExportClick = async () => {
    setMenuOpen(false);
    await onExportJson();
    showToast('Sauvegarde exportée');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onImportJson(parsed);
      showToast('Sauvegarde restaurée');
    } catch (err) {
      alert('Fichier JSON invalide : ' + (err.message || 'Erreur'));
    } finally {
      e.target.value = '';
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/[0.04] pt-safe">
      <div className="max-w-xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Marque minimaliste */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold tracking-tight text-zinc-100 text-[15px]">
            PulseFit
          </span>
        </div>

        {/* Actions épurées : Pilule Profil + Menu ••• */}
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/[0.07] transition-colors"
          >
            <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center text-[11px] font-semibold">
              {(profile?.name || 'A').charAt(0).toUpperCase()}
            </span>
            <span className="text-xs font-medium text-zinc-300 tabular-nums">
              {profile?.targets?.kcal || 2200} kcal
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Options et sauvegarde"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-56 card-elevated p-1.5 animate-fade-in">
                {installPromptEvent && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onTriggerInstall();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-medium text-emerald-300 hover:bg-white/[0.05] transition-colors"
                  >
                    <Smartphone className="w-4 h-4" />
                    Installer sur l’écran
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-medium text-zinc-200 hover:bg-white/[0.05] transition-colors"
                >
                  <Download className="w-4 h-4 text-zinc-400" />
                  Exporter sauvegarde (.json)
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-medium text-zinc-200 hover:bg-white/[0.05] transition-colors"
                >
                  <Upload className="w-4 h-4 text-zinc-400" />
                  Importer sauvegarde (.json)
                </button>

                <div className="my-1 border-t border-white/[0.05]" />

                <button
                  type="button"
                  onClick={() => {
                    onToggleTheme();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-medium text-zinc-300 hover:bg-white/[0.05] transition-colors"
                >
                  {theme === 'amoled' ? (
                    <>
                      <SunMedium className="w-4 h-4 text-zinc-400" />
                      Nuance : Zinc doux
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-zinc-400" />
                      Nuance : Noir OLED
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {statusToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-100 text-zinc-950 text-xs font-semibold shadow-xl flex items-center gap-1.5 animate-slide-up">
          <Check className="w-3.5 h-3.5" />
          {statusToast}
        </div>
      )}
    </header>
  );
}
