type SummarizableItem = {
  title?: string | null;
  source?: string | null;
  snippet?: string | null;
  summary?: string | null;
};

function cleanText(value?: string | null) {
  if (!value) return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength - 1).trim();
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trim()}...`;
}

export function getItemSummary(item: SummarizableItem, maxLength = 220) {
  const provided = cleanText(item.summary) || cleanText(item.snippet);
  if (provided) return compact(provided, maxLength);

  const title = cleanText(item.title);
  const source = cleanText(item.source);
  if (title && source) return compact(`${source} signal: ${title}`, maxLength);
  if (title) return compact(title, maxLength);
  return 'No summary is available for this item yet.';
}
