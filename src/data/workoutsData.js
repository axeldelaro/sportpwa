// Bibliothèque complète de 10 programmes sportifs universels + catalogue enrichi d'exercices multi-matériels
import {
  EQUIPMENT_OPTIONS,
  DISCIPLINE_CATEGORIES,
  MUSCLE_FILTER_GROUPS,
  EXTENDED_WORKOUT_PROGRAMS,
  EXTENDED_EXTRA_EXERCISES,
} from './extendedWorkoutsCatalog.js';

export { EQUIPMENT_OPTIONS, DISCIPLINE_CATEGORIES, MUSCLE_FILTER_GROUPS };

export const INTENSITY_MODES = [
  {
    id: 'normal',
    label: 'Normale',
    shortLabel: 'Standard',
    badge: '100%',
    description: 'Volume équilibré de référence.',
  },
  {
    id: 'low_energy',
    label: 'Énergie basse',
    shortLabel: '-25%',
    badge: '-25% vol.',
    description: 'Fatigue passagère : volume réduit sans perdre le rythme.',
  },
  {
    id: 'overload',
    label: 'Surcharge',
    shortLabel: '+1 série',
    badge: '+1 série',
    description: 'Grande forme : +1 série par exercice.',
  },
];

export const WORKOUT_PROGRAMS = [
  // =========================================================================
  // 1. FULL BODY POIDS DU CORPS (SANS MATÉRIEL)
  // =========================================================================
  {
    id: 'prog_fullbody_bw',
    title: 'Full Body Poids du Corps',
    subtitle: 'Sans matériel • Maison, parc ou déplacement',
    category: 'Poids du corps',
    frequency: '3x / sem.',
    level: 'Tous niveaux',
    workouts: [
      {
        id: 'wk_fb_bw_a',
        title: 'Full Body A — Fondamentaux & Gainage',
        durationMin: 38,
        targetMuscles: ['Pectoraux', 'Dos', 'Quadriceps', 'Abdos'],
        equipment: 'Aucun matériel',
        exercises: [
          {
            id: 'ex_pushups_std',
            name: 'Pompes strictes',
            type: 'reps',
            sets: 4,
            targetReps: 12,
            defaultWeightKg: 0,
            restSeconds: 75,
            muscle: 'Pectoraux & Triceps',
            cue: 'Coudes à 45° du buste, gainage verrouillé, poitrine proche du sol.',
            alternative: 'Pompes inclinées mains surélevées',
          },
          {
            id: 'ex_inverted_row',
            name: 'Rowing inversé (Tractions australiennes)',
            type: 'reps',
            sets: 4,
            targetReps: 10,
            defaultWeightKg: 0,
            restSeconds: 75,
            muscle: 'Dos & Rhomboïdes',
            cue: 'Corps aligné, tire la poitrine en serrant les omoplates 1 seconde.',
            alternative: 'Superman tirage horizontal au sol',
          },
          {
            id: 'ex_bulgarian_bw',
            name: 'Fentes bulgares au poids du corps',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 0,
            restSeconds: 75,
            muscle: 'Quadriceps & Fessiers',
            cue: 'Pied arrière sur support, buste légèrement penché, genou avant stable.',
            alternative: 'Squats tempo 3s descente',
          },
          {
            id: 'ex_chair_dips',
            name: 'Dips sur support ou Pompes diamant',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 0,
            restSeconds: 60,
            muscle: 'Triceps & Pectoraux',
            cue: 'Épaules basses loin des oreilles, flexion contrôlée à 90°.',
            alternative: 'Pompes mains serrées sur genoux',
          },
          {
            id: 'ex_plank_front',
            name: 'Gainage planche active RKC',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 45,
            muscle: 'Transverse & Gainage',
            cue: 'Rétroversion du bassin, contracte fessiers et quadriceps.',
            alternative: 'Dead Bug contrôlé au sol',
          },
        ],
      },
      {
        id: 'wk_fb_bw_b',
        title: 'Full Body B — Explosivité & Chaîne Postérieure',
        durationMin: 40,
        targetMuscles: ['Fessiers', 'Épaules', 'Dos', 'Obliques'],
        equipment: 'Aucun matériel',
        exercises: [
          {
            id: 'ex_pike_pushups',
            name: 'Pike Push-ups (Pompes épaules)',
            type: 'reps',
            sets: 4,
            targetReps: 10,
            defaultWeightKg: 0,
            restSeconds: 75,
            muscle: 'Épaules & Triceps',
            cue: 'Bassin haut en V inversé, amène la tête en triangle devant les mains.',
            alternative: 'Pompes déclinées pieds surélevés',
          },
          {
            id: 'ex_single_leg_glute_bridge',
            name: 'Hip Thrust unilatéral au sol',
            type: 'reps',
            sets: 4,
            targetReps: 14,
            defaultWeightKg: 0,
            restSeconds: 60,
            muscle: 'Fessiers & Ischios',
            cue: 'Pousse fort dans le talon, pause 2s en haut sans cambrer le dos.',
            alternative: 'Pont fessier bilatéral pausé 3s',
          },
          {
            id: 'ex_pullups_or_door_row',
            name: 'Tractions pronation (ou Rowing serviette)',
            type: 'reps',
            sets: 4,
            targetReps: 8,
            defaultWeightKg: 0,
            restSeconds: 90,
            muscle: 'Grand dorsal & Biceps',
            cue: 'Démarre bras tendus, abaisse les omoplates avant de tirer.',
            alternative: 'Tractions excentriques lentes (5s)',
          },
          {
            id: 'ex_tempo_squats',
            name: 'Squats Tempo 3-1-1 & Demi-rebond',
            type: 'reps',
            sets: 3,
            targetReps: 16,
            defaultWeightKg: 0,
            restSeconds: 60,
            muscle: 'Quadriceps',
            cue: '3s descente, 1s en bas, demi-remontée puis extension complète.',
            alternative: 'Chaise au mur (Wall Sit) 50s',
          },
          {
            id: 'ex_side_plank',
            name: 'Gainage latéral dynamique',
            type: 'timed',
            sets: 3,
            durationSeconds: 40,
            restSeconds: 40,
            muscle: 'Obliques',
            cue: 'Alignement épaule-bassin-cheville strict, repousse le sol.',
            alternative: 'Russian Twists contrôlés',
          },
        ],
      },
      {
        id: 'wk_fb_bw_c',
        title: 'Full Body C — Endurance Musculaire & Core',
        durationMin: 35,
        targetMuscles: ['Pectoraux', 'Jambes', 'Posture', 'Abdos'],
        equipment: 'Aucun matériel',
        exercises: [
          {
            id: 'ex_wide_pushups',
            name: 'Pompes prise large contrôlées',
            type: 'reps',
            sets: 4,
            targetReps: 14,
            defaultWeightKg: 0,
            restSeconds: 60,
            muscle: 'Pectoraux',
            cue: 'Étirement maîtrisé en bas, expiration franche à la montée.',
            alternative: 'Pompes classiques',
          },
          {
            id: 'ex_walking_lunges',
            name: 'Fentes arrière alternées',
            type: 'reps',
            sets: 4,
            targetReps: 20,
            defaultWeightKg: 0,
            restSeconds: 60,
            muscle: 'Jambes & Fessiers',
            cue: 'Tibia avant vertical, frôle le sol avec le genou arrière.',
            alternative: 'Montées sur banc (Step-ups)',
          },
          {
            id: 'ex_prone_swimmer',
            name: 'Nageur dorsal Y-T-W au sol',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 45,
            muscle: 'Haut du dos & Coiffe',
            cue: 'Pouces vers le plafond, resserre les omoplates sans hausser les épaules.',
            alternative: 'Rowing inversé prise supination',
          },
          {
            id: 'ex_hollow_body',
            name: 'Hollow Body Hold (Gainage gymnique)',
            type: 'timed',
            sets: 4,
            durationSeconds: 35,
            restSeconds: 45,
            muscle: 'Sangle profonde',
            cue: 'Bas du dos intégralement plaqué au sol.',
            alternative: 'Dead Bug alterné',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. PUSH / PULL / LEGS (SALLE OU HALTÈRES)
  // =========================================================================
  {
    id: 'prog_ppl_hypertrophy',
    title: 'Push / Pull / Legs',
    subtitle: 'Hypertrophie structurée • Salle ou Banc + Haltères',
    category: 'Musculation',
    frequency: '3 à 6x / sem.',
    level: 'Intermédiaire',
    workouts: [
      {
        id: 'wk_ppl_push',
        title: 'Push — Pectoraux, Épaules & Triceps',
        durationMin: 50,
        targetMuscles: ['Pectoraux', 'Épaules', 'Triceps'],
        equipment: 'Barre / Haltères / Poulie',
        exercises: [
          {
            id: 'ex_db_bench',
            name: 'Développé couché haltères ou barre',
            type: 'reps',
            sets: 4,
            targetReps: 8,
            defaultWeightKg: 24,
            restSeconds: 120,
            muscle: 'Pectoraux',
            cue: 'Omoplates fixées sur le banc, descente contrôlée 2s.',
            alternative: 'Presse pectoraux convergente',
          },
          {
            id: 'ex_incline_db_press',
            name: 'Développé incliné 30° haltères',
            type: 'reps',
            sets: 3,
            targetReps: 10,
            defaultWeightKg: 20,
            restSeconds: 90,
            muscle: 'Haut des pectoraux',
            cue: 'Inclinaison modérée à 30°, étirement propre en bas.',
            alternative: 'Écartés poulie basse à haute',
          },
          {
            id: 'ex_overhead_press',
            name: 'Développé militaire haltères',
            type: 'reps',
            sets: 3,
            targetReps: 10,
            defaultWeightKg: 16,
            restSeconds: 90,
            muscle: 'Deltoïdes',
            cue: 'Coudes légèrement avancés (plan scapulaire) pour préserver l’épaule.',
            alternative: 'Landmine Press unilatéral',
          },
          {
            id: 'ex_lat_raises',
            name: 'Élévations latérales strictes',
            type: 'reps',
            sets: 4,
            targetReps: 15,
            defaultWeightKg: 8,
            restSeconds: 60,
            muscle: 'Deltoïde latéral',
            cue: 'Éloigne les mains sur les côtés sans élan du buste.',
            alternative: 'Élévations latérales poulie basse',
          },
          {
            id: 'ex_triceps_ext',
            name: 'Extensions triceps poulie corde',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 20,
            restSeconds: 60,
            muscle: 'Triceps',
            cue: 'Coudes collés aux côtes, verrouille en bas sans bouger les épaules.',
            alternative: 'Extensions haltère derrière la nuque',
          },
        ],
      },
      {
        id: 'wk_ppl_pull',
        title: 'Pull — Dos Complet, Arrière d’Épaule & Biceps',
        durationMin: 50,
        targetMuscles: ['Grand dorsal', 'Trapèzes', 'Biceps'],
        equipment: 'Barre / Haltères / Poulie',
        exercises: [
          {
            id: 'ex_lat_pulldown',
            name: 'Tractions pronation ou Tirage vertical',
            type: 'reps',
            sets: 4,
            targetReps: 9,
            defaultWeightKg: 55,
            restSeconds: 105,
            muscle: 'Grand dorsal',
            cue: 'Tire les coudes vers les hanches, buste fier.',
            alternative: 'Tirage vertical prise neutre serrée',
          },
          {
            id: 'ex_one_arm_row',
            name: 'Rowing bûcheron unilatéral haltère',
            type: 'reps',
            sets: 4,
            targetReps: 10,
            defaultWeightKg: 26,
            restSeconds: 90,
            muscle: 'Épaisseur du dos',
            cue: 'Tire en arc vers la hanche sans vriller le buste.',
            alternative: 'Rowing assis poulie basse',
          },
          {
            id: 'ex_facepull',
            name: 'Face Pull corde (ou Oiseau haltères)',
            type: 'reps',
            sets: 3,
            targetReps: 15,
            defaultWeightKg: 18,
            restSeconds: 60,
            muscle: 'Deltoïde postérieur',
            cue: 'Tire vers le front avec rotation externe des épaules.',
            alternative: 'Oiseau sur banc incliné',
          },
          {
            id: 'ex_incline_curl',
            name: 'Curl haltères banc incliné (ou barre EZ)',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 12,
            restSeconds: 60,
            muscle: 'Biceps',
            cue: 'Coudes fixes légèrement en arrière du tronc.',
            alternative: 'Curl pupitre Larry Scott',
          },
          {
            id: 'ex_hammer_curl',
            name: 'Curl marteau prise neutre',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 14,
            restSeconds: 60,
            muscle: 'Brachial & Avant-bras',
            cue: 'Contrôle complet à la descente sans balancier.',
            alternative: 'Curl corde poulie basse',
          },
        ],
      },
      {
        id: 'wk_ppl_legs',
        title: 'Legs — Quadriceps, Ischios, Fessiers & Mollets',
        durationMin: 55,
        targetMuscles: ['Quadriceps', 'Ischios', 'Fessiers', 'Mollets'],
        equipment: 'Barre / Haltères / Presse',
        exercises: [
          {
            id: 'ex_squat_goblet_bar',
            name: 'Back Squat barre (ou Presse à cuisses)',
            type: 'reps',
            sets: 4,
            targetReps: 8,
            defaultWeightKg: 70,
            restSeconds: 120,
            muscle: 'Quadriceps & Fessiers',
            cue: 'Gainage 360°, genoux alignés avec les pointes de pieds.',
            alternative: 'Goblet Squat lourd ou Hack Squat',
          },
          {
            id: 'ex_rdl',
            name: 'Soulevé de terre roumain (RDL)',
            type: 'reps',
            sets: 4,
            targetReps: 10,
            defaultWeightKg: 65,
            restSeconds: 105,
            muscle: 'Ischios & Fessiers',
            cue: 'Charnière de hanche pure, dos neutre, barre frôlant les jambes.',
            alternative: 'Hip Thrust barre',
          },
          {
            id: 'ex_db_lunges',
            name: 'Fentes bulgares haltères',
            type: 'reps',
            sets: 3,
            targetReps: 10,
            defaultWeightKg: 16,
            restSeconds: 90,
            muscle: 'Quadriceps & Fessiers',
            cue: 'Descends verticalement avec contrôle, pousse par le talon avant.',
            alternative: 'Leg Extension contrôlé',
          },
          {
            id: 'ex_leg_curl',
            name: 'Leg Curl ischio-jambiers',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 40,
            restSeconds: 60,
            muscle: 'Ischio-jambiers',
            cue: 'Bassin collé au support, 3 secondes sur la phase négative.',
            alternative: 'Nordic Curl assisté ou Glute Slide',
          },
          {
            id: 'ex_calf_raises',
            name: 'Mollets debout pausés 2s',
            type: 'reps',
            sets: 4,
            targetReps: 15,
            defaultWeightKg: 45,
            restSeconds: 45,
            muscle: 'Mollets',
            cue: 'Pause complète de 2s en bas pour supprimer le rebond.',
            alternative: 'Mollets assis',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 3. UPPER / LOWER (4 JOURS ÉQUILIBRÉS)
  // =========================================================================
  {
    id: 'prog_upper_lower',
    title: 'Upper / Lower (4 Jours)',
    subtitle: 'Équilibre optimal Haut / Bas du corps & Récupération',
    category: 'Force & Volume',
    frequency: '4x / sem.',
    level: 'Intermédiaire',
    workouts: [
      {
        id: 'wk_ul_upper_a',
        title: 'Upper A — Force Haut du Corps',
        durationMin: 48,
        targetMuscles: ['Pectoraux', 'Dos', 'Épaules', 'Bras'],
        equipment: 'Barre & Haltères',
        exercises: [
          {
            id: 'ex_ul_bench',
            name: 'Développé couché barre ou haltères',
            type: 'reps',
            sets: 4,
            targetReps: 6,
            defaultWeightKg: 65,
            restSeconds: 120,
            muscle: 'Pectoraux',
            cue: 'Appuis solides au sol, trajectoire maîtrisée.',
            alternative: 'Dips lestés',
          },
          {
            id: 'ex_ul_row',
            name: 'Rowing barre ou poitrine appuyée',
            type: 'reps',
            sets: 4,
            targetReps: 8,
            defaultWeightKg: 55,
            restSeconds: 105,
            muscle: 'Dos complet',
            cue: 'Tirage franc vers le bas du sternum, omoplates serrées.',
            alternative: 'Rowing unilatéral haltère',
          },
          {
            id: 'ex_ul_ohp',
            name: 'Développé militaire debout',
            type: 'reps',
            sets: 3,
            targetReps: 8,
            defaultWeightKg: 38,
            restSeconds: 90,
            muscle: 'Épaules',
            cue: 'Fessiers et abdos gainés pour protéger le bas du dos.',
            alternative: 'Développé épaules assis haltères',
          },
          {
            id: 'ex_ul_chinups',
            name: 'Tractions supination (Chin-ups)',
            type: 'reps',
            sets: 3,
            targetReps: 8,
            defaultWeightKg: 0,
            restSeconds: 90,
            muscle: 'Dorsaux & Biceps',
            cue: 'Menton au-dessus de la barre, descente complète.',
            alternative: 'Tirage vertical prise serrée',
          },
        ],
      },
      {
        id: 'wk_ul_lower_a',
        title: 'Lower A — Quadriceps & Gainage',
        durationMin: 48,
        targetMuscles: ['Quadriceps', 'Fessiers', 'Abdos'],
        equipment: 'Barre & Haltères',
        exercises: [
          {
            id: 'ex_ul_squat',
            name: 'Squat complet (ou Front Squat)',
            type: 'reps',
            sets: 4,
            targetReps: 6,
            defaultWeightKg: 75,
            restSeconds: 120,
            muscle: 'Quadriceps & Fessiers',
            cue: 'Reste gainé et repousse le sol avec le milieu du pied.',
            alternative: 'Hack Squat',
          },
          {
            id: 'ex_ul_rdl_db',
            name: 'Soulevé de terre roumain haltères',
            type: 'reps',
            sets: 3,
            targetReps: 10,
            defaultWeightKg: 26,
            restSeconds: 90,
            muscle: 'Ischio-jambiers',
            cue: 'Étirement profond des ischios en gardant le dos plat.',
            alternative: 'Banc à lombaires 45° focus fessiers',
          },
          {
            id: 'ex_ul_split_squat',
            name: 'Squat bulgare haltères',
            type: 'reps',
            sets: 3,
            targetReps: 10,
            defaultWeightKg: 14,
            restSeconds: 75,
            muscle: 'Quadriceps & Fessiers',
            cue: 'Contrôle la descente sur chaque jambe.',
            alternative: 'Fentes marchées',
          },
          {
            id: 'ex_ul_abwheel',
            name: 'Ab-Wheel (Roue abdominale)',
            type: 'reps',
            sets: 3,
            targetReps: 10,
            defaultWeightKg: 0,
            restSeconds: 60,
            muscle: 'Abdominaux profonds',
            cue: 'Ne creuse jamais le bas du dos à l’extension.',
            alternative: 'Planche RKC 45s',
          },
        ],
      },
      {
        id: 'wk_ul_upper_b',
        title: 'Upper B — Hypertrophie Haut du Corps',
        durationMin: 45,
        targetMuscles: ['Haut Pectoraux', 'Dorsaux', 'Épaules', 'Bras'],
        equipment: 'Haltères & Poulies',
        exercises: [
          {
            id: 'ex_ul_inc_db',
            name: 'Développé incliné haltères',
            type: 'reps',
            sets: 4,
            targetReps: 10,
            defaultWeightKg: 22,
            restSeconds: 90,
            muscle: 'Haut des pectoraux',
            cue: 'Pause 1s en bas dans l’étirement.',
            alternative: 'Pompes pieds surélevés',
          },
          {
            id: 'ex_ul_pulldown_wide',
            name: 'Tirage vertical pronation',
            type: 'reps',
            sets: 4,
            targetReps: 10,
            defaultWeightKg: 52,
            restSeconds: 90,
            muscle: 'Grand dorsal',
            cue: 'Tire les coudes vers le bas sans arrondir les épaules.',
            alternative: 'Pull-over poulie haute',
          },
          {
            id: 'ex_ul_lat_raise_b',
            name: 'Élévations latérales + Oiseau',
            type: 'reps',
            sets: 4,
            targetReps: 15,
            defaultWeightKg: 8,
            restSeconds: 60,
            muscle: 'Épaules 3D',
            cue: 'Tension continue sans rebond.',
            alternative: 'Face Pull corde',
          },
          {
            id: 'ex_ul_arms_pair',
            name: 'Superset Curl haltères + Extensions triceps',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 12,
            restSeconds: 60,
            muscle: 'Biceps & Triceps',
            cue: 'Coudes fixes, amplitude complète.',
            alternative: 'Barre EZ + Dips',
          },
        ],
      },
      {
        id: 'wk_ul_lower_b',
        title: 'Lower B — Chaîne Postérieure & Fessiers',
        durationMin: 45,
        targetMuscles: ['Fessiers', 'Ischios', 'Quadriceps', 'Obliques'],
        equipment: 'Barre & Haltères',
        exercises: [
          {
            id: 'ex_ul_hip_thrust',
            name: 'Hip Thrust barre lourde',
            type: 'reps',
            sets: 4,
            targetReps: 10,
            defaultWeightKg: 80,
            restSeconds: 90,
            muscle: 'Grand fessier',
            cue: 'Menton rentré, tibias à 90° en haut, contraction 1s.',
            alternative: 'Soulevé de terre Trap Bar',
          },
          {
            id: 'ex_ul_leg_press',
            name: 'Presse à cuisses inclinée',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 110,
            restSeconds: 90,
            muscle: 'Quadriceps',
            cue: 'Garde le sacrum bien plaqué au siège.',
            alternative: 'Goblet Squat talons surélevés',
          },
          {
            id: 'ex_ul_ham_curl',
            name: 'Leg Curl assis ou allongé',
            type: 'reps',
            sets: 3,
            targetReps: 14,
            defaultWeightKg: 35,
            restSeconds: 60,
            muscle: 'Ischio-jambiers',
            cue: 'Chevilles fléchies, contrôle excentrique.',
            alternative: 'Swiss Ball Leg Curl',
          },
          {
            id: 'ex_ul_pallof',
            name: 'Pallof Press anti-rotation',
            type: 'timed',
            sets: 3,
            durationSeconds: 40,
            restSeconds: 45,
            muscle: 'Obliques & Tronc',
            cue: 'Résiste à la traction latérale sans tourner le buste.',
            alternative: 'Gainage latéral',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 4. HALTÈRES & KETTLEBELL MAISON (MINIMALISTE) — NOUVEAU !
  // =========================================================================
  {
    id: 'prog_home_db_kb',
    title: 'Haltères & Kettlebell Maison',
    subtitle: 'Minimaliste & ultra-efficace avec 2 haltères ou 1 kettlebell',
    category: 'Home Gym',
    frequency: '3x / sem.',
    level: 'Tous niveaux',
    workouts: [
      {
        id: 'wk_home_db_full',
        title: 'Home Gym A — Force Fonctionnelle Haltères',
        durationMin: 35,
        targetMuscles: ['Jambes', 'Épaules', 'Dos', 'Gainage'],
        equipment: '1 paire d’haltères',
        exercises: [
          {
            id: 'ex_goblet_squat',
            name: 'Goblet Squat haltère contre la poitrine',
            type: 'reps',
            sets: 4,
            targetReps: 12,
            defaultWeightKg: 20,
            restSeconds: 75,
            muscle: 'Quadriceps & Gainage',
            cue: 'Buste droit, coudes à l’intérieur des genoux en bas.',
            alternative: 'Fentes haltères sur place',
          },
          {
            id: 'ex_floor_press_db',
            name: 'Floor Press haltères (Développé au sol)',
            type: 'reps',
            sets: 4,
            targetReps: 10,
            defaultWeightKg: 18,
            restSeconds: 75,
            muscle: 'Pectoraux & Triceps',
            cue: 'Effleure le sol avec les triceps sans relâcher la tension, puis repousse.',
            alternative: 'Pompes mains sur haltères',
          },
          {
            id: 'ex_renegade_row',
            name: 'Rowing planche (Renegade Row) ou Bûcheron',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 14,
            restSeconds: 75,
            muscle: 'Dos & Anti-rotation',
            cue: 'Pieds écartés pour stabiliser le bassin immobile pendant le tirage.',
            alternative: 'Rowing buste penché 2 haltères',
          },
          {
            id: 'ex_db_thruster',
            name: 'Thrusters haltères (Squat + Presse)',
            type: 'reps',
            sets: 3,
            targetReps: 10,
            defaultWeightKg: 12,
            restSeconds: 75,
            muscle: 'Full Body & Cardio',
            cue: 'Utilise la poussée fluide des jambes pour propulser les haltères au-dessus de la tête.',
            alternative: 'Développé épaules debout',
          },
          {
            id: 'ex_farmer_walk',
            name: 'Marche du fermier lourde (ou maintien statique)',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 45,
            muscle: 'Trapèzes, Grip & Gainage',
            cue: 'Grandis-toi, épaules en arrière, marche d’un pas stable.',
            alternative: 'Suitcase Carry unilatéral',
          },
        ],
      },
      {
        id: 'wk_home_kb_cond',
        title: 'Home Gym B — Kettlebell Explosivité & Dos',
        durationMin: 30,
        targetMuscles: ['Chaîne postérieure', 'Épaules', 'Cardio', 'Core'],
        equipment: '1 Kettlebell ou 1 Haltère',
        exercises: [
          {
            id: 'ex_kb_swing',
            name: 'Kettlebell Swing russe (hauteur épaules)',
            type: 'reps',
            sets: 4,
            targetReps: 18,
            defaultWeightKg: 16,
            restSeconds: 60,
            muscle: 'Fessiers, Ischios & Cardio',
            cue: 'Charnière de hanche explosive (pas un squat !), les bras ne sont que des cordes.',
            alternative: 'Soulevé de terre roumain haltères',
          },
          {
            id: 'ex_kb_clean_press',
            name: 'Clean & Press unilatéral',
            type: 'reps',
            sets: 3,
            targetReps: 8,
            defaultWeightKg: 14,
            restSeconds: 75,
            muscle: 'Épaules, Dos & Gainage',
            cue: 'Épaule la charge près du corps puis presse verticalement biceps près de l’oreille.',
            alternative: 'Arnold Press haltères',
          },
          {
            id: 'ex_kb_gorilla_row',
            name: 'Gorilla Row alterné (ou Rowing penché)',
            type: 'reps',
            sets: 3,
            targetReps: 14,
            defaultWeightKg: 16,
            restSeconds: 60,
            muscle: 'Grand dorsal',
            cue: 'Hanches basses et dos plat solide.',
            alternative: 'Rowing unilatéral appuyé sur chaise',
          },
          {
            id: 'ex_kb_halo_core',
            name: 'Kettlebell Halo + Crunch lesté',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 45,
            muscle: 'Mobilité épaules & Abdos',
            cue: 'Fais tourner la charge autour de la nuque en gardant les côtes abaissées.',
            alternative: 'Russian Twist lesté',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 5. FOCUS BAS DU CORPS, FESSIERS & CORE — NOUVEAU !
  // =========================================================================
  {
    id: 'prog_glutes_legs_sculpt',
    title: 'Focus Fessiers, Jambes & Core',
    subtitle: 'Galbe, force du bas du corps & taille tonique',
    category: 'Bas du corps',
    frequency: '2 à 3x / sem.',
    level: 'Tous niveaux',
    workouts: [
      {
        id: 'wk_glutes_power',
        title: 'Séance A — Grand & Moyen Fessier + Ischios',
        durationMin: 42,
        targetMuscles: ['Grand fessier', 'Moyen fessier', 'Ischios', 'Transverse'],
        equipment: 'Haltères / Barre / Élastique',
        exercises: [
          {
            id: 'ex_kas_glute_bridge',
            name: 'Hip Thrust pausé 2s (ou KAS Glute Bridge)',
            type: 'reps',
            sets: 4,
            targetReps: 12,
            defaultWeightKg: 60,
            restSeconds: 90,
            muscle: 'Grand fessier',
            cue: 'Courte amplitude haute ultra-contrôlée pour isoler les fessiers sans les quadriceps.',
            alternative: 'Hip Thrust unilatéral poids du corps',
          },
          {
            id: 'ex_b_stance_rdl',
            name: 'RDL B-Stance (Soulevé roumain décalé)',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 20,
            restSeconds: 75,
            muscle: 'Fessiers & Ischios',
            cue: '80% du poids sur la jambe avant, pied arrière sur la pointe pour l’équilibre.',
            alternative: 'Soulevé de terre roumain classique',
          },
          {
            id: 'ex_stepup_glute',
            name: 'Step-Up haut focus fessier (buste penché)',
            type: 'reps',
            sets: 3,
            targetReps: 10,
            defaultWeightKg: 10,
            restSeconds: 75,
            muscle: 'Fessiers & Quadriceps',
            cue: 'Ne donne aucune impulsion avec le pied au sol, monte uniquement avec le talon du haut.',
            alternative: 'Fentes croisées (Curtsy Lunges) légères',
          },
          {
            id: 'ex_abduction_band',
            name: 'Abductions fessiers (élastique ou poulie basse)',
            type: 'reps',
            sets: 3,
            targetReps: 20,
            defaultWeightKg: 10,
            restSeconds: 45,
            muscle: 'Moyen fessier (galbe latéral)',
            cue: 'Légère inclinaison du buste en avant, contrôle le retour.',
            alternative: 'Fire Hydrant / Clamshell lent au sol',
          },
          {
            id: 'ex_stomach_vacuum',
            name: 'Vacuum abdominal & Dead Bug',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 30,
            muscle: 'Transverse (taille fine & tonique)',
            cue: 'Expire tout l’air puis aspire le nombril sous les côtes.',
            alternative: 'Planche sur avant-bras',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 6. HIIT CARDIO & CORE EXPRESS (20 MIN)
  // =========================================================================
  {
    id: 'prog_hiit_core',
    title: 'HIIT Cardio & Core (20 min)',
    subtitle: 'Dépense calorique élevée, VO2max & Sangle abdominale',
    category: 'Cardio Express',
    frequency: '2 à 3x / sem.',
    level: '20 min',
    workouts: [
      {
        id: 'wk_hiit_metabolic',
        title: 'HIIT Brûle-Graisses Athlétique',
        durationMin: 20,
        targetMuscles: ['Cardio', 'Jambes', 'Abdominaux'],
        equipment: 'Aucun matériel',
        exercises: [
          {
            id: 'ex_hiit_squat_pulse',
            name: 'Squat Dynamique (ou Jump Squat souple)',
            type: 'timed',
            sets: 4,
            durationSeconds: 40,
            restSeconds: 20,
            muscle: 'Cardio & Jambes',
            cue: 'Amorti silencieux et rythme constant.',
            alternative: 'Air Squats rapides sans saut',
          },
          {
            id: 'ex_hiit_climbers',
            name: 'Mountain Climbers gainés',
            type: 'timed',
            sets: 4,
            durationSeconds: 40,
            restSeconds: 20,
            muscle: 'Cardio & Abdos',
            cue: 'Épaules au-dessus des poignets, bassin fixe.',
            alternative: 'Montées de genoux debout sans impact',
          },
          {
            id: 'ex_hiit_burpee_nojump',
            name: 'Sprawls athlétiques',
            type: 'timed',
            sets: 4,
            durationSeconds: 35,
            restSeconds: 25,
            muscle: 'Full Body Métabolique',
            cue: 'Planche solide sans jamais creuser les lombaires.',
            alternative: 'Walk-out planche debout',
          },
          {
            id: 'ex_hiit_bicycle',
            name: 'Bicycle Crunch contrôlé',
            type: 'timed',
            sets: 4,
            durationSeconds: 40,
            restSeconds: 20,
            muscle: 'Grand droit & Obliques',
            cue: 'Tourne l’épaule vers le genou opposé sans tirer sur la nuque.',
            alternative: 'Dead Bug tonique',
          },
        ],
      },
      {
        id: 'wk_core_sculpt_18',
        title: 'Core 360° — Abdos & Gainage Athlétique',
        durationMin: 18,
        targetMuscles: ['Transverse', 'Grand droit', 'Obliques'],
        equipment: 'Tapis de sol',
        exercises: [
          {
            id: 'ex_core_deadbug',
            name: 'Dead Bug anti-extension',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 25,
            muscle: 'Transverse profond',
            cue: 'Lombaires collées au tapis pendant toute l’extension.',
            alternative: 'Planche genoux posés',
          },
          {
            id: 'ex_core_plank_saw',
            name: 'Body Saw (Planche dynamique)',
            type: 'timed',
            sets: 3,
            durationSeconds: 40,
            restSeconds: 25,
            muscle: 'Grand droit',
            cue: 'Léger va-et-vient d’avant en arrière depuis les chevilles.',
            alternative: 'Planche classique',
          },
          {
            id: 'ex_core_hollow_flutter',
            name: 'Reverse Crunch contrôlé',
            type: 'reps',
            sets: 3,
            targetReps: 15,
            defaultWeightKg: 0,
            restSeconds: 30,
            muscle: 'Bas des abdos',
            cue: 'Enroule le bassin sans élan, freine la descente 3s.',
            alternative: 'Relevé de genoux allongé',
          },
          {
            id: 'ex_core_bird_dog',
            name: 'Bird-Dog pausé 2s',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 20,
            muscle: 'Chaîne postérieure',
            cue: 'Allonge bras et jambe opposés sans vriller les hanches.',
            alternative: 'Pont fessier statique',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 7. MOBILITÉ, POSTURE & GAINAGE PROFOND
  // =========================================================================
  {
    id: 'prog_mobility_posture',
    title: 'Mobilité, Posture & Santé du Dos',
    subtitle: 'Récupération active, souplesse & blindage lombaire',
    category: 'Mobilité',
    frequency: 'Quotidien (16 min)',
    level: 'Récupération',
    workouts: [
      {
        id: 'wk_mob_full_flow',
        title: 'Déverrouillage Complet Hanches, Dos & Épaules',
        durationMin: 18,
        targetMuscles: ['Dos thoracique', 'Hanches', 'Épaules', 'Chevilles'],
        equipment: 'Tapis de sol',
        exercises: [
          {
            id: 'ex_mob_worlds_greatest',
            name: "World's Greatest Stretch",
            type: 'timed',
            sets: 3,
            durationSeconds: 50,
            restSeconds: 15,
            muscle: 'Hanches & Colonne thoracique',
            cue: 'Grande fente avant suivie d’une ouverture thoracique vers le plafond.',
            alternative: 'Cat-Cow respiré',
          },
          {
            id: 'ex_mob_90_90',
            name: 'Transitions de hanches 90/90',
            type: 'timed',
            sets: 3,
            durationSeconds: 50,
            restSeconds: 15,
            muscle: 'Mobilité des hanches',
            cue: 'Buste droit, bascule fluide des genoux d’un côté à l’autre.',
            alternative: 'Étirement du papillon',
          },
          {
            id: 'ex_mob_deep_squat_pry',
            name: 'Deep Squat Hold & Ouverture',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 20,
            muscle: 'Chevilles & Bas du dos',
            cue: 'Accroupi profond, repousse les genoux avec les coudes.',
            alternative: 'Posture de l’enfant',
          },
          {
            id: 'ex_mob_wall_angels',
            name: 'Wall Slides (Posture cervicale & épaules)',
            type: 'reps',
            sets: 3,
            targetReps: 12,
            defaultWeightKg: 0,
            restSeconds: 25,
            muscle: 'Trapèzes inférieurs',
            cue: 'Dos et avant-bras contre le mur sans cambrer.',
            alternative: 'Cercles d’épaules contrôlés',
          },
        ],
      },
      {
        id: 'wk_mob_mcgill_spine',
        title: 'Protocole Big 3 McGill — Blindage Lombaire',
        durationMin: 16,
        targetMuscles: ['Carré des lombes', 'Transverse', 'Lombaires'],
        equipment: 'Tapis de sol',
        exercises: [
          {
            id: 'ex_mcgill_curlup',
            name: 'Curl-Up modifié de McGill',
            type: 'timed',
            sets: 3,
            durationSeconds: 40,
            restSeconds: 20,
            muscle: 'Sangle antérieure',
            cue: 'Décolle tête et épaules de 3 cm sans écraser les lombaires.',
            alternative: 'Respiration diaphragmatique',
          },
          {
            id: 'ex_mcgill_sidebridge',
            name: 'Side Bridge (Planche latérale)',
            type: 'timed',
            sets: 3,
            durationSeconds: 40,
            restSeconds: 20,
            muscle: 'Carré des lombes',
            cue: 'Verrouille hanches et buste sur une seule ligne.',
            alternative: 'Pallof statique',
          },
          {
            id: 'ex_mcgill_birddog',
            name: 'Bird-Dog strict anti-rotation',
            type: 'timed',
            sets: 3,
            durationSeconds: 45,
            restSeconds: 20,
            muscle: 'Stabilisateurs spinaux',
            cue: 'Zéro mouvement du bassin pendant l’extension.',
            alternative: 'Pont fessier lent',
          },
        ],
      },
    ],
  },
];

// Exercices complémentaires pour enrichir le constructeur libre
const EXTRA_EXERCISES = [
  {
    id: 'ex_extra_deadlift',
    name: 'Soulevé de terre conventionnel ou Sumo',
    type: 'reps',
    sets: 4,
    targetReps: 5,
    defaultWeightKg: 90,
    restSeconds: 150,
    muscle: 'Chaîne postérieure complète',
    cue: 'Barre collée aux tibias, poitrine haute, poussée jambes puis hanches.',
    programCategory: 'Force',
  },
  {
    id: 'ex_extra_dips_weighted',
    name: 'Dips barres parallèles (poids du corps ou lestés)',
    type: 'reps',
    sets: 4,
    targetReps: 10,
    defaultWeightKg: 0,
    restSeconds: 90,
    muscle: 'Pectoraux & Triceps',
    cue: 'Légère inclinaison du buste en avant, contrôle l’étirement.',
    programCategory: 'Musculation',
  },
  {
    id: 'ex_extra_leg_ext',
    name: 'Leg Extension machine',
    type: 'reps',
    sets: 3,
    targetReps: 15,
    defaultWeightKg: 45,
    restSeconds: 60,
    muscle: 'Quadriceps (isolation)',
    cue: 'Pause 1s jambes tendues en haut.',
    programCategory: 'Musculation',
  },
  {
    id: 'ex_extra_pec_fly',
    name: 'Écartés poulie vis-à-vis ou Pec Deck',
    type: 'reps',
    sets: 3,
    targetReps: 14,
    defaultWeightKg: 20,
    restSeconds: 60,
    muscle: 'Pectoraux (finition)',
    cue: 'Garde un léger angle aux coudes et resserre les bras devant le sternum.',
    programCategory: 'Musculation',
  },
  {
    id: 'ex_extra_hanging_leg_raise',
    name: 'Relevés de jambes suspendu à la barre',
    type: 'reps',
    sets: 3,
    targetReps: 12,
    defaultWeightKg: 0,
    restSeconds: 60,
    muscle: 'Abdominaux & Fléchisseurs',
    cue: 'Enroule le bassin vers le haut sans te balancer.',
    programCategory: 'Poids du corps',
  },
  {
    id: 'ex_extra_copenhagen',
    name: 'Gainage Copenhagen (Adducteurs)',
    type: 'timed',
    sets: 3,
    durationSeconds: 30,
    restSeconds: 45,
    muscle: 'Adducteurs & Obliques',
    cue: 'Jambe supérieure en appui sur un banc, bassin haut.',
    programCategory: 'Prévention & Athlétique',
  },
  {
    id: 'ex_extra_skullcrusher',
    name: 'Barre EZ au front (Skullcrusher)',
    type: 'reps',
    sets: 3,
    targetReps: 10,
    defaultWeightKg: 25,
    restSeconds: 75,
    muscle: 'Triceps',
    cue: 'Descends la barre légèrement derrière le crâne pour garder les triceps sous tension.',
    programCategory: 'Musculation',
  },
  {
    id: 'ex_extra_cable_crunch',
    name: 'Crunch à genoux poulie haute',
    type: 'reps',
    sets: 3,
    targetReps: 15,
    defaultWeightKg: 30,
    restSeconds: 60,
    muscle: 'Grand droit abdominal',
    cue: 'Hanches fixes, enroule uniquement la colonne thoracique.',
    programCategory: 'Musculation',
  },
  ...EXTENDED_EXTRA_EXERCISES,
];

function inferEquipmentTagsFromText(name = '', fallbackText = '') {
  const txt = `${name} ${fallbackText}`.toLowerCase();
  const tags = new Set();

  if (txt.includes('chaise romaine')) tags.add('roman_chair');
  if (txt.includes('traction') || txt.includes('suspendu') || txt.includes('chin-up')) {
    tags.add('pullup_bar');
    tags.add('roman_chair');
  }
  if (txt.includes('dip') || txt.includes('parallette')) {
    tags.add('dip_bars');
    tags.add('roman_chair');
  }
  if (txt.includes('elastique') || txt.includes('élastique') || txt.includes('band')) {
    tags.add('bands');
  }
  if (txt.includes('anneau') || txt.includes('trx') || txt.includes('sangle') || txt.includes('ring')) {
    tags.add('trx_rings');
  }
  if (txt.includes('haltere') || txt.includes('haltère') || txt.includes('goblet')) {
    tags.add('dumbbells');
  }
  if (txt.includes('kettlebell') || txt.includes('kb ')) {
    tags.add('kettlebell');
  }
  if (txt.includes('banc') || txt.includes('incline') || txt.includes('incliné') || txt.includes('bulgare') || txt.includes('hip thrust')) {
    tags.add('bench');
  }
  if (txt.includes('barre') && !txt.includes('traction') && !txt.includes('suspendu') && !txt.includes('paralle')) {
    tags.add('barbell');
  }
  if (txt.includes('poulie') || txt.includes('corde') && !txt.includes('sauter') || txt.includes('face pull') || txt.includes('cable')) {
    tags.add('cables');
  }
  if (txt.includes('machine') || txt.includes('presse') || txt.includes('leg curl') || txt.includes('leg extension') || txt.includes('pec deck') || txt.includes('hack squat')) {
    tags.add('machines');
  }
  if (txt.includes('ab wheel') || txt.includes('roue') || txt.includes('swiss ball')) {
    tags.add('ab_wheel_ball');
  }
  if (txt.includes('corde à sauter') || txt.includes('rameur') || txt.includes('bike')) {
    tags.add('cardio_gear');
  }

  if (tags.size === 0 || txt.includes('aucun matériel') || txt.includes('tapis de sol') || txt.includes('poids du corps')) {
    if (tags.size === 0) tags.add('none');
  }

  return Array.from(tags);
}

function inferMuscleGroupKey(muscleStr = '', nameStr = '') {
  const m = `${muscleStr} ${nameStr}`.toLowerCase();
  if (m.includes('pector') || m.includes('pec ') || m.includes('pompe')) return 'pectoraux';
  if (m.includes('dorsal') || m.includes('dos') || m.includes('rhombo') || m.includes('rowing') || m.includes('traction')) return 'dos';
  if (m.includes('epaul') || m.includes('épaul') || m.includes('delto') || m.includes('militaire') || m.includes('pike')) return 'epaules';
  if (m.includes('biceps') || m.includes('triceps') || m.includes('bras') || m.includes('curl')) return 'bras';
  if (m.includes('quadri') || m.includes('ischio') || m.includes('fessier') || m.includes('jambe') || m.includes('mollet') || m.includes('adduct') || m.includes('squat') || m.includes('fente')) return 'jambes_fessiers';
  if (m.includes('abdo') || m.includes('gainage') || m.includes('oblique') || m.includes('transverse') || m.includes('lombaire') || m.includes('core') || m.includes('planche')) return 'abdos';
  return 'full_cardio';
}

function inferProgramDiscipline(prog) {
  if (prog.discipline) return prog.discipline;
  if (prog.id === 'prog_fullbody_bw') return 'bodyweight';
  if (prog.id === 'prog_home_db_kb') return 'bands_home';
  if (prog.id === 'prog_hiit_core') return 'hiit_cardio';
  if (prog.id === 'prog_mobility_posture') return 'mobility_core';
  return 'gym_strength';
}

// Ajout des programmes étendus (Callisthénie & Chaise Romaine, Full Élastiques, Anneaux & TRX)
WORKOUT_PROGRAMS.push(...EXTENDED_WORKOUT_PROGRAMS);

// Enrichissement automatique uniforme des 10 programmes
WORKOUT_PROGRAMS.forEach((prog) => {
  prog.discipline = inferProgramDiscipline(prog);
  const progEqSet = new Set(prog.equipmentTags || []);
  prog.workouts.forEach((wk) => {
    const wkEqSet = new Set(wk.equipmentTags || []);
    wk.exercises.forEach((ex) => {
      if (!ex.discipline) {
        if (
          ex.name.toLowerCase().includes('traction') ||
          ex.name.toLowerCase().includes('dips') ||
          ex.name.toLowerCase().includes('hollow') ||
          ex.name.toLowerCase().includes('pike')
        ) {
          ex.discipline = prog.discipline === 'bodyweight' ? 'calisthenics' : prog.discipline;
        } else {
          ex.discipline = prog.discipline;
        }
      }
      if (!Array.isArray(ex.equipmentTags) || ex.equipmentTags.length === 0) {
        ex.equipmentTags = inferEquipmentTagsFromText(ex.name, wk.equipment);
      }
      ex.muscleGroup = inferMuscleGroupKey(ex.muscle, ex.name);
      ex.equipmentTags.forEach((t) => {
        wkEqSet.add(t);
        progEqSet.add(t);
      });
    });
    wk.equipmentTags = Array.from(wkEqSet);
  });
  prog.equipmentTags = Array.from(progEqSet);
});

const seenExIds = new Set();
export const EXERCISE_CATALOG = [
  ...WORKOUT_PROGRAMS.flatMap((prog) =>
    prog.workouts.flatMap((wk) =>
      wk.exercises.map((ex) => ({
        ...ex,
        programCategory: prog.category,
      }))
    )
  ),
  ...EXTRA_EXERCISES.map((ex) => ({
    ...ex,
    discipline: ex.discipline || 'gym_strength',
    equipmentTags:
      Array.isArray(ex.equipmentTags) && ex.equipmentTags.length > 0
        ? ex.equipmentTags
        : inferEquipmentTagsFromText(ex.name, ex.programCategory || ''),
    muscleGroup: inferMuscleGroupKey(ex.muscle, ex.name),
  })),
].filter((ex) => {
  if (seenExIds.has(ex.id)) return false;
  seenExIds.add(ex.id);
  return true;
});

export function matchesSelectedEquipment(itemEquipmentTags = [], selectedEquipment = []) {
  if (!Array.isArray(selectedEquipment) || selectedEquipment.length === 0) return true;
  if (!Array.isArray(itemEquipmentTags) || itemEquipmentTags.length === 0) return true;
  return itemEquipmentTags.some((tag) => selectedEquipment.includes(tag));
}

export function buildActiveWorkoutExercises(workout, intensityMode = 'normal') {
  return (workout.exercises || []).map((ex) => {
    let adjustedSets = Number(ex.sets) || 3;
    let adjustedDuration = ex.durationSeconds || 40;

    if (intensityMode === 'low_energy') {
      adjustedSets = Math.max(2, Math.round(adjustedSets * 0.75));
      if (ex.type === 'timed') {
        adjustedDuration = Math.max(20, Math.round((adjustedDuration * 0.8) / 5) * 5);
      }
    } else if (intensityMode === 'overload') {
      adjustedSets = adjustedSets + 1;
      if (ex.type === 'timed') {
        adjustedDuration = adjustedDuration + 10;
      }
    }

    const setRows = Array.from({ length: adjustedSets }, (_, idx) => ({
      setNumber: idx + 1,
      reps: ex.type === 'reps' ? ex.targetReps || 10 : null,
      weightKg: ex.type === 'reps' ? ex.defaultWeightKg || 0 : 0,
      durationSeconds: ex.type === 'timed' ? adjustedDuration : null,
      completed: false,
    }));

    return {
      ...ex,
      setsCount: adjustedSets,
      setRows,
    };
  });
}
