import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  SlidersHorizontal,
  Check,
  Smartphone,
  Cloud,
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
    <header className="sticky top-0 z-30 bg-[var(--bg-app)]/88 backdrop-blur-xl border-b border-[var(--border-subtle)] pt-safe">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Marque minimaliste dessinée */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-[8px] bg-[var(--text-primary)] text-[var(--bg-app)] flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 12.5h4.2l2.6-6 4.1 11 2.9-7.2 1.8 2.2H21"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-[15px] text-[var(--text-primary)]">
            Pulse
          </span>
        </div>

        {/* Actions discrètes */}
        <div className="flex items-center gap-1.5 relative">
          <button
            type="button"
            onClick={onOpenCloudVault}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title={tr(lang, 'vault_title')}
          >
            {isLoggedIn ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                <span className="max-w-[84px] truncate text-[var(--text-primary)]">
                  @{activeAccount.username}
                </span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span>Synchro</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] transition-colors"
            title="Profil & objectifs"
          >
            {(profile?.name || 'A').charAt(0).toUpperCase()}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Réglages"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-50 w-64 card-elevated p-3.5 space-y-3.5 animate-fade-in">
                <div className="space-y-1.5">
                  <span className="section-eyebrow px-0.5 block">Apparence</span>
                  <div className="grid grid-cols-3 seg-control">
                    {[
                      { id: 'dark', label: 'Sombre' },
                      { id: 'amoled', label: 'Noir' },
                      { id: 'light', label: 'Clair' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onSetTheme(st.id)}
                        className={`py-1.5 seg-item ${
                          theme === st.id ? 'seg-item-active' : ''
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="section-eyebrow px-0.5 block">Langue</span>
                  <div className="grid grid-cols-3 seg-control">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => onChangeLang(l.id)}
                        className={`py-1.5 uppercase seg-item ${
                          lang === l.id ? 'seg-item-active' : ''
                        }`}
                      >
                        {l.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      Profil & objectifs
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                      {profile?.targets?.kcal || 2200} kcal
                    </span>
                  </button>

                  {installPromptEvent && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onTriggerInstall();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      {tr(lang, 'install_app')}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportClick}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    {tr(lang, 'export_json')}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[var(--text-muted)]" />
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
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-app)] text-xs font-medium shadow-lg flex items-center gap-1.5 animate-slide-up">
          <Check className="w-3.5 h-3.5" />
          {statusToast}
        </div>
      )}
    </header>
  );
}
