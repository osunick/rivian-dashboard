'use client';

import { useEffect, useState } from 'react';
import SearchModal from './SearchModal';

export default function SearchButton() {
  const [open, setOpen] = useState(false);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-claude-border bg-white/75 px-3 py-2 text-xs text-claude-text transition-colors hover:border-claude-accent hover:text-claude-accent"
        title="Search intel (⌘K)"
      >
        <span>🔍</span>
        <span>Search</span>
        <span className="font-mono-num text-[10px] text-claude-muted">⌘K</span>
      </button>

      {open && <SearchModal onClose={() => setOpen(false)} />}
    </>
  );
}
