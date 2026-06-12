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
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-marvel-red/50 hover:text-white"
        title="Search intel (⌘K)"
      >
        <span>🔍</span>
        <span>Search</span>
        <span className="font-mono-num text-[10px] text-zinc-500">⌘K</span>
      </button>

      {open && <SearchModal onClose={() => setOpen(false)} />}
    </>
  );
}
