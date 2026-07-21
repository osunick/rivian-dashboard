'use client';

import { useState } from 'react';
import ChatPanel from './ChatPanel';

export default function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-claude-accent bg-claude-accent px-3 py-2 text-xs text-white shadow-sm transition-colors hover:bg-claude-accentHover"
        title="Ask the intelligence analyst"
      >
        <span>🔵</span>
        <span>Ask AI</span>
      </button>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}
