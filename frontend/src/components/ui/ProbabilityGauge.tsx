import { clamp, toRatio } from '@/lib/format';

interface ProbabilityGaugeProps {
  probability: number;
  size?: number;
  label?: string;
}

export function ProbabilityGauge({ probability, size = 220, label = 'Probability of success' }: ProbabilityGaugeProps) {
  const value = clamp(toRatio(probability), 0, 1);
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - value);
  const color = value >= 0.65 ? '#006241' : value >= 0.5 ? '#cba258' : '#c82014';
  const percent = Math.round(value * 100);

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${label}: ${percent}%`}>
      <svg width={size} height={size} viewBox="0 0 220 220" className="max-w-full">
        <circle cx="110" cy="110" r={radius} fill="none" stroke="#eae8e3" strokeWidth="14" />
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 110 110)"
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.2, 0, 0, 1)' }}
        />
        <text
          x="110"
          y="108"
          textAnchor="middle"
          fill="#1b1c19"
          fontSize="46"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          letterSpacing="-1"
        >
          {percent}%
        </text>
        <text
          x="110"
          y="134"
          textAnchor="middle"
          fill="rgba(0,0,0,0.58)"
          fontSize="10"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          letterSpacing="1.4"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
