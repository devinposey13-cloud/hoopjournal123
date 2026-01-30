import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type FlashVariant = 'success' | 'danger' | 'warning' | 'neutral';

interface StatFlashProps {
  show: boolean;
  emoji: string;
  message: string;
  variant?: FlashVariant;
}

const variantStyles: Record<FlashVariant, string> = {
  success: 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]',
  danger: 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]',
  warning: 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]',
  neutral: 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]',
};

export function StatFlash({ show, emoji, message, variant = 'neutral' }: StatFlashProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsFading(false);
      
      // Start fade out after 500ms
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 500);
      
      // Hide completely after fade animation
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 800);
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-40 pointer-events-none flex items-center justify-center",
        isFading && "animate-stat-fade-out"
      )}
      style={{ 
        background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 70%)' 
      }}
    >
      <div className={cn(
        "flex flex-col items-center animate-stat-pop",
        isFading && "animate-stat-fade-out"
      )}>
        <span className="text-7xl mb-2">{emoji}</span>
        <p className={cn(
          "text-3xl font-bold uppercase tracking-wider",
          variantStyles[variant]
        )}>
          {message}
        </p>
      </div>
    </div>
  );
}

// Helper function to get flash configuration based on stat type
export function getFlashConfig(statType: string): { emoji: string; message: string; variant: FlashVariant } | null {
  const configs: Record<string, { emoji: string; message: string; variant: FlashVariant }> = {
    // Made shots are handled by FireCelebration, but include them for completeness
    fgMade: { emoji: '🔥', message: 'BUCKET!', variant: 'success' },
    threePtMade: { emoji: '🔥', message: 'BUCKET!', variant: 'success' },
    ftMade: { emoji: '🔥', message: 'BUCKET!', variant: 'success' },
    // Misses
    fgAttempted: { emoji: '❌', message: 'MISS', variant: 'danger' },
    threePtAttempted: { emoji: '❌', message: '3PT MISS', variant: 'danger' },
    ftAttempted: { emoji: '❌', message: 'FT MISS', variant: 'danger' },
    // Rebounds
    offensiveRebounds: { emoji: '💪', message: 'OREB!', variant: 'success' },
    defensiveRebounds: { emoji: '🪵', message: 'BOARD!', variant: 'neutral' },
    // Other positive stats
    assists: { emoji: '🎯', message: 'DIME!', variant: 'success' },
    steals: { emoji: '🔒', message: 'STEAL!', variant: 'success' },
    blocks: { emoji: '🚫', message: 'BLOCK!', variant: 'success' },
    // Negative stats
    turnovers: { emoji: '😬', message: 'TURNOVER', variant: 'warning' },
    fouls: { emoji: '⚠️', message: 'FOUL', variant: 'danger' },
  };
  
  return configs[statType] || null;
}
