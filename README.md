# PulseFit — PWA Universelle de Coaching Sportif & Nutritionnel (100 % Locale)

**PulseFit** est une Progressive Web App (PWA) mobile-first au design épuré, conçue pour le coaching sportif, le suivi nutritionnel au gramme près, la gestion intelligente de liste de courses et le calcul mathématique d'équivalences nutritionnelles — **sans serveur distant, sans compte cloud et sans API externe payante**.

- **Dépôt GitHub :** https://github.com/axeldelaro/sportpwa
- **Application Web / PWA (GitHub Pages) :** https://axeldelaro.github.io/sportpwa/

---

## Points Forts

- **Interface Minimaliste & Moderne :** Design system sombre épuré (`Zinc-950` + option **Noir OLED**), hiérarchie claire sans surcharge visuelle, ergonomie au pouce à 5 onglets.
- **Profil Universel (Mifflin-St Jeor) & Allergies Dynamiques :** Calcul instantané BMR / TDEE / Macros / Eau selon votre objectif (*Perte de gras*, *Maintien*, *Prise de muscle*) + filtres d'exclusions automatiques (`Végétarien`, `Vegan`, `Sans lactose`, `Sans gluten`, `Sans œufs`, `Sans fruits à coque`, `Sans porc`, `Sans poissons/crustacés`, `Digestion sensible`).
- **Base Nutritionnelle de 151 Aliments & 40 Recettes Équilibrées :** Distinction stricte des grammages *cru*, *cuit* ou *prêt à consommer*, portions ajustables (`0.5x`, `1x`, `1.5x`, `2x`) et création de recettes sur-mesure.
- **Liste de Courses Intelligente & Moteur d'Équivalences :** Agrégation automatique sur 1 ou 7 jours par rayon, et remplacement instantané en **Mode Macro Dominante** ou **Mode Iso-Calorique** (arrondi à `5g` près + calcul du delta net).
- **7 Programmes Sportifs Complets + Lecteur Actif :** *Full Body Poids du Corps*, *Push/Pull/Legs*, *Upper/Lower*, *Haltères & Kettlebell Maison*, *Focus Fessiers/Jambes & Core*, *HIIT & Core 20 min*, *Mobilité & McGill*. Chronomètre d'effort et de repos automatique avec bips **Web Audio API**, modulation d'intensité et anti-perte au rechargement.
- **Coach IA 100 % Local :** Connecté en temps réel à vos macros restantes, votre hydratation et vos filtres alimentaires, fonctionnant intégralement hors-ligne.

---

## 1. Lancement Local (PC, Mac, Linux)

```bash
git clone https://github.com/axeldelaro/sportpwa.git
cd sportpwa
npm install
npm run dev
```

---

## 2. Lancement Local sur Android via Termux

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
git clone https://github.com/axeldelaro/sportpwa.git
cd sportpwa
npm install
npm run dev -- --host
```
Ouvrez `http://localhost:5173` dans votre navigateur mobile puis choisissez **« Installer l'application / Ajouter à l'écran d'accueil »**.

---

## 3. Build Statique & Déploiement GitHub Pages

Le projet est configuré avec `base: './'` dans `vite.config.js` et un workflow automatique dans `.github/workflows/deploy.yml` :

```bash
npm run build
```
Chaque `git push` sur la branche `main` compile automatiquement le dossier `dist/` et met à jour **GitHub Pages**.
