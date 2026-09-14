import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_SYMBOLS = ['RIVN', 'TSLA', 'GM', 'F'];

type NasdaqQuote = {
  lastSalePrice?: string;
  netChange?: string;
  percentageChange?: string;
  lastTradeTimestamp?: string;
};

function numberFromQuote(value: string | undefined) {
  const parsed = Number(value?.replace(/[$,%+,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

async function getQuote(symbol: string) {
  const response = await fetch(
    `https://api.nasdaq.com/api/quote/${symbol.toLowerCase()}/info?assetclass=stocks`,
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; GameFilm market display/1.0)',
      },
      next: { revalidate: 45 },
    },
  );

  if (!response.ok) throw new Error(`Quote lookup failed for ${symbol}`);
  const payload = await response.json() as { data?: { primaryData?: NasdaqQuote } };
  const quote = payload.data?.primaryData;
  const price = numberFromQuote(quote?.lastSalePrice);
  const change = numberFromQuote(quote?.netChange);
  const changePercent = numberFromQuote(quote?.percentageChange);
  if (price === null || change === null || changePercent === null) {
    throw new Error(`Incomplete quote for ${symbol}`);
  }

  return {
    symbol,
    price,
    change,
    changePercent,
    marketTime: quote?.lastTradeTimestamp ?? null,
  };
}

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('symbols')?.split(',') ?? ALLOWED_SYMBOLS;
  const symbols = [...new Set(requested.map(value => value.trim().toUpperCase()))]
    .filter(symbol => ALLOWED_SYMBOLS.includes(symbol));

  const results = await Promise.allSettled((symbols.length ? symbols : ALLOWED_SYMBOLS).map(getQuote));
  const quotes = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);

  return NextResponse.json(
    { quotes, updatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=120' } },
  );
}
