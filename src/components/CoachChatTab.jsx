import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  RotateCcw,
  BookOpen,
  ExternalLink,
  Cpu,
  Play,
  Plus,
  Check,
} from 'lucide-react';
import {
  generateCoachResponse,
  warmUpCoachEngine,
  QUICK_COACH_SUGGESTIONS_BY_LANG,
} from '../utils/localCoachEngine';
import { tr } from '../i18n/translations';
import ExerciseMotionVisual from './ExerciseMotionVisual';

function renderFormattedLine(line, lineIdx) {
  const parts = String(line).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <p key={lineIdx} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-bold text-[var(--text-primary)]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={idx} className="italic text-[var(--text-secondary)]">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </p>
  );
}

export default function CoachChatTab({
  profile,
  lang = 'fr',
  todayMacros,
  waterMl,
  workoutHistory,
  messages = [],
  onAppendMessage,
  onClearHistory,
  onStartWorkoutFromCoach,
  onLogMealFromCoach,
}) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [memory, setMemory] = useState(null);
  const [loggedActionIds, setLoggedActionIds] = useState({});
  const [dynamicSuggestions, setDynamicSuggestions] = useState(
    QUICK_COACH_SUGGESTIONS_BY_LANG[lang] || QUICK_COACH_SUGGESTIONS_BY_LANG.fr
  );
  const chatScrollRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    warmUpCoachEngine();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setDynamicSuggestions(
      QUICK_COACH_SUGGESTIONS_BY_LANG[lang] || QUICK_COACH_SUGGESTIONS_BY_LANG.fr
    );
  }, [lang]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, isTyping]);

  const sendQuestion = (rawQuestion) => {
    const trimmed = String(rawQuestion || '').trim();
    if (!trimmed || isTyping) return;

    const nowTs = Date.now();
    const userMsg = {
      id: `msg_u_${nowTs}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: trimmed,
      timestamp: nowTs,
    };

    setInput('');
    onAppendMessage(userMsg);
    setIsTyping(true);

    const contextPayload = {
      profile,
      todayMacros,
      waterMl,
      workoutHistory,
      previousMemory: memory,
      lang,
    };

    setTimeout(() => {
      let response;
      try {
        response = generateCoachResponse(trimmed, contextPayload);
      } catch {
        response = {
          text: `Point rapide : il te reste **${Math.max(0, Math.round((profile?.targets?.kcal || 2200) - (todayMacros?.kcal || 0)))} kcal** et **${Math.max(0, Math.round((profile?.targets?.protein || 140) - (todayMacros?.protein || 0)))}g de protéines** aujourd'hui.`,
          sources: [],
          suggestions:
            QUICK_COACH_SUGGESTIONS_BY_LANG[lang] || QUICK_COACH_SUGGESTIONS_BY_LANG.fr,
        };
      }

      const replyTs = Date.now();
      const assistantMsg = {
        id: `msg_a_${replyTs}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: response?.text || 'Réponse générée.',
        sources: Array.isArray(response?.sources) ? response.sources : [],
        workoutAction: response?.workoutAction || null,
        mealAction: response?.mealAction || null,
        exerciseDemo: response?.exerciseDemo || null,
        timestamp: replyTs,
      };

      onAppendMessage(assistantMsg);

      if (isMountedRef.current) {
        if (response?.memory) setMemory(response.memory);
        if (Array.isArray(response?.suggestions) && response.suggestions.length > 0) {
          setDynamicSuggestions(response.suggestions);
        }
        setIsTyping(false);
      }
    }, 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-11rem)] max-h-[760px] animate-fade-in">
      {/* En-tête Moteur IA Autonome */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3 shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/35 text-[11px] font-bold text-emerald-400 whitespace-nowrap">
          <Cpu className="w-3.5 h-3.5 shrink-0" />
          <span>
            {lang === 'en'
              ? 'Autonomous Club AI · Zero Quota'
              : lang === 'es'
                ? 'IA Autónoma Club · Sin Cuota'
                : 'Coach IA Embarqué · Sans Quota'}
          </span>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Effacer la conversation ?')) {
                onClearHistory();
                setMemory(null);
              }
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      {/* Fil de discussion */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        <div className="max-w-[92%] rounded-3xl rounded-tl-md card-surface p-4 text-xs text-[var(--text-secondary)] leading-relaxed space-y-1.5">
          <span className="section-eyebrow !text-emerald-400 block">PULSE Intelligence</span>
          <p>
            Bonjour <strong className="text-[var(--text-primary)]">{profile?.name || 'Athlète'}</strong>. Demande-moi de <strong>composer une séance sur-mesure</strong>, de <strong>calculer les macros de plusieurs aliments</strong>, de créer un <strong>repas à un total précis de kcal</strong> ou d'afficher la <strong>biomécanique animée d'un exercice</strong>.
          </p>
        </div>

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const alreadyLogged = Boolean(loggedActionIds[msg.id]);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2`}
            >
              <div
                className={`max-w-[90%] p-4 text-xs space-y-2.5 ${
                  isUser
                    ? 'rounded-3xl rounded-tr-md bg-emerald-400 text-zinc-950 font-bold'
                    : 'rounded-3xl rounded-tl-md card-surface text-[var(--text-secondary)]'
                }`}
              >
                {isUser ? (
                  <span>{msg.content}</span>
                ) : (
                  <>
                    <div className="space-y-1">
                      {String(msg.content || '')
                        .split('\n')
                        .map((line, idx) => renderFormattedLine(line, idx))}
                    </div>

                    {/* Aperçu d'exécution animé intégré à la réponse IA */}
                    {msg.exerciseDemo && (
                      <div className="pt-1">
                        <ExerciseMotionVisual
                          exercise={msg.exerciseDemo}
                          size="card"
                          animated
                          showAnatomy={false}
                        />
                      </div>
                    )}

                    {/* Bouton interactif 1-clic : Lancer la séance générée par l'IA */}
                    {msg.workoutAction && onStartWorkoutFromCoach && (
                      <button
                        type="button"
                        onClick={() => onStartWorkoutFromCoach(msg.workoutAction)}
                        className="btn-accent w-full !py-2.5 !text-xs mt-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Lancer cette séance ({msg.workoutAction.exercises?.length || 0} ex.)
                      </button>
                    )}

                    {/* Bouton interactif 1-clic : Ajouter le repas calculé au journal */}
                    {msg.mealAction && onLogMealFromCoach && (
                      <button
                        type="button"
                        disabled={alreadyLogged}
                        onClick={() => {
                          onLogMealFromCoach(msg.mealAction);
                          setLoggedActionIds((prev) => ({ ...prev, [msg.id]: true }));
                        }}
                        className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all mt-1 ${
                          alreadyLogged
                            ? 'bg-[var(--bg-subtle)] text-emerald-400 border border-emerald-400/30'
                            : 'btn-primary !py-2.5 !text-xs'
                        }`}
                      >
                        {alreadyLogged ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Ajouté à ton journal du jour
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter au journal ({msg.mealAction.kcal} kcal)
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

              {!isUser && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-w-[90%] pl-1">
                  {msg.sources.map((src) => (
                    <a
                      key={src.id}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10.5px] text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
                      title={src.localizedSummary}
                    >
                      <BookOpen className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{src.citation}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="inline-flex items-center gap-1.5 rounded-3xl card-surface px-4 py-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
              style={{ animationDelay: '120ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
              style={{ animationDelay: '240ms' }}
            />
          </div>
        )}
      </div>

      {/* Suggestions & Saisie */}
      <div className="pt-2 space-y-2.5 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {dynamicSuggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => sendQuestion(sug)}
              className="px-3.5 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 card-surface !rounded-2xl pl-4 pr-2 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tr(lang, 'placeholder_coach')}
            className="flex-1 bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-xl bg-emerald-400 disabled:opacity-30 text-zinc-950 flex items-center justify-center shrink-0 transition-transform active:scale-95"
            aria-label="Envoyer"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.6]" />
          </button>
        </form>
      </div>
    </div>
  );
}
