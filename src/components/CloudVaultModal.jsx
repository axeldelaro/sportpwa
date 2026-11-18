import React, { useState, useEffect } from 'react';
import {
  X,
  User,
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
            ? `Bon retour @${res.identity.username} ! Ton suivi est synchronisé.`
            : `Bienvenue @${res.identity.username} ! Tu peux retrouver ton suivi sur tous tes appareils.`,
        });
        return;
      }

      const res = await loginUserAccount(username, password);
      if (res.payload) {
        await onRestoreFullBackup(res.payload);
      }
      onAccountAuthenticated(res.identity);
      setPassword('');
      setFeedback({
        type: 'ok',
        msg: `Connecté à @${res.identity.username}. Ton suivi est à jour.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err.message || 'Impossible de se connecter.',
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
          msg: 'Ton suivi a bien été sauvegardé en ligne.',
        });
      } else {
        setFeedback({
          type: 'err',
          msg: 'Enregistré sur cet appareil (connexion Internet indisponible).',
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
          msg: 'Ton suivi est à jour sur cet appareil.',
        });
      } else {
        setFeedback({
          type: 'err',
          msg: 'Aucune mise à jour plus récente disponible.',
        });
      }
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md max-h-[90vh] card-elevated rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
        {/* En-tête simple et naturel */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center">
              <User className="w-4 h-4 text-[var(--text-primary)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Mon compte
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Retrouve tes séances et tes repas sur téléphone ou PC
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* VUE A : COMPTE CONNECTÉ */}
        {activeAccount ? (
          <div className="overflow-y-auto p-5 space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/65 border border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    @{activeAccount.username}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Synchronisation automatique activée
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (
                    window.confirm(
                      'Se déconnecter de cet appareil ? Tu pourras te reconnecter à tout moment avec ton identifiant et ton mot de passe.'
                    )
                  ) {
                    await onAccountLockedOut();
                    onClose();
                  }
                }}
                className="btn-secondary !py-1.5 !px-3 !text-xs shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-0.5">
              Utilise simplement ton identifiant <strong className="font-medium text-[var(--text-primary)]">@{activeAccount.username}</strong> et ton mot de passe sur un autre appareil pour récupérer tes objectifs, tes repas et ton historique d’entraînement.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={handleManualPush}
                className="btn-secondary !py-2.5 !text-xs"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                Sauvegarder
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
                Actualiser
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
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
          /* VUE B : CONNEXION / CRÉATION DE COMPTE */
          <form onSubmit={handleAuthSubmit} className="overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 seg-control">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setFeedback(null);
                }}
                className={`py-2 seg-item ${authTab === 'login' ? 'seg-item-active' : ''}`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setFeedback(null);
                }}
                className={`py-2 seg-item ${authTab === 'register' ? 'seg-item-active' : ''}`}
              >
                Créer un compte
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Identifiant
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex : axel"
                  autoComplete="username"
                  className="input-dark"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  Mot de passe {authTab === 'register' ? '(6 caractères min.)' : ''}
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
                className={`p-3 rounded-xl text-xs space-y-2 leading-relaxed ${
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
                      className="btn-secondary w-full !py-1.5 !px-3 !text-xs"
                    >
                      Créer ce compte maintenant →
                    </button>
                  )}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : authTab === 'register' ? (
                'Créer mon compte'
              ) : (
                'Me connecter'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
