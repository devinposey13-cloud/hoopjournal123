import { useState, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const SWIPE_THRESHOLD = 80;
const DELETE_WIDTH = 80;

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  enabled?: boolean;
}

export function SwipeToDelete({ children, onDelete, enabled = true }: SwipeToDeleteProps) {
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-DELETE_WIDTH, -20, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-DELETE_WIDTH, -20, 0], [1, 0.8, 0.6]);

  if (!enabled) return <>{children}</>;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setIsSwipeOpen(true);
    } else {
      setIsSwipeOpen(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive rounded-r-lg"
        style={{ width: DELETE_WIDTH, opacity: deleteOpacity }}
      >
        <motion.button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex flex-col items-center gap-1 text-destructive-foreground p-3"
          style={{ scale: deleteScale }}
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">Delete</span>
        </motion.button>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -DELETE_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isSwipeOpen ? -DELETE_WIDTH : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{ x }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
