// Base de références scientifiques internationales certifiées (ISSN, ACSM, IOC, BJSM, PubMed)

export const SCIENTIFIC_STUDIES = [
  {
    id: 'morton_2018_protein',
    org: 'BJSM • Méta-analyse (49 études)',
    citation: 'Morton RW et al. (2018) — Br J Sports Med',
    pmid: '28698222',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/',
    keywords: [
      'proteine', 'proteines', 'protein', 'proteina', 'quota', 'hypertrophie',
      'muscle', 'masse', 'gramme', 'besoin', 'combien',
    ],
    summary: {
      fr: 'Méta-analyse sur 1 863 pratiquants : les gains de masse maigre plafonnent autour de 1,62 g/kg/jour de protéines (intervalle supérieur de sécurité jusqu’à 2,2 g/kg/j).',
      en: 'Meta-analysis across 49 RCTs (1,863 participants): fat-free mass gains plateau around 1.62 g/kg/day of protein (upper 95% CI at 2.2 g/kg/day).',
      es: 'Metaanálisis de 49 ensayos: la ganancia de masa libre de grasa se estabiliza en torno a 1,62 g/kg/día de proteína (rango superior hasta 2,2 g/kg/día).',
    },
  },
  {
    id: 'jager_2017_issn_protein',
    org: 'ISSN Position Stand',
    citation: 'Jäger R et al. (2017) — J Int Soc Sports Nutr',
    pmid: '28642676',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28642676/',
    keywords: [
      'proteine', 'repas', 'repartition', 'assimilation', 'leucine', 'whey',
      'collation', 'shaker', 'synthesis', 'protein',
    ],
    summary: {
      fr: 'Consensus officiel ISSN : répartir 0,25 à 0,40 g/kg de protéines par repas (20 à 40g incluant 2–3g de leucine) toutes les 3 à 4 heures maximise la synthèse protéique musculaire (MPS).',
      en: 'Official ISSN Position Stand: distributing 0.25–0.40 g/kg of high-quality protein per meal (20–40g with 2–3g leucine) every 3–4 hours maximizes muscle protein synthesis.',
      es: 'Consenso ISSN: distribuir 0,25–0,40 g/kg de proteína por comida (20–40g con 2–3g de leucina) cada 3–4 horas maximiza la síntesis proteica muscular.',
    },
  },
  {
    id: 'helms_2014_deficit',
    org: 'JISSN • Sèche & Rétention Musculaire',
    citation: 'Helms ER, Aragon AA & Fitschen PJ (2014) — JISSN',
    pmid: '24864135',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24864135/',
    keywords: [
      'seche', 'perte', 'gras', 'poids', 'deficit', 'maigrir', 'cut',
      'cutting', 'plateau', 'stagne', 'definicion', 'adelgazar',
    ],
    summary: {
      fr: 'En déficit calorique, cibler une perte de 0,5 à 1,0 % du poids corporel par semaine avec 2,0 à 2,4 g/kg de protéines préserve la masse musculaire et les performances.',
      en: 'During caloric restriction, aiming for 0.5–1.0% bodyweight loss per week alongside 2.0–2.4 g/kg protein preserves lean muscle mass and strength.',
      es: 'En déficit calórico, perder entre 0,5 y 1,0 % del peso corporal por semana con 2,0–2,4 g/kg de proteína preserva la masa magra.',
    },
  },
  {
    id: 'schoenfeld_2017_volume',
    org: 'J Sports Sci • Volume Hebdomadaire',
    citation: 'Schoenfeld BJ, Ogborn D & Krieger JW (2017)',
    pmid: '27433992',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/',
    keywords: [
      'volume', 'serie', 'series', 'sets', 'programme', 'hypertrophie',
      'surcharge', 'combien de series', 'entrainement', 'workout',
    ],
    summary: {
      fr: 'Relation dose-réponse claire : effectuer 10 à 20 séries effectives par groupe musculaire et par semaine produit significativement plus d’hypertrophie que <10 séries.',
      en: 'Clear dose-response relationship: 10–20 weekly hard sets per muscle group yield significantly superior hypertrophy compared to fewer than 10 sets.',
      es: 'Relación dosis-respuesta demostrada: realizar de 10 a 20 series efectivas semanales por grupo muscular optimiza la hipertrofia.',
    },
  },
  {
    id: 'schoenfeld_2016_rest',
    org: 'JSCR • Temps de Repos',
    citation: 'Schoenfeld BJ et al. (2016) — J Strength Cond Res',
    pmid: '26605807',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26605807/',
    keywords: [
      'repos', 'recuperation', 'minute', 'seconde', 'chrono', 'timer',
      'force', 'rest', 'descanso', 'superset', 'emom',
    ],
    summary: {
      fr: 'Des temps de repos de 2 à 3 minutes sur les exercices polyarticulaires génèrent plus de force (1RM) et d’épaisseur musculaire que des repos courts de 60 secondes.',
      en: 'Longer inter-set rest periods (2–3 minutes) on compound lifts produce greater strength and muscle thickness gains than short 1-minute rests.',
      es: 'Descansos de 2 a 3 minutos en ejercicios compuestos producen mayores ganancias de fuerza e hipertrofia que descansos de 1 minuto.',
    },
  },
  {
    id: 'kreider_2017_creatine',
    org: 'ISSN Position Stand • Créatine',
    citation: 'Kreider RB et al. (2017) — J Int Soc Sports Nutr',
    pmid: '28615996',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28615996/',
    keywords: [
      'creatine', 'complement', 'supplement', 'force', 'explosivite',
      'monohydrate', 'creatina',
    ],
    summary: {
      fr: 'La créatine monohydrate (3 à 5 g/jour en prise continue, sans phase de charge obligatoire) est l’aide ergogénique la plus étudiée et sûre pour la force et la masse maigre.',
      en: 'Creatine monohydrate (3–5 g/day continuously, no loading phase needed) is the safest, most effective ergogenic supplement for strength and lean mass.',
      es: 'El monohidrato de creatina (3–5 g/día continuos, sin fase de carga) es el suplemento más eficaz y seguro respaldado por evidencia.',
    },
  },
  {
    id: 'sawka_2007_acsm_hydration',
    org: 'ACSM Position Stand • Hydratation',
    citation: 'Sawka MN et al. (2007) — Med Sci Sports Exerc (ACSM)',
    pmid: '17277604',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17277604/',
    keywords: [
      'eau', 'hydratation', 'boire', 'soif', 'crampe', 'transpiration',
      'electrolytes', 'water', 'hydration', 'agua', 'hidratacion',
    ],
    summary: {
      fr: 'Position ACSM : une déshydratation excédant 2 % du poids corporel dégrade significativement l’endurance aérobie, la thermorégulation et la performance cognitive.',
      en: 'ACSM Position Stand: body water deficits exceeding 2% of bodyweight impair aerobic performance, thermoregulation, and cognitive function.',
      es: 'Postura ACSM: una deshidratación superior al 2 % del peso corporal reduce notablemente el rendimiento físico y cognitivo.',
    },
  },
  {
    id: 'saner_2020_sleep_mps',
    org: 'J Physiol • Sommeil & Récupération',
    citation: 'Saner NJ et al. (2020) — Journal of Physiology',
    pmid: '32078168',
    url: 'https://pubmed.ncbi.nlm.nih.gov/32078168/',
    keywords: [
      'sommeil', 'dormir', 'fatigue', 'epuise', 'mal dormi', 'courbature',
      'recuperation', 'sleep', 'tired', 'recovery', 'sueno', 'cansado',
    ],
    summary: {
      fr: 'La restriction de sommeil réduit de ~18 % la synthèse protéique myofibrillaire ; en revanche, une séance d’entraînement adaptée atténue cette baisse anabolique.',
      en: 'Sleep restriction blunts myofibrillar protein synthesis by ~18%, whereas performing resistance exercise helps restore anabolic signaling.',
      es: 'La falta de sueño reduce un ~18 % la síntesis proteica miofibrilar, aunque el ejercicio de fuerza adaptado mitiga esta caída.',
    },
  },
  {
    id: 'hevia_2021_vegan_protein',
    org: 'Sports Med • Protéines Végétales vs Animales',
    citation: 'Hevia-Larraín V et al. (2021) — Sports Medicine',
    pmid: '33599941',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33599941/',
    keywords: [
      'vegan', 'vegetarien', 'vegetal', 'tofu', 'soja', 'tempeh', 'pois',
      'lentilles', 'plant', 'vegano',
    ],
    summary: {
      fr: 'À apport protéique total égal (~1,6 g/kg/j) et en variant les sources (soja, légumineuses, céréales, isolat pois/riz), un régime 100 % végétal produit la même hypertrophie qu’un régime omnivore.',
      en: 'Matched for total daily protein (~1.6 g/kg/day) and leucine, exclusively plant-based diets support identical muscle hypertrophy and strength gains as omnivorous diets.',
      es: 'Con igual ingesta proteica total (~1,6 g/kg/día), una dieta 100 % vegetal genera idéntica hipertrofia y fuerza que una dieta omnívora.',
    },
  },
  {
    id: 'burke_2011_ioc_carbs',
    org: 'IOC Consensus • Glucides & Énergie',
    citation: 'Burke LM et al. (2011) — J Sports Sci (IOC)',
    pmid: '21660838',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21660838/',
    keywords: [
      'glucide', 'glucides', 'riz', 'avoine', 'pates', 'patate', 'glycogene',
      'energie', 'carbs', 'carbohydrate', 'carbohidratos', 'remplacer', 'equivalent',
    ],
    summary: {
      fr: 'Consensus du Comité International Olympique (CIO) : 3 à 5 g/kg/j de glucides couvrent les sports de force/fitness classiques, en ajustant selon le volume quotidien.',
      en: 'IOC Consensus: 3–5 g/kg/day of carbohydrates adequately fuels general strength and skill-based training programs.',
      es: 'Consenso del COI: de 3 a 5 g/kg/día de carbohidratos cubren eficazmente las demandas del entrenamiento de fuerza.',
    },
  },
  {
    id: 'mifflin_1990_rmr',
    org: 'AJCN & Academy of Nutrition',
    citation: 'Mifflin MD et al. (1990) — Am J Clin Nutr',
    pmid: '2305711',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    keywords: [
      'metabolisme', 'calorie', 'calories', 'kcal', 'mifflin', 'bmr',
      'tdee', 'calcul', 'objectif',
    ],
    summary: {
      fr: 'L’équation de Mifflin-St Jeor est reconnue par l’Academy of Nutrition and Dietetics comme la formule prédictive la plus fiable du métabolisme de repos (précision à ±10 %).',
      en: 'The Mifflin-St Jeor equation is validated by the Academy of Nutrition and Dietetics as the most accurate non-calorimetric RMR formula.',
      es: 'La ecuación de Mifflin-St Jeor está validada como el estándar más fiable para estimar la tasa metabólica en reposo.',
    },
  },
  {
    id: 'mcgill_spine_stability',
    org: 'Biomécanique Rachidienne & Prévention',
    citation: 'McGill SM (2010) — Core Training: Evidence Translating to Better Performance',
    pmid: '20543739',
    url: 'https://pubmed.ncbi.nlm.nih.gov/20543739/',
    keywords: [
      'douleur', 'lombaire', 'epaule', 'genou', 'blessure',
      'gainage', 'posture', 'injury', 'dolor', 'espalda', 'rodilla',
    ],
    summary: {
      fr: 'L’endurance isométrique anti-mouvement du tronc (Curl-up modifié, Side-bridge, Bird-dog) protège les disques intervertébraux et transfère mieux la force aux membres que les flexions répétées.',
      en: 'Isometric anti-motion core endurance (McGill Big 3) spares spinal discs while enhancing distal limb force transfer.',
      es: 'La resistencia isométrica del core (Big 3 de McGill) protege los discos lumbares y mejora la transferencia de fuerza.',
    },
  },
];

function cleanTokens(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

/**
 * Recherche sémantique BM25 légère des études internationales pertinentes
 */
export function retrieveScientificEvidence(query, lang = 'fr', maxResults = 2) {
  const tokens = cleanTokens(query);
  if (tokens.length === 0) {
    return [SCIENTIFIC_STUDIES[0], SCIENTIFIC_STUDIES[1]].map((s) => ({
      ...s,
      localizedSummary: s.summary[lang] || s.summary.fr,
    }));
  }

  const scored = SCIENTIFIC_STUDIES.map((study) => {
    let score = 0;
    const summaryText = cleanTokens(study.summary[lang] || study.summary.fr).join(' ');

    for (const tok of tokens) {
      const stem = tok.length > 4 && tok.endsWith('s') ? tok.slice(0, -1) : tok;
      for (const kw of study.keywords) {
        if (kw === tok || kw === stem) score += 6;
        else if (kw.includes(stem) || tok.includes(kw)) score += 3;
      }
      if (summaryText.includes(stem)) score += 1.2;
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
