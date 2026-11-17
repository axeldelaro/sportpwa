// Base encyclopédique de 25 références scientifiques internationales (ISSN, ACSM, IOC, BJSM, Lancet, PubMed)
// Pré-indexée en mémoire dès le lancement du site pour 0 ms de latence et 100% de fonctionnement hors-ligne

export const SCIENTIFIC_STUDIES = [
  {
    id: 'morton_2018_protein',
    org: 'BJSM • Méta-analyse (49 études)',
    citation: 'Morton RW et al. (2018) — Br J Sports Med',
    pmid: '28698222',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/',
    keywords: ['proteine', 'protein', 'proteina', 'quota', 'hypertrophie', 'muscle', 'gramme', 'besoin', 'combien'],
    summary: {
      fr: 'Méta-analyse sur 1 863 pratiquants : les gains de masse maigre plafonnent autour de 1,62 g/kg/jour de protéines (intervalle supérieur de sécurité jusqu’à 2,2 g/kg/j).',
      en: 'Meta-analysis across 49 RCTs: fat-free mass gains plateau around 1.62 g/kg/day of protein (upper 95% CI at 2.2 g/kg/day).',
      es: 'Metaanálisis de 49 ensayos: la ganancia muscular se estabiliza en 1,62 g/kg/día de proteína (hasta 2,2 g/kg/día).',
    },
  },
  {
    id: 'jager_2017_issn_protein',
    org: 'ISSN Position Stand',
    citation: 'Jäger R et al. (2017) — J Int Soc Sports Nutr',
    pmid: '28642676',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28642676/',
    keywords: ['repartition', 'assimilation', 'leucine', 'whey', 'caseine', 'collation', 'shaker', 'repas'],
    summary: {
      fr: 'Consensus ISSN : répartir 0,25 à 0,40 g/kg de protéines par repas (20 à 40g incluant 2–3g de leucine) toutes les 3 à 4h maximise la synthèse protéique musculaire.',
      en: 'ISSN Position Stand: 0.25–0.40 g/kg protein per meal (20–40g with 2–3g leucine) every 3–4h maximizes muscle protein synthesis.',
      es: 'Consenso ISSN: 0,25–0,40 g/kg de proteína por comida cada 3–4h maximiza la síntesis proteica muscular.',
    },
  },
  {
    id: 'helms_2014_deficit',
    org: 'JISSN • Sèche & Définition',
    citation: 'Helms ER, Aragon AA & Fitschen PJ (2014) — JISSN',
    pmid: '24864135',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24864135/',
    keywords: ['seche', 'perte', 'gras', 'poids', 'deficit', 'maigrir', 'cut', 'plateau', 'stagne', 'adelgazar', 'definicion'],
    summary: {
      fr: 'En sèche, viser une perte de 0,5 à 1,0 % du poids corporel par semaine avec 2,0 à 2,4 g/kg de protéines préserve la masse maigre et la force.',
      en: 'During fat loss, targeting 0.5–1.0% bodyweight loss/week with 2.0–2.4 g/kg protein maximally preserves lean muscle mass.',
      es: 'En definición, perder 0,5–1,0 % del peso corporal por semana con 2,0–2,4 g/kg de proteína preserva el músculo.',
    },
  },
  {
    id: 'iraki_2019_bulk',
    org: 'JISSN • Prise de Masse Propre',
    citation: 'Iraki J et al. (2019) — J Int Soc Sports Nutr',
    pmid: '31242947',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31242947/',
    keywords: ['prise de masse', 'masse', 'surplus', 'grossir', 'bulk', 'bulking', 'volumen', 'ectomorphe'],
    summary: {
      fr: 'Un surplus calorique modéré de +10 à +20 % (+250 à +400 kcal/j) maximise le gain musculaire tout en limitant fortement le stockage adipeux par rapport aux gros surplus.',
      en: 'A controlled +10–20% caloric surplus (+250–400 kcal/day) optimizes muscle hypertrophy while minimizing fat gain.',
      es: 'Un superávit controlado de +10–20 % (+250–400 kcal/día) maximiza la hipertrofia minimizando la grasa.',
    },
  },
  {
    id: 'schoenfeld_2017_volume',
    org: 'J Sports Sci • Volume Hebdomadaire',
    citation: 'Schoenfeld BJ, Ogborn D & Krieger JW (2017)',
    pmid: '27433992',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/',
    keywords: ['volume', 'serie', 'series', 'sets', 'programme', 'entrainement', 'workout'],
    summary: {
      fr: 'Effectuer 10 à 20 séries effectives par groupe musculaire et par semaine stimule significativement mieux l’hypertrophie que moins de 10 séries.',
      en: 'Performing 10–20 weekly hard sets per muscle group produces superior hypertrophy compared to <10 sets.',
      es: 'Realizar de 10 a 20 series efectivas semanales por músculo optimiza la hipertrofia.',
    },
  },
  {
    id: 'refalo_2023_failure',
    org: 'Sports Med • Échec Musculaire & RIR',
    citation: 'Refalo MC et al. (2023) — Sports Medicine',
    pmid: '36334240',
    url: 'https://pubmed.ncbi.nlm.nih.gov/36334240/',
    keywords: ['echec', 'rir', 'rpe', 'intensite', 'forcer', 'failure', 'fallo'],
    summary: {
      fr: 'S’arrêter à 1 ou 2 répétitions de l’échec (RIR 1–2) produit la même hypertrophie que l’échec total tout en réduisant drastiquement la fatigue neuromusculaire.',
      en: 'Terminating sets 1–2 reps shy of failure (1–2 RIR) elicits similar hypertrophy to absolute failure with much lower neuromuscular fatigue.',
      es: 'Detenerse a 1–2 repeticiones del fallo (RIR 1–2) genera igual hipertrofia con mucha menor fatiga nerviosa.',
    },
  },
  {
    id: 'schoenfeld_2016_rest',
    org: 'JSCR • Temps de Repos',
    citation: 'Schoenfeld BJ et al. (2016) — J Strength Cond Res',
    pmid: '26605807',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26605807/',
    keywords: ['repos', 'minute', 'seconde', 'chrono', 'timer', 'force', 'rest', 'descanso'],
    summary: {
      fr: 'Prendre 2 à 3 minutes de repos sur les exercices polyarticulaires génère plus de force et d’hypertrophie que des repos courts de 60 secondes.',
      en: 'Resting 2–3 minutes on compound lifts yields greater strength and muscle thickness gains than 60-second rests.',
      es: 'Descansar 2–3 minutos en ejercicios compuestos produce más fuerza e hipertrofia que descansos de 60 segundos.',
    },
  },
  {
    id: 'kreider_2017_creatine',
    org: 'ISSN Position Stand • Créatine',
    citation: 'Kreider RB et al. (2017) — J Int Soc Sports Nutr',
    pmid: '28615996',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28615996/',
    keywords: ['creatine', 'monohydrate', 'creatina', 'explosivite', 'atp'],
    summary: {
      fr: 'La créatine monohydrate (3 à 5 g/jour tous les jours, sans phase de charge nécessaire) augmente la force, la puissance répétée et la masse maigre en toute sécurité rénale.',
      en: 'Creatine monohydrate (3–5 g/day continuously, no loading needed) safely boosts strength, power, and lean mass.',
      es: 'El monohidrato de creatina (3–5 g/día continuos) aumenta la fuerza y masa magra con total seguridad.',
    },
  },
  {
    id: 'guest_2021_caffeine',
    org: 'ISSN Position Stand • Caféine & Pré-Workout',
    citation: 'Guest NS et al. (2021) — J Int Soc Sports Nutr',
    pmid: '33388079',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33388079/',
    keywords: ['cafeine', 'cafe', 'booster', 'preworkout', 'pre workout', 'caffeine', 'cafeina', 'citrulline', 'beta alanine'],
    summary: {
      fr: 'La caféine (3 à 6 mg/kg prise 45–60 min avant séance) améliore l’endurance et la force ; éviter dans les 6–8h précédant le coucher pour préserver le sommeil profond.',
      en: 'Caffeine (3–6 mg/kg 45–60 min pre-exercise) acutely improves strength and endurance; avoid within 6–8h of bedtime.',
      es: 'La cafeína (3–6 mg/kg 45–60 min antes) mejora fuerza y resistencia; evitar 6–8h antes de dormir.',
    },
  },
  {
    id: 'wolfe_2017_bcaa',
    org: 'JISSN • BCAA vs Protéines Complètes',
    citation: 'Wolfe RR (2017) — J Int Soc Sports Nutr',
    pmid: '28852372',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28852372/',
    keywords: ['bcaa', 'eaa', 'acides amines', 'bruleur', 'complement', 'supplement', 'suplemento'],
    summary: {
      fr: 'Les BCAA isolés ne stimulent pas pleinement l’anabolisme sans les 6 autres acides aminés essentiels : si le quota protéique quotidien est atteint, les BCAA sont superflus.',
      en: 'Isolated BCAAs lack the remaining 6 essential amino acids; when daily protein targets are met, BCAA supplements add no extra benefit.',
      es: 'Si alcanzas tu meta diaria de proteínas completas, los BCAA aislados no aportan beneficio adicional.',
    },
  },
  {
    id: 'rawson_2018_ioc_micronutrients',
    org: 'IOC Consensus • Oméga-3, Vitamine D & Magnésium',
    citation: 'Maughan RJ, Burke LM et al. (2018) — Br J Sports Med (IOC)',
    pmid: '29589768',
    url: 'https://pubmed.ncbi.nlm.nih.gov/29589768/',
    keywords: ['omega', 'vitamine', 'magnesium', 'zinc', 'collagene', 'tendon', 'sante', 'micronutriment'],
    summary: {
      fr: 'Consensus du CIO : corriger les déficits en Vitamine D3, Oméga-3 (1–2g EPA/DHA) et Magnésium soutient l’immunité, la fonction neuromusculaire et la récupération articulaire.',
      en: 'IOC Consensus: addressing Vitamin D3, Omega-3 EPA/DHA, and Magnesium status supports neuromuscular function and recovery.',
      es: 'Consenso COI: optimizar Vitamina D3, Omega-3 y Magnesio respalda la función neuromuscular y articular.',
    },
  },
  {
    id: 'moro_2016_fasting',
    org: 'J Transl Med • Jeûne Intermittent 16/8',
    citation: 'Moro T et al. (2016) — Journal of Translational Medicine',
    pmid: '27737674',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27737674/',
    keywords: ['jeune', 'intermittent', '16 8', 'fasting', 'a jeun', 'ramadan', 'ayuno'],
    summary: {
      fr: 'À calories et protéines égales, le jeûne 16/8 réduit la masse grasse tout en préservant le muscle, mais devient moins optimal que 3–4 repas étalés pour une prise de masse maximale.',
      en: 'Calorie- and protein-matched 16:8 time-restricted feeding supports fat loss and lean mass retention, though 3–4 spread meals favor maximal bulking.',
      es: 'A iguales calorías y proteínas, el ayuno 16/8 reduce grasa manteniendo músculo.',
    },
  },
  {
    id: 'schumann_2022_cardio_interference',
    org: 'Sports Med • Cardio + Musculation',
    citation: 'Schumann M et al. (2022) — Sports Medicine',
    pmid: '34757594',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34757594/',
    keywords: ['cardio', 'courir', 'course', 'hiit', 'zone 2', 'endurance', 'velo', 'running'],
    summary: {
      fr: 'Méta-analyse : combiner cardio (Zone 2 ou HIIT) et musculation ne bloque PAS l’hypertrophie si les séances sont espacées d’au moins 3–6h ou placées après la muscu.',
      en: 'Concurrent endurance and resistance training does NOT blunt hypertrophy when separated by >3h or performed after lifting.',
      es: 'Combinar cardio y pesas no frena la hipertrofia si el cardio va después de las pesas o en días separados.',
    },
  },
  {
    id: 'sawka_2007_acsm_hydration',
    org: 'ACSM Position Stand • Hydratation',
    citation: 'Sawka MN et al. (2007) — Med Sci Sports Exerc (ACSM)',
    pmid: '17277604',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17277604/',
    keywords: ['eau', 'hydratation', 'boire', 'soif', 'crampe', 'electrolytes', 'water', 'hydration', 'agua', 'hidratacion'],
    summary: {
      fr: 'Une déshydratation dépassant 2 % du poids corporel réduit l’endurance, la force sous-maximale et la concentration ; viser ~35 ml/kg/j + 500 ml par heure de sport.',
      en: 'Dehydration >2% bodyweight impairs endurance, strength, and focus; aim for ~35 ml/kg/day plus 500 ml/h of training.',
      es: 'Una deshidratación >2 % reduce fuerza y resistencia; apunta a ~35 ml/kg/día más 500 ml por hora de ejercicio.',
    },
  },
  {
    id: 'saner_2020_sleep_mps',
    org: 'J Physiol • Sommeil, Fatigue & DOMS',
    citation: 'Saner NJ et al. (2020) — Journal of Physiology',
    pmid: '32078168',
    url: 'https://pubmed.ncbi.nlm.nih.gov/32078168/',
    keywords: ['sommeil', 'dormir', 'fatigue', 'epuise', 'mal dormi', 'courbature', 'doms', 'deload', 'sleep', 'tired', 'recovery', 'cansado'],
    summary: {
      fr: 'Le manque de sommeil réduit de ~18 % la synthèse protéique myofibrillaire ; moduler le volume (-25 %) les jours de fatigue préserve les gains sans épuiser le système nerveux.',
      en: 'Sleep restriction reduces myofibrillar protein synthesis by ~18%; auto-regulating volume (-25%) protects recovery.',
      es: 'Dormir poco reduce un ~18 % la síntesis muscular; reducir un 25 % el volumen en días de fatiga protege el progreso.',
    },
  },
  {
    id: 'hevia_2021_vegan_protein',
    org: 'Sports Med • Alimentation Végétale Sportive',
    citation: 'Hevia-Larraín V et al. (2021) — Sports Medicine',
    pmid: '33599941',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33599941/',
    keywords: ['vegan', 'vegetarien', 'vegetal', 'tofu', 'soja', 'tempeh', 'lentilles', 'vegano'],
    summary: {
      fr: 'À quota protéique égal (~1,6–2,0 g/kg/j) en combinant soja, légumineuses et céréales, une alimentation 100 % végétale génère exactement la même hypertrophie qu’un régime omnivore.',
      en: 'Matched for daily protein (~1.6–2.0 g/kg/day), plant-based diets support identical hypertrophy and strength as omnivorous diets.',
      es: 'Con igual proteína total, una dieta 100 % vegetal produce idéntica hipertrofia y fuerza.',
    },
  },
  {
    id: 'parr_2014_alcohol',
    org: 'PLoS One • Alcool & Récupération',
    citation: 'Parr EB et al. (2014) — PLoS One',
    pmid: '24533082',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24533082/',
    keywords: ['alcool', 'biere', 'vin', 'soiree', 'alcohol', 'cerveza'],
    summary: {
      fr: 'La consommation élevée d’alcool post-séance réduit la synthèse protéique myofibrillaire de 24 % (même avec apport de Whey) et fragmente le sommeil paradoxal.',
      en: 'Heavy post-exercise alcohol intake suppresses myofibrillar protein synthesis by ~24% even when co-ingested with protein.',
      es: 'El alcohol post-entreno reduce hasta un 24 % la síntesis proteica muscular y altera el sueño.',
    },
  },
  {
    id: 'mcgill_spine_stability',
    org: 'Biomécanique & Prévention Articulaire',
    citation: 'McGill SM (2010) — Sports Medicine',
    pmid: '20543739',
    url: 'https://pubmed.ncbi.nlm.nih.gov/20543739/',
    keywords: ['douleur', 'lombaire', 'epaule', 'genou', 'coude', 'poignet', 'blessure', 'gainage', 'posture', 'injury', 'dolor', 'espalda', 'rodilla'],
    summary: {
      fr: 'L’endurance isométrique anti-mouvement du tronc (Big 3 de McGill) et l’adaptation de l’angle scapulaire/articulaire protègent les tissus tout en maintenant le stimulus mécanique.',
      en: 'Isometric anti-motion core stability (McGill Big 3) and joint-friendly movement planes protect tissues while maintaining training stimulus.',
      es: 'La estabilidad isométrica del core (Big 3 de McGill) y ángulos articulares neutros protegen tendones y discos.',
    },
  },
  {
    id: 'aragon_2013_nutrient_timing',
    org: 'JISSN • Fenêtre Anabolique & Péri-Training',
    citation: 'Aragon AA & Schoenfeld BJ (2013) — JISSN',
    pmid: '23360586',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23360586/',
    keywords: ['avant seance', 'apres seance', 'fenetre anabolique', 'timing', 'post workout', 'pre workout', 'glucide'],
    summary: {
      fr: 'La « fenêtre anabolique » n’est pas limitée à 30 minutes : espacer le repas pré-séance et post-séance de 3 à 5h max avec ~0,4 g/kg de protéines et des glucides suffit à maximiser la récupération.',
      en: 'The anabolic window spans several hours: spacing pre- and post-workout meals within 3–5h with ~0.4 g/kg protein optimizes recovery.',
      es: 'La ventana anabólica dura varias horas: separar la comida pre y post-entreno máximo 3–5h con ~0,4 g/kg de proteína es óptimo.',
    },
  },
  {
    id: 'plotkin_2022_progressive_overload',
    org: 'PeerJ • Surcharge Progressive (Poids vs Reps)',
    citation: 'Plotkin D, Schoenfeld BJ et al. (2022) — PeerJ',
    pmid: '36199287',
    url: 'https://pubmed.ncbi.nlm.nih.gov/36199287/',
    keywords: ['surcharge', 'progresser', 'augmenter', 'double progression', 'charge', 'overload'],
    summary: {
      fr: 'Progresser en ajoutant des répétitions à charge fixe produit exactement la même hypertrophie qu’ajouter du poids sur la barre : la double progression combine le meilleur des deux.',
      en: 'Progressing via extra repetitions produces identical muscle growth to adding load on the bar (validating double progression).',
      es: 'Progresar añadiendo repeticiones genera idéntica hipertrofia que subir peso en la barra.',
    },
  },
  {
    id: 'wolf_2023_lengthened_hypertrophy',
    org: 'Sports Med • Amplitude & Étirement sous Tension',
    citation: 'Wolf M, Androulakis-Korakakis P et al. (2023) — Sports Med',
    pmid: '36828324',
    url: 'https://pubmed.ncbi.nlm.nih.gov/36828324/',
    keywords: ['pectoraux', 'pecs', 'dos', 'bras', 'biceps', 'triceps', 'epaules', 'jambes', 'fessiers', 'abdos', 'amplitude', 'etirement'],
    summary: {
      fr: 'Travailler un muscle en amplitude complète avec forte tension en position étirée (ex: écartés poulie, curl incliné, RDL) stimule significativement plus d’hypertrophie.',
      en: 'Training muscles at long muscle lengths under tension (stretched position) produces superior regional hypertrophy.',
      es: 'Entrenar el músculo bajo tensión en posición estirada estimula significativamente mayor hipertrofia.',
    },
  },
  {
    id: 'behm_2016_warmup_stretching',
    org: 'APNM • Échauffement Dynamique vs Statique',
    citation: 'Behm DG et al. (2016) — Appl Physiol Nutr Metab',
    pmid: '26642915',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26642915/',
    keywords: ['echauffement', 'etirement', 'mobilite', 'souplesse', 'warmup', 'stretching', 'calentamiento'],
    summary: {
      fr: 'Les étirements statiques longs (>60s) juste avant la musculation réduisent la force maximale de ~4–5 % : privilégier la mobilité dynamique et les séries de chauffe progressives.',
      en: 'Prolonged static stretching (>60s) pre-lifting reduces acute strength by ~4–5%; prefer dynamic mobility and ramp-up sets.',
      es: 'Estiramientos estáticos largos antes de pesas reducen la fuerza aguda; prioriza movilidad dinámica y series de aproximación.',
    },
  },
  {
    id: 'paluch_2022_lancet_steps',
    org: 'Lancet Public Health • NEAT & Pas Quotidiens',
    citation: 'Paluch AE et al. (2022) — The Lancet Public Health',
    pmid: '35247352',
    url: 'https://pubmed.ncbi.nlm.nih.gov/35247352/',
    keywords: ['pas', 'marche', 'neat', '10000', '8000', 'tapis', 'depense', 'steps', 'walking', 'caminar'],
    summary: {
      fr: 'Méta-analyse sur 47 471 adultes : atteindre 7 500 à 10 000 pas/jour augmente massivement la dépense énergétique hors-sport (NEAT) sans générer de fatigue nerveuse ni de faim rebond.',
      en: 'Reaching 7,500–10,000 daily steps boosts non-exercise energy expenditure (NEAT) for fat loss without CNS fatigue or hunger spikes.',
      es: 'Caminar 7.500–10.000 pasos diarios eleva el gasto calórico (NEAT) sin fatiga nerviosa.',
    },
  },
  {
    id: 'reynolds_2019_lancet_fiber_satiety',
    org: 'The Lancet • Fibres, Satiété & Microbiote',
    citation: 'Reynolds A et al. (2019) — The Lancet',
    pmid: '30638909',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30638909/',
    keywords: ['faim', 'fringale', 'sucre', 'satiete', 'fibre', 'digestion', 'cheat', 'ecart', 'ballonnement', 'hunger', 'craving'],
    summary: {
      fr: 'Consommer 25 à 35 g de fibres/jour (légumes, avoine, baies, légumineuses) combinés aux protéines régule la glycémie, nourrit le microbiote et réduit drastiquement les fringales.',
      en: 'Consuming 25–35 g/day of dietary fiber alongside protein stabilizes blood glucose and markedly increases meal satiety.',
      es: 'Consumir 25–35 g de fibra al día junto con proteínas estabiliza la glucemia y reduce los antojos.',
    },
  },
  {
    id: 'mifflin_1990_resting_energy',
    org: 'AJCN • Équation de Référence Mifflin-St Jeor',
    citation: 'Mifflin MD, St Jeor ST et al. (1990) — Am J Clin Nutr',
    pmid: '2305711',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    keywords: ['metabolisme', 'bmr', 'tdee', 'mifflin', 'calorie', 'kcal', 'calculer', 'macro'],
    summary: {
      fr: 'Reconnue par l’Academy of Nutrition and Dietetics comme l’équation la plus fiable pour estimer le métabolisme de base (BMR) chez l’adulte avant application du facteur d’activité.',
      en: 'Validated by the Academy of Nutrition and Dietetics as the most accurate predictive equation for resting metabolic rate (RMR).',
      es: 'Validada como la ecuación predictiva más precisa para estimar la tasa metabólica basal en adultos.',
    },
  },
];

let prewarmedIndex = null;

function tokenize(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

export function prewarmScientificIndex() {
  if (prewarmedIndex) return prewarmedIndex;
  prewarmedIndex = SCIENTIFIC_STUDIES.map((study) => ({
    study,
    kwSet: new Set(study.keywords.flatMap((k) => tokenize(k))),
    fullTokens: new Set([
      ...tokenize(study.summary.fr),
      ...tokenize(study.summary.en),
      ...tokenize(study.citation),
    ]),
  }));
  return prewarmedIndex;
}

export function retrieveScientificEvidence(query, lang = 'fr', maxResults = 2) {
  const index = prewarmScientificIndex();
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return [SCIENTIFIC_STUDIES[0], SCIENTIFIC_STUDIES[1]].map((s) => ({
      ...s,
      localizedSummary: s.summary[lang] || s.summary.fr,
    }));
  }

  const scored = index
    .map(({ study, kwSet, fullTokens }) => {
      let score = 0;
      for (const tok of tokens) {
        const stem = tok.length > 4 && tok.endsWith('s') ? tok.slice(0, -1) : tok;
        if (kwSet.has(tok) || kwSet.has(stem)) score += 7;
        else {
          for (const kw of study.keywords) {
            if (kw.includes(' ') && query.toLowerCase().includes(kw)) score += 9;
          }
        }
        if (fullTokens.has(tok) || fullTokens.has(stem)) score += 1.5;
      }
      return { study, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  if (scored.length === 0) {
    return [
      {
        ...SCIENTIFIC_STUDIES[1],
        localizedSummary: SCIENTIFIC_STUDIES[1].summary[lang] || SCIENTIFIC_STUDIES[1].summary.fr,
      },
    ];
  }

  return scored.map(({ study }) => ({
    ...study,
    localizedSummary: study.summary[lang] || study.summary.fr,
  }));
}
