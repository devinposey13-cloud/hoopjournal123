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
        className="text-4xl md:text-5xl lg:text-6xl mb-2 relative text-foreground"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        Dear Basketball,
      </h1>
      
      {/* Decorative divider with basketball accents */}
      <div className="flex items-center justify-center gap-3 my-4">
        <div className="w-8 h-0.5 bg-primary/30" />
        <span className="text-primary/40 text-sm animate-pulse">🏀</span>
        <div className="w-8 h-0.5 bg-primary/30" />
      </div>
      
      <p 
        className="text-lg md:text-xl text-muted-foreground"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        {playerName ? `${playerName}'s Journey` : 'My Basketball Journey'}
      </p>
    </div>
  );
}