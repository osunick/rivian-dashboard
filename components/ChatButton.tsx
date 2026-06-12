'use client';

import { useState } from 'react';
import ChatPanel from './ChatPanel';

export default function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-marvel-red/40 bg-marvel-red/10 px-3 py-2 text-xs text-white transition-colors hover:border-marvel-red hover:bg-marvel-red/20"
        title="Ask the intelligence analyst"
      >
        <span>🔵</span>
        <span>Ask AI</span>
      </button>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}
