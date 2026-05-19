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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="h-0.5 w-full bg-[#3B82F6] mb-8" />

        <div className="text-center mb-8">
          <span className="text-[#3B82F6] text-3xl">🔵</span>
          <h1 className="text-[#F5F5F5] font-semibold text-xl mt-3 tracking-tight">GameFilm</h1>
          <p className="text-[#6B7280] text-sm font-mono mt-1">INTELLIGENCE DASHBOARD</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-6 space-y-4">
          <div>
            <label className="text-[#6B7280] text-xs font-mono uppercase tracking-wider block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#2F2F2F] rounded-md px-3 py-2.5 text-[#F5F5F5] text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
              placeholder="Enter password"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-[#EF4444] text-xs font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-md transition-colors"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
