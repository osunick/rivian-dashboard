'use client';

import { useState } from 'react';
import ThemeModal from './ThemeModal';

export interface DrillDownItem {
  title: string;
  url?: string;
  source: string;
  sentiment: string;
  publishedAt?: string | null;
  snippet?: string;
  reportTimestamp: string;
}

interface Props {
  title: string;
  items: DrillDownItem[];
  children: React.ReactNode;
  className?: string;
  label?: string;
  description?: string;
  footerSuffix?: string;
  disabled?: boolean;
}

export default function DrillDown({
  title,
  items,
  children,
  className = '',
  label,
  description,
  footerSuffix,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const clickable = !disabled && items.length > 0;

  return (
    <>
      <button
        type="button"
        disabled={!clickable}
        onClick={() => clickable && setOpen(true)}
        className={`${className} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
        title={clickable ? `See ${items.length} item${items.length !== 1 ? 's' : ''}` : 'No detail available'}
      >
        {children}
      </button>

      {open && (
        <ThemeModal
          theme={title}
          items={items}
          onClose={() => setOpen(false)}
          label={label}
          description={description}
          footerSuffix={footerSuffix}
        />
      )}
    </>
  );
}
