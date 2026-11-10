import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ModelVersion } from '@/types';
import { ALGORITHM_LABELS } from '@/lib/constants';
import { toRatio } from '@/lib/format';

export function ModelComparisonChart({ models }: { models: ModelVersion[] }) {
  const data = [...models]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((model) => ({
      name: model.version ?? model.name ?? ALGORITHM_LABELS[model.algorithm],
      accuracy: toRatio(model.accuracy),
      f1: toRatio(model.f1Score),
      active: model.isActive,
    }));

  if (data.length === 0) {
    return <p className="py-10 text-center text-body-sm text-muted">No model versions have been trained yet.</p>;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e2dd" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.58)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0.5, 1]}
            tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
            tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.58)' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #bec9bf',
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}
            cursor={{ fill: 'rgba(212, 233, 226, 0.3)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (value === 'accuracy' ? 'Accuracy' : 'F1 score')}
          />
          <Bar dataKey="accuracy" name="accuracy" fill="#00754a" radius={[5, 5, 0, 0]} maxBarSize={28} />
          <Bar dataKey="f1" name="f1" fill="#cba258" radius={[5, 5, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
