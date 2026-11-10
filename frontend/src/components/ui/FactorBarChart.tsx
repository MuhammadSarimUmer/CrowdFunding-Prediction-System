import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { humanizeFactor, toPercentPoints } from '@/lib/format';

interface FactorDatum {
  name: string;
  signed: number;
}

function FactorTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FactorDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-lg border border-line/50 bg-white px-3 py-2 text-label-md shadow-lift">
      <p className="font-semibold text-ink">{datum.name}</p>
      <p className={datum.signed >= 0 ? 'text-brand' : 'text-danger'}>
        {datum.signed >= 0 ? '+' : ''}
        {datum.signed.toFixed(0)} pts {datum.signed >= 0 ? 'toward success' : 'added risk'}
      </p>
    </div>
  );
}

export function FactorBarChart({ factors }: { factors: Record<string, number> }) {
  const data: FactorDatum[] = Object.entries(factors)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6)
    .map(([key, value]) => ({
      name: humanizeFactor(key),
      signed: toPercentPoints(value),
    }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-body-sm text-muted">No factor attribution was returned.</p>;
  }

  const maxAbs = Math.max(30, ...data.map((datum) => Math.abs(datum.signed)));
  const domain: [number, number] = [
    data.some((datum) => datum.signed < 0) ? -Math.ceil(maxAbs / 10) * 10 : 0,
    Math.ceil(maxAbs / 10) * 10,
  ];

  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <XAxis
              type="number"
              domain={domain}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.58)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 12, fill: '#3f4942' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke="#bec9bf" />
            <Tooltip content={<FactorTooltip />} cursor={{ fill: 'rgba(212, 233, 226, 0.35)' }} />
            <Bar dataKey="signed" radius={[4, 4, 4, 4]} barSize={16}>
              {data.map((datum) => (
                <Cell key={datum.name} fill={datum.signed >= 0 ? '#00754a' : '#c82014'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-label-md text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-action" aria-hidden="true" />
          Supports success
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" aria-hidden="true" />
          Adds risk
        </span>
      </div>
    </div>
  );
}
