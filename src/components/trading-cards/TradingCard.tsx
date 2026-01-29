import { Star, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TradingCard as TradingCardType, EarnedBadge } from '@/types/tradingCard';
import { RARITY_STYLES, RARITY_STARS } from '@/types/tradingCard';
import { BadgeRow } from './BadgeDisplay';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TradingCardProps {
  card: TradingCardType;
  playerName: string;
  playerTeam: string;
  playerPosition: string;
  playerNumber: number;
  playerGrade: string;
  avatarUrl?: string;
  className?: string;
  onClick?: () => void;
}

export function TradingCard({
  card,
  playerName,
  playerTeam,
  playerPosition,
  playerNumber,
  playerGrade,
  avatarUrl,
  className,
  onClick,
}: TradingCardProps) {
  const rarityStyle = RARITY_STYLES[card.rarity];
  const stars = RARITY_STARS[card.rarity];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative w-72 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105',
        'bg-gradient-to-br',
        rarityStyle.gradient,
        rarityStyle.glow,
        'border-2',
        rarityStyle.border,
        className
      )}
    >
      {/* Holographic overlay for elite cards */}
      {card.rarity === 'elite' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-pink-500/10 to-orange-500/10 animate-pulse pointer-events-none" />
      )}
      
      {/* Diamond sparkle effect */}
      {card.rarity === 'diamond' && (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-blue-500/5 pointer-events-none" />
      )}

      <div className="relative p-4 space-y-3">
        {/* Header: Rarity & Position */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4',
                  i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'
                )}
              />
            ))}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-white/80 bg-black/20 px-2 py-1 rounded">
            {playerPosition}
          </span>
        </div>

        {/* Player Title */}
        {card.player_title && (
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-white/90">
              ★ {card.player_title} ★
            </span>
          </div>
        )}

        {/* Avatar */}
        <div className="flex justify-center">
          <Avatar className="w-28 h-28 border-4 border-white/30 shadow-xl">
            <AvatarImage src={avatarUrl} alt={playerName} />
            <AvatarFallback className="bg-white/20 text-white text-3xl">
              <User className="w-12 h-12" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Player Info */}
        <div className="text-center space-y-0.5">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {playerName} <span className="text-white/70">#{playerNumber}</span>
          </h3>
          <p className="text-xs text-white/70">
            {playerTeam} • {playerGrade}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/20" />

        {/* Badges Section */}
        {card.badges_earned.length > 0 && (
          <div className="bg-black/20 rounded-lg p-2">
            <div className="text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
              Badges
            </div>
            <BadgeRow badges={card.badges_earned} maxBadges={5} size="sm" />
          </div>
        )}

        {/* Stats Row */}
        <div className="flex justify-center gap-4 text-center">
          <StatItem label="PPG" value={card.stats_snapshot.ppg} />
          <StatItem label="RPG" value={card.stats_snapshot.rpg} />
          <StatItem label="APG" value={card.stats_snapshot.apg} />
        </div>

        {/* Scouting Report */}
        {card.scouting_report && (
          <p className="text-xs text-white/80 italic text-center leading-relaxed bg-black/10 rounded-lg p-2">
            "{card.scouting_report}"
          </p>
        )}

        {/* Ratings Grid */}
        <div className="grid grid-cols-6 gap-1 text-center bg-black/20 rounded-lg p-2">
          <RatingCell label="OVR" value={card.overall_rating} highlight />
          <RatingCell label="OFF" value={card.offense_rating} />
          <RatingCell label="DEF" value={card.defense_rating} />
          <RatingCell label="PLY" value={card.playmaking_rating} />
          <RatingCell label="ATH" value={card.athleticism_rating} />
          <RatingCell label="IQ" value={card.iq_rating} />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-white/60">
          <span>{card.games_played} Games Played</span>
          <span>{new Date(card.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-bold text-white">{value.toFixed(1)}</div>
      <div className="text-xs text-white/60 uppercase">{label}</div>
    </div>
  );
}

function RatingCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded px-1 py-0.5',
      highlight && 'bg-white/10'
    )}>
      <div className="text-[10px] text-white/50 uppercase">{label}</div>
      <div className={cn(
        'text-sm font-bold',
        value >= 85 ? 'text-green-400' :
        value >= 70 ? 'text-yellow-400' :
        value >= 55 ? 'text-orange-400' :
        'text-white'
      )}>
        {value}
      </div>
    </div>
  );
}

// Mini card for collection grid
interface TradingCardMiniProps {
  card: TradingCardType;
  playerName: string;
  avatarUrl?: string;
  onClick?: () => void;
}

export function TradingCardMini({ card, playerName, avatarUrl, onClick }: TradingCardMiniProps) {
  const rarityStyle = RARITY_STYLES[card.rarity];
  const stars = RARITY_STARS[card.rarity];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative w-40 h-56 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105',
        'bg-gradient-to-br',
        rarityStyle.gradient,
        rarityStyle.glow,
        'border',
        rarityStyle.border
      )}
    >
      <div className="relative p-2 h-full flex flex-col">
        {/* Stars */}
        <div className="flex items-center gap-0.5 mb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'w-2.5 h-2.5',
                i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'
              )}
            />
          ))}
        </div>

        {/* Avatar */}
        <div className="flex-1 flex items-center justify-center">
          <Avatar className="w-16 h-16 border-2 border-white/30">
            <AvatarImage src={avatarUrl} alt={playerName} />
            <AvatarFallback className="bg-white/20 text-white">
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="text-center mt-auto">
          <div className="text-xs font-bold text-white truncate">{playerName}</div>
          <div className="text-lg font-bold text-white">{card.overall_rating}</div>
          <div className="text-[10px] text-white/60 uppercase">Overall</div>
        </div>
      </div>
    </div>
  );
}
