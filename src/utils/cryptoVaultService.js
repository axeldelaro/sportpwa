// Système de Compte Utilisateur & Mot de Passe 100% autonome (Zéro serveur tiers, Zéro connexion GitHub)
// Cryptographie Web Crypto API : PBKDF2-HMAC-SHA256 (600 000 tours) + AES-256-GCM authentifié (avec AAD)
// Synchronisation inter-appareils via Lien Chiffré Compressé (#sync=...) sur GitHub Pages ou fichier .pulsevault

import {
  LS_KEYS,
  safeJsonParse,
  getEncryptedAccountRecord,
  saveEncryptedAccountRecord,
} from '../db/database.js';

const PBKDF2_ITERATIONS = 600000;

// Anti-brute-force en mémoire et sessionStorage
const LOCKOUT_KEY = 'pulsefit_auth_lockout_v1';

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

function toBase64Url(bytes) {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(str) {
  let b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return base64ToBytes(b64);
}

export function normalizeUsername(raw = '') {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 30);
}

function checkRateLimit(username) {
  try {
    const map = safeJsonParse(sessionStorage.getItem(LOCKOUT_KEY) || '{}', {});
    const entry = map[username];
    if (entry && entry.lockedUntil && Date.now() < entry.lockedUntil) {
      const waitSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
      throw new Error(
        `Protection anti-piratage : réessaie dans ${waitSec}s après plusieurs tentatives échouées.`
      );
    }
  } catch (err) {
    if (err.message?.includes('Protection anti-piratage')) throw err;
  }
}

function recordFailedAttempt(username) {
  try {
    const map = safeJsonParse(sessionStorage.getItem(LOCKOUT_KEY) || '{}', {});
    const prev = map[username] || { count: 0, lockedUntil: 0 };
    const nextCount = prev.count + 1;
    const lockMs = nextCount >= 5 ? Math.min(300000, 15000 * Math.pow(2, nextCount - 5)) : 0;
    map[username] = {
      count: nextCount,
      lockedUntil: lockMs > 0 ? Date.now() + lockMs : 0,
    };
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota
  }
}

function clearFailedAttempts(username) {
  try {
    const map = safeJsonParse(sessionStorage.getItem(LOCKOUT_KEY) || '{}', {});
    delete map[username];
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

async function deriveUnextractableKey(password, saltBytes, iterations = PBKDF2_ITERATIONS) {
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
    false, // extractable: false -> impossible à lire même depuis la console JS
    ['encrypt', 'decrypt']
  );
}

async function compressString(str) {
  const rawBytes = new TextEncoder().encode(str);
  if (typeof CompressionStream === 'undefined') {
    return { bytes: rawBytes, compressed: false };
  }
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(rawBytes);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return { bytes: new Uint8Array(buf), compressed: true };
}

async function decompressBytes(bytes, isCompressed) {
  if (!isCompressed || typeof DecompressionStream === 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

/**
 * Évalue l'entropie et la robustesse du mot de passe
 */
export function evaluatePasswordStrength(pwd = '') {
  if (!pwd) return { score: 0, bits: 0, label: 'Vide', color: 'bg-zinc-600' };
  let pool = 0;
  if (/[a-z]/.test(pwd)) pool += 26;
  if (/[A-Z]/.test(pwd)) pool += 26;
  if (/[0-9]/.test(pwd)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32;

  const bits = Math.round(pwd.length * Math.log2(Math.max(2, pool)));
  if (pwd.length < 8 || bits < 42) {
    return { score: 1, bits, label: 'Faible (8+ caractères requis)', color: 'bg-rose-500' };
  }
  if (bits < 64) {
    return { score: 2, bits, label: 'Bonne', color: 'bg-amber-400' };
  }
  if (bits < 85) {
    return { score: 3, bits, label: 'Forte (Anti-Brute-Force)', color: 'bg-emerald-400' };
  }
  return { score: 4, bits, label: 'Maximale (>85 bits)', color: 'bg-emerald-400' };
}

export function getActiveAccountUsername() {
  try {
    return localStorage.getItem(LS_KEYS.ACTIVE_ACCOUNT) || null;
  } catch {
    return null;
  }
}

export function setActiveAccountUsername(username) {
  try {
    if (!username) localStorage.removeItem(LS_KEYS.ACTIVE_ACCOUNT);
    else localStorage.setItem(LS_KEYS.ACTIVE_ACCOUNT, normalizeUsername(username));
  } catch {
    // Ignore
  }
}

/**
 * Chiffre un objet JSON avec une clé AES-GCM déjà dérivée et un AAD lié au compte
 */
async function encryptWithDerivedKey(key, username, dataObject) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(`pulsefit:${username}`);
  const plainBytes = new TextEncoder().encode(JSON.stringify(dataObject));

  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    plainBytes
  );

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
  };
}

async function decryptWithDerivedKey(key, username, ivB64, cipherB64) {
  const iv = base64ToBytes(ivB64);
  const cipherBytes = base64ToBytes(cipherB64);
  const aad = new TextEncoder().encode(`pulsefit:${username}`);

  const plainBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    cipherBytes
  );

  const jsonStr = new TextDecoder().decode(plainBuf);
  const parsed = safeJsonParse(jsonStr, null);
  if (!parsed) throw new Error('Données corrompues.');
  return parsed;
}

/**
 * CRÉATION DE COMPTE UTILISATEUR + MOT DE PASSE
 */
export async function registerUserAccount(rawUsername, password, initialBackupData) {
  const username = normalizeUsername(rawUsername);
  if (username.length < 3) {
    throw new Error('L’identifiant doit contenir au moins 3 caractères (lettres/chiffres).');
  }
  if (!password || password.length < 8) {
    throw new Error('Pour ta sécurité, le mot de passe doit contenir au moins 8 caractères.');
  }

  const existing = await getEncryptedAccountRecord(username);
  if (existing) {
    throw new Error(`Le compte "${username}" existe déjà sur cet appareil. Connecte-toi !`);
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const sessionKey = await deriveUnextractableKey(password, salt, PBKDF2_ITERATIONS);
  const { iv, ciphertext } = await encryptWithDerivedKey(
    sessionKey,
    username,
    initialBackupData
  );

  const saltBase64 = bytesToBase64(salt);
  await saveEncryptedAccountRecord({
    username,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: saltBase64,
    iv,
    ciphertext,
    updatedAt: new Date().toISOString(),
  });

  setActiveAccountUsername(username);
  return { username, sessionKey, saltBase64 };
}

/**
 * CONNEXION UTILISATEUR + MOT DE PASSE (avec anti-brute-force)
 */
export async function loginUserAccount(rawUsername, password) {
  const username = normalizeUsername(rawUsername);
  if (!username || !password) {
    throw new Error('Renseigne ton identifiant et ton mot de passe.');
  }

  checkRateLimit(username);

  const record = await getEncryptedAccountRecord(username);
  if (!record) {
    throw new Error(
      `Aucun compte "${username}" sur cet appareil. Crée un compte ou ouvre ton lien/fichier de synchronisation si tu viens d'un autre appareil.`
    );
  }

  try {
    const saltBytes = base64ToBytes(record.salt);
    const sessionKey = await deriveUnextractableKey(
      password,
      saltBytes,
      Number(record.iterations) || PBKDF2_ITERATIONS
    );

    const decryptedBackup = await decryptWithDerivedKey(
      sessionKey,
      username,
      record.iv,
      record.ciphertext
    );

    clearFailedAttempts(username);
    setActiveAccountUsername(username);

    return {
      username,
      sessionKey,
      saltBase64: record.salt,
      payload: decryptedBackup,
    };
  } catch {
    recordFailedAttempt(username);
    throw new Error('Identifiant ou mot de passe incorrect.');
  }
}

/**
 * SAUVEGARDE CONTINUE CHIFFRÉE EN ARRIÈRE-PLAN (via la CryptoKey non-extractible en RAM)
 */
export async function saveEncryptedSessionSnapshot(
  username,
  sessionKey,
  saltBase64,
  backupPayload
) {
  if (!username || !sessionKey || !saltBase64) return;
  const { iv, ciphertext } = await encryptWithDerivedKey(
    sessionKey,
    username,
    backupPayload
  );

  await saveEncryptedAccountRecord({
    username,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: saltBase64,
    iv,
    ciphertext,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * GÉNÈRE UN LIEN DE TRANSFERT MULTI-APPAREILS 100% GITHUB PAGES (Compressé + AES-256-GCM)
 * Permet de retrouver son compte sur un nouveau téléphone/PC sans aucun serveur externe !
 */
export async function generateEncryptedSyncLink(rawUsername, password, backupPayload) {
  const username = normalizeUsername(rawUsername);
  if (!username || !password || password.length < 8) {
    throw new Error('Saisis ton mot de passe (8+ caractères) pour signer le lien de transfert.');
  }

  // Allège l'historique de bavardage du chat dans le lien URL pour garder un lien compact
  const compactBackup = {
    ...backupPayload,
    indexedDB: {
      ...(backupPayload.indexedDB || {}),
      coachMessages: (backupPayload.indexedDB?.coachMessages || []).slice(-10),
    },
  };

  const { bytes: compressedBytes, compressed } = await compressString(
    JSON.stringify(compactBackup)
  );

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveUnextractableKey(password, salt, PBKDF2_ITERATIONS);
  const aad = new TextEncoder().encode(`pulsefit:${username}`);

  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    compressedBytes
  );

  const flag = compressed ? '1' : '0';
  const tokenParts = [
    username,
    flag,
    toBase64Url(salt),
    toBase64Url(iv),
    toBase64Url(new Uint8Array(cipherBuf)),
  ].join('.');

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}#sync=${tokenParts}`;
}

/**
 * Détecte si l'URL courante contient un lien de synchronisation inter-appareils (#sync=...)
 */
export function inspectPendingSyncHash(hashStr = window.location.hash) {
  if (!hashStr || !hashStr.startsWith('#sync=')) return null;
  const raw = hashStr.slice(6);
  const parts = raw.split('.');
  if (parts.length !== 5) return null;
  return {
    username: normalizeUsername(parts[0]),
    rawToken: raw,
  };
}

/**
 * Déverrouille un lien #sync=... sur un nouvel appareil avec le mot de passe du compte
 */
export async function unlockSyncTokenAndImport(rawToken, password) {
  const parts = String(rawToken || '').split('.');
  if (parts.length !== 5) {
    throw new Error('Lien de synchronisation incomplet ou invalide.');
  }

  const [rawUser, flag, saltUrl, ivUrl, cipherUrl] = parts;
  const username = normalizeUsername(rawUser);
  checkRateLimit(username);

  try {
    const salt = fromBase64Url(saltUrl);
    const iv = fromBase64Url(ivUrl);
    const cipherBytes = fromBase64Url(cipherUrl);
    const aad = new TextEncoder().encode(`pulsefit:${username}`);

    const sessionKey = await deriveUnextractableKey(password, salt, PBKDF2_ITERATIONS);
    const plainBuf = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      sessionKey,
      cipherBytes
    );

    const jsonStr = await decompressBytes(new Uint8Array(plainBuf), flag === '1');
    const payload = safeJsonParse(jsonStr, null);
    if (!payload || !payload.indexedDB) {
      throw new Error('Contenu invalide.');
    }

    // Enregistre et chiffre immédiatement le compte sur ce nouvel appareil !
    const saltBase64 = bytesToBase64(salt);
    await saveEncryptedSessionSnapshot(username, sessionKey, saltBase64, payload);
    clearFailedAttempts(username);
    setActiveAccountUsername(username);

    return { username, sessionKey, saltBase64, payload };
  } catch {
    recordFailedAttempt(username);
    throw new Error('Mot de passe incorrect ou lien altéré.');
  }
}

/**
 * Export / Import de fichier coffre chiffré .pulsevault (AES-256-GCM, capacité illimitée)
 */
export async function encryptVaultData(dataObject, password, rawUsername = 'vault') {
  if (!password || password.length < 8) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
  }
  const username = normalizeUsername(rawUsername);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveUnextractableKey(password, salt, PBKDF2_ITERATIONS);
  const { iv, ciphertext } = await encryptWithDerivedKey(key, username, dataObject);

  return {
    vaultFormat: 'PulseFit-E2EE-v2',
    username,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv,
    ciphertext,
    encryptedAt: new Date().toISOString(),
  };
}

export async function decryptVaultData(envelope, password) {
  if (!envelope || envelope.cipher !== 'AES-256-GCM' || !envelope.ciphertext) {
    throw new Error('Fichier coffre non reconnu.');
  }
  const username = normalizeUsername(envelope.username || 'vault');
  checkRateLimit(username);

  try {
    const salt = base64ToBytes(envelope.salt);
    const sessionKey = await deriveUnextractableKey(
      password,
      salt,
      Number(envelope.iterations) || PBKDF2_ITERATIONS
    );

    let payload;
    if (envelope.vaultFormat === 'PulseFit-E2EE-v2') {
      payload = await decryptWithDerivedKey(
        sessionKey,
        username,
        envelope.iv,
        envelope.ciphertext
      );
    } else {
      // Rétrocompatibilité enveloppes v1
      const iv = base64ToBytes(envelope.iv);
      const cipherBytes = base64ToBytes(envelope.ciphertext);
      const plainBuf = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        sessionKey,
        cipherBytes
      );
      payload = safeJsonParse(new TextDecoder().decode(plainBuf), null);
    }

    clearFailedAttempts(username);
    return {
      username,
      sessionKey,
      saltBase64: envelope.salt,
      payload,
    };
  } catch {
    recordFailedAttempt(username);
    throw new Error('Mot de passe incorrect ou fichier altéré.');
  }
}
