import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  MoreHorizontal,
  Check,
  Smartphone,
  ShieldCheck,
  Lock,
  Globe,
  Palette,
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
    showToast('JSON OK');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onImportJson(parsed);
      showToast('Restauré');
    } catch (err) {
      alert('JSON invalide : ' + (err.message || 'Erreur'));
    } finally {
      e.target.value = '';
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-app)]/80 backdrop-blur-2xl border-b border-[var(--border-subtle)] pt-safe">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold tracking-tight text-[var(--text-primary)] text-[15px]">
            PulseFit
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 relative min-w-0">
          {/* Bouton Compte & Mot de Passe */}
          <button
            type="button"
            onClick={onOpenCloudVault}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-xs font-medium transition-colors ${
              isLoggedIn
                ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-400'
                : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={tr(lang, 'vault_title')}
          >
            {isLoggedIn ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden xs:inline max-w-[75px] truncate">
                  @{activeAccount.username}
                </span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Connexion</span>
              </>
            )}
          </button>

          {/* Pilule Profil Biométrique */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] transition-colors"
          >
            <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">
              {(profile?.name || 'A').charAt(0).toUpperCase()}
            </span>
            <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
              {profile?.targets?.kcal || 2200} kcal
            </span>
          </button>

          {/* Menu ••• */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Menu"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-64 card-elevated p-3 space-y-3 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Langue / Language</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-[var(--bg-subtle)]">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => onChangeLang(l.id)}
                        className={`py-1 rounded-full text-xs font-semibold transition-all ${
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

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Style d’interface</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-[var(--bg-subtle)]">
                    {[
                      { id: 'dark', label: 'Studio' },
                      { id: 'amoled', label: 'OLED' },
                      { id: 'light', label: 'Ivoire' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onSetTheme(st.id)}
                        className={`py-1 rounded-full text-[11px] font-semibold transition-all ${
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

                <div className="border-t border-[var(--border-subtle)] pt-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenCloudVault();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-xs font-medium text-emerald-400 hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {tr(lang, 'vault_title')}
                  </button>

                  {installPromptEvent && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onTriggerInstall();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Smartphone className="w-4 h-4" />
                      {tr(lang, 'install_app')}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportClick}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Download className="w-4 h-4 text-[var(--text-muted)]" />
                    {tr(lang, 'export_json')}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-2xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Upload className="w-4 h-4 text-[var(--text-muted)]" />
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
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-xl flex items-center gap-1.5 animate-slide-up">
          <Check className="w-3.5 h-3.5" />
          {statusToast}
        </div>
      )}
    </header>
  );
}
