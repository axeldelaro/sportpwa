import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  SlidersHorizontal,
  Check,
  Smartphone,
  ShieldCheck,
  Cloud,
  Globe,
  Palette,
  User,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, tr } from '../i18n/translations';

export default function Header({
  profile,
  activeAccount,
  lang = 'fr',
  onChangeLang,
  onOpenProfile,
  onOpenCloudVault,
  onExportJson,
  onImportJson,
  theme,
  onSetTheme,
  installPromptEvent,
  onTriggerInstall,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusToast, setStatusToast] = useState(null);
  const fileInputRef = useRef(null);

  const isLoggedIn = Boolean(activeAccount?.username);

  const showToast = (msg) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2600);
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
      showToast('Données restaurées');
    } catch (err) {
      alert('JSON invalide : ' + (err.message || 'Erreur'));
    } finally {
      e.target.value = '';
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-app)]/80 backdrop-blur-2xl border-b border-[var(--border-subtle)] pt-safe">
      <div className="max-w-xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        {/* Identité Club Pro */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-400 flex items-center justify-center shadow-sm">
            <div className="w-2.5 h-2.5 rounded-xs bg-zinc-950 rotate-45" />
          </div>
          <div className="leading-none">
            <span className="font-extrabold tracking-[0.14em] text-[var(--text-primary)] text-sm block">
              PULSE
            </span>
            <span className="text-[9px] font-bold tracking-[0.18em] text-[var(--text-muted)] uppercase block mt-0.5">
              Athletic Club
            </span>
          </div>
        </div>

        {/* Barre d'actions épurée (zéro surcharge texte) */}
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={onOpenCloudVault}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-semibold transition-all ${
              isLoggedIn
                ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-400'
                : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={tr(lang, 'vault_title')}
          >
            {isLoggedIn ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[82px] truncate">@{activeAccount.username}</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span>Cloud</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-extrabold text-emerald-400 hover:border-emerald-400/40 transition-colors"
            title="Mon profil biométrique & objectifs"
          >
            {(profile?.name || 'A').charAt(0).toUpperCase()}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Réglages"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-50 w-68 card-elevated p-4 space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 section-eyebrow px-1">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Ambiance Studio</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--bg-subtle)]">
                    {[
                      { id: 'dark', label: 'Volt Club' },
                      { id: 'amoled', label: 'Carbone' },
                      { id: 'light', label: 'Ivoire' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onSetTheme(st.id)}
                        className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                          theme === st.id
                            ? 'bg-emerald-400 text-zinc-950'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 section-eyebrow px-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Langue</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--bg-subtle)]">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => onChangeLang(l.id)}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                          lang === l.id
                            ? 'bg-emerald-400 text-zinc-950'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {l.flag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <User className="w-4 h-4 text-emerald-400" />
                    Profil & Cibles ({profile?.targets?.kcal || 2200} kcal)
                  </button>

                  {installPromptEvent && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onTriggerInstall();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      {tr(lang, 'install_app')}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {tr(lang, 'export_json')}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {tr(lang, 'import_json')}
                  </button>
                </div>
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-400 text-zinc-950 text-xs font-bold shadow-xl flex items-center gap-1.5 animate-slide-up">
          <Check className="w-3.5 h-3.5" />
          {statusToast}
        </div>
      )}
    </header>
  );
}
