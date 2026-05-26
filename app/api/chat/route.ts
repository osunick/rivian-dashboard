import { NextRequest, NextResponse } from 'next/server';
import { reports, validReports } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question?.trim()) {
    return NextResponse.json({ answer: 'Please ask a question.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: 'The AI analyst is not configured. Set GEMINI_API_KEY in your Vercel environment variables to enable this feature.',
    });
  }

  // Build context from the last 5 valid reports
  const contextReports = validReports.slice(0, 5);

  const reportSummaries = contextReports.map(r => {
    const date = new Date(r.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      timeZone: 'America/Los_Angeles',
    });

    const topThemes = r.themes.slice(0, 8).join(', ') || 'none';
    const itemList = (r.items ?? []).length > 0
      ? r.items.map(i => `- [${i.source}] ${i.title}: ${i.snippet}`).join('\n')
      : '(no individual items — summary only)';

    return `Report (${date}):
Sentiment: positive=${r.sentiment.positive}% neutral=${r.sentiment.neutral}% negative=${r.sentiment.negative}%
Top themes: ${topThemes}
Competitive context: ${r.competitiveContext || 'N/A'}
Summary: ${r.summary}
Full report: ${r.fullReport}
Items:
${itemList}`;
  }).join('\n\n---\n\n');

  const prompt = `You are a competitive intelligence analyst for Rivian. You are given access to recent GameFilm intelligence reports. Answer the question based ONLY on the data provided below. Be specific, cite numbers and themes when available. If the data doesn't cover the question, say so clearly.

--- CONTEXT ---

${reportSummaries}

--- QUESTION ---

${question}`;

  try {
    const model = 'gemini-3.1-flash'; // Use flash for speed/cost
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return NextResponse.json({ answer: 'Sorry — the AI analyst ran into an error. Please try again.' });
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      return NextResponse.json({ answer: 'Sorry — I got an empty response. Please try again.' });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ answer: 'Sorry — something went wrong. Please try again.' });
  }
}