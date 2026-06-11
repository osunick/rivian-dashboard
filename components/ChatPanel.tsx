'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  onClose: () => void;
}

export default function ChatPanel({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Ask about the GameFilm reports and I can summarize themes, compare competitors, explain signal shifts, or point out patterns across the archive.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => {
      setMounted(false);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(current => [...current, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      setMessages(current => [
        ...current,
        { role: 'assistant', content: data.answer ?? 'Sorry, I had trouble answering that.' },
      ]);
    } catch {
      setMessages(current => [
        ...current,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) return null;

  const panel = (
    <div className="fixed inset-0 z-[9998] flex justify-end bg-[rgba(19,19,19,0.32)]">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-[540px] flex-col border-l border-[#131313]/12 bg-[#fffdf8] shadow-[-18px_0_60px_rgba(19,19,19,0.12)]">
        <div className="border-b border-[#131313]/10 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono-num text-[10px] uppercase tracking-[0.3em] text-[#7b7468]">Analyst / Conversational View</div>
              <h2 className="mt-2 text-2xl tracking-[-0.05em] text-[#131313]">GameFilm Assistant</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#5d584d]">
                A lightweight analysis layer over the report archive, tuned for quick questions and comparative reads.
              </p>
            </div>
            <button
              onClick={onClose}
              className="border border-[#131313]/12 px-3 py-2 font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#5d584d] transition-colors hover:border-[#131313] hover:text-[#131313]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#fcf8ef] px-5 py-5 sm:px-6">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className="space-y-2">
                <div className="font-mono-num text-[10px] uppercase tracking-[0.26em] text-[#7b7468]">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div
                  className={`max-w-[92%] border px-4 py-3 text-sm leading-7 ${
                    message.role === 'user'
                      ? 'ml-auto border-[#0f5bd7]/18 bg-[#d9e5fb] text-[#15346c]'
                      : 'border-[#131313]/10 bg-[#fffdf8] text-[#2b2924]'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="space-y-2">
                <div className="font-mono-num text-[10px] uppercase tracking-[0.26em] text-[#7b7468]">Assistant</div>
                <div className="inline-flex items-center gap-2 border border-[#131313]/10 bg-[#fffdf8] px-4 py-3 text-sm text-[#5d584d]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0f5bd7]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0f5bd7] [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0f5bd7] [animation-delay:300ms]" />
                  Thinking
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-[#131313]/10 bg-[#fffdf8] px-5 py-4 sm:px-6">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about threats, sources, or recent report patterns..."
              rows={1}
              className="max-h-36 flex-1 resize-none border border-[#131313]/12 bg-[#f8f3e8] px-4 py-3 text-sm leading-6 text-[#131313] outline-none placeholder:text-[#8b8478]"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="self-end bg-[#131313] px-4 py-3 font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#f3efe4] disabled:cursor-not-allowed disabled:bg-[#bfb7a7]"
            >
              Send
            </button>
          </div>
          <div className="mt-3 font-mono-num text-[10px] uppercase tracking-[0.24em] text-[#7b7468]">
            Enter sends · Shift+Enter makes a new line
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
