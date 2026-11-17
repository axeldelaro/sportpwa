import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  RotateCcw,
  BookOpen,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  generateCoachResponse,
  warmUpCoachEngine,
  QUICK_COACH_SUGGESTIONS_BY_LANG,
} from '../utils/localCoachEngine';
import { tr } from '../i18n/translations';

function renderFormattedLine(line, lineIdx) {
  const parts = String(line).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <p key={lineIdx} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
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
}) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [memory, setMemory] = useState(null);
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

    // 1. Affichage et persistance synchrones immédiats (0 ms, zéro perte possible)
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

    // 2. Génération instantanée hors-ligne protégée par try/catch
    setTimeout(() => {
      let response;
      try {
        response = generateCoachResponse(trimmed, contextPayload);
      } catch {
        response = {
          text: `Voici ton point rapide : il te reste **${Math.max(0, Math.round((profile?.targets?.kcal || 2200) - (todayMacros?.kcal || 0)))} kcal** et **${Math.max(0, Math.round((profile?.targets?.protein || 140) - (todayMacros?.protein || 0)))}g de protéines** aujourd'hui.`,
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
    }, 110);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-9.8rem)] max-h-[760px] animate-fade-in">
      {/* Barre supérieure : Statut IA Pré-chargée Hors-Ligne Instantanée */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3 shrink-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/25 text-[11px] sm:text-xs font-medium text-emerald-400 whitespace-nowrap">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>
            {lang === 'en'
              ? 'Offline Science AI · Ready'
              : lang === 'es'
                ? 'IA Científica Offline · Lista'
                : 'IA Hors-Ligne · Pré-chargée'}
          </span>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Effacer l’historique de conversation ?')) {
                onClearHistory();
                setMemory(null);
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Effacer l'historique"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden xs:inline">Effacer</span>
          </button>
        )}
      </div>

      {/* Fil de discussion */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-2">
        <div className="max-w-[90%] rounded-3xl rounded-tl-md card-surface px-4 py-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
          {lang === 'en' ? (
            <>
              Hi <strong className="text-[var(--text-primary)]">{profile?.name || 'Athlete'}</strong>. My sport & nutrition knowledge base (<strong>25 ISSN, ACSM & PubMed studies</strong>, meal plans, food swaps, 1RM & HR zones) is already cached on your device for instant offline answers.
            </>
          ) : lang === 'es' ? (
            <>
              Hola <strong className="text-[var(--text-primary)]">{profile?.name || 'Atleta'}</strong>. Mi motor científico (<strong>25 estudios ISSN, ACSM y PubMed</strong>, menús, equivalencias, 1RM y zonas cardio) ya está en caché para responder al instante con o sin conexión.
            </>
          ) : (
            <>
              Salut <strong className="text-[var(--text-primary)]">{profile?.name || 'Athlète'}</strong>. Mon moteur IA Sport & Nutrition (<strong>25 méta-analyses ISSN, ACSM & PubMed</strong>, menus complets, équivalences d’aliments, anatomie, 1RM et zones cardio) est déjà en cache pour te répondre instantanément, même hors-ligne.
            </>
          )}
        </div>

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}
            >
              <div
                className={`max-w-[88%] px-4 py-3 text-xs space-y-1 ${
                  isUser
                    ? 'rounded-3xl rounded-tr-md bg-emerald-400 text-zinc-950 font-medium'
                    : 'rounded-3xl rounded-tl-md card-surface text-[var(--text-secondary)]'
                }`}
              >
                {isUser
                  ? msg.content
                  : String(msg.content || '')
                      .split('\n')
                      .map((line, idx) => renderFormattedLine(line, idx))}
              </div>

              {/* Citations scientifiques internationales cliquables (PubMed / ISSN) */}
              {!isUser && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-w-[88%] pl-1">
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

      {/* Suggestions rapides & Barre d'envoi */}
      <div className="pt-2 space-y-2.5 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {dynamicSuggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => sendQuestion(sug)}
              className="px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 card-surface !rounded-full pl-4 pr-1.5 py-1.5"
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
            className="w-8 h-8 rounded-full bg-emerald-400 disabled:opacity-30 text-zinc-950 flex items-center justify-center shrink-0 transition-transform active:scale-95"
            aria-label="Envoyer"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
}
