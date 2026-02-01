import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Trophy, Star, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RingOfHonorEntry {
  id: string;
  user_id: string;
  quarter: string;
  display_name: string;
  avatar_url: string | null;
  position: string | null;
  team_name: string | null;
  final_xp: number;
  games_played: number;
  achieved_at: string;
  inducted_at: string;
}

export default function RingOfHonor() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RingOfHonorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('ring_of_honor')
        .select('*')
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
      
      // Set default quarter to most recent
      if (data && data.length > 0) {
        const quarters = [...new Set(data.map(e => e.quarter))];
        setSelectedQuarter(quarters[0]);
      }
    } catch (error) {
      console.error('Error fetching ring of honor:', error);
    } finally {
      setLoading(false);
    }
  };

  const quarters = [...new Set(entries.map(e => e.quarter))].sort().reverse();
  const filteredEntries = selectedQuarter 
    ? entries.filter(e => e.quarter === selectedQuarter)
    : entries;

  const formatQuarter = (quarter: string) => {
    const [year, q] = quarter.split('-');
    return `${q} ${year}`;
  };

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5 rounded-full blur-3xl" />
        
        {/* Floating stars */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="w-10 h-10 text-yellow-400" />
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                Ring of Honor
              </h1>
              <Crown className="w-10 h-10 text-yellow-400" />
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Celebrating the elite players who reached Level 50 and achieved legendary status
            </p>
          </motion.div>
        </div>

        {/* Quarter Filter */}
        {quarters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            <Button
              variant={selectedQuarter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedQuarter(null)}
              className={cn(
                selectedQuarter === null && 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600'
              )}
            >
              All Time
            </Button>
            {quarters.map((quarter) => (
              <Button
                key={quarter}
                variant={selectedQuarter === quarter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedQuarter(quarter)}
                className={cn(
                  selectedQuarter === quarter && 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600'
                )}
              >
                {formatQuarter(quarter)}
              </Button>
            ))}
          </motion.div>
        )}

        {entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-yellow-400/60" />
            </div>
            <h2 className="text-2xl font-bold mb-2">The Ring Awaits</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              No players have been inducted yet. Be the first to reach Level 50 and claim your place in the Ring of Honor!
            </p>
          </motion.div>
        )}

        {/* Inductees Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedQuarter || 'all'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {filteredEntries.map((entry, index) => (
              <HonorCard key={entry.id} entry={entry} index={index} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Stats Summary */}
        {entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-6 px-8 py-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-yellow-500/20">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{entries.length}</p>
                <p className="text-xs text-muted-foreground">Total Legends</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-400">{quarters.length}</p>
                <p className="text-xs text-muted-foreground">Seasons</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface HonorCardProps {
  entry: RingOfHonorEntry;
  index: number;
}

function HonorCard({ entry, index }: HonorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/30 via-amber-500/30 to-orange-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative bg-card rounded-2xl border border-yellow-500/20 overflow-hidden hover:border-yellow-500/40 transition-all duration-300 p-3">
        {/* Avatar */}
        <div className="relative aspect-square">
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 p-[3px] shadow-lg shadow-yellow-500/20">
            <div className="w-full h-full rounded-[10px] bg-background overflow-hidden flex items-center justify-center">
              {entry.avatar_url ? (
                <img
                  src={entry.avatar_url}
                  alt={entry.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-yellow-400">
                  {entry.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          
          {/* Crown badge */}
          <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-amber-500 p-1.5 rounded-full shadow-lg">
            <Crown className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Name */}
        <div className="mt-2 text-center">
          <h3 className="text-sm font-bold truncate">{entry.display_name}</h3>
          <p className="text-[10px] text-muted-foreground">{entry.quarter.split('-')[1]} {entry.quarter.split('-')[0]}</p>
        </div>
      </div>
    </motion.div>
  );
}
