import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  LogOut,
  Share2,
  Copy,
  FileLock2,
  Check,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  Smartphone,
} from 'lucide-react';
import {
  evaluatePasswordStrength,
  registerUserAccount,
  loginUserAccount,
  generateEncryptedSyncLink,
  unlockSyncTokenAndImport,
  encryptVaultData,
  decryptVaultData,
  saveEncryptedSessionSnapshot,
  setActiveAccountUsername,
} from '../utils/cryptoVaultService';
import { listEncryptedAccountUsernames } from '../db/database';

export default function CloudVaultModal({
  isOpen,
  activeAccount,
  pendingSyncInfo,
  onClearPendingSync,
  onClose,
  onAccountAuthenticated,
  onAccountLockedOut,
  onGetFullBackup,
  onRestoreFullBackup,
}) {
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [generatedLink, setGeneratedLink] = useState('');

  const vaultFileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setGeneratedLink('');
    setPassword('');
    setConfirmPassword('');

    listEncryptedAccountUsernames()
      .then((list) => {
        setSavedAccounts(list);
        if (pendingSyncInfo?.username) {
          setUsername(pendingSyncInfo.username);
          setAuthTab('login');
        } else if (activeAccount?.username) {
          setUsername(activeAccount.username);
        } else if (list.length > 0) {
          setUsername(list[0].username);
          setAuthTab('login');
        } else {
          setAuthTab('register');
        }
      })
      .catch(() => {});
  }, [isOpen, pendingSyncInfo, activeAccount]);

  const pwdStrength = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );

  if (!isOpen) return null;

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);

    try {
      // Cas 1 : Déverrouillage d'un lien de changement d'appareil (#sync=...)
      if (pendingSyncInfo?.rawToken) {
        const res = await unlockSyncTokenAndImport(pendingSyncInfo.rawToken, password);
        await onRestoreFullBackup(res.payload);
        onAccountAuthenticated({
          username: res.username,
          sessionKey: res.sessionKey,
          saltBase64: res.saltBase64,
        });
        onClearPendingSync?.();
        setPassword('');
        setFeedback({
          type: 'ok',
          msg: `Compte @${res.username} importé et déverrouillé sur cet appareil !`,
        });
        return;
      }

      // Cas 2 : Création de compte
      if (authTab === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Les deux mots de passe ne correspondent pas.');
        }
        const currentBackup = await onGetFullBackup();
        const res = await registerUserAccount(username, password, currentBackup);
        onAccountAuthenticated({
          username: res.username,
          sessionKey: res.sessionKey,
          saltBase64: res.saltBase64,
        });
        setPassword('');
        setConfirmPassword('');
        setFeedback({
          type: 'ok',
          msg: `Compte @${res.username} créé et chiffré en AES-256-GCM !`,
        });
        return;
      }

      // Cas 3 : Connexion classique
      const res = await loginUserAccount(username, password);
      await onRestoreFullBackup(res.payload);
      onAccountAuthenticated({
        username: res.username,
        sessionKey: res.sessionKey,
        saltBase64: res.saltBase64,
      });
      setPassword('');
      setFeedback({
        type: 'ok',
        msg: `Connecté au compte @${res.username} !`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err.message || 'Erreur d’authentification.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateTransferLink = async () => {
    setFeedback(null);
    if (!password || password.length < 8) {
      setFeedback({
        type: 'err',
        msg: 'Confirme ton mot de passe ci-dessous pour chiffrer le lien de transfert.',
      });
      return;
    }

    setBusy(true);
    try {
      const backup = await onGetFullBackup();
      const link = await generateEncryptedSyncLink(
        activeAccount.username,
        password,
        backup
      );

      if (link.length > 32000) {
        // Si l'historique sur plusieurs années est très volumineux, bascule vers le fichier .pulsevault
        await handleDownloadEncryptedFile();
        return;
      }

      setGeneratedLink(link);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link).catch(() => {});
      }
      setFeedback({
        type: 'ok',
        msg: 'Lien chiffré copié ! Ouvre-le sur ton autre appareil pour retrouver ton compte.',
      });
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleShareNative = async () => {
    if (!generatedLink || !navigator.share) return;
    try {
      await navigator.share({
        title: `PulseFit — Synchronisation @${activeAccount?.username}`,
        text: 'Lien personnel chiffré AES-256 pour restaurer mon compte PulseFit :',
        url: generatedLink,
      });
    } catch {
      // Partage annulé par l'utilisateur
    }
  };

  const handleDownloadEncryptedFile = async () => {
    setFeedback(null);
    if (!password || password.length < 8) {
      setFeedback({
        type: 'err',
        msg: 'Saisis ton mot de passe (8+ caractères) pour chiffrer le coffre .pulsevault.',
      });
      return;
    }

    setBusy(true);
    try {
      const backup = await onGetFullBackup();
      const targetUser = activeAccount?.username || username || 'athlete';
      const encrypted = await encryptVaultData(backup, password, targetUser);
      const blob = new Blob([JSON.stringify(encrypted)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulsefit-${targetUser}.pulsevault`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setFeedback({
        type: 'ok',
        msg: 'Coffre chiffré .pulsevault téléchargé !',
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

    if (!password) {
      setFeedback({
        type: 'err',
        msg: 'Saisis d’abord le mot de passe du compte avant de sélectionner le fichier .pulsevault.',
      });
      return;
    }

    setBusy(true);
    try {
      const raw = await file.text();
      const envelope = JSON.parse(raw);
      const res = await decryptVaultData(envelope, password);
      await saveEncryptedSessionSnapshot(
        res.username,
        res.sessionKey,
        res.saltBase64,
        res.payload
      );
      setActiveAccountUsername(res.username);
      await onRestoreFullBackup(res.payload);
      onAccountAuthenticated({
        username: res.username,
        sessionKey: res.sessionKey,
        saltBase64: res.saltBase64,
      });
      setPassword('');
      setFeedback({
        type: 'ok',
        msg: `Compte @${res.username} déchiffré et restauré avec succès !`,
      });
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md max-h-[90vh] card-elevated rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-400/15 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Compte & Sécurité Chiffrée
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                AES-256-GCM · PBKDF2 600k · Zéro service tiers
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

        {/* ================================================================= */}
        {/* VUE A : UTILISATEUR CONNECTÉ                                      */}
        {/* ================================================================= */}
        {activeAccount && !pendingSyncInfo ? (
          <div className="overflow-y-auto p-5 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-400/10 border border-emerald-400/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    @{activeAccount.username}
                  </p>
                  <p className="text-[11px] text-emerald-400">
                    Sauvegarde chiffrée automatique active
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (
                    window.confirm(
                      'Verrouiller ta session ? Tes données resteront protégées par ton mot de passe.'
                    )
                  ) {
                    await onAccountLockedOut();
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-primary)] hover:text-rose-400 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Verrouiller
              </button>
            </div>

            {/* Transfert vers un autre appareil (100% GitHub Pages, sans serveur tiers) */}
            <div className="rounded-2xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Retrouver mon compte sur un autre appareil
                </h3>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Génère un lien personnel ou un coffre chiffré par ton mot de passe : même envoyé par message ou email, personne d’autre ne peut l’ouvrir.
              </p>

              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Confirme ton mot de passe..."
                  className="input-dark !py-2 !pr-10 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGenerateTransferLink}
                  className="btn-accent !py-2 !text-xs"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Lien d’accès chiffré
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDownloadEncryptedFile}
                  className="btn-secondary !py-2 !text-xs"
                >
                  <FileLock2 className="w-3.5 h-3.5 text-emerald-400" />
                  Coffre .pulsevault
                </button>
              </div>

              {generatedLink && typeof navigator !== 'undefined' && navigator.share && (
                <button
                  type="button"
                  onClick={handleShareNative}
                  className="btn-primary w-full !py-2 !text-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Envoyer vers mon autre appareil
                </button>
              )}
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                  feedback.type === 'ok'
                    ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {feedback.type === 'ok' && <Check className="w-4 h-4 shrink-0" />}
                <span>{feedback.msg}</span>
              </div>
            )}
          </div>
        ) : (
          /* ================================================================= */
          /* VUE B : CONNEXION / CRÉATION DE COMPTE / DÉVERROUILLAGE LIEN      */
          /* ================================================================= */
          <form onSubmit={handleAuthSubmit} className="overflow-y-auto p-5 space-y-4">
            {pendingSyncInfo ? (
              <div className="p-3.5 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 space-y-1">
                <p className="text-xs font-semibold text-emerald-400">
                  Synchronisation du compte @{pendingSyncInfo.username}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Entre ton mot de passe pour déchiffrer et restaurer toutes tes données sur cet appareil.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 p-1 rounded-full bg-[var(--bg-subtle)]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setFeedback(null);
                  }}
                  className={`py-1.5 rounded-full text-xs font-semibold transition-all ${
                    authTab === 'login'
                      ? 'bg-emerald-400 text-zinc-950'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Se connecter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setFeedback(null);
                  }}
                  className={`py-1.5 rounded-full text-xs font-semibold transition-all ${
                    authTab === 'register'
                      ? 'bg-emerald-400 text-zinc-950'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Créer un compte
                </button>
              </div>
            )}

            {/* Sélection rapide d'un compte déjà enregistré sur l'appareil */}
            {!pendingSyncInfo && authTab === 'login' && savedAccounts.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {savedAccounts.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => setUsername(acc.username)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      username === acc.username
                        ? 'bg-emerald-400/15 border-emerald-400/50 text-emerald-400 font-semibold'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    @{acc.username}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Identifiant utilisateur
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(pendingSyncInfo)}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: axel"
                  autoComplete="username"
                  className="input-dark"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Mot de passe {authTab === 'register' ? '(8+ caractères)' : ''}
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={
                      authTab === 'register' ? 'new-password' : 'current-password'
                    }
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

                {authTab === 'register' && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10.5px] text-[var(--text-muted)]">
                      <span>Robustesse : {pwdStrength.label}</span>
                      <span className="tabular-nums">~{pwdStrength.bits} bits</span>
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

              {!pendingSyncInfo && authTab === 'register' && (
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="input-dark"
                  />
                </div>
              )}
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                  feedback.type === 'ok'
                    ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {feedback.type === 'ok' && <Check className="w-4 h-4 shrink-0" />}
                <span>{feedback.msg}</span>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-accent w-full py-3">
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {pendingSyncInfo
                ? 'Déverrouiller et importer mon compte'
                : authTab === 'register'
                ? 'Créer mon compte sécurisé'
                : 'Se connecter'}
            </button>

            {!pendingSyncInfo && (
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => vaultFileInputRef.current?.click()}
                  className="btn-secondary w-full !py-2 !text-xs"
                >
                  <FileLock2 className="w-3.5 h-3.5 text-emerald-400" />
                  Importer un fichier coffre (.pulsevault) d’un autre appareil
                </button>
                <input
                  ref={vaultFileInputRef}
                  type="file"
                  accept=".pulsevault,.json,application/json"
                  onChange={handleImportEncryptedFile}
                  className="hidden"
                />
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
