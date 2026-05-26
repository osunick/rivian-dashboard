'use client';

import { useState, useRef, useEffect } from 'react';
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
      content: '🔵 Ask me anything about the GameFilm intelligence reports. I can summarize recent themes, explain competitive threats, compare sources, or highlight any patterns across the data.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.answer ?? 'Sorry, I had trouble answering that.' }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry — something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) return null;

  const panel = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: '480px',
          background: '#0D0D0D', borderLeft: '1px solid #1F1F1F',
          display: 'flex', flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '16px 18px', borderBottom: '1px solid #1F1F1F',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '18px' }}>🔵</span>
          <div>
            <div style={{ color: '#F5F5F5', fontSize: '14px', fontWeight: 600 }}>GameFilm Assistant</div>
            <div style={{ color: '#4B5563', fontSize: '11px', fontFamily: 'monospace' }}>Intelligence Analyst</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: '#1A1A1A', border: '1px solid #2A2A2A',
              borderRadius: '6px', color: '#6B7280', fontSize: '12px',
              padding: '4px 10px', cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: m.role === 'user' ? '#60A5FA' : '#9CA3AF', fontSize: '11px', fontFamily: 'monospace' }}>
                {m.role === 'user' ? 'YOU' : 'ASSISTANT'}
              </div>
              <div style={{
                background: m.role === 'user' ? '#1A2A3A' : '#111111',
                border: `1px solid ${m.role === 'user' ? '#1E3A5F' : '#1F1F1F'}`,
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#E5E7EB',
                fontSize: '13px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 0' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6', animation: 'pulse 1s infinite' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6', animation: 'pulse 1s infinite 0.2s' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6', animation: 'pulse 1s infinite 0.4s' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid #1F1F1F', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about the intelligence…"
              rows={1}
              style={{
                flex: 1, background: '#111111', border: '1px solid #2A2A2A',
                borderRadius: '8px', color: '#F5F5F5', fontSize: '13px',
                padding: '10px 12px', resize: 'none', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '120px',
                overflowY: 'auto',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: loading ? '#1A2A3A' : '#3B82F6',
                border: 'none', borderRadius: '8px',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                padding: '10px 16px', cursor: loading ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>
          <div style={{ color: '#374151', fontSize: '10px', fontFamily: 'monospace', marginTop: '6px', textAlign: 'center' }}>
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );

  return createPortal(panel, document.body);
}