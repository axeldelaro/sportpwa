// Système Cloud Multi-Serveurs 100% Gratuit, Illimité & Anti-Piratage (Identifiant + Mot de passe uniquement)
// Protocole : Dérivation PBKDF2-HMAC-SHA256 (OWASP 210k tours, 512 bits) -> Signature Schnorr secp256k1 (BIP-340) + Chiffrement AES-256-GCM
// Réplication Cloud temps réel à quorum rapide sur 5 serveurs mondiaux redondants (NIP-78 Kind 30078) + Cache Hors-Ligne IndexedDB

import { secp256k1, schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import {
  LS_KEYS,
  safeJsonParse,
  getEncryptedAccountRecord,
  saveEncryptedAccountRecord,
} from '../db/database.js';

const PBKDF2_ITERATIONS = 210000;
const VAULT_D_TAG = 'pulsefit-vault-v3';

export const CLOUD_RELAYS = [
  'wss://nostr.mom',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.primal.net',
  'wss://offchain.pub',
];

const LOCKOUT_KEY = 'pulsefit_auth_lockout_v3';
const SESSION_CACHE_KEY = 'pulsefit_active_cloud_session_v3';

const webCrypto = globalThis.crypto;

// Horloge monotone anti-décalage entre PC et Téléphone
let highestSeenTimestampSec = 0;

function observeCloudTimestamp(tsSec) {
  const n = Number(tsSec) || 0;
  if (n > highestSeenTimestampSec) {
    highestSeenTimestampSec = n;
  }
}

function nextMonotonicTimestampSec() {
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec <= highestSeenTimestampSec) {
    highestSeenTimestampSec += 1;
  } else {
    highestSeenTimestampSec = nowSec;
  }
  return highestSeenTimestampSec;
}

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

function getStorageItem(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function setStorageItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
  } catch {
    // Ignore
  }
}

function removeStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

export function normalizeUsername(raw = '') {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 30);
}

function getClaimTagForUsername(username) {
  const digest = sha256(new TextEncoder().encode(`pulsefit-user-claim-v3:${username}`));
  return `pfu3_${bytesToHex(digest).slice(0, 40)}`;
}

// ==========================================
// PROTECTION ANTI-BRUTE-FORCE
// ==========================================

function checkRateLimit(username) {
  const map = safeJsonParse(getStorageItem(LOCKOUT_KEY) || '{}', {});
  const entry = map[username];
  if (entry && entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const waitSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    throw new Error(
      `Sécurité anti-brute-force : réessaie dans ${waitSec}s après plusieurs échecs.`
    );
  }
}

function recordFailedAttempt(username) {
  const map = safeJsonParse(getStorageItem(LOCKOUT_KEY) || '{}', {});
  const prev = map[username] || { count: 0, lockedUntil: 0 };
  const nextCount = prev.count + 1;
  const lockMs =
    nextCount >= 5 ? Math.min(300000, 15000 * Math.pow(2, nextCount - 5)) : 0;
  map[username] = {
    count: nextCount,
    lockedUntil: lockMs > 0 ? Date.now() + lockMs : 0,
  };
  setStorageItem(LOCKOUT_KEY, JSON.stringify(map));
}

function clearFailedAttempts(username) {
  const map = safeJsonParse(getStorageItem(LOCKOUT_KEY) || '{}', {});
  delete map[username];
  setStorageItem(LOCKOUT_KEY, JSON.stringify(map));
}

export function evaluatePasswordStrength(pwd = '') {
  if (!pwd) return { score: 0, bits: 0, label: 'Vide', color: 'bg-zinc-600' };
  let pool = 0;
  if (/[a-z]/.test(pwd)) pool += 26;
  if (/[A-Z]/.test(pwd)) pool += 26;
  if (/[0-9]/.test(pwd)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32;

  const bits = Math.round(pwd.length * Math.log2(Math.max(2, pool)));
  if (pwd.length < 6 || bits < 34) {
    return { score: 1, bits, label: 'Trop court (6+ car. requis)', color: 'bg-rose-500' };
  }
  if (bits < 58) {
    return { score: 2, bits, label: 'Correcte', color: 'bg-amber-400' };
  }
  if (bits < 80) {
    return { score: 3, bits, label: 'Forte (Anti-Piratage)', color: 'bg-emerald-400' };
  }
  return { score: 4, bits, label: 'Maximale (>80 bits)', color: 'bg-emerald-400' };
}

// ==========================================
// DÉRIVATION CRYPTOGRAPHIQUE DÉTERMINISTE (OWASP PBKDF2 512 BITS)
// ==========================================

async function deriveMasterBytes512(password, domainSaltStr) {
  const enc = new TextEncoder();
  const keyMaterial = await webCrypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await webCrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(domainSaltStr),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    512
  );

  return new Uint8Array(bits);
}

async function importAesKeyFromRaw(rawAesBytes) {
  return webCrypto.subtle.importKey(
    'raw',
    rawAesBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Dérive les clés cryptographiques Cloud & Chiffrement à partir de (identifiant + mot de passe)
 */
export async function deriveCloudIdentity(rawUsername, password) {
  const username = normalizeUsername(rawUsername);
  const master = await deriveMasterBytes512(
    password,
    `pulsefit-cloud-kdf-v3:${username}`
  );

  let signingBytes = master.slice(0, 32);
  if (!secp256k1.utils.isValidPrivateKey(signingBytes)) {
    signingBytes = sha256(signingBytes);
  }
  const aesBytes = master.slice(32, 64);

  const signingKeyHex = bytesToHex(signingBytes);
  const pubkeyHex = bytesToHex(schnorr.getPublicKey(signingBytes));
  const aesRawB64 = bytesToBase64(aesBytes);
  const aesKey = await importAesKeyFromRaw(aesBytes);

  return {
    username,
    signingKeyHex,
    pubkeyHex,
    aesRawB64,
    aesKey,
    claimTag: getClaimTagForUsername(username),
  };
}

// ==========================================
// COMPRESSION + CHIFFREMENT AUTHENTIFIÉ AES-256-GCM
// ==========================================

async function compressText(str) {
  const rawBytes = new TextEncoder().encode(str);
  if (typeof CompressionStream === 'undefined') {
    return { bytes: rawBytes, compressed: false };
  }
  try {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(rawBytes);
    writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return { bytes: new Uint8Array(buf), compressed: true };
  } catch {
    return { bytes: rawBytes, compressed: false };
  }
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

async function encryptPayloadToEnvelope(aesKey, username, dataObject) {
  const { bytes, compressed } = await compressText(JSON.stringify(dataObject));
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(`pulsefit-v3:${username}`);

  const cipherBuf = await webCrypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    aesKey,
    bytes
  );

  return JSON.stringify({
    v: 3,
    c: compressed ? 1 : 0,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(cipherBuf)),
  });
}

async function decryptEnvelopeToPayload(aesKey, username, envelopeStr) {
  const env = typeof envelopeStr === 'string' ? safeJsonParse(envelopeStr, null) : envelopeStr;
  if (!env || !env.iv || !env.ct) {
    throw new Error('Enveloppe chiffrée invalide.');
  }

  const iv = base64ToBytes(env.iv);
  const cipherBytes = base64ToBytes(env.ct);
  const aad = new TextEncoder().encode(`pulsefit-v3:${username}`);

  const plainBuf = await webCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    aesKey,
    cipherBytes
  );

  const jsonStr = await decompressBytes(new Uint8Array(plainBuf), env.c === 1);
  const parsed = safeJsonParse(jsonStr, null);
  if (!parsed) throw new Error('Données déchiffrées invalides.');
  return parsed;
}

// ==========================================
// RÉSEAU MULTI-RELAIS CLOUD À QUORUM RAPIDE (NIP-01 / NIP-78)
// ==========================================

function createSignedVaultEvent(signingKeyHex, pubkeyHex, claimTag, encryptedContent) {
  const skBytes = hexToBytes(signingKeyHex);
  const event = {
    kind: 30078,
    pubkey: pubkeyHex,
    created_at: nextMonotonicTimestampSec(),
    tags: [
      ['d', VAULT_D_TAG],
      ['t', claimTag],
    ],
    content: encryptedContent,
  };

  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);

  event.id = bytesToHex(sha256(new TextEncoder().encode(serialized)));
  event.sig = bytesToHex(schnorr.sign(event.id, skBytes));
  return event;
}

function verifyNostrEventSignature(ev) {
  try {
    if (!ev || !ev.id || !ev.sig || !ev.pubkey) return false;
    const serialized = JSON.stringify([
      0,
      ev.pubkey,
      ev.created_at,
      ev.kind,
      ev.tags,
      ev.content,
    ]);
    const expectedId = bytesToHex(sha256(new TextEncoder().encode(serialized)));
    if (expectedId !== ev.id) return false;
    return schnorr.verify(ev.sig, ev.id, ev.pubkey);
  } catch {
    return false;
  }
}

function publishEventToSingleRelay(relayUrl, event, timeoutMs = 3800) {
  if (typeof WebSocket === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    let settled = false;
    let ws;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        // Ignore
      }
      resolve(ok);
    };

    try {
      ws = new WebSocket(relayUrl);
    } catch {
      resolve(false);
      return;
    }

    const timer = setTimeout(() => finish(false), timeoutMs);

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify(['EVENT', event]));
      } catch {
        finish(false);
      }
    };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        if (parsed[0] === 'OK' && parsed[1] === event.id) {
          finish(Boolean(parsed[2]));
        }
      } catch {
        // Ignore
      }
    };

    ws.onerror = () => finish(false);
    ws.onclose = () => finish(false);
  });
}

/**
 * Publie en parallèle sur les 5 relais et rend la main dès que >=2 serveurs ont confirmé
 * (tout en laissant les autres finir la réplication en tâche de fond).
 */
async function publishEventToCloudQuorum(event) {
  if (typeof WebSocket === 'undefined') return 0;
  return new Promise((resolve) => {
    let ackCount = 0;
    let doneCount = 0;
    let resolved = false;
    let graceTimer = null;

    const finalize = () => {
      if (resolved) return;
      resolved = true;
      if (graceTimer) clearTimeout(graceTimer);
      resolve(ackCount);
    };

    CLOUD_RELAYS.forEach((url) => {
      publishEventToSingleRelay(url, event, 3800).then((ok) => {
        if (ok) ackCount += 1;
        doneCount += 1;

        if (ackCount >= 2 && !graceTimer && !resolved) {
          graceTimer = setTimeout(finalize, 200);
        }
        if (doneCount === CLOUD_RELAYS.length) {
          finalize();
        }
      });
    });
  });
}

function queryEventsFromSingleRelay(relayUrl, filter, timeoutMs = 3400) {
  if (typeof WebSocket === 'undefined') return Promise.resolve([]);
  return new Promise((resolve) => {
    const events = [];
    let settled = false;
    let ws;
    const subId = `pf_${Math.random().toString(36).slice(2, 8)}`;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        // Ignore
      }
      resolve(events);
    };

    try {
      ws = new WebSocket(relayUrl);
    } catch {
      resolve([]);
      return;
    }

    const timer = setTimeout(finish, timeoutMs);

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify(['REQ', subId, filter]));
      } catch {
        finish();
      }
    };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        if (parsed[0] === 'EVENT' && parsed[1] === subId && parsed[2]) {
          if (verifyNostrEventSignature(parsed[2])) {
            observeCloudTimestamp(parsed[2].created_at);
            events.push(parsed[2]);
          }
        } else if (parsed[0] === 'EOSE' && parsed[1] === subId) {
          finish();
        }
      } catch {
        // Ignore
      }
    };

    ws.onerror = finish;
    ws.onclose = finish;
  });
}

/**
 * Interroge les 5 serveurs Cloud avec résolution rapide par quorum (~300 ms)
 */
async function queryLatestCloudEvent(filter) {
  if (typeof WebSocket === 'undefined') return null;

  return new Promise((resolve) => {
    const collected = [];
    let finishedRelays = 0;
    let resolved = false;
    let graceTimer = null;

    const finalize = () => {
      if (resolved) return;
      resolved = true;
      if (graceTimer) clearTimeout(graceTimer);
      if (collected.length === 0) {
        resolve(null);
        return;
      }
      collected.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      observeCloudTimestamp(collected[0].created_at);
      resolve(collected[0]);
    };

    CLOUD_RELAYS.forEach((url) => {
      queryEventsFromSingleRelay(url, filter, 3400).then((evs) => {
        finishedRelays += 1;
        if (evs.length > 0) {
          collected.push(...evs);
          if (!graceTimer && !resolved) {
            graceTimer = setTimeout(finalize, 300);
          }
        } else if (finishedRelays >= 3 && collected.length === 0 && !graceTimer && !resolved) {
          graceTimer = setTimeout(finalize, 220);
        }

        if (finishedRelays === CLOUD_RELAYS.length) {
          finalize();
        }
      });
    });
  });
}

// ==========================================
// GESTION DE SESSION PERSISTANTE SUR L'APPAREIL
// ==========================================

export function persistUnlockedSession(identity) {
  const data = {
    username: identity.username,
    signingKeyHex: identity.signingKeyHex,
    pubkeyHex: identity.pubkeyHex,
    aesRawB64: identity.aesRawB64,
    claimTag: identity.claimTag,
    highestTs: highestSeenTimestampSec,
  };
  setStorageItem(SESSION_CACHE_KEY, JSON.stringify(data));
  setStorageItem(LS_KEYS.ACTIVE_ACCOUNT, identity.username);
}

export async function restoreUnlockedSession() {
  try {
    const raw = getStorageItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse(raw, null);
    if (!parsed?.username || !parsed?.aesRawB64 || !parsed?.signingKeyHex) return null;
    if (parsed.highestTs) observeCloudTimestamp(parsed.highestTs);
    const aesKey = await importAesKeyFromRaw(base64ToBytes(parsed.aesRawB64));
    return {
      ...parsed,
      aesKey,
    };
  } catch {
    return null;
  }
}

export function clearUnlockedSession() {
  removeStorageItem(SESSION_CACHE_KEY);
  removeStorageItem(LS_KEYS.ACTIVE_ACCOUNT);
}

// ==========================================
// API PUBLIQUE : INSCRIPTION / CONNEXION / SYNC CLOUD
// ==========================================

function prepareCompactBackup(backupData) {
  const safeProfile = backupData?.localStorage?.profile
    ? { ...backupData.localStorage.profile, onboardingCompleted: true }
    : undefined;

  return {
    ...backupData,
    updatedAtMs: Date.now(),
    localStorage: {
      ...(backupData?.localStorage || {}),
      ...(safeProfile ? { profile: safeProfile } : {}),
    },
    indexedDB: {
      ...(backupData?.indexedDB || {}),
      coachMessages: (backupData?.indexedDB?.coachMessages || []).slice(-40),
    },
  };
}

/**
 * INSCRIPTION EN LIGNE (PC ou Téléphone) : crée le compte chiffré sur les 5 serveurs Cloud
 */
export async function registerUserAccount(rawUsername, password, initialBackupData) {
  const username = normalizeUsername(rawUsername);
  if (username.length < 3) {
    throw new Error('L’identifiant doit contenir au moins 3 caractères (lettres ou chiffres).');
  }
  if (!password || password.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
  }

  const identity = await deriveCloudIdentity(username, password);

  // 1. Double vérification Cloud (par clé auteur ET par tag d'identifiant) pour ne jamais écraser un compte existant
  const [ownVaultEvent, existingClaimEvent] = await Promise.all([
    queryLatestCloudEvent({
      kinds: [30078],
      authors: [identity.pubkeyHex],
      '#d': [VAULT_D_TAG],
      limit: 1,
    }),
    queryLatestCloudEvent({
      kinds: [30078],
      '#t': [identity.claimTag],
      limit: 3,
    }),
  ]);

  const foundExistingOwn =
    ownVaultEvent ||
    (existingClaimEvent && existingClaimEvent.pubkey === identity.pubkeyHex
      ? existingClaimEvent
      : null);

  if (foundExistingOwn?.content) {
    // Le même utilisateur a déjà créé ce compte sur un autre appareil -> on restaure directement !
    const payload = await decryptEnvelopeToPayload(
      identity.aesKey,
      username,
      foundExistingOwn.content
    );
    persistUnlockedSession(identity);
    await saveEncryptedAccountRecord({
      username,
      pubkeyHex: identity.pubkeyHex,
      envelope: foundExistingOwn.content,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
    return { identity, payload, alreadyExisted: true };
  }

  if (existingClaimEvent && existingClaimEvent.pubkey !== identity.pubkeyHex) {
    throw new Error(
      `L'identifiant "@${username}" est déjà utilisé en ligne. Choisis-en un autre (ou utilise « Se connecter » si c'est ton compte).`
    );
  }

  // 2. Chiffre le profil et publie sur les 5 serveurs Cloud
  const compactBackup = prepareCompactBackup(initialBackupData);
  const encryptedEnvelope = await encryptPayloadToEnvelope(
    identity.aesKey,
    username,
    compactBackup
  );

  const signedEvent = createSignedVaultEvent(
    identity.signingKeyHex,
    identity.pubkeyHex,
    identity.claimTag,
    encryptedEnvelope
  );

  const ackCount = await publishEventToCloudQuorum(signedEvent);

  await saveEncryptedAccountRecord({
    username,
    pubkeyHex: identity.pubkeyHex,
    envelope: encryptedEnvelope,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  persistUnlockedSession(identity);

  if (ackCount === 0) {
    throw new Error(
      'Impossible de joindre les serveurs Cloud (vérifie ta connexion Internet avant de créer ton compte en ligne).'
    );
  }

  return { identity, payload: compactBackup, relaysReached: ackCount };
}

/**
 * CONNEXION MULTI-APPAREILS (PC <-> Téléphone) AVEC UNIQUEMENT IDENTIFIANT + MOT DE PASSE
 */
export async function loginUserAccount(rawUsername, password) {
  const username = normalizeUsername(rawUsername);
  if (!username || !password) {
    throw new Error('Renseigne ton identifiant et ton mot de passe.');
  }

  checkRateLimit(username);

  const identity = await deriveCloudIdentity(username, password);

  // 1. Recherche prioritaire sur les 5 serveurs Cloud (récupère le profil créé sur PC depuis le Téléphone !)
  const cloudEvent = await queryLatestCloudEvent({
    kinds: [30078],
    authors: [identity.pubkeyHex],
    '#d': [VAULT_D_TAG],
    limit: 1,
  });

  if (cloudEvent && cloudEvent.content) {
    try {
      const decryptedPayload = await decryptEnvelopeToPayload(
        identity.aesKey,
        username,
        cloudEvent.content
      );

      clearFailedAttempts(username);
      persistUnlockedSession(identity);
      await saveEncryptedAccountRecord({
        username,
        pubkeyHex: identity.pubkeyHex,
        envelope: cloudEvent.content,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});

      return {
        identity,
        payload: decryptedPayload,
        source: 'cloud',
      };
    } catch {
      recordFailedAttempt(username);
      throw new Error('Mot de passe incorrect ou données corrompues.');
    }
  }

  // 2. Repli hors-ligne local si pas de réseau mobile au moment de la connexion
  const localRecord = await getEncryptedAccountRecord(username).catch(() => null);
  if (localRecord?.envelope && localRecord.pubkeyHex === identity.pubkeyHex) {
    try {
      const decryptedPayload = await decryptEnvelopeToPayload(
        identity.aesKey,
        username,
        localRecord.envelope
      );
      clearFailedAttempts(username);
      persistUnlockedSession(identity);
      return {
        identity,
        payload: decryptedPayload,
        source: 'local',
      };
    } catch {
      // Continue vers diagnostic d'erreur
    }
  }

  // 3. Diagnostic précis : mauvais mot de passe vs compte inexistant
  const claimCheck = await queryLatestCloudEvent({
    kinds: [30078],
    '#t': [identity.claimTag],
    limit: 1,
  });

  recordFailedAttempt(username);
  if (claimCheck) {
    throw new Error(`Mot de passe incorrect pour le compte "@${username}".`);
  }

  throw new Error(
    `Aucun compte "@${username}" trouvé en ligne. Bascule sur l'onglet « Créer un compte » pour l'enregistrer sur le Cloud !`
  );
}

/**
 * SYNCHRONISATION AUTOMATIQUE EN ARRIÈRE-PLAN VERS LES SERVEURS CLOUD
 */
export async function syncPushAccountToCloud(identity, backupPayload) {
  if (!identity?.aesKey || !identity?.signingKeyHex || !identity?.username) {
    return { ok: false, relays: 0 };
  }

  const compactBackup = prepareCompactBackup(backupPayload);
  const encryptedEnvelope = await encryptPayloadToEnvelope(
    identity.aesKey,
    identity.username,
    compactBackup
  );

  await saveEncryptedAccountRecord({
    username: identity.username,
    pubkeyHex: identity.pubkeyHex,
    envelope: encryptedEnvelope,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  const signedEvent = createSignedVaultEvent(
    identity.signingKeyHex,
    identity.pubkeyHex,
    identity.claimTag || getClaimTagForUsername(identity.username),
    encryptedEnvelope
  );

  const relays = await publishEventToCloudQuorum(signedEvent);
  persistUnlockedSession(identity);
  return { ok: relays > 0, relays, updatedAtMs: compactBackup.updatedAtMs };
}

/**
 * RÉCUPÈRE LA DERNIÈRE VERSION DU CLOUD POUR UN COMPTE DÉJÀ CONNECTÉ
 */
export async function syncPullAccountFromCloud(identity) {
  if (!identity?.pubkeyHex || !identity?.aesKey) return null;

  const cloudEvent = await queryLatestCloudEvent({
    kinds: [30078],
    authors: [identity.pubkeyHex],
    '#d': [VAULT_D_TAG],
    limit: 1,
  });

  if (!cloudEvent?.content) return null;

  const payload = await decryptEnvelopeToPayload(
    identity.aesKey,
    identity.username,
    cloudEvent.content
  );

  await saveEncryptedAccountRecord({
    username: identity.username,
    pubkeyHex: identity.pubkeyHex,
    envelope: cloudEvent.content,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  persistUnlockedSession(identity);
  return payload;
}
