import { Progress } from '@/components/ui/progress';

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number | null; // null = unlimited
  icon?: React.ReactNode;
}

export function UsageMeter({ label, used, limit, icon }: UsageMeterProps) {
  const isUnlimited = limit === null || limit === Infinity;
  const percent = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = !isUnlimited && limit > 0 && used >= limit * 0.8;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className={isNearLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
          {used}{isUnlimited ? '' : ` / ${limit}`}
          {isUnlimited && <span className="text-xs ml-1 text-primary">unlimited</span>}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percent}
          className={`h-2 ${isNearLimit ? '[&>div]:bg-destructive' : ''}`}
        />
      )}
      {isUnlimited && (
        <div className="h-2 w-full rounded-full bg-primary/20" />
      )}
    </div>
  );
}
