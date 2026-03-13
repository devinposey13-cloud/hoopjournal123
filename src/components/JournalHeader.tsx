import { cn } from '@/lib/utils';

interface JournalHeaderProps {
  playerName?: string;
  className?: string;
}

export function JournalHeader({ playerName, className }: JournalHeaderProps) {
  return (
    <div className={cn("pb-6 border-b border-border/30 text-center relative", className)}>
      {/* Decorative basketball icon with gentle bounce */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 animate-[bounce_3s_ease-in-out_infinite]">
        <span className="text-6xl md:text-7xl">🏀</span>
      </div>
      
      <h1
        className="text-5xl md:text-6xl lg:text-7xl mb-2 relative text-foreground uppercase tracking-wide"
        style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600 }}>
        TRACK YOUR GAME.<br/>IMPROVE EVERY DAY.
      </h1>
      
      {/* Decorative divider with basketball accents */}
      <div className="flex items-center justify-center gap-3 my-4">
        <div className="w-8 h-0.5 bg-primary/30" />
        <span className="text-primary/40 text-sm animate-pulse">🏀</span>
        <div className="w-8 h-0.5 bg-primary/30" />
      </div>
      
      <p
        className="text-xl md:text-2xl text-muted-foreground uppercase tracking-widest"
        style={{ fontFamily: "'Teko', sans-serif", fontWeight: 400 }}>
        {playerName ? `${playerName}'s Journey` : 'My Basketball Journey'}
      </p>
      </p>
    </div>);

}