import {
  getFoodById,
  calculateFoodMacros,
  isFoodCompatibleWithProfile,
} from './foodDatabase.js';

export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Petit-déjeuner', timeHint: 'Matin' },
  { id: 'lunch', label: 'Déjeuner', timeHint: 'Midi' },
  { id: 'snack', label: 'Collation', timeHint: '16h30' },
  { id: 'dinner', label: 'Dîner', timeHint: 'Soir' },
];

export const RECIPES_DATA = [
  // =========================================================================
  // PETITS-DÉJEUNERS (10 RECETTES)
  // =========================================================================
  {
    id: 'rec_porridge_proteine',
    title: 'Porridge Crémeux Fruits Rouges & Amande',
    mealTypes: ['breakfast', 'snack'],
    prepMinutes: 6,
    goalTag: 'Équilibre',
    description: 'Fibres bêta-glucanes et protéines lentes pour tenir jusqu’à midi.',
    ingredients: [
      { foodId: 'flocons_avoine', grams: 65 },
      { foodId: 'lait_demi_ecreme', grams: 180 },
      { foodId: 'skyr_0', grams: 120 },
      { foodId: 'myrtilles_fruits_rouges', grams: 100 },
      { foodId: 'puree_amande', grams: 15 },
    ],
    steps: [
      "Chauffer les flocons d'avoine avec le lait 3 min à feu doux.",
      'Hors du feu, incorporer le Skyr 0% pour un rendu onctueux.',
      "Garnir de fruits rouges et d'un filet de purée d'amande.",
    ],
  },
  {
    id: 'rec_cream_of_rice_whey',
    title: 'Cream of Rice Framboises, Whey & Chocolat 85%',
    mealTypes: ['breakfast', 'snack'],
    prepMinutes: 4,
    goalTag: 'Pré-Séance',
    description: 'Ultra digeste, sans gluten, assimilation rapide avant entraînement.',
    ingredients: [
      { foodId: 'creme_de_riz', grams: 65 },
      { foodId: 'whey_isolate', grams: 30 },
      { foodId: 'framboises', grams: 100 },
      { foodId: 'chocolat_noir_85', grams: 15 },
    ],
    steps: [
      "Délayer la crème de riz dans 220 ml d'eau bouillante jusqu'à texture veloutée.",
      'Incorporer la Whey Isolate tiédie puis déposer le carré de chocolat noir 85% fondant et les framboises.',
    ],
  },
  {
    id: 'rec_omelette_levain_avocat',
    title: 'Omelette Plein Air, Pain au Levain & Avocat',
    mealTypes: ['breakfast', 'dinner'],
    prepMinutes: 10,
    goalTag: 'Énergie Stable',
    description: 'Petit-déjeuner salé à index glycémique bas sans pic d’insuline.',
    ingredients: [
      { foodId: 'oeufs_entiers', grams: 150 },
      { foodId: 'blancs_oeufs', grams: 80 },
      { foodId: 'pain_levain', grams: 80 },
      { foodId: 'avocat', grams: 60 },
      { foodId: 'epinards_frais', grams: 60 },
    ],
    steps: [
      "Battre les œufs et les blancs d'œufs avec poivre et ciboulette.",
      'Saisir les pousses d’épinards 1 min puis cuire l’omelette baveuse.',
      "Servir sur le pain au levain grillé tartiné d'avocat.",
    ],
  },
  {
    id: 'rec_bagel_saumon_cottage',
    title: 'Bagel Grillé Saumon Fumé, Cottage & Concombre',
    mealTypes: ['breakfast', 'lunch'],
    prepMinutes: 5,
    goalTag: 'Brunch Protéiné',
    description: 'Riche en Oméga-3 et prêt en 5 minutes sans cuisson complexe.',
    ingredients: [
      { foodId: 'bagel_pita', grams: 85 },
      { foodId: 'saumon_fume', grams: 80 },
      { foodId: 'cottage_cheese', grams: 90 },
      { foodId: 'concombre', grams: 80 },
    ],
    steps: [
      'Ouvrir et toaster légèrement le bagel.',
      'Tartiner le cottage cheese citronné, ajouter les fines rondelles de concombre et le saumon fumé.',
    ],
  },
  {
    id: 'rec_pancakes_sarrasin_banane',
    title: 'Pancakes Sarrasin-Banane (Sans Gluten)',
    mealTypes: ['breakfast', 'snack'],
    prepMinutes: 12,
    goalTag: 'Prise de Muscle',
    description: 'Moelleux, naturellement sans gluten et riches en magnésium.',
    ingredients: [
      { foodId: 'sarrasin_cru', grams: 70 },
      { foodId: 'banane', grams: 110 },
      { foodId: 'oeufs_entiers', grams: 120 },
      { foodId: 'lait_amande', grams: 80 },
      { foodId: 'beurre_cacahuete', grams: 15 },
    ],
    steps: [
      "Mixer le sarrasin, la banane mûre, les œufs et le lait d'amande.",
      'Cuire des petits pancakes 1 min 30 par face sur poêle chaude.',
      'Napper de beurre de cacahuète 100%.',
    ],
  },
  {
    id: 'rec_chia_pudding_vegan_mangue',
    title: 'Chia Bowl Vegan Mangue & Protéine',
    mealTypes: ['breakfast', 'snack'],
    prepMinutes: 5,
    goalTag: 'Vegan',
    description: 'Idéal en préparation la veille (Overnight), riche en Oméga-3.',
    ingredients: [
      { foodId: 'graines_chia', grams: 25 },
      { foodId: 'boisson_soja', grams: 200 },
      { foodId: 'yaourt_soja', grams: 120 },
      { foodId: 'proteine_vegan_poudre', grams: 25 },
      { foodId: 'mangue', grams: 120 },
    ],
    steps: [
      'Mélanger la boisson soja, la protéine végétale et les graines de chia.',
      'Laisser épaissir au frais au moins 20 min.',
      'Ajouter le yaourt soja et la mangue fraîche coupée en dés.',
    ],
  },
  {
    id: 'rec_bowl_skyr_kiwi_noix',
    title: 'Bowl Frais Skyr, Kiwi, Pomme & Pistaches',
    mealTypes: ['breakfast', 'snack'],
    prepMinutes: 4,
    goalTag: 'Sèche',
    description: 'Zéro cuisson, ultra-frais et riche en vitamine C.',
    ingredients: [
      { foodId: 'skyr_0', grams: 220 },
      { foodId: 'kiwi', grams: 120 },
      { foodId: 'pomme', grams: 120 },
      { foodId: 'pistaches', grams: 20 },
    ],
    steps: [
      'Verser le Skyr dans un bol.',
      'Ajouter le kiwi et la pomme en dés croquants puis les pistaches concassées.',
    ],
  },
  {
    id: 'rec_tartines_cottage_dinde',
    title: 'Tartines Complètes Cottage Cheese & Dinde',
    mealTypes: ['breakfast', 'lunch'],
    prepMinutes: 5,
    goalTag: 'Express',
    description: 'Alternative salée rapide pour les matins pressés.',
    ingredients: [
      { foodId: 'pain_complet', grams: 95 },
      { foodId: 'cottage_cheese', grams: 130 },
      { foodId: 'jambon_dinde', grams: 90 },
      { foodId: 'tomates', grams: 100 },
      { foodId: 'huile_olive', grams: 5 },
    ],
    steps: [
      'Toaster le pain complet et étaler le cottage cheese.',
      "Disposer le blanc de dinde, les tomates et un filet d'huile d'olive.",
    ],
  },
  {
    id: 'rec_tofu_scramble_patate_douce',
    title: 'Tofu Brouillé Curcuma & Patate Douce Rôtie',
    mealTypes: ['breakfast', 'lunch'],
    prepMinutes: 15,
    goalTag: 'Vegan Sans Gluten',
    description: 'Brunch sportif complet 100% végétal, sans lactose et sans œufs.',
    ingredients: [
      { foodId: 'tofu_ferme', grams: 180 },
      { foodId: 'patate_douce_crue', grams: 220 },
      { foodId: 'epinards_frais', grams: 100 },
      { foodId: 'poivrons', grams: 100 },
      { foodId: 'huile_olive', grams: 10 },
    ],
    steps: [
      'Rôtir la patate douce en petits dés 12 min.',
      'Émietter le tofu ferme avec curcuma et poivre noir.',
      "Faire sauter avec les poivrons, l'huile d'olive et les épinards.",
    ],
  },
  {
    id: 'rec_muesli_yaourt_grec_peche',
    title: 'Muesli Artisanal, Yaourt Grec & Pêche Fraîche',
    mealTypes: ['breakfast'],
    prepMinutes: 3,
    goalTag: 'Équilibre',
    description: 'Texture croquante et onctueuse prête en 3 minutes.',
    ingredients: [
      { foodId: 'muesli_sans_sucre', grams: 65 },
      { foodId: 'yaourt_grec', grams: 180 },
      { foodId: 'peche_abricot', grams: 150 },
      { foodId: 'graines_chanvre', grams: 12 },
    ],
    steps: [
      'Déposer le yaourt grec au fond du bol.',
      'Ajouter le muesli sans sucres ajoutés, les quartiers de pêche et les graines de chanvre.',
    ],
  },

  // =========================================================================
  // DÉJEUNERS (12 RECETTES)
  // =========================================================================
  {
    id: 'rec_poulet_basmati_brocoli',
    title: 'Bowl Poulet Grillé, Riz Basmati & Brocoli',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 18,
    goalTag: 'Classique Fitness',
    description: 'Le pilier digeste et précis pour la performance et la recomposition.',
    ingredients: [
      { foodId: 'poulet_blanc', grams: 160 },
      { foodId: 'riz_basmati_cru', grams: 80 },
      { foodId: 'brocoli', grams: 200 },
      { foodId: 'huile_olive', grams: 10 },
    ],
    steps: [
      'Cuire le riz basmati par absorption et le brocoli vapeur croquant.',
      'Saisir le poulet émincé au paprika doux et citron.',
      "Arroser d'huile d'olive crue au dressage.",
    ],
  },
  {
    id: 'rec_bavette_patate_douce_haricots',
    title: 'Bavette Grillée, Frites de Patate Douce & Haricots Verts',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 20,
    goalTag: 'Force & Fer',
    description: 'Riche en fer biodisponible, zinc et bêta-carotène.',
    ingredients: [
      { foodId: 'bavette_rumsteck', grams: 155 },
      { foodId: 'patate_douce_crue', grams: 260 },
      { foodId: 'haricots_verts', grams: 180 },
      { foodId: 'huile_olive', grams: 10 },
    ],
    steps: [
      "Enfourner les bâtonnets de patate douce 18 min avec la moitié de l'huile d'olive.",
      'Cuire les haricots verts vapeur et saisir la bavette 2 min par face à feu vif.',
    ],
  },
  {
    id: 'rec_buddha_bowl_quinoa_tofu',
    title: 'Buddha Bowl Quinoa, Tofu Fumé, Edamame & Tahini',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 16,
    goalTag: 'Vegan Complet',
    description: 'Spectre complet en acides aminés essentiels et minéraux.',
    ingredients: [
      { foodId: 'tofu_fume', grams: 150 },
      { foodId: 'quinoa_cru', grams: 80 },
      { foodId: 'edamame_feves', grams: 100 },
      { foodId: 'carottes', grams: 120 },
      { foodId: 'tahini', grams: 15 },
    ],
    steps: [
      'Rincer et cuire le quinoa 12 min.',
      'Dorer les dés de tofu fumé à la poêle et râper les carottes.',
      'Assembler avec les edamames et napper de sauce tahini-citron.',
    ],
  },
  {
    id: 'rec_pad_thai_fit_crevettes',
    title: 'Wok Façon Pad Thaï Léger Crevettes, Nouilles de Riz & Cajou',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 14,
    goalTag: 'Sans Gluten',
    description: 'Saveurs asiatiques fraîches, haute teneur en protéines et sans gluten.',
    ingredients: [
      { foodId: 'nouilles_riz_sobba', grams: 80 },
      { foodId: 'crevettes', grams: 160 },
      { foodId: 'oeufs_entiers', grams: 60 },
      { foodId: 'chou_kale', grams: 140 },
      { foodId: 'noix_cajou', grams: 20 },
    ],
    steps: [
      'Réhydrater les nouilles de riz dans l’eau chaude 4 min puis égoutter.',
      'Sauter le chou émincé et les crevettes au wok, brouiller l’œuf sur le côté.',
      'Mélanger avec jus de citron vert et noix de cajou concassées.',
    ],
  },
  {
    id: 'rec_pates_completes_bolognaise_5',
    title: 'Pâtes Complètes Bolognaise Maigre 5% & Parmesan',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 18,
    goalTag: 'Hypertrophie',
    description: 'Idéal après une séance lourde pour recharger le glycogène.',
    ingredients: [
      { foodId: 'pates_completes_crues', grams: 90 },
      { foodId: 'steak_hache_5', grams: 140 },
      { foodId: 'coulis_tomate', grams: 180 },
      { foodId: 'carottes', grams: 80 },
      { foodId: 'comte_parmesan', grams: 15 },
    ],
    steps: [
      'Cuire les pâtes complètes al dente.',
      'Mijoter le bœuf haché 5% avec les petits dés de carottes, basilic et passata de tomate.',
      'Servir parsemé de parmesan affiné.',
    ],
  },
  {
    id: 'rec_salade_med_thon_poischiches',
    title: 'Salade Méditerranéenne Thon, Pois Chiches & Feta',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 8,
    goalTag: 'Sans Cuisson',
    description: 'Parfaite en lunchbox au bureau, zéro réchauffage nécessaire.',
    ingredients: [
      { foodId: 'thon_naturel', grams: 130 },
      { foodId: 'pois_chiches_cuit', grams: 180 },
      { foodId: 'concombre', grams: 150 },
      { foodId: 'tomates', grams: 120 },
      { foodId: 'feta', grams: 40 },
      { foodId: 'huile_olive', grams: 10 },
    ],
    steps: [
      'Rincer les pois chiches et égoutter le thon au naturel.',
      'Couper concombre et tomates en dés, émietter la feta et assaisonner.',
    ],
  },
  {
    id: 'rec_dahl_lentilles_corail_coco',
    title: 'Dahl Lentilles Corail, Lait de Coco & Épinards',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 18,
    goalTag: 'Vegan Digeste',
    description: 'Cuisson express en 12 min, crémeux et très rassasiant.',
    ingredients: [
      { foodId: 'lentilles_corail_crues', grams: 85 },
      { foodId: 'riz_basmati_cru', grams: 50 },
      { foodId: 'lait_coco_leger', grams: 120 },
      { foodId: 'epinards_frais', grams: 120 },
      { foodId: 'coulis_tomate', grams: 100 },
    ],
    steps: [
      'Mijoter les lentilles corail rincées 12 min avec coulis de tomate, lait de coco et curcuma.',
      'Cuire le riz basmati en parallèle et fondre les épinards en fin de cuisson.',
    ],
  },
  {
    id: 'rec_saumon_patate_douce_asperges',
    title: 'Pavé de Saumon, Patate Douce & Asperges Vertes',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 20,
    goalTag: 'Oméga-3',
    description: 'Haute densité nutritionnelle et récupération articulaire.',
    ingredients: [
      { foodId: 'saumon_frais', grams: 140 },
      { foodId: 'patate_douce_crue', grams: 250 },
      { foodId: 'asperges', grams: 180 },
    ],
    steps: [
      'Rôtir la patate douce et les asperges vertes 16 min.',
      'Cuire le saumon à l’unilatérale à feu doux pour préserver les Oméga-3.',
    ],
  },
  {
    id: 'rec_wrap_dinde_avocat_crudites',
    title: 'Wraps Poulet/Dinde, Avocat & Mâche Croquante',
    mealTypes: ['lunch'],
    prepMinutes: 7,
    goalTag: 'Sur le Pouce',
    description: 'Prêt en 7 minutes, transportable partout.',
    ingredients: [
      { foodId: 'wraps_ble_mais', grams: 90 },
      { foodId: 'dinde_filet', grams: 150 },
      { foodId: 'fromage_blanc_0', grams: 60 },
      { foodId: 'avocat', grams: 65 },
      { foodId: 'salade_mache', grams: 60 },
    ],
    steps: [
      'Saisir les aiguillettes de dinde aux herbes.',
      "Tartiner les wraps de fromage blanc poivré, garnir d'avocat, mâche et dinde puis rouler.",
    ],
  },
  {
    id: 'rec_poke_sarrasin_crevettes_mangue',
    title: 'Poke Bowl Sarrasin, Crevettes, Avocat & Mangue',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 15,
    goalTag: 'Sans Gluten',
    description: 'Alliance fraîche sucré-salé haute en protéines maigres.',
    ingredients: [
      { foodId: 'crevettes', grams: 160 },
      { foodId: 'sarrasin_cru', grams: 80 },
      { foodId: 'concombre', grams: 120 },
      { foodId: 'mangue', grams: 90 },
      { foodId: 'avocat', grams: 60 },
    ],
    steps: [
      'Cuire puis tiédir le sarrasin.',
      'Disposer concombre, mangue, avocat et crevettes citronnées.',
    ],
  },
  {
    id: 'rec_gnocchis_poeles_poulet_courgette',
    title: 'Poêlée Express Gnocchis Dorés, Poulet & Courgettes',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 12,
    goalTag: '1 Poêle • 12 min',
    description: 'Une seule poêle, prêt en 12 minutes chrono.',
    ingredients: [
      { foodId: 'gnocchis', grams: 220 },
      { foodId: 'poulet_blanc', grams: 150 },
      { foodId: 'courgette', grams: 200 },
      { foodId: 'pignons_pin', grams: 15 },
      { foodId: 'huile_olive', grams: 8 },
    ],
    steps: [
      "Dorer les dés de poulet et les gnocchis dans l'huile d'olive 8 min.",
      'Ajouter les courgettes en fines demi-lunes et les pignons de pin en fin de cuisson.',
    ],
  },
  {
    id: 'rec_bowl_mexicain_boeuf_mais',
    title: 'Burrito Bowl Bœuf 5%, Riz, Haricots Rouges & Avocat',
    mealTypes: ['lunch', 'dinner'],
    prepMinutes: 15,
    goalTag: 'Prise de Muscle',
    description: 'Riche en protéines, fibres, potassium et glucides complexes.',
    ingredients: [
      { foodId: 'steak_hache_5', grams: 140 },
      { foodId: 'riz_basmati_cru', grams: 70 },
      { foodId: 'haricots_rouges_cuit', grams: 120 },
      { foodId: 'mais_doux', grams: 80 },
      { foodId: 'avocat', grams: 60 },
    ],
    steps: [
      'Cuire le riz et faire revenir le bœuf 5% avec cumin et paprika doux.',
      'Assembler en bol avec les haricots rouges rincés, le maïs et les tranches d’avocat.',
    ],
  },

  // =========================================================================
  // COLLATIONS SPORTIVES (9 RECETTES)
  // =========================================================================
  {
    id: 'rec_shaker_banane_amandes',
    title: 'Post-Training : Whey Isolate, Banane & Amandes',
    mealTypes: ['snack'],
    prepMinutes: 2,
    goalTag: 'Récupération',
    description: 'Assimilation rapide des acides aminés après la séance.',
    ingredients: [
      { foodId: 'whey_isolate', grams: 30 },
      { foodId: 'banane', grams: 120 },
      { foodId: 'amandes', grams: 20 },
    ],
    steps: [
      "Mélanger la Whey dans 250 ml d'eau fraîche et accompagner de la banane et des amandes.",
    ],
  },
  {
    id: 'rec_fb0_pomme_cacahuete',
    title: 'Fromage Blanc 0%, Pomme Croquante & Cacahuète',
    mealTypes: ['snack', 'breakfast'],
    prepMinutes: 3,
    goalTag: 'Satiété',
    description: 'Coupe-faim protéiné idéal en milieu d’après-midi.',
    ingredients: [
      { foodId: 'fromage_blanc_0', grams: 200 },
      { foodId: 'pomme', grams: 150 },
      { foodId: 'beurre_cacahuete', grams: 15 },
    ],
    steps: [
      'Verser le fromage blanc avec une pointe de cannelle, ajouter la pomme et le beurre de cacahuète.',
    ],
  },
  {
    id: 'rec_mousse_choco_tofu_soyeux',
    title: 'Mousse Chocolat Noir Protéinée au Tofu Soyeux (Vegan)',
    mealTypes: ['snack', 'dinner'],
    prepMinutes: 5,
    goalTag: 'Dessert Fit Vegan',
    description: 'Bluffante, sans œufs ni lactose, riche en magnésium et antioxydants.',
    ingredients: [
      { foodId: 'tofu_soyeux', grams: 200 },
      { foodId: 'chocolat_noir_85', grams: 30 },
      { foodId: 'sirop_erable', grams: 15 },
      { foodId: 'framboises', grams: 80 },
    ],
    steps: [
      'Fondre le chocolat noir 85%, puis mixer lisse avec le tofu soyeux et le sirop d’érable.',
      'Réfrigérer 30 min et déguster avec les framboises.',
    ],
  },
  {
    id: 'rec_snack_vegan_proteine_fruits_rouges',
    title: 'Bowl Vegan Soja, Protéine & Fraises Fraîches',
    mealTypes: ['snack', 'breakfast'],
    prepMinutes: 4,
    goalTag: '100% Végétal',
    description: 'Collation végétale haute en protéines sans lactose.',
    ingredients: [
      { foodId: 'yaourt_soja', grams: 150 },
      { foodId: 'proteine_vegan_poudre', grams: 25 },
      { foodId: 'fraises', grams: 140 },
      { foodId: 'graines_lin_courge', grams: 15 },
    ],
    steps: [
      'Fouetter le yaourt soja avec la protéine végétale et garnir de fraises et graines.',
    ],
  },
  {
    id: 'rec_tartine_ricotta_fraises_miel',
    title: 'Toast Complet Ricotta, Fraises & Miel d’Acacia',
    mealTypes: ['snack', 'breakfast'],
    prepMinutes: 4,
    goalTag: 'Pré-Séance',
    description: 'Énergie progressive légère 1h15 avant le sport.',
    ingredients: [
      { foodId: 'pain_complet', grams: 60 },
      { foodId: 'ricotta', grams: 80 },
      { foodId: 'fraises', grams: 120 },
      { foodId: 'miel_acacia', grams: 12 },
    ],
    steps: [
      'Toaster le pain complet, étaler la ricotta, disposer les fraises et le filet de miel.',
    ],
  },
  {
    id: 'rec_galettes_riz_bresaola_noix',
    title: 'Collation Salée : Galettes de Riz, Grisons & Noix',
    mealTypes: ['snack'],
    prepMinutes: 2,
    goalTag: 'Sèche Salée',
    description: 'Très haute densité protéique, sans gluten et transportable.',
    ingredients: [
      { foodId: 'galettes_riz_mais', grams: 35 },
      { foodId: 'bresaola_grisons', grams: 70 },
      { foodId: 'noix_grenoble', grams: 20 },
    ],
    steps: [
      'Accompagner les galettes de riz de la viande des Grisons et des cerneaux de noix.',
    ],
  },
  {
    id: 'rec_booster_preworkout_dattes',
    title: 'Booster Express : Compote, Dattes Medjool & Cajou',
    mealTypes: ['snack'],
    prepMinutes: 2,
    goalTag: '30 min avant Sport',
    description: 'Glucides rapides zéro lourdeur gastrique avant un HIIT.',
    ingredients: [
      { foodId: 'compote_sans_sucre', grams: 120 },
      { foodId: 'dattes', grams: 35 },
      { foodId: 'noix_cajou', grams: 15 },
    ],
    steps: [
      'Consommer 30 minutes avant l’échauffement avec un grand verre d’eau.',
    ],
  },
  {
    id: 'rec_houmous_batonnets_lupin',
    title: 'Assiette Apéro Fit : Houmous, Carottes, Céleri & Lupin',
    mealTypes: ['snack'],
    prepMinutes: 5,
    goalTag: 'Vegan Salé',
    description: 'Alternative saine et protéinée aux biscuits apéritifs.',
    ingredients: [
      { foodId: 'houmous', grams: 65 },
      { foodId: 'lupin_graines', grams: 100 },
      { foodId: 'carottes', grams: 120 },
      { foodId: 'celeri_radis', grams: 100 },
    ],
    steps: [
      'Tailler les carottes et le céleri en bâtonnets à tremper dans le houmous, avec les graines de lupin.',
    ],
  },
  {
    id: 'rec_petits_suisses_poire_choco',
    title: 'Petits-Suisses 0%, Poire Fondante & Carrés 85%',
    mealTypes: ['snack'],
    prepMinutes: 3,
    goalTag: 'Soirée / Satiété',
    description: 'Riche en caséine lente et pauvre en sucres.',
    ingredients: [
      { foodId: 'petits_suisses_0', grams: 180 },
      { foodId: 'poire', grams: 150 },
      { foodId: 'chocolat_noir_85', grams: 15 },
    ],
    steps: [
      'Lisser les petits-suisses, ajouter la poire en lamelles et les copeaux de chocolat noir 85%.',
    ],
  },

  // =========================================================================
  // DÎNERS (9 RECETTES)
  // =========================================================================
  {
    id: 'rec_cabillaud_pdt_courgettes',
    title: 'Dos de Cabillaud Citronné, Pommes de Terre & Courgettes',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 20,
    goalTag: 'Sommeil & Légèreté',
    description: 'Digestion ultra légère en soirée pour optimiser le sommeil profond.',
    ingredients: [
      { foodId: 'cabillaud', grams: 190 },
      { foodId: 'pomme_de_terre_crue', grams: 260 },
      { foodId: 'courgette', grams: 220 },
      { foodId: 'huile_colza', grams: 10 },
    ],
    steps: [
      'Cuire les pommes de terre et courgettes à la vapeur douce.',
      "Cuire le cabillaud 10 min en papillote citron-aneth et verser l'huile de colza crue.",
    ],
  },
  {
    id: 'rec_dorade_fenouil_riz_complet',
    title: 'Filet de Dorade Grillé, Fenouil Braisé & Riz Complet',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 20,
    goalTag: 'Méditerranéen',
    description: 'Poisson blanc fin riche en iode et sélénium.',
    ingredients: [
      { foodId: 'dorade_bar', grams: 180 },
      { foodId: 'riz_complet_cru', grams: 75 },
      { foodId: 'fenouil', grams: 180 },
      { foodId: 'tomates', grams: 100 },
      { foodId: 'huile_olive', grams: 10 },
    ],
    steps: [
      'Cuire le riz complet et braiser le fenouil émincé avec les tomates.',
      'Saisir le filet de dorade côté peau 4 min puis 1 min côté chair.',
    ],
  },
  {
    id: 'rec_wok_tempeh_riz_complet',
    title: 'Wok Tempeh Doré, Brocoli, Poivrons & Riz Complet',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 20,
    goalTag: 'Vegan',
    description: 'Protéines végétales fermentées hautement assimilables.',
    ingredients: [
      { foodId: 'tempeh', grams: 150 },
      { foodId: 'riz_complet_cru', grams: 75 },
      { foodId: 'brocoli', grams: 150 },
      { foodId: 'poivrons', grams: 120 },
      { foodId: 'huile_coco', grams: 8 },
    ],
    steps: [
      'Cuire le riz complet.',
      "Dorer le tempeh dans l'huile de coco puis faire sauter brocoli et poivrons croquants.",
    ],
  },
  {
    id: 'rec_filet_mignon_butternut',
    title: 'Filet Mignon, Courge Butternut Rôtie & Polenta',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 22,
    goalTag: 'Maigre & Gourmand',
    description: 'Moins de 4% de lipides sur le filet mignon et texture crémeuse.',
    ingredients: [
      { foodId: 'filet_mignon_porc', grams: 160 },
      { foodId: 'polenta_crue', grams: 70 },
      { foodId: 'courge_butternut', grams: 220 },
      { foodId: 'huile_olive', grams: 10 },
    ],
    steps: [
      'Rôtir les dés de butternut au thym, saisir les médaillons de filet mignon et cuire la polenta 5 min.',
    ],
  },
  {
    id: 'rec_shakshuka_proteinee',
    title: 'Shakshuka Œufs, Poivrons, Feta & Pain au Levain',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 16,
    goalTag: 'Végétarien',
    description: 'Poêlée parfumée au cumin doux en une seule poêle.',
    ingredients: [
      { foodId: 'oeufs_entiers', grams: 160 },
      { foodId: 'poivrons', grams: 180 },
      { foodId: 'coulis_tomate', grams: 180 },
      { foodId: 'feta', grams: 45 },
      { foodId: 'pain_levain', grams: 70 },
      { foodId: 'huile_olive', grams: 8 },
    ],
    steps: [
      'Compoter les poivrons dans la sauce tomate épicée.',
      'Casser les œufs, parsemer de feta, couvrir 5 min et servir avec le levain.',
    ],
  },
  {
    id: 'rec_pates_lentilles_epinards_pst',
    title: 'Pâtes de Lentilles Corail, Épinards & Soja Texturé',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 12,
    goalTag: 'Hyperprotéiné Vegan',
    description: 'Plus de 42g de protéines végétales sans gluten en 12 minutes.',
    ingredients: [
      { foodId: 'pates_lentilles_corail', grams: 80 },
      { foodId: 'pst_rehydratees', grams: 140 },
      { foodId: 'epinards_frais', grams: 150 },
      { foodId: 'coulis_tomate', grams: 140 },
      { foodId: 'huile_olive', grams: 10 },
    ],
    steps: [
      'Cuire les pâtes de lentilles corail 6 min.',
      "Chauffer les protéines de soja réhydratées avec le coulis de tomate, les épinards et l'huile d'olive.",
    ],
  },
  {
    id: 'rec_truite_quinoa_courgette',
    title: 'Pavé de Truite, Quinoa & Courgettes Fondantes',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 16,
    goalTag: 'Récupération',
    description: 'Alternative locale durable au saumon, riche en protéines et Oméga-3.',
    ingredients: [
      { foodId: 'truite_pave', grams: 160 },
      { foodId: 'quinoa_cru', grams: 75 },
      { foodId: 'courgette', grams: 220 },
      { foodId: 'huile_olive', grams: 8 },
    ],
    steps: [
      'Cuire le quinoa 12 min, poêler les courgettes aux herbes et saisir le pavé de truite.',
    ],
  },
  {
    id: 'rec_salade_tiede_lentilles_halloumi',
    title: 'Assiette Tiède Lentilles du Puy, Halloumi Grillé & Betterave',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 10,
    goalTag: 'Végétarien Express',
    description: 'Riche en fer végétal et prête en 10 minutes.',
    ingredients: [
      { foodId: 'lentilles_vertes_cuites', grams: 200 },
      { foodId: 'halloumi', grams: 85 },
      { foodId: 'betterave_cuite', grams: 120 },
      { foodId: 'salade_mache', grams: 70 },
      { foodId: 'huile_colza', grams: 8 },
    ],
    steps: [
      'Griller les tranches de halloumi à sec 2 min par face.',
      'Dresser sur lit de mâche avec les lentilles tièdes et la betterave.',
    ],
  },
  {
    id: 'rec_escalope_veau_champignons_ebly',
    title: 'Escalope de Veau, Poêlée de Champignons & Blé',
    mealTypes: ['dinner', 'lunch'],
    prepMinutes: 16,
    goalTag: 'Équilibre',
    description: 'Viande blanche très tendre et sauce légère au fromage blanc.',
    ingredients: [
      { foodId: 'escalope_veau', grams: 160 },
      { foodId: 'ebly_ble_cru', grams: 75 },
      { foodId: 'champignons_paris', grams: 180 },
      { foodId: 'fromage_blanc_0', grams: 50 },
      { foodId: 'huile_olive', grams: 8 },
    ],
    steps: [
      'Cuire le blé 10 min et dorer les champignons émincés.',
      'Saisir l’escalope de veau puis déglacer hors du feu avec le fromage blanc moutardé.',
    ],
  },
];

export function computeRecipeMacros(recipe, portionMultiplier = 1) {
  const mult = Number(portionMultiplier) || 1;
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  (recipe.ingredients || []).forEach((ing) => {
    const scaledGrams = Math.round(ing.grams * mult);
    const m = calculateFoodMacros(ing.foodId, scaledGrams);
    totals.kcal += m.kcal;
    totals.protein += m.protein;
    totals.carbs += m.carbs;
    totals.fat += m.fat;
    totals.fiber += m.fiber;
  });

  return {
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
  };
}

export function isRecipeCompatibleWithProfile(recipe, profile) {
  if (!recipe || !Array.isArray(recipe.ingredients)) return false;
  return recipe.ingredients.every((ing) => {
    const food = getFoodById(ing.foodId);
    return food && isFoodCompatibleWithProfile(food, profile);
  });
}
