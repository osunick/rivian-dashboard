'use client';

import { useState } from 'react';
import { SOURCE_LABELS, SourceKey } from '@/lib/types';

interface RivianAutonomyIssue {
  title: string;
  url: string;
  source: string;
  sentiment: string;
  snippet: string;
  category?: string;
  publishedAt?: string | null;
  reportTimestamp: string;
  issueType: 'engagement' | 'software' | 'hardware' | 'feature-regression' | 'voice-ai' | 'third-party';
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#22C55E',
  neutral:  '#6B7280',
  negative: '#EF4444',
};

const ISSUE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  engagement:        { label: '⚡ Engagement',  color: '#F97316', bg: '#F9731610', dot: 'bg-[#F97316]' },
  software:          { label: '🐛 Software',    color: '#A855F7', bg: '#A855F710', dot: 'bg-[#A855F7]' },
  hardware:          { label: '🔧 Hardware',    color: '#3B82F6', bg: '#3B82F610', dot: 'bg-[#3B82F6]' },
  'feature-regression': { label: '📉 Regress.', color: '#EF4444', bg: '#EF444410', dot: 'bg-[#EF4444]' },
  'voice-ai':        { label: '🎤 Voice/AI',   color: '#EC4899', bg: '#EC489910', dot: 'bg-[#EC4899]' },
  'third-party':     { label: '🔌 3rd Party',  color: '#6B7280', bg: '#6B728010', dot: 'bg-[#6B7280]' },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function IssueCard({ issue }: { issue: RivianAutonomyIssue }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ISSUE_TYPE_CONFIG[issue.issueType] ?? ISSUE_TYPE_CONFIG['feature-regression'];
  const sentimentColor = SENTIMENT_COLOR[issue.sentiment] ?? '#6B7280';

  return (
    <div
      className="border border-[#1F1F1F] rounded-lg overflow-hidden hover:border-[#2D2D2D] transition-all cursor-pointer"
      style={{ backgroundColor: cfg.bg }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
              style={{ color: cfg.color, backgroundColor: cfg.color + '20' }}
            >
              {cfg.label}
            </span>
            <span className="text-[#4B5563] text-[10px] font-mono">
              {SOURCE_LABELS[issue.source as SourceKey] ?? issue.source}
            </span>
            <span className="text-[#4B5563] text-[10px] font-mono">
              · {timeAgo(issue.reportTimestamp)}
            </span>
            <span
              className="text-[10px] font-mono px-1 py-0.5 rounded"
              style={{ color: sentimentColor, backgroundColor: sentimentColor + '20' }}
            >
              {issue.sentiment}
            </span>
          </div>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        </div>
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#F5F5F5] text-xs font-semibold hover:text-[#60A5FA] transition-colors line-clamp-2 leading-snug"
          onClick={e => e.stopPropagation()}
        >
          {issue.title}
        </a>
        {expanded && issue.snippet && (
          <p className="text-[#9CA3AF] text-xs mt-1.5 leading-relaxed line-clamp-4">{issue.snippet}</p>
        )}
        {!expanded && (
          <p className="text-[#4B5563] text-[10px] font-mono mt-1 line-clamp-1">{issue.snippet}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  issues: RivianAutonomyIssue[];
}

export default function AutonomyIssues({ issues }: Props) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? issues : issues.slice(0, 8);
  const hasMore = issues.length > 8;

  // Group by issue type for summary
  const byType = issues.reduce((acc, issue) => {
    acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Summary pills */}
      {issues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(byType).map(([type, count]) => {
            const cfg = ISSUE_TYPE_CONFIG[type] ?? ISSUE_TYPE_CONFIG['feature-regression'];
            return (
              <span
                key={type}
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{ color: cfg.color, backgroundColor: cfg.color + '20' }}
              >
                {cfg.label} {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Issue cards */}
      {issues.length === 0 ? (
        <div className="text-[#4B5563] text-xs font-mono py-6 text-center border border-dashed border-[#1F1F1F] rounded-lg">
          No autonomy issues detected in recent scans
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((issue, i) => (
            <IssueCard key={i} issue={issue} />
          ))}
        </div>
      )}

      {/* Show more */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full text-center text-[#6B7280] text-xs font-mono hover:text-[#F5F5F5] transition-colors py-1.5 border border-dashed border-[#1F1F1F] rounded-lg"
        >
          {showAll ? 'Show less' : `+ ${issues.length - 8} more`}
        </button>
      )}
    </div>
  );
}