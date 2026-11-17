import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  LogOut,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  Check,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import {
  evaluatePasswordStrength,
  registerUserAccount,
  loginUserAccount,
  syncPushAccountToCloud,
  syncPullAccountFromCloud,
} from '../utils/cryptoVaultService';

export default function CloudVaultModal({
  isOpen,
  activeAccount,
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
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setPassword('');
    setConfirmPassword('');
    if (activeAccount?.username) {
      setUsername(activeAccount.username);
    }
  }, [isOpen, activeAccount]);

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
      if (authTab === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Les deux mots de passe ne correspondent pas.');
        }
        const currentBackup = await onGetFullBackup();
        const res = await registerUserAccount(username, password, currentBackup);

        if (res.alreadyExisted && res.payload) {
          await onRestoreFullBackup(res.payload);
        }

        onAccountAuthenticated(res.identity);
        setPassword('');
        setConfirmPassword('');
        setFeedback({
          type: 'ok',
          msg: res.alreadyExisted
            ? `Compte @${res.identity.username} retrouvé en ligne et synchronisé !`
            : `Compte @${res.identity.username} créé et sauvegardé sur le Cloud (${res.relaysReached || 1} serveurs) ! Tu peux maintenant t'y connecter depuis ton téléphone ou PC.`,
        });
        return;
      }

      // Connexion en ligne multi-appareils
      const res = await loginUserAccount(username, password);
      if (res.payload) {
        await onRestoreFullBackup(res.payload);
      }
      onAccountAuthenticated(res.identity);
      setPassword('');
      setFeedback({
        type: 'ok',
        msg: `Connecté à @${res.identity.username} ! Toutes tes données Cloud sont synchronisées.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err.message || 'Erreur de connexion.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleManualPush = async () => {
    if (!activeAccount) return;
    setFeedback(null);
    setBusy(true);
    try {
      const backup = await onGetFullBackup();
      const res = await syncPushAccountToCloud(activeAccount, backup);
      if (res.ok) {
        setFeedback({
          type: 'ok',
          msg: `Sauvegarde Cloud effectuée avec succès (${res.relays} serveurs répliqués) !`,
        });
      } else {
        setFeedback({
          type: 'err',
          msg: 'Sauvegardé en local (connexion réseau momentanément indisponible).',
        });
      }
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleManualPull = async () => {
    if (!activeAccount) return;
    setFeedback(null);
    setBusy(true);
    try {
      const latestPayload = await syncPullAccountFromCloud(activeAccount);
      if (latestPayload) {
        await onRestoreFullBackup(latestPayload);
        setFeedback({
          type: 'ok',
          msg: 'Dernières données du Cloud récupérées avec succès sur cet appareil !',
        });
      } else {
        setFeedback({
          type: 'err',
          msg: 'Aucune sauvegarde plus récente trouvée en ligne.',
        });
      }
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
                Compte En Ligne & Synchronisation
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Multi-appareils PC & Mobile · Chiffré AES-256-GCM
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
        {/* VUE A : COMPTE CONNECTÉ EN LIGNE                                  */}
        {/* ================================================================= */}
        {activeAccount ? (
          <div className="overflow-y-auto p-5 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-400/10 border border-emerald-400/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    @{activeAccount.username}
                  </p>
                  <p className="text-[11px] text-emerald-400">
                    Synchronisation Cloud automatique active
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (
                    window.confirm(
                      'Se déconnecter de cet appareil ? Tu pourras te reconnecter à tout moment avec ton identifiant et mot de passe.'
                    )
                  ) {
                    await onAccountLockedOut();
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-primary)] hover:text-rose-400 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-0.5">
              Connecte-toi simplement avec <strong>@{activeAccount.username}</strong> et ton mot de passe sur ton téléphone, tablette ou PC pour retrouver instantanément tout ton profil, tes repas et tes séances.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={handleManualPush}
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
                onClick={handleManualPull}
                className="btn-primary !py-2.5 !text-xs"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudDownload className="w-4 h-4" />
                )}
                Actualiser Cloud
              </button>
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
          /* VUE B : CONNEXION / INSCRIPTION EN LIGNE (USER + MOT DE PASSE)    */
          /* ================================================================= */
          <form onSubmit={handleAuthSubmit} className="overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 p-1 rounded-full bg-[var(--bg-subtle)]">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setFeedback(null);
                }}
                className={`py-2 rounded-full text-xs font-semibold transition-all ${
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
                className={`py-2 rounded-full text-xs font-semibold transition-all ${
                  authTab === 'register'
                    ? 'bg-emerald-400 text-zinc-950'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Créer un compte
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Identifiant utilisateur
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: axel"
                  autoComplete="username"
                  className="input-dark"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Mot de passe {authTab === 'register' ? '(6+ caractères)' : ''}
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
                      <span>Sécurité : {pwdStrength.label}</span>
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

              {authTab === 'register' && (
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
                className={`p-3 rounded-2xl text-xs space-y-2 leading-relaxed ${
                  feedback.type === 'ok'
                    ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === 'ok' && <Check className="w-4 h-4 shrink-0" />}
                  <span>{feedback.msg}</span>
                </div>
                {feedback.type === 'err' &&
                  authTab === 'login' &&
                  feedback.msg?.includes('Aucun compte') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setConfirmPassword(password);
                        setFeedback(null);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-400 text-zinc-950 font-semibold text-xs transition-transform active:scale-[0.99]"
                    >
                       Passer sur « Créer un compte » avec cet identifiant →
                    </button>
                  )}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-accent w-full py-3">
              {busy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Synchronisation Cloud en cours...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {authTab === 'register'
                    ? 'Créer mon compte en ligne'
                    : 'Se connecter et synchroniser'}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
