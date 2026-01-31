import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Lock, Check, Star, Sparkles, Gift, Crown, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useXpProgress } from '@/hooks/useXpProgress';
import { XpProgressBar } from '@/components/xp/XpProgressBar';
import { LevelBadge } from '@/components/xp/LevelBadge';
import { getXpForLevel, getTotalXpForLevel, getLevelTier, getLevelTierGradient, XP_CONFIG } from '@/utils/xpCalculations';
import type { LevelReward } from '@/types/xp';

// Group rewards by type
function groupRewardsByType(rewards: LevelReward[]) {
  const grouped: Record<string, LevelReward[]> = {};
  rewards.forEach(reward => {
    const type = reward.reward_type;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(reward);
  });
  return grouped;
}

// Get icon for reward type
function getRewardTypeIcon(type: string) {
  switch (type) {
    case 'badge': return Medal;
    case 'title': return Crown;
    case 'frame': return Sparkles;
    case 'flair': return Star;
    default: return Gift;
  }
}

// Get display name for reward type
function getRewardTypeLabel(type: string) {
  switch (type) {
    case 'badge': return 'Badges';
    case 'title': return 'Titles';
    case 'frame': return 'Frames';
    case 'flair': return 'Flair';
    default: return 'Other';
  }
}

interface RewardCardProps {
  reward: LevelReward;
  isUnlocked: boolean;
  currentLevel: number;
}

function RewardCard({ reward, isUnlocked, currentLevel }: RewardCardProps) {
  const levelsAway = reward.level_required - currentLevel;
  const tierGradient = getLevelTierGradient(reward.level_required);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isUnlocked ? { scale: 1.02, y: -2 } : undefined}
      className={cn(
        'relative rounded-xl border p-4 transition-all overflow-hidden',
        isUnlocked 
          ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/10' 
          : 'bg-card/50 border-border opacity-60'
      )}
    >
      {/* Background glow for unlocked */}
      {isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5" />
      )}

      {/* Lock/Check Icon */}
      <div className={cn(
        'absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center',
        isUnlocked ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'
      )}>
        {isUnlocked ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className={cn(
          'text-4xl mb-3',
          !isUnlocked && 'grayscale opacity-50'
        )}>
          {reward.reward_icon}
        </div>

        {/* Info */}
        <div className="space-y-1.5">
          <h4 className={cn(
            'font-semibold',
            isUnlocked && 'text-yellow-100'
          )}>
            {reward.reward_name}
          </h4>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {reward.description}
          </p>
          
          {/* Level requirement */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full font-medium',
              isUnlocked 
                ? 'bg-green-500/20 text-green-400' 
                : `bg-gradient-to-r ${tierGradient} text-white/90`
            )}>
              Level {reward.level_required}
            </span>
            
            {!isUnlocked && levelsAway > 0 && (
              <span className="text-xs text-muted-foreground">
                {levelsAway} level{levelsAway !== 1 ? 's' : ''} away
              </span>
            )}
            
            {isUnlocked && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Unlocked!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Shimmer effect for unlocked rewards */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

export default function Rewards() {
  const navigate = useNavigate();
  const { progress, rewards, unlockedRewards, loading, quarterInfo } = useXpProgress();
  
  const currentLevel = progress?.current_level ?? 1;
  const currentXp = progress?.current_xp ?? 0;
  const unlockedRewardIds = new Set(unlockedRewards.map(r => r.reward_id));
  
  // Group rewards by type
  const groupedRewards = groupRewardsByType(rewards);
  const rewardTypes = Object.keys(groupedRewards).sort();
  
  // Calculate stats
  const totalRewards = rewards.length;
  const unlockedCount = unlockedRewards.length;
  const progressPercent = totalRewards > 0 ? (unlockedCount / totalRewards) * 100 : 0;
  
  // Get next reward
  const nextReward = rewards.find(r => !unlockedRewardIds.has(r.id) && r.level_required > currentLevel);
  const levelsToNextReward = nextReward ? nextReward.level_required - currentLevel : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading rewards...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Rewards Showcase
            </h1>
            <p className="text-muted-foreground text-sm">
              Unlock rewards by leveling up through great performances
            </p>
          </div>
        </div>

        {/* Current Progress Card */}
        <Card className="mb-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-yellow-500/5 pointer-events-none" />
          <CardContent className="pt-6 relative">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Level Badge */}
              <div className="flex items-center gap-4">
                <LevelBadge level={currentLevel} size="lg" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Level</p>
                  <p className="text-2xl font-bold">{getLevelTier(currentLevel)}</p>
                </div>
              </div>
              
              {/* XP Progress */}
              <div className="flex-1 w-full md:w-auto">
                <XpProgressBar 
                  currentXp={currentXp} 
                  level={currentLevel}
                />
              </div>
              
              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-500">{unlockedCount}</p>
                  <p className="text-xs text-muted-foreground">Unlocked</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{totalRewards - unlockedCount}</p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
              </div>
            </div>

            {/* Collection Progress */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Collection Progress</span>
                <span className="text-sm font-medium">{unlockedCount}/{totalRewards}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Next Reward Preview */}
            {nextReward && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <div className="text-2xl opacity-50 grayscale">{nextReward.reward_icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Next: {nextReward.reward_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {levelsToNextReward} level{levelsToNextReward !== 1 ? 's' : ''} away • Level {nextReward.level_required}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quarter Info */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{quarterInfo.quarter}</p>
                <p className="text-sm text-muted-foreground">
                  {quarterInfo.daysRemaining} days remaining in quarter
                </p>
              </div>
              <Progress value={quarterInfo.progressPercent} className="w-32 h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Rewards by Type */}
        {rewardTypes.length > 0 ? (
          <Tabs defaultValue={rewardTypes[0] || 'all'} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
              {rewardTypes.map(type => {
                const Icon = getRewardTypeIcon(type);
                const typeRewards = groupedRewards[type] || [];
                const typeUnlocked = typeRewards.filter(r => unlockedRewardIds.has(r.id)).length;
                
                return (
                  <TabsTrigger 
                    key={type} 
                    value={type}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {getRewardTypeLabel(type)}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {typeUnlocked}/{typeRewards.length}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {rewardTypes.map(type => (
              <TabsContent key={type} value={type} className="mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(groupedRewards[type] || [])
                    .sort((a, b) => a.level_required - b.level_required)
                    .map((reward, index) => (
                      <motion.div
                        key={reward.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <RewardCard
                          reward={reward}
                          isUnlocked={unlockedRewardIds.has(reward.id)}
                          currentLevel={currentLevel}
                        />
                      </motion.div>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Rewards Available Yet</h3>
              <p className="text-muted-foreground">
                Rewards will be added soon. Keep playing and leveling up!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Level Roadmap */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Level Roadmap
            </CardTitle>
            <CardDescription>
              XP required for each level tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { tier: 'Rookie', levels: '1-9', minLevel: 1 },
                { tier: 'Bronze', levels: '10-24', minLevel: 10 },
                { tier: 'Silver', levels: '25-34', minLevel: 25 },
                { tier: 'Gold', levels: '35-44', minLevel: 35 },
                { tier: 'Diamond', levels: '45-50', minLevel: 45 },
              ].map(({ tier, levels, minLevel }) => (
                <div 
                  key={tier}
                  className={cn(
                    'p-4 rounded-lg border text-center',
                    currentLevel >= minLevel 
                      ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30' 
                      : 'bg-muted/30 border-border'
                  )}
                >
                  <LevelBadge level={minLevel} size="sm" className="mx-auto mb-2" />
                  <p className="font-semibold">{tier}</p>
                  <p className="text-xs text-muted-foreground">Levels {levels}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getTotalXpForLevel(minLevel).toLocaleString()} XP
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
