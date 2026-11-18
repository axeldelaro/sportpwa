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
      fr: 'Les gains de masse musculaire sont optimaux autour de 1,6 à 2,2 g de protéines par kg de poids de corps et par jour.',
      en: 'Lean muscle gains peak around 1.6 to 2.2 g of protein per kg of bodyweight per day.',
      es: 'La ganancia muscular es óptima entre 1,6 y 2,2 g de proteína por kg de peso al día.',
    },
  },
  {
    id: 'jager_2017_issn_protein',
    org: 'Nutrition sportive',
    citation: 'Répartition des protéines',
    pmid: '28642676',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28642676/',
    keywords: ['repartition', 'assimilation', 'leucine', 'whey', 'caseine', 'collation', 'shaker', 'repas'],
    summary: {
      fr: 'Répartir 20 à 40 g de protéines par repas toutes les 3 à 4 heures aide à mieux récupérer sur toute la journée.',
      en: 'Spreading 20–40g of protein per meal every 3–4h supports muscle recovery throughout the day.',
      es: 'Repartir 20–40 g de proteína por comida cada 3–4h mejora la recuperación muscular.',
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
      fr: 'S’arrêter à 1 ou 2 répétitions de l’échec donne d’aussi bons résultats musculaires que d’aller à l’échec total, avec beaucoup moins de fatigue.',
      en: 'Stopping 1–2 reps shy of failure builds just as much muscle as absolute failure with much less fatigue.',
      es: 'Detenerse a 1–2 repeticiones del fallo genera igual progreso muscular con mucha menor fatiga.',
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
      fr: 'Un apport suffisant en Vitamine D3, Oméga-3 et Magnésium soutient l’énergie, la récupération musculaire et le confort articulaire.',
      en: 'Adequate Vitamin D3, Omega-3, and Magnesium intake supports daily energy and joint recovery.',
      es: 'Un buen aporte de Vitamina D3, Omega-3 y Magnesio favorece la energía y la recuperación articular.',
    },
  },
  {
    id: 'moro_2016_fasting',
    org: 'Rythme des repas',
    citation: 'Jeûne intermittent',
    pmid: '27737674',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27737674/',
    keywords: ['jeune', 'intermittent', '16 8', 'fasting', 'a jeun', 'ramadan', 'ayuno'],
    summary: {
      fr: 'À calories et protéines égales, le jeûne 16/8 aide à perdre du gras tout en gardant le muscle, mais 3 à 4 repas répartis restent plus confortables en prise de masse.',
      en: 'Matched for calories and protein, 16:8 fasting supports fat loss, though 3–4 meals make bulking easier.',
      es: 'A iguales calorías y proteínas, el ayuno 16/8 reduce grasa manteniendo músculo.',
    },
  },
  {
    id: 'schumann_2022_cardio_interference',
    org: 'Cardio & Musculation',
    citation: 'Combiner cardio et renforcement',
    pmid: '34757594',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34757594/',
    keywords: ['cardio', 'courir', 'course', 'hiit', 'zone 2', 'endurance', 'velo', 'running'],
    summary: {
      fr: 'Combiner cardio et musculation ne freine pas tes progrès musculaires si le cardio est placé après la muscu ou espacé de quelques heures.',
      en: 'Combining cardio and strength training does not slow muscle gains when cardio is placed after lifting or on separate sessions.',
      es: 'Combinar cardio y pesas no frena el progreso si el cardio va después de las pesas o en días separados.',
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
      fr: 'Un gainage régulier du tronc et des angles de travail confortables protègent tes articulations tout en continuant à progresser.',
      en: 'Consistent core stability and joint-friendly movement angles protect joints while keeping up progress.',
      es: 'El trabajo estable del core y ángulos cómodos protegen tus articulaciones.',
    },
  },
  {
    id: 'aragon_2013_nutrient_timing',
    org: 'Autour de la séance',
    citation: 'Repas avant et après sport',
    pmid: '23360586',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23360586/',
    keywords: ['avant seance', 'apres seance', 'fenetre anabolique', 'timing', 'post workout', 'pre workout', 'glucide'],
    summary: {
      fr: 'Pas besoin de courir dans les 30 minutes après ta séance : espacer le repas d’avant et d’après entraînement de 3 à 5h maximum avec protéines et glucides suffit largement.',
      en: 'No need to rush within 30 minutes: spacing pre- and post-workout meals within 3–5h with protein and carbs optimizes recovery.',
      es: 'Separar la comida antes y después de entrenar máximo 3–5h con proteínas y carbohidratos es suficiente.',
    },
  },
  {
    id: 'plotkin_2022_progressive_overload',
    org: 'Progression',
    citation: 'Répétitions et charges',
    pmid: '36199287',
    url: 'https://pubmed.ncbi.nlm.nih.gov/36199287/',
    keywords: ['surcharge', 'progresser', 'augmenter', 'double progression', 'charge', 'overload'],
    summary: {
      fr: 'Progresser en ajoutant 1 répétition à charge fixe construit autant de muscle qu’ajouter du poids sur la barre : alterne les deux tranquillement.',
      en: 'Adding extra reps at a fixed weight builds just as much muscle as adding weight on the bar.',
      es: 'Progresar añadiendo repeticiones genera igual ganancia muscular que subir peso.',
    },
  },
  {
    id: 'wolf_2023_lengthened_hypertrophy',
    org: 'Amplitude',
    citation: 'Travail en amplitude complète',
    pmid: '36828324',
    url: 'https://pubmed.ncbi.nlm.nih.gov/36828324/',
    keywords: ['pectoraux', 'pecs', 'dos', 'bras', 'biceps', 'triceps', 'epaules', 'jambes', 'fessiers', 'abdos', 'amplitude', 'etirement'],
    summary: {
      fr: 'Travailler un muscle en belle amplitude complète, notamment dans la phase d’étirement contrôlé, accélère nettement la progression.',
      en: 'Training muscles through a full range of motion under control accelerates muscle growth.',
      es: 'Entrenar con rango completo de movimiento controlado mejora mucho el progreso.',
    },
  },
  {
    id: 'behm_2016_warmup_stretching',
    org: 'Échauffement',
    citation: 'Mobilité avant séance',
    pmid: '26642915',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26642915/',
    keywords: ['echauffement', 'etirement', 'mobilite', 'souplesse', 'warmup', 'stretching', 'calentamiento'],
    summary: {
      fr: 'Évite les longs étirements statiques juste avant de soulever lourd : privilégie quelques minutes de mobilité dynamique et 2 à 3 séries de chauffe.',
      en: 'Avoid long static stretches right before heavy sets; prefer dynamic mobility and ramp-up sets.',
      es: 'Prioriza movilidad dinámica y series de aproximación antes de entrenar fuerza.',
    },
  },
  {
    id: 'paluch_2022_lancet_steps',
    org: 'Activité quotidienne',
    citation: 'Pas quotidiens',
    pmid: '35247352',
    url: 'https://pubmed.ncbi.nlm.nih.gov/35247352/',
    keywords: ['pas', 'marche', 'neat', '10000', '8000', 'tapis', 'depense', 'steps', 'walking', 'caminar'],
    summary: {
      fr: 'Atteindre 7 500 à 10 000 pas par jour augmente fortement ta dépense énergétique quotidienne sans fatiguer tes muscles ni ouvrir l’appétit.',
      en: 'Reaching 7,500–10,000 daily steps boosts daily calorie burn without extra fatigue or hunger spikes.',
      es: 'Caminar 7.500–10.000 pasos diarios eleva el gasto calórico sin fatiga extra.',
    },
  },
  {
    id: 'reynolds_2019_lancet_fiber_satiety',
    org: 'Satiété',
    citation: 'Fibres et satiété',
    pmid: '30638909',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30638909/',
    keywords: ['faim', 'fringale', 'sucre', 'satiete', 'fibre', 'digestion', 'cheat', 'ecart', 'ballonnement', 'hunger', 'craving'],
    summary: {
      fr: 'Viser 25 à 35 g de fibres par jour (légumes, flocons d’avoine, fruits, légumineuses) avec tes protéines calme durablement la faim.',
      en: 'Consuming 25–35 g/day of fiber alongside protein keeps you full and reduces cravings.',
      es: 'Consumir 25–35 g de fibra al día junto con proteínas reduce los antojos.',
    },
  },
  {
    id: 'mifflin_1990_resting_energy',
    org: 'Besoins énergétiques',
    citation: 'Estimation des calories',
    pmid: '2305711',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    keywords: ['metabolisme', 'bmr', 'tdee', 'mifflin', 'calorie', 'kcal', 'calculer', 'macro'],
    summary: {
      fr: 'Tes besoins caloriques dépendent de ton poids, ta taille, ton âge et ton niveau d’activité hebdomadaire, puis s’affinent selon l’évolution réelle de ton poids.',
      en: 'Daily calorie needs scale with weight, height, age, and weekly activity, then adjust to real-world weight trends.',
      es: 'Tus calorías diarias dependen de peso, altura, edad y actividad semanal.',
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
