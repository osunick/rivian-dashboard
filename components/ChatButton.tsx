'use client';

import { useState } from 'react';
import ChatPanel from './ChatPanel';

export default function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
        title="Ask the intelligence analyst"
      >
        <span>🔵</span>
        <span>Ask AI</span>
      </button>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}
