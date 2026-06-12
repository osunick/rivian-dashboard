'use client';

import { useEffect, useState } from 'react';

interface Props {
  url: string;
  title: string;
  className?: string;
}

type PreviewState =
  | { status: 'idle' | 'loading' | 'none' }
  | { status: 'image'; imageUrl: string }
  | { status: 'error' };

const previewCache = new Map<string, PreviewState>();

function parseYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '') || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}

function isDirectImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url);
}

export default function MediaPreview({ url, title, className = '' }: Props) {
  const youtubeId = parseYouTubeId(url);
  const [state, setState] = useState<PreviewState>(() => {
    if (youtubeId) return { status: 'idle' };
    if (isDirectImageUrl(url)) return { status: 'image', imageUrl: url };
    return previewCache.get(url) ?? { status: 'idle' };
  });

  useEffect(() => {
    if (youtubeId || isDirectImageUrl(url)) return;
    const cached = previewCache.get(url);
    if (cached) {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`/api/media-preview?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const nextState: PreviewState =
          data.kind === 'image' && data.imageUrl
            ? { status: 'image', imageUrl: data.imageUrl }
            : { status: 'none' };
        previewCache.set(url, nextState);
        setState(nextState);
      })
      .catch(() => {
        if (cancelled) return;
        const nextState: PreviewState = { status: 'error' };
        previewCache.set(url, nextState);
        setState(nextState);
      });

    return () => {
      cancelled = true;
    };
  }, [url, youtubeId]);

  if (youtubeId) {
    return (
      <div className={`mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30 ${className}`}>
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  if (state.status === 'image') {
    return (
      <div className={`mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30 ${className}`}>
        <img
          src={state.imageUrl}
          alt={title}
          loading="lazy"
          className="max-h-[360px] w-full object-cover"
        />
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className={`mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30 ${className}`}>
        <div className="flex aspect-[16/9] items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[#8b8478]">
          Loading preview
        </div>
      </div>
    );
  }

  return null;
}
