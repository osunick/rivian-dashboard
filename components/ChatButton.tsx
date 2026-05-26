'use client';

import { useState } from 'react';
import ChatPanel from './ChatPanel';

export default function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#1A1A1A', border: '1px solid #2A2A2A',
          borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
          color: '#6B7280', fontSize: '12px', fontFamily: 'monospace',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#3B82F6';
          e.currentTarget.style.color = '#9CA3AF';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#2A2A2A';
          e.currentTarget.style.color = '#6B7280';
        }}
        title="Ask the intelligence analyst"
      >
        <span>🔵</span>
        <span>Ask AI</span>
      </button>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}