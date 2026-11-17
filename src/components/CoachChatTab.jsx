import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, RotateCcw } from 'lucide-react';
import {
  generateCoachResponse,
  QUICK_COACH_SUGGESTIONS,
} from '../utils/localCoachEngine';

function renderFormattedLine(line, lineIdx) {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <p key={lineIdx} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-semibold text-zinc-50">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={idx} className="italic text-zinc-400">
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
  const [dynamicSuggestions, setDynamicSuggestions] = useState(QUICK_COACH_SUGGESTIONS);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const targets = profile?.targets || { kcal: 2200, protein: 140 };
  const remKcal = Math.max(0, Math.round(targets.kcal - (todayMacros?.kcal || 0)));
  const remProt = Math.max(0, Math.round(targets.protein - (todayMacros?.protein || 0)));

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

    setTimeout(async () => {
      const response = generateCoachResponse(trimmed, {
        profile,
        todayMacros,
        waterMl,
        workoutHistory,
        previousMemory: memory,
      });

      if (response.memory) setMemory(response.memory);
      if (Array.isArray(response.suggestions) && response.suggestions.length > 0) {
        setDynamicSuggestions(response.suggestions);
      }

      await onAppendMessage({
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
      });

      setIsTyping(false);
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.8rem)] max-h-[760px] animate-fade-in">
      {/* Barre d'état minimale */}
      <div className="flex items-center justify-between px-1 pb-3 shrink-0">
        <div className="flex items-center gap-2 text-xs text-zinc-400 tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>
            Coach local · Reste {remKcal} kcal & {remProt}g P
          </span>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Nouvelle conversation ?')) {
                onClearHistory();
                setMemory(null);
                setDynamicSuggestions(QUICK_COACH_SUGGESTIONS);
              }
            }}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <RotateCcw className="w-3 h-3" />
            Effacer
          </button>
        )}
      </div>

      {/* Messages épurés */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-2">
        <div className="max-w-[88%] rounded-3xl rounded-tl-md bg-zinc-900/70 border border-white/[0.06] px-4 py-3 text-xs text-zinc-300 leading-relaxed">
          Salut <strong className="text-zinc-100">{profile?.name || 'Athlète'}</strong>. Je
          suis connecté localement à tes repas, tes filtres alimentaires et ton historique.
          Que veux-tu ajuster aujourd’hui ?
        </div>

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] px-4 py-3 text-xs space-y-1 ${
                  isUser
                    ? 'rounded-3xl rounded-tr-md bg-zinc-100 text-zinc-950 font-medium'
                    : 'rounded-3xl rounded-tl-md bg-zinc-900/70 border border-white/[0.06] text-zinc-300'
                }`}
              >
                {isUser
                  ? msg.content
                  : String(msg.content)
                      .split('\n')
                      .map((line, idx) => renderFormattedLine(line, idx))}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="inline-flex items-center gap-1.5 rounded-3xl bg-zinc-900/70 border border-white/[0.06] px-4 py-3">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
              style={{ animationDelay: '120ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
              style={{ animationDelay: '240ms' }}
            />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions & Saisie flottante */}
      <div className="pt-2 space-y-2.5 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {dynamicSuggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => sendQuestion(sug)}
              className="px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/[0.07] text-[11px] text-zinc-300 whitespace-nowrap transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-zinc-900 border border-white/[0.08] rounded-full pl-4 pr-1.5 py-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message au coach..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-full bg-zinc-100 disabled:opacity-30 text-zinc-950 flex items-center justify-center shrink-0 transition-transform active:scale-95"
            aria-label="Envoyer"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
}
