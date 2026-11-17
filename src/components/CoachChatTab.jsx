import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  RotateCcw,
  Cpu,
  BookOpen,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  generateCoachResponse,
  buildGroundedLLMMessages,
  QUICK_COACH_SUGGESTIONS_BY_LANG,
} from '../utils/localCoachEngine';
import {
  subscribeNeuralState,
  preloadNeuralLLM,
  generateWithNeuralLLM,
} from '../utils/neuralCoachClient';
import { tr } from '../i18n/translations';

function renderFormattedLine(line, lineIdx) {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
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
  const [streamingText, setStreamingText] = useState('');
  const [neuralEnabled, setNeuralEnabled] = useState(false);
  const [neuralStatus, setNeuralStatus] = useState({
    ready: false,
    loading: false,
    progress: 0,
    device: null,
    error: null,
  });
  const [memory, setMemory] = useState(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState(
    QUICK_COACH_SUGGESTIONS_BY_LANG[lang] || QUICK_COACH_SUGGESTIONS_BY_LANG.fr
  );
  const chatScrollRef = useRef(null);

  useEffect(() => {
    setDynamicSuggestions(
      QUICK_COACH_SUGGESTIONS_BY_LANG[lang] || QUICK_COACH_SUGGESTIONS_BY_LANG.fr
    );
  }, [lang]);

  useEffect(() => {
    const unsub = subscribeNeuralState((st) => setNeuralStatus(st));
    return unsub;
  }, []);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, streamingText]);

  const handleToggleNeural = () => {
    const next = !neuralEnabled;
    setNeuralEnabled(next);
    if (next && !neuralStatus.ready && !neuralStatus.loading) {
      preloadNeuralLLM();
    }
  };

  const sendQuestion = async (rawQuestion) => {
    const trimmed = String(rawQuestion || '').trim();
    if (!trimmed || isTyping) return;

    setInput('');
    await onAppendMessage({
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    });

    setIsTyping(true);
    setStreamingText('');

    const contextPayload = {
      profile,
      todayMacros,
      waterMl,
      workoutHistory,
      previousMemory: memory,
      lang,
    };

    // MODE A : VRAI LLM NEURAL EMBARQUÉ (Qwen2.5-0.5B-Instruct WebGPU/WASM) + RAG SCIENTIFIQUE
    if (neuralEnabled) {
      try {
        const { messages: llmPromptMessages, sources } = buildGroundedLLMMessages(
          trimmed,
          contextPayload,
          messages
        );

        const finalGenerated = await generateWithNeuralLLM(
          llmPromptMessages,
          (partialText) => {
            setStreamingText(partialText);
          }
        );

        setStreamingText('');
        await onAppendMessage({
          role: 'assistant',
          content: finalGenerated || '...',
          sources,
          engine: 'Qwen2.5-0.5B Neural',
          timestamp: Date.now(),
        });
        setIsTyping(false);
        return;
      } catch {
        // Repli automatique sans coupure sur le moteur RAG scientifique si erreur mémoire GPU
        setStreamingText('');
      }
    }

    // MODE B : MOTEUR SCIENTIFIQUE RAG INSTANTANÉ (<5ms, 0 Mo)
    setTimeout(async () => {
      const response = generateCoachResponse(trimmed, contextPayload);

      if (response.memory) setMemory(response.memory);
      if (Array.isArray(response.suggestions) && response.suggestions.length > 0) {
        setDynamicSuggestions(response.suggestions);
      }

      await onAppendMessage({
        role: 'assistant',
        content: response.text,
        sources: response.sources || [],
        engine: 'RAG Science',
        timestamp: Date.now(),
      });

      setIsTyping(false);
    }, 240);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-9.8rem)] max-h-[760px] animate-fade-in">
      {/* Barre supérieure : Sélecteur RAG Instantané vs LLM Neural Embarqué */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleNeural}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              neuralEnabled
                ? 'bg-emerald-400 text-zinc-950 border-emerald-400 font-semibold'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
            title="Activer le vrai modèle LLM Qwen2.5-0.5B dans le navigateur (100% gratuit et illimité)"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>
              {neuralEnabled ? `${tr(lang, 'neural_llm')} (Qwen 0.5B)` : tr(lang, 'instant_rag')}
            </span>
          </button>

          {neuralEnabled && neuralStatus.ready && (
            <span className="text-[10.5px] text-emerald-400 font-medium">
              {neuralStatus.device === 'webgpu' ? 'WebGPU' : 'WASM'} · Illimité
            </span>
          )}
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Réinitialiser la conversation ?')) {
                onClearHistory();
                setMemory(null);
              }
            }}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Barre de progression téléchargement initial du modèle LLM Neural */}
      {neuralEnabled && neuralStatus.loading && (
        <div className="mb-3 px-4 py-2.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Chargement initial Qwen2.5-0.5B (mis en cache hors-ligne ensuite)
            </span>
            <span className="font-semibold text-emerald-400 tabular-nums">
              {neuralStatus.progress}%
            </span>
          </div>
          <div className="h-1 w-full bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${neuralStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Fil de discussion */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-2">
        <div className="max-w-[90%] rounded-3xl rounded-tl-md card-surface px-4 py-3.5 text-xs text-[var(--text-secondary)] leading-relaxed">
          {lang === 'en' ? (
            <>
              Hi <strong className="text-[var(--text-primary)]">{profile?.name || 'Athlete'}</strong>. Ask unlimited questions backed by <strong>ISSN, ACSM & PubMed</strong> studies — or toggle <strong>Neural LLM</strong> above to run our local generative model directly in your browser.
            </>
          ) : lang === 'es' ? (
            <>
              Hola <strong className="text-[var(--text-primary)]">{profile?.name || 'Atleta'}</strong>. Haz preguntas ilimitadas respaldadas por estudios <strong>ISSN, ACSM y PubMed</strong> — o activa <strong>LLM Neural</strong> arriba para usar el modelo generativo local en tu navegador.
            </>
          ) : (
            <>
              Salut <strong className="text-[var(--text-primary)]">{profile?.name || 'Athlète'}</strong>. Pose tes questions en illimité avec références scientifiques (<strong>ISSN, ACSM, BJSM, PubMed</strong>) — ou active <strong>LLM Neural</strong> en haut pour exécuter le modèle IA génératif directement dans ton navigateur.
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
                  : String(msg.content)
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

        {/* Rendu temps réel du streaming token par token du LLM Neural */}
        {isTyping && streamingText && (
          <div className="max-w-[88%] rounded-3xl rounded-tl-md card-surface px-4 py-3 text-xs text-[var(--text-secondary)] space-y-1">
            {streamingText.split('\n').map((line, idx) => renderFormattedLine(line, idx))}
          </div>
        )}

        {isTyping && !streamingText && (
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

      {/* Suggestions & Barre d'envoi */}
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
