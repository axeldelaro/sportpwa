import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  ShieldCheck,
  CloudUpload,
  CloudDownload,
  Lock,
  ExternalLink,
  KeyRound,
  FileLock2,
  Check,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  evaluatePasswordStrength,
  loadVaultMetadata,
  saveVaultMetadata,
  encryptVaultData,
  decryptVaultData,
  syncPushToGitHubVault,
  syncPullFromGitHubVault,
} from '../utils/cryptoVaultService';

export default function CloudVaultModal({
  isOpen,
  onClose,
  onGetFullBackup,
  onRestoreFullBackup,
}) {
  const existingMeta = useMemo(() => (isOpen ? loadVaultMetadata() : null), [isOpen]);

  const [accountId, setAccountId] = useState(existingMeta?.accountId || '');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [showTokenSetup, setShowTokenSetup] = useState(!existingMeta?.encryptedToken);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'ok'|'err', msg: string }

  const vaultFileInputRef = useRef(null);

  const pwdStrength = useMemo(
    () => evaluatePasswordStrength(masterPassword),
    [masterPassword]
  );

  if (!isOpen) return null;

  const resolveGithubToken = async () => {
    if (githubToken.trim()) return githubToken.trim();
    const meta = loadVaultMetadata();
    if (meta?.encryptedToken) {
      const unlocked = await decryptVaultData(meta.encryptedToken, masterPassword);
      return unlocked.token;
    }
    throw new Error('Colle ta clé GitHub Gist une première fois pour lier cet appareil.');
  };

  const handleCloudPush = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!accountId.trim() || masterPassword.length < 6) {
      setFeedback({
        type: 'err',
        msg: 'Choisis un identifiant et un mot de passe d’au moins 6 caractères.',
      });
      return;
    }

    setBusy(true);
    try {
      const token = await resolveGithubToken();
      const backup = await onGetFullBackup();
      const meta = await syncPushToGitHubVault({
        accountId: accountId.trim(),
        masterPassword,
        githubToken: token,
        fullBackupPayload: backup,
      });
      setGithubToken('');
      setShowTokenSetup(false);
      setFeedback({
        type: 'ok',
        msg: `Coffre chiffré synchronisé sur GitHub (${meta.accountId}) !`,
      });
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message || 'Échec de synchronisation.' });
    } finally {
      setBusy(false);
    }
  };

  const handleCloudPull = async () => {
    setFeedback(null);
    if (!accountId.trim() || !masterPassword) {
      setFeedback({
        type: 'err',
        msg: 'Saisis ton identifiant et ton mot de passe maître pour déchiffrer.',
      });
      return;
    }

    setBusy(true);
    try {
      const token = await resolveGithubToken();
      const restoredPayload = await syncPullFromGitHubVault({
        accountId: accountId.trim(),
        masterPassword,
        githubToken: token,
      });
      await onRestoreFullBackup(restoredPayload);
      setGithubToken('');
      setShowTokenSetup(false);
      setFeedback({
        type: 'ok',
        msg: 'Données déchiffrées et restaurées intégralement sur cet appareil !',
      });
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message || 'Échec de restauration.' });
    } finally {
      setBusy(false);
    }
  };

  // Export d'un fichier .pulsevault chiffré AES-256-GCM (sans clé GitHub requise)
  const handleDownloadEncryptedFile = async () => {
    setFeedback(null);
    if (masterPassword.length < 6) {
      setFeedback({
        type: 'err',
        msg: 'Définis d’abord un mot de passe maître (6+ caractères) pour chiffrer le fichier.',
      });
      return;
    }

    setBusy(true);
    try {
      const backup = await onGetFullBackup();
      const encrypted = await encryptVaultData(backup, masterPassword);
      const blob = new Blob([JSON.stringify(encrypted, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulsefit-${accountId || 'vault'}.pulsevault`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'ok',
        msg: 'Fichier .pulsevault chiffré en AES-256-GCM téléchargé !',
      });
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleImportEncryptedFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!masterPassword) {
      setFeedback({
        type: 'err',
        msg: 'Saisis le mot de passe maître avant d’importer le coffre .pulsevault.',
      });
      return;
    }

    setBusy(true);
    try {
      const raw = await file.text();
      const envelope = JSON.parse(raw);
      const decryptedBackup = await decryptVaultData(envelope, masterPassword);
      await onRestoreFullBackup(decryptedBackup);
      setFeedback({
        type: 'ok',
        msg: 'Coffre .pulsevault déchiffré et restauré avec succès !',
      });
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] card-elevated rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-400/15 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Compte & Cloud Anti-Piratage (GitHub)
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Chiffrement Zero-Knowledge AES-256-GCM · PBKDF2 600 000 tours
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCloudPush} className="overflow-y-auto p-5 space-y-4">
          {/* Statut appareil lié */}
          {existingMeta?.accountId && (
            <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-400/10 border border-emerald-400/25 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Compte lié : <strong>{existingMeta.accountId}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Déconnecter la clé Cloud de cet appareil ?')) {
                    saveVaultMetadata(null);
                    setShowTokenSetup(true);
                    setFeedback({ type: 'ok', msg: 'Clé locale effacée de cet appareil.' });
                  }
                }}
                className="text-[11px] text-[var(--text-muted)] hover:underline"
              >
                Dissocier
              </button>
            </div>
          )}

          {/* Identifiant & Mot de Passe Maître */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                Identifiant du compte (ex: ton pseudo)
              </label>
              <input
                type="text"
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="ex: axel"
                autoComplete="username"
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                Mot de passe maître (ne quitte jamais ton appareil)
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Mot de passe secret..."
                  autoComplete="current-password"
                  className="input-dark !pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {masterPassword.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-[var(--text-muted)]">
                      Sécurité : {pwdStrength.label}
                    </span>
                    <span className="tabular-nums text-[var(--text-muted)]">
                      ~{pwdStrength.bits} bits
                    </span>
                  </div>
                  <div className="h-1 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                      style={{ width: `${(pwdStrength.score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Clé GitHub Gist (chiffrée au repos) */}
          <div className="rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Connexion Cloud GitHub (100% Gratuit)
              </span>
              {existingMeta?.encryptedToken && (
                <button
                  type="button"
                  onClick={() => setShowTokenSetup((v) => !v)}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  {showTokenSetup ? 'Masquer' : 'Changer la clé'}
                </button>
              )}
            </div>

            {showTokenSetup ? (
              <div className="space-y-2">
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Pour stocker ton coffre chiffré gratuitement sur ton propre GitHub sans serveur intermédiaire, crée une clé limitée au seul droit <strong>gist</strong> (elle sera chiffrée en AES-256 par ton mot de passe) :
                </p>
                <a
                  href="https://github.com/settings/tokens/new?scopes=gist&description=PulseFit+Encrypted+Vault"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:underline"
                >
                  1. Générer ma clé Gist sur GitHub en 1 clic
                  <ExternalLink className="w-3 h-3" />
                </a>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="2. Colle ici la clé ghp_..."
                  className="input-dark !py-2 text-xs"
                />
              </div>
            ) : (
              <p className="text-[11px] text-[var(--text-muted)]">
                Clé Cloud déjà chiffrée sur cet appareil. Entre simplement ton mot de passe ci-dessus pour synchroniser.
              </p>
            )}
          </div>

          {/* Message de retour */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                feedback.type === 'ok'
                  ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {feedback.type === 'ok' && <Check className="w-4 h-4 shrink-0" />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Boutons Synchronisation Cloud */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="btn-accent !py-2.5 !text-xs"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              Sauvegarder Cloud
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleCloudPull}
              className="btn-primary !py-2.5 !text-xs"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudDownload className="w-4 h-4" />
              )}
              Restaurer Cloud
            </button>
          </div>

          {/* Alternative Hors-GitHub : Fichier Coffre Chiffré .pulsevault */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <p className="text-[11px] text-[var(--text-muted)]">
              Ou transfert direct sans GitHub (fichier chiffré indéchiffrable sans ton mot de passe) :
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleDownloadEncryptedFile}
                className="btn-secondary !py-2 !text-xs"
              >
                <FileLock2 className="w-3.5 h-3.5 text-emerald-400" />
                Exporter .pulsevault
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => vaultFileInputRef.current?.click()}
                className="btn-secondary !py-2 !text-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                Ouvrir .pulsevault
              </button>
            </div>
            <input
              ref={vaultFileInputRef}
              type="file"
              accept=".pulsevault,.json,application/json"
              onChange={handleImportEncryptedFile}
              className="hidden"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
