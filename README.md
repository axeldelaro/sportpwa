# PulseFit V2 — PWA Coaching Sportif, Nutrition Scientifique, IA Locale & Cloud Chiffré GitHub

**PulseFit** est une Progressive Web App (PWA) mobile-first au design minimaliste haute couture, intégrant un **Coach IA illimité** (RAG scientifique + vrai modèle LLM neural dans le navigateur), une recherche nutritionnelle sur **plus de 3 millions d'aliments**, un moteur mathématique d'équivalences et un **système de compte et sauvegarde Cloud chiffré de bout en bout (`AES-256-GCM`) reposant 100 % sur GitHub**.

- **Application en ligne (PWA) :** https://axeldelaro.github.io/sportpwa/
- **Dépôt GitHub :** https://github.com/axeldelaro/sportpwa

---

## Nouveautés Majeures V2

1. **Double Moteur IA Conversationnel Illimité & 100 % Gratuit :**
   - **LLM Neural Embarqué (`Qwen2.5-0.5B-Instruct` via WebGPU / WebAssembly)** : s'exécute directement dans votre navigateur dans un Web Worker dédié avec génération *streaming* mot par mot, zéro clé API et usage illimité.
   - **RAG Scientifique Instantané (`ISSN`, `ACSM`, `IOC`, `BJSM`, `PubMed`)** : chaque conseil s'appuie sur de vraies méta-analyses et consensus internationaux (Morton et al. 2018, Jäger et al. 2017, Schoenfeld et al. 2017, Kreider et al. 2017, Helms et al. 2014, McGill 2010...) avec liens cliquables vers les études PubMed.

2. **Recherche Alimentaire Universelle (3M+ Produits) + Sources Officielles :**
   - Socle hors-ligne certifié **ANSES CIQUAL / USDA** (151 aliments de référence) + connecteur en direct **Open Food Facts** (3+ millions d'aliments mondiaux, Nutri-Score et recherche par **Code-Barres EAN-13**).
   - **Classifieur nutritionnel automatique** : tout produit trouvé en ligne est classé automatiquement par famille de macros et mis en cache dans `IndexedDB` pour fonctionner hors-ligne et dans le **Moteur Mathématique d'Équivalences**.

3. **Compte, Mot de Passe & Sauvegarde Cloud Anti-Piratage (100 % GitHub) :**
   - **Cryptographie Zero-Knowledge (`Web Crypto API`)** : dérivation de clé **`PBKDF2-HMAC-SHA256` à `600 000` itérations** (norme OWASP anti-brute-force) + chiffrement authentifié **`AES-256-GCM`**.
   - **Synchronisation Multi-Appareils via GitHub Secret Gist** : vos données sont chiffrées sur votre appareil *avant* d'être envoyées sur votre coffre privé GitHub (même GitHub ne peut pas lire vos données).
   - **Export/Import `.pulsevault` chiffré** également disponible sans compte GitHub.

4. **Multilingue (`FR` / `EN` / `ES`) & 3 Styles d'Interface :**
   - Bascule instantanée **Français**, **English**, **Español** (interface + Coach IA).
   - 3 ambiances visuelles : **Studio Sombre**, **Noir OLED** et **Clair Ivoire** (haute lisibilité en plein soleil).

---

## Lancement Local & Déploiement

```bash
npm install
npm run dev -- --host
npm run build
```
Chaque `git push` sur `main` déploie automatiquement la version de production sur **GitHub Pages**.
