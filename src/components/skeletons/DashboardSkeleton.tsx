import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

function StatCardSkeleton() {
  return (
    <div className="journal-card p-4 rounded-xl">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-7 w-10" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

function ChartCardSkeleton() {
  return (
    <div className="journal-card p-4 rounded-xl">
      <Skeleton className="h-4 w-20 mb-4" />
      <div className="h-[180px] flex items-end justify-between gap-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1" 
            style={{ height: `${30 + Math.random() * 70}%` }} 
          />
        ))}
      </div>
    </div>
  );
}

function GameCardSkeleton() {
  return (
    <div className="journal-card p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function PlayerHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="hidden md:flex gap-6">
        <div className="text-center space-y-1">
          <Skeleton className="h-8 w-8 mx-auto" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="text-center space-y-1">
          <Skeleton className="h-8 w-8 mx-auto" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="text-center space-y-1">
          <Skeleton className="h-8 w-8 mx-auto" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function DashboardSkeleton() {
  return (
    <div className="journal-page rounded-2xl overflow-hidden">
      <motion.div 
        className="px-6 md:px-10 py-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Header Skeleton */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </motion.div>

        {/* Player Header Skeleton */}
        <motion.div variants={itemVariants} className="journal-section">
          <PlayerHeaderSkeleton />
        </motion.div>

        {/* Season Averages Section */}
        <motion.section variants={itemVariants} className="journal-section">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </motion.section>

        {/* Performance Charts Section */}
        <motion.section variants={itemVariants} className="journal-section">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="grid md:grid-cols-3 gap-4">
            <ChartCardSkeleton />
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </div>
        </motion.section>

        {/* Recent Games Section */}
        <motion.section variants={itemVariants} className="journal-section">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}

// Export individual skeletons for reuse
export { StatCardSkeleton, ChartCardSkeleton, GameCardSkeleton, PlayerHeaderSkeleton };
