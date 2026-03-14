import { LucideIcon, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GameCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradientClass: string;
  highScore?: number | null;
  highScoreLabel?: string;
  suffix?: string;
  xpLabel?: string;
  onClick: () => void;
}

export function GameCard({
  title,
  description,
  icon: Icon,
  gradientClass,
  highScore,
  highScoreLabel = 'High Score',
  suffix = '',
  xpLabel,
  onClick,
}: GameCardProps) {
  return (
    <Card className="overflow-hidden transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer group">
      <div className={cn('h-2 bg-gradient-to-r', gradientClass)} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={cn('p-3 rounded-xl bg-gradient-to-br', gradientClass)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {highScore !== null && highScore !== undefined && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{highScoreLabel}</p>
              <p className="text-lg font-bold">{highScore}{suffix}</p>
            </div>
          )}
        </div>
        <CardTitle className="text-lg mt-3">{title}</CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
        {xpLabel && (
          <div className="flex items-center gap-1 mt-1">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">{xpLabel}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Button 
          onClick={onClick}
          className={cn('w-full bg-gradient-to-r text-white', gradientClass)}
        >
          Play Now
        </Button>
      </CardContent>
    </Card>
  );
}
