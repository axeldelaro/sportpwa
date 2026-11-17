// Cryptographie Zero-Knowledge de grade militaire (Web Crypto API native)
// PBKDF2-HMAC-SHA256 (600 000 itérations OWASP) + AES-256-GCM authentifié
// Synchronisation Cloud 100% GitHub (Secret Gist Vault) sans aucun serveur tiers

import { LS_KEYS } from '../db/database.js';

const PBKDF2_ITERATIONS = 600000;

function bytesToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesGcmKey(password, saltBytes, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffre n'importe quel objet JSON en AES-256-GCM avec sel et IV uniques
 */
export async function encryptVaultData(dataObject, masterPassword) {
  if (!masterPassword || masterPassword.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesGcmKey(masterPassword, salt, PBKDF2_ITERATIONS);

  const encodedPlaintext = new TextEncoder().encode(JSON.stringify(dataObject));
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedPlaintext
  );

  return {
    vaultFormat: 'PulseFit-ZeroKnowledge-v1',
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)),
    encryptedAt: new Date().toISOString(),
  };
}

/**
 * Déchiffre et vérifie l'intégrité cryptographique d'une enveloppe AES-256-GCM
 */
export async function decryptVaultData(envelope, masterPassword) {
  if (!envelope || envelope.cipher !== 'AES-256-GCM' || !envelope.ciphertext) {
    throw new Error('Format de coffre chiffré non valide.');
  }

  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const ciphertext = base64ToBytes(envelope.ciphertext);
    const iterations = Number(envelope.iterations) || PBKDF2_ITERATIONS;

    const key = await deriveAesGcmKey(masterPassword, salt, iterations);
    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoded = new TextDecoder().decode(plainBuffer);
    return JSON.parse(decoded);
  } catch {
    throw new Error('Mot de passe incorrect ou coffre altéré (échec vérification AES-GCM).');
  }
}

/**
 * Évalue l'entropie et la robustesse d'un mot de passe contre le brute-force
 */
export function evaluatePasswordStrength(pwd = '') {
  if (!pwd) return { score: 0, label: 'Vide', color: 'bg-zinc-700' };
  let pool = 0;
  if (/[a-z]/.test(pwd)) pool += 26;
  if (/[A-Z]/.test(pwd)) pool += 26;
  if (/[0-9]/.test(pwd)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32;

  const entropyBits = Math.round(pwd.length * Math.log2(Math.max(2, pool)));

  if (entropyBits < 40 || pwd.length < 8) {
    return { score: 1, bits: entropyBits, label: 'Faible (min. 8 car. conseillés)', color: 'bg-rose-500' };
  }
  if (entropyBits < 65) {
    return { score: 2, bits: entropyBits, label: 'Correcte', color: 'bg-amber-400' };
  }
  if (entropyBits < 85) {
    return { score: 3, bits: entropyBits, label: 'Forte (Anti-Brute-Force)', color: 'bg-emerald-400' };
  }
  return { score: 4, bits: entropyBits, label: 'Militaire (>85 bits)', color: 'bg-emerald-400' };
}

function sanitizeAccountSlug(accountId = '') {
  return (
    String(accountId)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 32) || 'default'
  );
}

export function loadVaultMetadata() {
  try {
    const raw = localStorage.getItem(LS_KEYS.CLOUD_VAULT_META);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveVaultMetadata(meta) {
  if (!meta) {
    localStorage.removeItem(LS_KEYS.CLOUD_VAULT_META);
    return;
  }
  localStorage.setItem(LS_KEYS.CLOUD_VAULT_META, JSON.stringify(meta));
}

/**
 * Recherche automatiquement le Gist privé correspondant au compte sur GitHub
 */
async function findExistingVaultGist(githubToken, vaultFileName) {
  const res = await fetch('https://api.github.com/gists?per_page=100', {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (res.status === 401) {
    throw new Error('Clé GitHub invalide ou expirée (vérifie le droit "gist").');
  }
  if (!res.ok) {
    throw new Error(`Erreur API GitHub (${res.status}).`);
  }

  const gists = await res.json();
  return gists.find((g) => g.files && g.files[vaultFileName]) || null;
}

/**
 * Chiffre toute la base locale en AES-256-GCM et la sauvegarde sur un Gist privé GitHub
 */
export async function syncPushToGitHubVault({
  accountId,
  masterPassword,
  githubToken,
  fullBackupPayload,
}) {
  const slug = sanitizeAccountSlug(accountId);
  const fileName = `pulsefit_vault_${slug}.enc.json`;

  // 1. Chiffrement Zero-Knowledge côté client avant tout envoi réseau
  const encryptedVault = await encryptVaultData(
    {
      accountId: slug,
      payload: fullBackupPayload,
    },
    masterPassword
  );

  const fileContent = JSON.stringify(encryptedVault, null, 2);

  // 2. Recherche si un coffre existe déjà pour ce compte
  const existingGist = await findExistingVaultGist(githubToken, fileName);

  let savedGist;
  if (existingGist) {
    const updateRes = await fetch(`https://api.github.com/gists/${existingGist.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: `PulseFit Zero-Knowledge Encrypted Vault (${slug})`,
        files: {
          [fileName]: { content: fileContent },
        },
      }),
    });
    if (!updateRes.ok) throw new Error(`Échec mise à jour Cloud GitHub (${updateRes.status})`);
    savedGist = await updateRes.json();
  } else {
    const createRes = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: `PulseFit Zero-Knowledge Encrypted Vault (${slug})`,
        public: false,
        files: {
          [fileName]: { content: fileContent },
        },
      }),
    });
    if (!createRes.ok) throw new Error(`Échec création coffre GitHub (${createRes.status})`);
    savedGist = await createRes.json();
  }

  // 3. Chiffre le jeton GitHub au repos avec le Mot de Passe Maître (jamais stocké en clair !)
  const encryptedTokenEnvelope = await encryptVaultData({ token: githubToken }, masterPassword);
  const meta = {
    accountId: slug,
    gistId: savedGist.id,
    encryptedToken: encryptedTokenEnvelope,
    lastSyncAt: new Date().toISOString(),
  };
  saveVaultMetadata(meta);

  return meta;
}

/**
 * Télécharge le coffre chiffré depuis GitHub sur un nouvel appareil et le déchiffre localement
 */
export async function syncPullFromGitHubVault({
  accountId,
  masterPassword,
  githubToken,
  explicitGistId = '',
}) {
  const slug = sanitizeAccountSlug(accountId);
  const fileName = `pulsefit_vault_${slug}.enc.json`;

  let targetGistId = explicitGistId.trim();
  if (!targetGistId) {
    if (!githubToken) {
      throw new Error('Renseigne ta clé GitHub Gist ou ton ID de coffre pour restaurer.');
    }
    const found = await findExistingVaultGist(githubToken, fileName);
    if (!found) {
      throw new Error(`Aucun coffre "${fileName}" trouvé sur ce compte GitHub.`);
    }
    targetGistId = found.id;
  }

  const headers = { Accept: 'application/vnd.github+json' };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;

  const res = await fetch(`https://api.github.com/gists/${targetGistId}`, { headers });
  if (!res.ok) throw new Error(`Impossible de récupérer le coffre (${res.status}).`);
  const gistData = await res.json();

  const fileEntry =
    gistData.files?.[fileName] ||
    Object.values(gistData.files || {}).find((f) => f.filename?.endsWith('.enc.json'));

  if (!fileEntry || !fileEntry.content) {
    throw new Error('Fichier de coffre chiffré introuvable dans ce Gist.');
  }

  const envelope = JSON.parse(fileEntry.content);
  const decrypted = await decryptVaultData(envelope, masterPassword);

  if (githubToken) {
    const encryptedTokenEnvelope = await encryptVaultData({ token: githubToken }, masterPassword);
    saveVaultMetadata({
      accountId: slug,
      gistId: targetGistId,
      encryptedToken: encryptedTokenEnvelope,
      lastSyncAt: new Date().toISOString(),
    });
  }

  return decrypted.payload;
}
