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
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
        title="Search intel (⌘K)"
      >
        <span>🔍</span>
        <span>Search</span>
        <span className="font-mono-num text-[10px] text-zinc-400">⌘K</span>
      </button>

      {open && <SearchModal onClose={() => setOpen(false)} />}
    </>
  );
}
