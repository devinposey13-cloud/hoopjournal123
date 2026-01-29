import { LucideIcon } from 'lucide-react';
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
  onClick,
}: GameCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
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
