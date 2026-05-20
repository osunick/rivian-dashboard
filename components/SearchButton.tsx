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
        title="Search intel (⌘K)"
      >
        <span>🔍</span>
        <span>Search</span>
        <span style={{ opacity: 0.5, fontSize: '10px' }}>⌘K</span>
      </button>

      {open && <SearchModal onClose={() => setOpen(false)} />}
    </>
  );
}
