import { cn } from '@/lib/cn';

const CATEGORY_STYLES: Record<string, { icon: string; bg: string; fg: string }> = {
  technology: { icon: 'memory', bg: 'bg-[#d4e9e2]', fg: 'text-[#006241]' },
  design: { icon: 'architecture', bg: 'bg-[#f3e8d3]', fg: 'text-[#82601c]' },
  environment: { icon: 'eco', bg: 'bg-[#dcebdc]', fg: 'text-[#146b4a]' },
  health: { icon: 'favorite', bg: 'bg-[#f6e3e0]', fg: 'text-[#a91a10]' },
  food: { icon: 'restaurant', bg: 'bg-[#f7ecd7]', fg: 'text-[#674803]' },
  education: { icon: 'school', bg: 'bg-[#e4e8f0]', fg: 'text-[#3f4942]' },
  games: { icon: 'sports_esports', bg: 'bg-[#e8e2f0]', fg: 'text-[#4a3f6b]' },
};

interface CampaignArtworkProps {
  categoryName?: string;
  title: string;
  className?: string;
  compact?: boolean;
}

export function CampaignArtwork({ categoryName, title, className, compact = false }: CampaignArtworkProps) {
  const style = CATEGORY_STYLES[(categoryName ?? '').toLowerCase()] ?? {
    icon: 'lightbulb',
    bg: 'bg-surface-container',
    fg: 'text-on-surface-variant',
  };

  return (
    <div
      role="img"
      aria-label={`${title} campaign artwork`}
      className={cn('relative flex items-center justify-center overflow-hidden', style.bg, style.fg, className)}
    >
      <span
        className={cn(
          'absolute -right-10 -top-10 rounded-full border-2 border-current opacity-15',
          compact ? 'h-28 w-28' : 'h-44 w-44',
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'absolute -bottom-12 -left-8 rounded-full border-2 border-current opacity-15',
          compact ? 'h-32 w-32' : 'h-52 w-52',
        )}
        aria-hidden="true"
      />
      <span
        className="absolute inset-x-8 top-8 h-px bg-current opacity-10"
        aria-hidden="true"
      />
      <span
        className="absolute inset-x-12 bottom-10 h-px bg-current opacity-10"
        aria-hidden="true"
      />
      <span
        className={cn(
          'material-symbols-outlined relative opacity-80',
          compact ? 'text-[42px]' : 'text-[64px]',
        )}
        aria-hidden="true"
      >
        {style.icon}
      </span>
      <span className="absolute bottom-3 right-3 rounded-pill bg-white/80 px-2.5 py-1 text-label-sm font-semibold uppercase tracking-[0.1em] text-house">
        {categoryName ?? 'Campaign'}
      </span>
    </div>
  );
}
