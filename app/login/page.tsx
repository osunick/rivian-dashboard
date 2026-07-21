'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Wrong password');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-claude-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="h-0.5 w-full bg-claude-accent mb-8" />

        <div className="text-center mb-8">
          <span className="text-claude-accent text-3xl">🔵</span>
          <h1 className="text-claude-text font-semibold text-xl mt-3 tracking-tight">GameFilm</h1>
          <p className="text-claude-muted text-sm font-mono mt-1">INTELLIGENCE DASHBOARD</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-claude-card border border-claude-border rounded-lg p-6 space-y-4 shadow-cinematic">
          <div>
            <label className="text-claude-muted text-xs font-mono uppercase tracking-wider block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-claude-border rounded-md px-3 py-2.5 text-claude-text text-sm focus:outline-none focus:border-claude-accent transition-colors"
              placeholder="Enter password"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-[#B42318] text-xs font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-claude-accent hover:bg-claude-accentHover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-md transition-colors"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
