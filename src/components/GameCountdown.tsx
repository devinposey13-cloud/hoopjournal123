import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface GameCountdownProps {
  gameDate: string;
  gameTime: string;
}

export function GameCountdown({ gameDate, gameTime }: GameCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isGameTime, setIsGameTime] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Parse game date - extract year, month, day to avoid UTC issues
      const dateParts = gameDate.split('T')[0].split('-').map(Number);
      const [year, month, day] = dateParts;
      
      // Parse time like "7:30 PM" or "19:30"
      let hours = 0;
      let minutes = 0;
      
      const timeMatch = gameTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3]?.toUpperCase();
        
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
      }
      
      // Create local date with parsed components
      const gameDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

      const now = new Date();
      const difference = gameDateTime.getTime() - now.getTime();

      if (difference <= 0) {
        setIsGameTime(true);
        setTimeLeft(null);
        return;
      }

      setIsGameTime(false);
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [gameDate, gameTime]);

  if (isGameTime) {
    return (
      <div className="flex items-center gap-2 text-primary font-semibold animate-pulse">
        <Clock className="w-4 h-4" />
        <span>Game Time!</span>
      </div>
    );
  }

  if (!timeLeft) return null;

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 text-primary font-bold text-lg sm:text-xl w-10 sm:w-12 h-10 sm:h-12 rounded-lg flex items-center justify-center">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Clock className="w-4 h-4 text-muted-foreground hidden sm:block" />
      {timeLeft.days > 0 && <TimeUnit value={timeLeft.days} label="Days" />}
      <TimeUnit value={timeLeft.hours} label="Hrs" />
      <span className="text-primary font-bold text-lg">:</span>
      <TimeUnit value={timeLeft.minutes} label="Min" />
      <span className="text-primary font-bold text-lg">:</span>
      <TimeUnit value={timeLeft.seconds} label="Sec" />
    </div>
  );
}
