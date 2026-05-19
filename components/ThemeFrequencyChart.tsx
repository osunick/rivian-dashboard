'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';

interface ThemeEntry {
  theme: string;
  count: number;
}

interface Props {
  data: ThemeEntry[];
  onThemeClick?: (theme: string) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-[#1F1F1F] rounded p-2 text-xs font-mono">
      <div className="text-[#F5F5F5]">{d.theme}</div>
      <div className="text-[#3B82F6]">{d.count} mention{d.count === 1 ? '' : 's'}</div>
    </div>
  );
};

// Custom label renderer: theme name on the left edge of the bar, count on the right.
const BarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (width == null || height == null) return null;
  return (
    <text
      x={(x ?? 0) + 8}
      y={(y ?? 0) + height / 2}
      fill="#F5F5F5"
      fontSize={11}
      fontFamily="monospace"
      dominantBaseline="central"
    >
      {value}
    </text>
  );
};

const CountLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (width == null || height == null) return null;
  return (
    <text
      x={(x ?? 0) + (width ?? 0) + 6}
      y={(y ?? 0) + height / 2}
      fill="#6B7280"
      fontSize={11}
      fontFamily="monospace"
      dominantBaseline="central"
    >
      {value}
    </text>
  );
};

export default function ThemeFrequencyChart({ data, onThemeClick }: Props) {
  const max = Math.max(...data.map(d => d.count), 1);
  // Dynamic height: ~28px per row, min 200, max 480
  const rowHeight = 28;
  const chartHeight = Math.min(Math.max(data.length * rowHeight + 32, 200), 480);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
        barCategoryGap={6}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={{ stroke: '#1F1F1F' }}
          domain={[0, max + 1]}
          allowDecimals={false}
          hide
        />
        <YAxis
          type="category"
          dataKey="theme"
          hide
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1F1F1F' }} />
        <Bar
          dataKey="count"
          radius={[0, 2, 2, 0]}
          cursor={onThemeClick ? 'pointer' : 'default'}
          onClick={(d: any) => onThemeClick?.(d.theme)}
          minPointSize={120}
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              fill="#3B82F6"
              fillOpacity={0.55 + (0.45 * (data.length - i) / data.length)}
            />
          ))}
          <LabelList dataKey="theme" content={<BarLabel />} />
          <LabelList dataKey="count" content={<CountLabel />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
