import { MilestoneRarity, RARITY_STYLES } from '@/types/milestone';
import { Badge } from '@/components/ui/badge';

interface PublicMilestoneCardProps {
  name: string;
  description: string;
  rarity: MilestoneRarity;
  icon: string;
  count?: number;
}

/**
 * Privacy-respecting milestone card for public profiles.
 * Shows only: name, description, rarity, icon, and occurrence count.
 * Excludes: stats snapshot, opponent, date, flip animation.
 */
export function PublicMilestoneCard({ 
  name, 
  description, 
  rarity, 
  icon, 
  count = 1 
}: PublicMilestoneCardProps) {
  const rarityStyle = RARITY_STYLES[rarity];

  return (
    <div
      className={`
        relative rounded-xl border-2 ${rarityStyle.border} ${rarityStyle.bgClass}
        bg-gradient-to-br from-card/90 to-card/70
        shadow-lg ${rarityStyle.glow}
        p-4 flex flex-col items-center text-center
        h-[180px]
      `}
    >
      {/* Rarity Badge */}
      <Badge 
        variant="outline" 
        className={`absolute top-2 left-2 text-[10px] uppercase tracking-wider ${rarityStyle.text} border-current`}
      >
        {rarity}
      </Badge>

      {/* Count Badge (if earned multiple times) */}
      {count > 1 && (
        <Badge 
          className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold"
        >
          {count}×
        </Badge>
      )}

      {/* Icon */}
      <div className={`text-3xl mt-4 mb-2 ${rarityStyle.text}`}>
        {icon}
      </div>

      {/* Milestone Name */}
      <h3 className="font-bold text-sm text-foreground mb-1 leading-tight">
        {name}
      </h3>

      {/* Requirement Description */}
      <p className="text-xs text-muted-foreground leading-snug px-1">
        {description}
      </p>
    </div>
  );
}
