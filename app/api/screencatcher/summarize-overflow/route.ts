import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function localFallbackSummary(text: string, maxChars: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
  const sentence = sentences.find(item => item.length <= maxChars && item.length >= Math.min(44, maxChars));
  if (sentence) return sentence;

  const clipped = normalized.slice(0, Math.max(24, maxChars - 3)).trim();
  return `${clipped.replace(/[,\s;:.-]+$/, '')}...`;
}

function normalizeSummary(value: string, fallbackText: string, maxChars: number) {
  const cleaned = value
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return localFallbackSummary(fallbackText, maxChars);
  if (cleaned.length <= maxChars) return cleaned;
  return localFallbackSummary(cleaned, maxChars);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  const context = typeof body?.context === 'string' ? body.context.slice(0, 80) : 'display text';
  const maxChars = Math.min(Math.max(Number(body?.maxChars) || 120, 24), 260);

  if (!text) {
    return NextResponse.json({ summary: '' });
  }

  if (text.length <= maxChars) {
    return NextResponse.json({ summary: text });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ summary: localFallbackSummary(text, maxChars), source: 'fallback' });
  }

  const prompt = `Rewrite this ${context} so it fits a fixed dashboard box.

Rules:
- Keep the key facts, names, numbers, dates, and product/competitor meaning.
- Return one concise display-ready line or sentence.
- Use no markdown, bullets, labels, quotes, or commentary.
- Maximum ${maxChars} characters.

Text:
${text}`;

  try {
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 120,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ summary: localFallbackSummary(text, maxChars), source: 'fallback' });
    }

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return NextResponse.json({
      summary: normalizeSummary(typeof summary === 'string' ? summary : '', text, maxChars),
      source: 'gemini',
    });
  } catch (err) {
    console.error('Overflow summarization failed:', err);
    return NextResponse.json({ summary: localFallbackSummary(text, maxChars), source: 'fallback' });
  }
}
