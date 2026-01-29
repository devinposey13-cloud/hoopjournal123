import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  audioData: number[];
  isRecording: boolean;
  barCount?: number;
}

export function AudioWaveform({ audioData, isRecording, barCount = 24 }: AudioWaveformProps) {
  if (!isRecording) return null;

  // Generate bars based on audio data or idle animation
  const bars = Array.from({ length: barCount }, (_, i) => {
    const value = audioData[i] || 0;
    // Normalize to 0-1 range and add minimum height
    const normalizedValue = Math.max(0.15, value / 255);
    return normalizedValue;
  });

  return (
    <div className="flex items-center justify-center gap-0.5 h-8 px-2">
      {bars.map((value, index) => (
        <div
          key={index}
          className={cn(
            "w-1 rounded-full transition-all duration-100 ease-out",
            "bg-gradient-to-t from-primary/60 to-primary"
          )}
          style={{
            height: `${value * 100}%`,
            minHeight: '4px',
            animationDelay: `${index * 30}ms`,
          }}
        />
      ))}
    </div>
  );
}
