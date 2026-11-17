# PulseFit — PWA Coaching Sportif, Nutrition Scientifique, IA Locale & Comptes Chiffrés

**PulseFit** est une Progressive Web App (PWA) mobile-first au design minimaliste haute couture, intégrant un **Coach IA illimité** (RAG scientifique + vrai modèle LLM neural dans le navigateur), une recherche nutritionnelle sur **plus de 3 millions d'aliments**, un moteur mathématique d'équivalences et un **système de compte utilisateur & mot de passe chiffré en `AES-256-GCM` sans aucun serveur tiers**.

- **Application en ligne (PWA) :** https://axeldelaro.github.io/sportpwa/
- **Dépôt GitHub :** https://github.com/axeldelaro/sportpwa

---

## Architecture & Sécurité

1. **Compte Utilisateur & Mot de Passe Anti-Piratage (100 % Autonome sur GitHub Pages) :**
   - **Inscription / Connexion simple par Identifiant + Mot de passe** (aucune connexion GitHub ni service externe requis).
   - **Cryptographie Zero-Knowledge (`Web Crypto API`)** : dérivation **`PBKDF2-HMAC-SHA256` à `600 000` itérations**, clé `CryptoKey` non-extractible en mémoire vive, chiffrement authentifié **`AES-256-GCM` avec AAD** et temporisation anti-brute-force.
   - **Transfert inter-appareils sans serveur** : génération d'un **Lien d'accès compressé et chiffré (`#sync=...`)** hébergé directement sur GitHub Pages ou d'un coffre `.pulsevault`, indéchiffrables sans le mot de passe du compte.

2. **Double Moteur IA Conversationnel Illimité & Gratuit :**
   - **LLM Neural Embarqué (`Qwen2.5-0.5B-Instruct` WebGPU / WASM)** avec streaming mot par mot et zéro clé API.
   - **RAG Scientifique International (`ISSN`, `ACSM`, `IOC`, `BJSM`, `PubMed`)** avec citations vérifiables cliquables.

3. **Nutrition Universelle (CIQUAL / USDA + 3M+ Open Food Facts) & Équivalences :**
   - 151 aliments certifiés hors-ligne + recherche temps réel sur 3 millions de produits et lecteur de **Code-Barres EAN-13**, tous reliés au **Moteur Mathématique d'Équivalences** (iso-macros & iso-calories arrondis à `5g`).

4. **Multilingue (`FR` / `EN` / `ES`) & 3 Styles d'Interface (`Studio`, `OLED`, `Ivoire`).**
