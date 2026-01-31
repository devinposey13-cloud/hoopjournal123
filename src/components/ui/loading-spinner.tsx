import { motion } from 'framer-motion';
import '@lottiefiles/dotlottie-wc';

// Use the dotlottie-wc types from the web-components.d.ts file

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  xs: { width: 32, height: 32 },
  sm: { width: 60, height: 60 },
  md: { width: 100, height: 100 },
  lg: { width: 150, height: 150 },
  xl: { width: 200, height: 200 },
};

export function LoadingSpinner({ 
  size = 'md', 
  message,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const dimensions = sizeMap[size];
  
  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-3"
    >
      <dotlottie-wc
        src="https://lottie.host/dc3b3b08-d2bb-46f0-915d-c8d56d0dd2c1/lCHnsbvgB8.lottie"
        style={{ 
          width: `${dimensions.width}px`, 
          height: `${dimensions.height}px` 
        }}
        autoplay
        loop
      />
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return content;
}

// Inline variant for chat bubbles and small loading states
interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({ message, className }: InlineLoadingProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <dotlottie-wc
        src="https://lottie.host/dc3b3b08-d2bb-46f0-915d-c8d56d0dd2c1/lCHnsbvgB8.lottie"
        style={{ width: '24px', height: '24px' }}
        autoplay
        loop
      />
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
