# Pulse — Entraînement & Nutrition (PWA Offline-First)

**Pulse** est une Progressive Web App (PWA) mobile-first conçue avec une direction artistique éditoriale sobre et soignée : **3 ambiances calibrées (Sombre graphite, Noir OLED, Clair papier chaud)**, **démonstrations biomécaniques animées**, **près de 3 000 aliments officiels ANSES CIQUAL 100 % hors-ligne (+ 3 millions+ Open Food Facts + synthèse universelle)**, **144 exercices catégorisés**, **Coach autonome sans quota** et **synchronisation chiffrée multi-appareils**.

- **Application en ligne (PWA) :** https://axeldelaro.github.io/sportpwa/
- **Téléchargement direct APK Android (signé via GitHub Actions) :** https://github.com/axeldelaro/sportpwa/releases/download/apk-latest/Pulse.apk
- **Dépôt GitHub :** https://github.com/axeldelaro/sportpwa

---

## Points Forts (V7 — Édition Éditoriale)

1. **Direction Artistique Sobre & Humaine (Sombre, Noir OLED, Clair) :**
   - Typographie **Inter** à chiffres tabulaires (`tabular-nums`), surfaces mattes finement étagées sans néon ni surcharge visuelle, contrôles segmentés tactiles, contrastes d'encre nets et accent **Sauge minérale** mesuré.
   - Illustrations biomécaniques et anatomiques adaptatives aux thèmes sombre et clair.

2. **Générateur de Semaine (« Du Placard au Menu ») & Recettes Dynamiques :**
   - **Planificateur 3 / 5 / 7 jours (`WeeklyPlannerModal.jsx`)** : saisissez quelques ingrédients disponibles (*ex : poulet, riz, œufs*) pour composer automatiquement la semaine complète calée sur vos macros (mode *Varié* ou *Batch Cooking 2j*), distinguer ce que vous possédez déjà (`✓`) de **ce qu'il vous manque (`+`)**, et envoyer les manquants aux courses en 1 clic.
   - **Réactualisation intégrale des recettes** (`resolveDynamicRecipe`) et **4 suggestions culinaires variées par repas** pour chacun des 302+ aliments hors-ligne et produits Open Food Facts (+ **scan caméra EAN en direct**).

3. **Démonstrations Biomécaniques, Récupération & Outils Salle :**
   - Moteur cinématique vectoriel articulé (`ExerciseMotionVisual.jsx`) adaptatif aux thèmes sur **les 144 exercices** + **courbe de progression personnelle (1RM)** sur chaque fiche mouvement.
   - **Carte de récupération musculaire & volume effectif 7 jours**, **anti-veille écran (`Wake Lock`)**, **retour haptique**, **séries avancées (`#` Normale / `E` Échauffement / `D` Drop-set)**, **calculateur de disques olympiques (`20 kg`)** et **métabolisme réel observé (`TDEE adaptatif`)**.

4. **Coach IA Compositionnel Embarqué (100 % Autonome & Sans Quota En Ligne) :**
   - **Générateur de séances en langage naturel**, **calculateur multi-aliments & unités naturelles**, **idées de recettes par ingrédient** (*« Idées de recettes avec du saumon »*) et **solveur de repas au gramme près**, avec boutons d'action directs dans le chat et **25 méta-analyses internationales (`ISSN`, `ACSM`, `IOC`, `The Lancet`, `PubMed`)**.

5. **Base Alimentaire Hors-Ligne Intégrale (2 970+ références ANSES CIQUAL) & Synchro Cloud (`AES-256-GCM`) :**
   - **2 970+ aliments courants de magasin & cuisine 100 % hors-ligne** (`ciqualSupermarketCatalog.js` + catalogues essentiels) + **3 millions+ de produits Open Food Facts** & caméra EAN.
   - Mémoire personnelle (`recipeOverrides`, `dislikedFoodIds`, `favoriteRecipeIds`, 14 équipements sportifs) synchronisée entre PC et smartphone par simple `Identifiant + Mot de passe`.
