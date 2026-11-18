import React, { useMemo } from 'react';

const SPLINE = '0.42 0 0.58 1; 0.42 0 0.58 1';
const KEY_TIMES = '0; 0.46; 1';

/**
 * Détecte automatiquement l'archétype biomécanique exact parmi 16 cinématiques réalistes
 */
export function detectMovementArchetype(exercise = {}) {
  const txt = `${exercise.id || ''} ${exercise.name || ''} ${exercise.muscle || ''}`.toLowerCase();

  if (txt.includes('inclin')) return 'incline_press';
  if (
    txt.includes('développé couché') ||
    txt.includes('developpe couche') ||
    txt.includes('bench') ||
    txt.includes('floor press') ||
    txt.includes('presse convergente') ||
    txt.includes('pec deck') ||
    txt.includes('écarté') ||
    txt.includes('ecarte')
  ) {
    return 'bench_press';
  }
  if (txt.includes('dip')) return 'dips_roman';
  if (
    txt.includes('pompe') ||
    txt.includes('push-up') ||
    txt.includes('pushup') ||
    txt.includes('planche lean') ||
    txt.includes('burpee')
  ) {
    return 'pushup';
  }
  if (
    txt.includes('élévation') ||
    txt.includes('elevation') ||
    txt.includes('oiseau') ||
    txt.includes('pull-apart') ||
    txt.includes('y-t-w')
  ) {
    return 'lateral_raise';
  }
  if (
    txt.includes('militaire') ||
    txt.includes('overhead') && !txt.includes('triceps') ||
    txt.includes('pike') ||
    txt.includes('handstand') ||
    txt.includes('clean & press') ||
    txt.includes('développé épaules') ||
    txt.includes('developpe epaules')
  ) {
    return 'overhead_press';
  }
  if (
    txt.includes('traction') && !txt.includes('australienne') ||
    txt.includes('chin-up') ||
    txt.includes('muscle-up') ||
    txt.includes('front lever')
  ) {
    return 'pullup';
  }
  if (txt.includes('tirage vertical') || txt.includes('pulldown')) {
    return 'lat_pulldown';
  }
  if (
    txt.includes('rowing') ||
    txt.includes('australienne') ||
    txt.includes('tirage horizontal') ||
    txt.includes('face pull') ||
    txt.includes('face-pull')
  ) {
    return 'row';
  }
  if (txt.includes('curl') && !txt.includes('leg curl') && !txt.includes('nordic') && !txt.includes('ischio')) {
    return 'bicep_curl';
  }
  if (
    txt.includes('triceps') ||
    txt.includes('skullcrusher') ||
    txt.includes('pushdown') ||
    txt.includes('barre au front')
  ) {
    return 'tricep_ext';
  }
  if (
    txt.includes('relevé') ||
    txt.includes('releve') ||
    txt.includes('l-sit') ||
    txt.includes('toes') ||
    txt.includes('chaise romaine') && txt.includes('abdo')
  ) {
    return 'hanging_leg_raise';
  }
  if (txt.includes('hip thrust') || txt.includes('pont fessier') || txt.includes('glute bridge')) {
    return 'hip_thrust';
  }
  if (
    txt.includes('roumain') ||
    txt.includes('rdl') ||
    txt.includes('soulevé de terre') ||
    txt.includes('souleve de terre') ||
    txt.includes('good morning') ||
    txt.includes('swing') ||
    txt.includes('leg curl') ||
    txt.includes('nordic')
  ) {
    return 'hinge_rdl';
  }
  if (txt.includes('fente') || txt.includes('bulgare') || txt.includes('step-up') || txt.includes('pistol')) {
    return 'lunge';
  }
  if (
    txt.includes('gainage') ||
    txt.includes('planche') ||
    txt.includes('hollow') ||
    txt.includes('ab wheel') ||
    txt.includes('rollout') ||
    txt.includes('dead bug') ||
    txt.includes('crunch') ||
    txt.includes('pallof') ||
    txt.includes('mcgill')
  ) {
    return 'core_plank';
  }
  if (
    txt.includes('corde à sauter') ||
    txt.includes('sprint') ||
    txt.includes('jumping') ||
    txt.includes('mountain') ||
    txt.includes('mollet')
  ) {
    return 'plyo_cardio';
  }
  return 'squat';
}

/**
 * Cinématiques articulées 2D (coordonnées [départ/étirement, pic de contraction] dans un repère 240x160)
 */
const ARCHETYPE_RIGS = {
  squat: {
    label: 'Squat & Jambes',
    activeLimb: 'legs',
    dur: '2.7s',
    equip: 'barbell_back',
    head: [[122, 34], [118, 66]],
    shoulder: [[120, 50], [114, 82]],
    hip: [[114, 92], [92, 118]],
    knee: [[120, 122], [134, 118]],
    ankle: [[116, 148], [116, 148]],
    elbow: [[104, 66], [98, 96]],
    wrist: [[118, 50], [112, 82]],
  },
  lunge: {
    label: 'Fente',
    activeLimb: 'legs',
    dur: '2.7s',
    equip: 'dumbbells_hand',
    head: [[120, 32], [120, 58]],
    shoulder: [[120, 48], [120, 74]],
    hip: [[118, 88], [118, 114]],
    knee: [[142, 118], [148, 116]],
    ankle: [[146, 148], [146, 148]],
    backKnee: [[98, 120], [92, 142]],
    backAnkle: [[76, 148], [72, 148]],
    elbow: [[120, 72], [120, 96]],
    wrist: [[122, 92], [122, 116]],
  },
  hinge_rdl: {
    label: 'Bassin & Ischios',
    activeLimb: 'posterior',
    dur: '2.9s',
    equip: 'barbell_hand',
    head: [[124, 32], [156, 68]],
    shoulder: [[120, 48], [144, 78]],
    hip: [[112, 88], [86, 88]],
    knee: [[116, 120], [104, 120]],
    ankle: [[114, 148], [114, 148]],
    elbow: [[122, 72], [140, 102]],
    wrist: [[124, 94], [138, 124]],
  },
  hip_thrust: {
    label: 'Extension de Hanche',
    activeLimb: 'posterior',
    dur: '2.6s',
    equip: 'bench_back',
    head: [[72, 84], [68, 76]],
    shoulder: [[86, 94], [86, 88]],
    hip: [[124, 128], [128, 92]],
    knee: [[162, 102], [164, 94]],
    ankle: [[166, 148], [166, 148]],
    elbow: [[106, 112], [108, 92]],
    wrist: [[124, 122], [128, 88]],
  },
  bench_press: {
    label: 'Poussée Horizontale',
    activeLimb: 'upper_push',
    dur: '2.6s',
    equip: 'flat_bench_bar',
    head: [[68, 100], [68, 100]],
    shoulder: [[90, 102], [90, 102]],
    hip: [[134, 104], [134, 104]],
    knee: [[166, 104], [166, 104]],
    ankle: [[174, 148], [174, 148]],
    elbow: [[94, 122], [94, 76]],
    wrist: [[94, 94], [94, 48]],
  },
  incline_press: {
    label: 'Poussée Inclinée 30°',
    activeLimb: 'upper_push',
    dur: '2.6s',
    equip: 'incline_bench_db',
    head: [[80, 72], [80, 72]],
    shoulder: [[94, 86], [94, 86]],
    hip: [[128, 114], [128, 114]],
    knee: [[162, 112], [162, 112]],
    ankle: [[170, 148], [170, 148]],
    elbow: [[92, 106], [100, 62]],
    wrist: [[98, 80], [104, 36]],
  },
  pushup: {
    label: 'Gainage & Poussée Sol',
    activeLimb: 'upper_push',
    dur: '2.5s',
    equip: 'floor_only',
    head: [[174, 74], [168, 114]],
    shoulder: [[154, 82], [150, 122]],
    hip: [[112, 104], [110, 130]],
    knee: [[82, 122], [82, 136]],
    ankle: [[56, 144], [56, 144]],
    elbow: [[148, 112], [134, 112]],
    wrist: [[154, 146], [154, 146]],
  },
  dips_roman: {
    label: 'Dips Chaise Romaine',
    activeLimb: 'upper_push',
    dur: '2.6s',
    equip: 'dip_station',
    head: [[126, 30], [132, 58]],
    shoulder: [[120, 48], [124, 78]],
    hip: [[112, 88], [108, 116]],
    knee: [[114, 120], [102, 136]],
    ankle: [[96, 128], [84, 142]],
    elbow: [[116, 68], [100, 68]],
    wrist: [[120, 88], [120, 88]],
  },
  overhead_press: {
    label: 'Poussée Verticale',
    activeLimb: 'shoulders',
    dur: '2.6s',
    equip: 'barbell_ohp',
    head: [[120, 46], [120, 46]],
    shoulder: [[120, 62], [120, 62]],
    hip: [[120, 100], [120, 100]],
    knee: [[120, 126], [120, 126]],
    ankle: [[120, 148], [120, 148]],
    elbow: [[104, 82], [110, 40]],
    wrist: [[112, 58], [118, 16]],
  },
  lateral_raise: {
    label: 'Épaules Latérales',
    activeLimb: 'shoulders',
    dur: '2.5s',
    equip: 'front_dumbbells',
    isFrontView: true,
    head: [[120, 36], [120, 36]],
    shoulderL: [[102, 56], [102, 56]],
    shoulderR: [[138, 56], [138, 56]],
    elbowL: [[96, 82], [74, 58]],
    wristL: [[94, 104], [50, 60]],
    elbowR: [[144, 82], [166, 58]],
    wristR: [[146, 104], [190, 60]],
    hip: [[120, 96], [120, 96]],
    ankleL: [[108, 148], [108, 148]],
    ankleR: [[132, 148], [132, 148]],
  },
  pullup: {
    label: 'Traction Verticale',
    activeLimb: 'upper_pull',
    dur: '2.8s',
    equip: 'pullup_bar',
    head: [[120, 58], [120, 24]],
    shoulder: [[120, 74], [120, 40]],
    hip: [[120, 112], [118, 78]],
    knee: [[122, 138], [126, 106]],
    ankle: [[114, 146], [114, 118]],
    elbow: [[116, 48], [102, 58]],
    wrist: [[120, 24], [120, 24]],
  },
  lat_pulldown: {
    label: 'Tirage Poulie Haute',
    activeLimb: 'upper_pull',
    dur: '2.7s',
    equip: 'cable_high',
    head: [[120, 58], [116, 60]],
    shoulder: [[120, 74], [116, 76]],
    hip: [[120, 112], [120, 112]],
    knee: [[148, 112], [148, 112]],
    ankle: [[148, 148], [148, 148]],
    elbow: [[122, 48], [104, 92]],
    wrist: [[126, 26], [122, 72]],
  },
  row: {
    label: 'Tirage Horizontal',
    activeLimb: 'upper_pull',
    dur: '2.6s',
    equip: 'cable_mid',
    head: [[112, 54], [106, 52]],
    shoulder: [[112, 70], [106, 68]],
    hip: [[106, 112], [106, 112]],
    knee: [[142, 116], [142, 116]],
    ankle: [[164, 144], [164, 144]],
    elbow: [[138, 80], [88, 86]],
    wrist: [[166, 82], [114, 88]],
  },
  bicep_curl: {
    label: 'Flexion du Coude (Biceps)',
    activeLimb: 'arms',
    dur: '2.4s',
    equip: 'dumbbells_hand',
    head: [[120, 34], [120, 34]],
    shoulder: [[118, 50], [118, 50]],
    hip: [[116, 92], [116, 92]],
    knee: [[118, 120], [118, 120]],
    ankle: [[116, 148], [116, 148]],
    elbow: [[120, 76], [122, 76]],
    wrist: [[124, 102], [138, 54]],
  },
  tricep_ext: {
    label: 'Extension du Coude (Triceps)',
    activeLimb: 'arms',
    dur: '2.4s',
    equip: 'cable_tricep',
    head: [[124, 36], [124, 36]],
    shoulder: [[120, 52], [120, 52]],
    hip: [[112, 92], [112, 92]],
    knee: [[114, 120], [114, 120]],
    ankle: [[112, 148], [112, 148]],
    elbow: [[124, 76], [124, 76]],
    wrist: [[142, 60], [122, 102]],
  },
  hanging_leg_raise: {
    label: 'Relevé de Jambes',
    activeLimb: 'core',
    dur: '2.7s',
    equip: 'roman_backrest',
    head: [[110, 36], [110, 36]],
    shoulder: [[110, 52], [110, 52]],
    hip: [[110, 90], [116, 86]],
    knee: [[112, 120], [148, 82]],
    ankle: [[112, 146], [176, 78]],
    elbow: [[126, 68], [126, 68]],
    wrist: [[138, 68], [138, 68]],
  },
  core_plank: {
    label: 'Gainage Abdos',
    activeLimb: 'core',
    dur: '2.9s',
    equip: 'ab_wheel',
    head: [[154, 92], [182, 110]],
    shoulder: [[136, 98], [164, 114]],
    hip: [[96, 106], [116, 120]],
    knee: [[66, 144], [66, 144]],
    ankle: [[44, 146], [44, 146]],
    elbow: [[146, 122], [182, 128]],
    wrist: [[156, 142], [198, 142]],
  },
  plyo_cardio: {
    label: 'Impulsion & Cardio',
    activeLimb: 'legs',
    dur: '1.6s',
    equip: 'floor_only',
    head: [[120, 42], [120, 22]],
    shoulder: [[120, 58], [120, 38]],
    hip: [[116, 96], [120, 76]],
    knee: [[126, 124], [122, 106]],
    ankle: [[118, 148], [120, 132]],
    elbow: [[104, 76], [106, 56]],
    wrist: [[116, 92], [132, 34]],
  },
};

function AnimLine({ p1, p2, dur, width = 7, color = '#e2e8f0', glow = false, animated = true }) {
  return (
    <line
      x1={p1[0][0]}
      y1={p1[0][1]}
      x2={p2[0][0]}
      y2={p2[0][1]}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    >
      {animated && (
        <>
          <animate
            attributeName="x1"
            values={`${p1[0][0]};${p1[1][0]};${p1[0][0]}`}
            dur={dur}
            keyTimes={KEY_TIMES}
            calcMode="spline"
            keySplines={SPLINE}
            repeatCount="indefinite"
          />
          <animate
            attributeName="y1"
            values={`${p1[0][1]};${p1[1][1]};${p1[0][1]}`}
            dur={dur}
            keyTimes={KEY_TIMES}
            calcMode="spline"
            keySplines={SPLINE}
            repeatCount="indefinite"
          />
          <animate
            attributeName="x2"
            values={`${p2[0][0]};${p2[1][0]};${p2[0][0]}`}
            dur={dur}
            keyTimes={KEY_TIMES}
            calcMode="spline"
            keySplines={SPLINE}
            repeatCount="indefinite"
          />
          <animate
            attributeName="y2"
            values={`${p2[0][1]};${p2[1][1]};${p2[0][1]}`}
            dur={dur}
            keyTimes={KEY_TIMES}
            calcMode="spline"
            keySplines={SPLINE}
            repeatCount="indefinite"
          />
        </>
      )}
    </line>
  );
}

function AnimCircle({ p, r = 8, dur, fill = '#f8fafc', stroke = 'none', strokeWidth = 0, animated = true }) {
  return (
    <circle cx={p[0][0]} cy={p[0][1]} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
      {animated && (
        <>
          <animate
            attributeName="cx"
            values={`${p[0][0]};${p[1][0]};${p[0][0]}`}
            dur={dur}
            keyTimes={KEY_TIMES}
            calcMode="spline"
            keySplines={SPLINE}
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values={`${p[0][1]};${p[1][1]};${p[0][1]}`}
            dur={dur}
            keyTimes={KEY_TIMES}
            calcMode="spline"
            keySplines={SPLINE}
            repeatCount="indefinite"
          />
        </>
      )}
    </circle>
  );
}

/**
 * Silhouette anatomique miniature mettant en surbrillance les groupes musculaires sollicités
 */
export function MuscleAnatomyBadge({ muscleText = '', size = 56 }) {
  const m = String(muscleText).toLowerCase();
  const pecs = m.includes('pector') || m.includes('pec');
  const back = m.includes('dos') || m.includes('dorsal') || m.includes('rhombo') || m.includes('trap');
  const shoulders = m.includes('epaul') || m.includes('épaul') || m.includes('delto') || m.includes('coiffe');
  const arms = m.includes('biceps') || m.includes('triceps') || m.includes('bras');
  const abs = m.includes('abdo') || m.includes('gainage') || m.includes('oblique') || m.includes('transverse') || m.includes('core');
  const glutes = m.includes('fessier') || m.includes('lombaire') || m.includes('postérieure');
  const legs = m.includes('quadri') || m.includes('ischio') || m.includes('jambe') || m.includes('mollet') || m.includes('adduct') || m.includes('full');

  const hot = 'var(--accent)';
  const idle = 'var(--border-strong)';

  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 64 84"
      className="shrink-0"
      aria-label={`Anatomie : ${muscleText}`}
    >
      {/* Tête */}
      <circle cx="32" cy="10" r="6" fill="var(--text-muted)" fillOpacity="0.45" />
      {/* Épaules / Deltoïdes */}
      <circle cx="19" cy="22" r="4.5" fill={shoulders ? hot : idle} />
      <circle cx="45" cy="22" r="4.5" fill={shoulders ? hot : idle} />
      {/* Pectoraux / Dos haut */}
      <rect
        x="22"
        y="18"
        width="20"
        height="11"
        rx="4"
        fill={pecs || back ? hot : idle}
      />
      {/* Sangle abdominale / Tronc */}
      <rect
        x="24"
        y="30"
        width="16"
        height="14"
        rx="3"
        fill={abs ? hot : idle}
      />
      {/* Bras (Biceps / Triceps) */}
      <rect x="13" y="27" width="5" height="16" rx="2.5" fill={arms ? hot : idle} />
      <rect x="46" y="27" width="5" height="16" rx="2.5" fill={arms ? hot : idle} />
      {/* Bassin / Fessiers */}
      <rect
        x="22"
        y="45"
        width="20"
        height="8"
        rx="4"
        fill={glutes ? hot : idle}
      />
      {/* Cuisses & Mollets */}
      <rect x="22" y="54" width="8" height="24" rx="4" fill={legs ? hot : idle} />
      <rect x="34" y="54" width="8" height="24" rx="4" fill={legs ? hot : idle} />
    </svg>
  );
}

export default function ExerciseMotionVisual({
  exercise,
  size = 'hero', // 'thumb' | 'card' | 'hero'
  animated = true,
  showAnatomy = true,
}) {
  const archetypeKey = useMemo(() => detectMovementArchetype(exercise), [exercise]);
  const rig = ARCHETYPE_RIGS[archetypeKey] || ARCHETYPE_RIGS.squat;
  const dur = rig.dur;

  const accent = 'var(--accent)';
  const bodyPrimary = 'var(--text-primary)';
  const bodyNeutral = 'var(--text-secondary)';
  const bodyDark = 'var(--text-muted)';
  const rigMetal = 'var(--border-strong)';

  const isThumb = size === 'thumb';

  const torsoColor =
    rig.activeLimb === 'core' || rig.activeLimb === 'upper_pull' ? accent : bodyNeutral;
  const legColor =
    rig.activeLimb === 'legs' || rig.activeLimb === 'posterior' ? accent : bodyNeutral;
  const armColor =
    rig.activeLimb === 'upper_push' ||
    rig.activeLimb === 'arms' ||
    rig.activeLimb === 'shoulders' ||
    rig.activeLimb === 'upper_pull'
      ? accent
      : bodyNeutral;

  return (
    <div
      className={`relative overflow-hidden select-none ${
        isThumb
          ? 'w-12 h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0'
          : size === 'card'
          ? 'w-full h-36 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)]'
          : 'w-full h-48 sm:h-52 rounded-2xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)]'
      }`}
    >
      {/* Grille architecturale discrète */}
      {!isThumb && (
        <div
          className="absolute inset-0 opacity-35 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      )}

      <svg
        viewBox="0 0 240 160"
        className="w-full h-full"
        aria-label={exercise?.name || rig.label}
      >
        {/* Sol du studio */}
        <line x1="24" y1="150" x2="216" y2="150" stroke="var(--border-strong)" strokeWidth="1.5" />

        {/* ÉQUIPEMENTS DE SALLE RÉALISTES */}
        {rig.equip === 'flat_bench_bar' && (
          <g>
            <rect x="54" y="110" width="96" height="8" rx="4" fill={rigMetal} />
            <line x1="70" y1="118" x2="70" y2="150" stroke={rigMetal} strokeWidth="5" />
            <line x1="136" y1="118" x2="136" y2="150" stroke={rigMetal} strokeWidth="5" />
            <line x1="82" y1="42" x2="82" y2="150" stroke={bodyDark} strokeWidth="4" />
          </g>
        )}

        {rig.equip === 'incline_bench_db' && (
          <g>
            <line x1="68" y1="74" x2="128" y2="120" stroke={rigMetal} strokeWidth="8" strokeLinecap="round" />
            <line x1="128" y1="120" x2="156" y2="116" stroke={rigMetal} strokeWidth="8" strokeLinecap="round" />
            <line x1="92" y1="96" x2="92" y2="150" stroke={rigMetal} strokeWidth="5" />
            <line x1="142" y1="118" x2="142" y2="150" stroke={rigMetal} strokeWidth="5" />
          </g>
        )}

        {rig.equip === 'bench_back' && (
          <rect x="44" y="96" width="44" height="54" rx="8" fill={rigMetal} />
        )}

        {rig.equip === 'dip_station' && (
          <g>
            <line x1="76" y1="88" x2="156" y2="88" stroke={bodyDark} strokeWidth="5" strokeLinecap="round" />
            <line x1="84" y1="88" x2="84" y2="150" stroke={rigMetal} strokeWidth="5" />
            <line x1="148" y1="88" x2="148" y2="150" stroke={rigMetal} strokeWidth="5" />
          </g>
        )}

        {rig.equip === 'pullup_bar' && (
          <g>
            <line x1="68" y1="20" x2="68" y2="150" stroke={rigMetal} strokeWidth="5" />
            <line x1="172" y1="20" x2="172" y2="150" stroke={rigMetal} strokeWidth="5" />
            <line x1="64" y1="22" x2="176" y2="22" stroke={bodyNeutral} strokeWidth="5" strokeLinecap="round" />
          </g>
        )}

        {rig.equip === 'roman_backrest' && (
          <g>
            <line x1="98" y1="24" x2="98" y2="150" stroke={rigMetal} strokeWidth="6" />
            <rect x="94" y="44" width="10" height="48" rx="4" fill={bodyDark} />
            <line x1="98" y1="72" x2="142" y2="72" stroke={bodyDark} strokeWidth="5" strokeLinecap="round" />
          </g>
        )}

        {rig.equip === 'cable_high' && (
          <g>
            <line x1="172" y1="14" x2="172" y2="150" stroke={rigMetal} strokeWidth="5" />
            <line x1="118" y1="16" x2="172" y2="16" stroke={rigMetal} strokeWidth="5" />
            <rect x="104" y="118" width="38" height="7" rx="3.5" fill={rigMetal} />
            <line x1="122" y1="125" x2="122" y2="150" stroke={rigMetal} strokeWidth="4" />
            <AnimLine
              p1={[[126, 16], [126, 16]]}
              p2={rig.wrist}
              dur={dur}
              width={2}
              color={bodyDark}
              animated={animated}
            />
          </g>
        )}

        {rig.equip === 'cable_mid' && (
          <g>
            <line x1="192" y1="24" x2="192" y2="150" stroke={rigMetal} strokeWidth="5" />
            <AnimLine
              p1={[[192, 84], [192, 84]]}
              p2={rig.wrist}
              dur={dur}
              width={2.5}
              color={accent}
              animated={animated}
            />
          </g>
        )}

        {rig.equip === 'cable_tricep' && (
          <g>
            <line x1="168" y1="18" x2="168" y2="150" stroke={rigMetal} strokeWidth="5" />
            <AnimLine
              p1={[[168, 24], [168, 24]]}
              p2={rig.wrist}
              dur={dur}
              width={2.2}
              color={bodyDark}
              animated={animated}
            />
          </g>
        )}

        {/* VUE FRONTALE SPÉCIALE (ÉLÉVATIONS LATÉRALES) */}
        {rig.isFrontView ? (
          <g>
            <line x1="120" y1="54" x2="120" y2="98" stroke={bodyNeutral} strokeWidth="14" strokeLinecap="round" />
            <line x1="114" y1="98" x2="108" y2="148" stroke={bodyDark} strokeWidth="8" strokeLinecap="round" />
            <line x1="126" y1="98" x2="132" y2="148" stroke={bodyDark} strokeWidth="8" strokeLinecap="round" />
            <circle cx="120" cy="34" r="10" fill={bodyPrimary} />

            <AnimLine p1={rig.shoulderL} p2={rig.elbowL} dur={dur} width={7} color={accent} animated={animated} />
            <AnimLine p1={rig.elbowL} p2={rig.wristL} dur={dur} width={6} color={accent} animated={animated} />
            <AnimLine p1={rig.shoulderR} p2={rig.elbowR} dur={dur} width={7} color={accent} animated={animated} />
            <AnimLine p1={rig.elbowR} p2={rig.wristR} dur={dur} width={6} color={accent} animated={animated} />

            <AnimCircle p={rig.wristL} r={5} dur={dur} fill={bodyPrimary} animated={animated} />
            <AnimCircle p={rig.wristR} r={5} dur={dur} fill={bodyPrimary} animated={animated} />
          </g>
        ) : (
          /* MODÈLE BIOMÉCANIQUE ARTICULÉ PROFIL */
          <g>
            {/* Jambe arrière pour la fente */}
            {rig.backKnee && rig.backAnkle && (
              <>
                <AnimLine p1={rig.hip} p2={rig.backKnee} dur={dur} width={8} color={bodyDark} animated={animated} />
                <AnimLine p1={rig.backKnee} p2={rig.backAnkle} dur={dur} width={7} color={bodyDark} animated={animated} />
              </>
            )}

            {/* Cuisse & Mollet */}
            <AnimLine
              p1={rig.hip}
              p2={rig.knee}
              dur={dur}
              width={10}
              color={legColor}
              animated={animated}
            />
            <AnimLine
              p1={rig.knee}
              p2={rig.ankle}
              dur={dur}
              width={8}
              color={legColor === accent ? bodyPrimary : bodyDark}
              animated={animated}
            />

            {/* Buste anatomique */}
            <AnimLine
              p1={rig.shoulder}
              p2={rig.hip}
              dur={dur}
              width={13}
              color={torsoColor}
              animated={animated}
            />

            {/* Tête */}
            <AnimCircle p={rig.head} r={9.5} dur={dur} fill={bodyPrimary} animated={animated} />

            {/* Bras & Avant-bras */}
            <AnimLine
              p1={rig.shoulder}
              p2={rig.elbow}
              dur={dur}
              width={7.5}
              color={armColor}
              animated={animated}
            />
            <AnimLine
              p1={rig.elbow}
              p2={rig.wrist}
              dur={dur}
              width={6.5}
              color={bodyPrimary}
              animated={animated}
            />

            {/* Pivots articulaires */}
            <AnimCircle p={rig.hip} r={3.5} dur={dur} fill="var(--bg-card)" animated={animated} />
            <AnimCircle p={rig.knee} r={3} dur={dur} fill="var(--bg-card)" animated={animated} />
            <AnimCircle p={rig.shoulder} r={3.5} dur={dur} fill="var(--bg-card)" animated={animated} />

            {/* Charges mobiles (Disques olympiques / Haltères / Ab Wheel) */}
            {(rig.equip === 'barbell_back' ||
              rig.equip === 'barbell_hand' ||
              rig.equip === 'flat_bench_bar' ||
              rig.equip === 'barbell_ohp') && (
              <AnimCircle
                p={rig.equip === 'barbell_back' ? rig.shoulder : rig.wrist}
                r={11}
                dur={dur}
                fill="var(--bg-card)"
                stroke={accent}
                strokeWidth={2.5}
                animated={animated}
              />
            )}

            {(rig.equip === 'dumbbells_hand' || rig.equip === 'incline_bench_db') && (
              <AnimCircle
                p={rig.wrist}
                r={6}
                dur={dur}
                fill={accent}
                animated={animated}
              />
            )}

            {rig.equip === 'ab_wheel' && (
              <AnimCircle
                p={rig.wrist}
                r={7}
                dur={dur}
                fill="none"
                stroke={accent}
                strokeWidth={2.5}
                animated={animated}
              />
            )}
          </g>
        )}
      </svg>

      {/* Overlay discret : Anatomie musculaire + étiquette biomécanique (uniquement en vue Hero) */}
      {size === 'hero' && (
        <>
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)]">
              {rig.label}
            </span>
          </div>

          {showAnatomy && (
            <div className="absolute right-3 bottom-2.5 px-2 py-1.5 rounded-xl bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-subtle)] flex items-center gap-1.5">
              <MuscleAnatomyBadge muscleText={exercise?.muscle || ''} size={34} />
            </div>
          )}

          {/* Barre de cadence respiratoire */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="w-14 h-1 rounded-full bg-[var(--border-strong)] overflow-hidden">
              <div className="h-full w-full bg-[var(--accent)] bio-tempo-bar" />
            </div>
            <span className="text-[10.5px] tabular-nums text-[var(--text-muted)]">
              Mouvement contrôlé
            </span>
          </div>
        </>
      )}
    </div>
  );
}
