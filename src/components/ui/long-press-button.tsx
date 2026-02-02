import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./button";

interface LongPressButtonProps extends ButtonProps {
  onLongPress: () => void;
  pressDuration?: number;
  progressClassName?: string;
}

const LongPressButton = React.forwardRef<HTMLButtonElement, LongPressButtonProps>(
  ({ 
    children, 
    onLongPress, 
    pressDuration = 1200, 
    className, 
    progressClassName,
    disabled,
    ...props 
  }, ref) => {
    const [progress, setProgress] = useState(0);
    const [isPressing, setIsPressing] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    const startPress = useCallback(() => {
      if (disabled) return;
      
      setIsPressing(true);
      startTimeRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min((elapsed / pressDuration) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress >= 100) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          onLongPress();
          setProgress(0);
          setIsPressing(false);
        }
      }, 16);
    }, [disabled, pressDuration, onLongPress]);

    const endPress = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setProgress(0);
      setIsPressing(false);
    }, []);

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, []);

    return (
      <Button
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onTouchCancel={endPress}
        disabled={disabled}
        {...props}
      >
        {/* Progress overlay */}
        {isPressing && (
          <div 
            className={cn(
              "absolute inset-0 bg-destructive/30 transition-none",
              progressClassName
            )}
            style={{ width: `${progress}%` }}
          />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </Button>
    );
  }
);

LongPressButton.displayName = "LongPressButton";

export { LongPressButton };
