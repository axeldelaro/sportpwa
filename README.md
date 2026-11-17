# PulseFit — PWA Coaching Sportif, Nutrition Scientifique, IA Hors-Ligne Pré-chargée & Sync Cloud Chiffrée

**PulseFit** est une Progressive Web App (PWA) mobile-first au design minimaliste haute couture, intégrant un **Coach IA Scientifique pré-chargé dès l'ouverture (0 ms d'attente, 100 % hors-ligne)**, une recherche nutritionnelle sur **plus de 3 millions d'aliments**, un moteur mathématique d'équivalences et un **système de compte en ligne multi-appareils (PC & Téléphone) chiffré de bout en bout en `AES-256-GCM`**.

- **Application en ligne (PWA) :** https://axeldelaro.github.io/sportpwa/
- **Dépôt GitHub :** https://github.com/axeldelaro/sportpwa

---

## Architecture & Fonctionnalités Clés

1. **Synchronisation Cloud Multi-Appareils (PC ↔ Téléphone) par Identifiant + Mot de passe uniquement :**
   - **Zéro lien à copier, zéro token GitHub, stockage illimité & 100 % gratuit** : crée ton compte sur PC et connecte-toi instantanément sur ton téléphone avec ton identifiant et ton mot de passe.
   - **Cryptographie Zero-Knowledge (`Web Crypto API` + `secp256k1` Schnorr BIP-340)** : dérivation déterministe **`PBKDF2-HMAC-SHA256` (OWASP `210 000` tours, 512 bits)**, compression `deflate-raw`, chiffrement authentifié **`AES-256-GCM` avec AAD** et réplication à quorum rapide (~300 ms) sur **5 relais mondiaux redondants** (`NIP-78 Kind 30078`) + cache local `IndexedDB`.

2. **Coach IA Scientifique Pré-Caché dès le Lancement (0 ms d'attente, 100 % Hors-Ligne) :**
   - **Pré-indexation immédiate en mémoire vive** et mise en cache intégrale via Service Worker (`pulsefit-pwa-v4.0`) dès la première ouverture du site.
   - **20 modules experts & 25 méta-analyses internationales (`ISSN`, `ACSM`, `IOC`, `BJSM`, `The Lancet`, `PubMed`)** : menus complets calibrés sur tes macros, nutrition pré/post-séance, anatomie par groupe musculaire, double progression, calculateur 1RM, zones cardiaques Tanaka, compléments dosés au poids de corps, gestion de la satiété et équivalences au gramme près.
   - **Persistance hybride synchrone (`localStorage` + `IndexedDB`)** garantissant zéro perte de message.

3. **Nutrition Universelle (CIQUAL / USDA + 3M+ Open Food Facts) & Équivalences :**
   - 151 aliments certifiés hors-ligne + recherche temps réel sur 3 millions de produits et lecteur de **Code-Barres EAN-13**, reliés au **Moteur Mathématique d'Équivalences** (iso-macros & iso-calories arrondis à `5g`).

4. **Multilingue (`FR` / `EN` / `ES`) & 3 Styles d'Interface (`Studio`, `OLED`, `Ivoire`).**
