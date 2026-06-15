import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isDirectImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url);
}

// Google News redirect links don't resolve to the publisher without JS, so their
// og:image is always Google's generic placeholder logo. Suppress those previews.
function isGenericNewsAggregator(resolvedUrl: string) {
  try {
    const host = new URL(resolvedUrl).hostname.toLowerCase();
    return host === 'news.google.com' || host.endsWith('.news.google.com');
  } catch {
    return false;
  }
}

function extractMetaContent(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function resolveUrl(candidate: string, base: string) {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')?.trim();
  if (!rawUrl) {
    return NextResponse.json({ kind: 'none' }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(rawUrl);

    if (isDirectImageUrl(parsedUrl.toString())) {
      return NextResponse.json({
        kind: 'image',
        imageUrl: parsedUrl.toString(),
        resolvedUrl: parsedUrl.toString(),
      });
    }

    const response = await fetch(parsedUrl.toString(), {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    const resolvedUrl = response.url || parsedUrl.toString();

    // Aggregator pages (e.g. Google News) only expose a generic logo — skip them.
    if (isGenericNewsAggregator(resolvedUrl)) {
      return NextResponse.json({ kind: 'none', resolvedUrl });
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.startsWith('image/')) {
      return NextResponse.json({
        kind: 'image',
        imageUrl: resolvedUrl,
        resolvedUrl,
      });
    }

    const html = await response.text();
    const imageCandidate = extractMetaContent(html, [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i,
    ]);

    if (!imageCandidate) {
      return NextResponse.json({ kind: 'none', resolvedUrl });
    }

    const imageUrl = resolveUrl(imageCandidate, resolvedUrl);
    if (!imageUrl) {
      return NextResponse.json({ kind: 'none', resolvedUrl });
    }

    return NextResponse.json({
      kind: 'image',
      imageUrl,
      resolvedUrl,
    });
  } catch {
    return NextResponse.json({ kind: 'none' });
  }
}
