# PULSE — Athletic & Nutrition Club (PWA Édition Salles de Sport & Coaching Pro)

**PULSE Athletic Club** est une Progressive Web App (PWA) mobile-first de calibre club sportif professionnel : design **Obsidian & Volt**, **représentations biomécaniques animées 60 FPS**, **302 aliments certifiés hors-ligne (+ 3 millions+ en direct)**, **144 exercices catégorisés**, **Coach IA compositionnel embarqué sans quota** et **synchronisation Cloud chiffrée multi-appareils**.

- **Application en ligne (PWA) :** https://axeldelaro.github.io/sportpwa/
- **Dépôt GitHub :** https://github.com/axeldelaro/sportpwa

---

## Points Forts (V6.5 — Athletic Club Edition)

1. **Design System « Athletic Club » Mobile-First (Zéro Surcharge) :**
   - Typographie géométrique **Plus Jakarta Sans** & métriques **JetBrains Mono**, dock de navigation flottant en verre dépoli, hiérarchie éditoriale aérée et 3 ambiances studio (**Volt Club**, **Carbone OLED**, **Ivoire**).
   - Divulgation progressive (accordéons repas épurés, fiches biomécaniques dédiées, sparkline de tendance pondérale SVG, contrôles adaptés à l'usage en salle à une main).

2. **Recettes Dynamiques en Temps Réel & 4 Suggestions Variées par Aliment :**
   - **Réactualisation intégrale des recettes** (`resolveDynamicRecipe`) : remplacer un ingrédient dans le catalogue `Recettes`, dans le journal quotidien ou via la liste `Exclus` met à jour instantanément le **titre**, les **étapes de préparation**, les **ingrédients** et les **macros** (avec mémorisation dans le profil synchronisé et option *« Rétablir l'originale »*).
   - **Suggestions culinaires variées (4 idées par type de repas)** disponibles en 1 tap pour **chacun des 302+ aliments hors-ligne et produits Open Food Facts** (*Petit-déjeuner*, *Déjeuner*, *Collation*, *Dîner*) depuis le sélecteur d'aliments, la liste de courses et le Coach IA.

3. **Démonstrations Biomécaniques Animées 60 FPS & Outils de Progression en Salle :**
   - Moteur cinématique vectoriel articulé (`ExerciseMotionVisual.jsx`) sur **les 144 exercices** + cartographie anatomique musculaire.
   - **Pré-remplissage intelligent des charges** d'après la dernière séance, **calculateur de disques olympiques (barre 20 kg)** intégré au lecteur actif et **détection automatique des Records Personnels (PR / 1RM)**.

4. **Coach IA Compositionnel Embarqué (100 % Autonome & Sans Quota En Ligne) :**
   - **Générateur de séances en langage naturel**, **calculateur multi-aliments & unités naturelles**, **idées de recettes par ingrédient** (*« Idées de recettes avec du saumon »*) et **solveur de repas au gramme près**, avec boutons d'action directs dans le chat et **25 méta-analyses internationales (`ISSN`, `ACSM`, `IOC`, `The Lancet`, `PubMed`)**.

5. **Panel Intégral d'Aliments & Mémoire Profil Synchronisée Cloud (`AES-256-GCM`) :**
   - **302 aliments certifiés CIQUAL / USDA hors-ligne** + **3 millions+ de produits Open Food Facts** & code-barres EAN.
   - Mémoire personnelle (`recipeOverrides`, `dislikedFoodIds`, `favoriteRecipeIds`, 14 équipements sportifs) synchronisée entre PC et smartphone par simple `Identifiant + Mot de passe`.
