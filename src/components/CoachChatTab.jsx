import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  RotateCcw,
  BookOpen,
  ExternalLink,
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
    <p key={lineIdx} className={line.trim() === '' ? 'h-1.5' : 'leading-relaxed'}>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-semibold text-[var(--text-primary)]">
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
    <div className="flex flex-col h-[calc(100dvh-10.5rem)] max-h-[760px] animate-fade-in">
      {/* En-tête éditorial discret */}
      <div className="flex items-center justify-between gap-2 px-0.5 pb-3 border-b border-[var(--border-subtle)] mb-3 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
            {lang === 'en' ? 'Coach' : lang === 'es' ? 'Entrenador' : 'Coach'}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {lang === 'en'
              ? 'Offline engine · ISSN & ACSM references'
              : lang === 'es'
                ? 'Motor sin conexión · Referencias ISSN y ACSM'
                : 'Moteur autonome hors-ligne · Références ISSN & ACSM'}
          </p>
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Effacer</span>
          </button>
        )}
      </div>

      {/* Fil de discussion */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-2">
        <div className="max-w-[92%] rounded-2xl rounded-bl-sm card-surface p-4 text-[13px] text-[var(--text-secondary)] leading-relaxed">
          <p>
            Bonjour <strong className="font-semibold text-[var(--text-primary)]">{profile?.name || 'Athlète'}</strong>. Tu peux me demander de <strong className="font-medium text-[var(--text-primary)]">composer une séance sur-mesure</strong>, de <strong className="font-medium text-[var(--text-primary)]">calculer les macros de plusieurs aliments</strong>, de proposer des <strong className="font-medium text-[var(--text-primary)]">recettes autour d'un ingrédient</strong> ou d'afficher l'exécution d'un mouvement.
          </p>
        </div>

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const alreadyLogged = Boolean(loggedActionIds[msg.id]);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}
            >
              <div
                className={`max-w-[90%] text-[13px] leading-relaxed ${
                  isUser
                    ? 'rounded-2xl rounded-br-sm bg-[var(--text-primary)] text-[var(--bg-app)] px-4 py-2.5 font-normal'
                    : 'rounded-2xl rounded-bl-sm card-surface p-4 text-[var(--text-secondary)] space-y-2.5'
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

                    {msg.workoutAction && onStartWorkoutFromCoach && (
                      <button
                        type="button"
                        onClick={() => onStartWorkoutFromCoach(msg.workoutAction)}
                        className="btn-primary w-full !py-2 !text-xs mt-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Lancer cette séance ({msg.workoutAction.exercises?.length || 0} ex.)
                      </button>
                    )}

                    {msg.mealAction && onLogMealFromCoach && (
                      <button
                        type="button"
                        disabled={alreadyLogged}
                        onClick={() => {
                          onLogMealFromCoach(msg.mealAction);
                          setLoggedActionIds((prev) => ({ ...prev, [msg.id]: true }));
                        }}
                        className={`w-full py-2 px-4 rounded-xl font-medium text-xs inline-flex items-center justify-center gap-1.5 transition-all mt-1 ${
                          alreadyLogged
                            ? 'bg-[var(--bg-subtle)] text-emerald-400 border border-[var(--border-subtle)]'
                            : 'btn-primary !py-2 !text-xs'
                        }`}
                      >
                        {alreadyLogged ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Ajouté au journal du jour
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
                <div className="flex flex-wrap gap-1.5 max-w-[90%] pl-0.5">
                  {msg.sources.map((src) => (
                    <a
                      key={src.id}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      title={src.localizedSummary}
                    >
                      <BookOpen className="w-3 h-3 shrink-0" />
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
          <div className="inline-flex items-center gap-1.5 rounded-2xl card-surface px-3.5 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
              style={{ animationDelay: '120ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
              style={{ animationDelay: '240ms' }}
            />
          </div>
        )}
      </div>

      {/* Suggestions & Saisie */}
      <div className="pt-2.5 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {dynamicSuggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => sendQuestion(sug)}
              className="chip !py-1.5 !px-3 !text-[11.5px]"
            >
              {sug}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 card-surface !rounded-xl pl-3.5 pr-1.5 py-1.5"
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
            className="w-8 h-8 rounded-lg bg-[var(--text-primary)] disabled:opacity-25 text-[var(--bg-app)] flex items-center justify-center shrink-0 transition-transform active:scale-95"
            aria-label="Envoyer"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.2]" />
          </button>
        </form>
      </div>
    </div>
  );
}
