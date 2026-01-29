import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Badge calculation logic (duplicated from frontend for edge function use)
type BadgeTier = 'bronze' | 'silver' | 'gold' | 'hof';
type BadgeCategory = 'finishing' | 'shooting' | 'playmaking' | 'defense' | 'rebounding';
type CardRarity = 'bronze' | 'silver' | 'gold' | 'diamond' | 'elite';

interface EarnedBadge {
  name: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: string;
  description: string;
}

interface SeasonStats {
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  fgPercentage: number;
  threePtPercentage: number;
  ftPercentage: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgTurnovers?: number;
}

interface CardRatings {
  overall: number;
  offense: number;
  defense: number;
  playmaking: number;
  athleticism: number;
  iq: number;
}

const BADGE_DEFINITIONS = {
  posterizer: {
    name: 'Posterizer', category: 'finishing' as const, icon: 'flame',
    description: 'Dominant scorer who attacks the rim with power',
    thresholds: { bronze: { ppg: 10, fg_pct: 40 }, silver: { ppg: 15, fg_pct: 45 }, gold: { ppg: 20, fg_pct: 50 }, hof: { ppg: 25, fg_pct: 55 } },
  },
  paintBeast: {
    name: 'Paint Beast', category: 'finishing' as const, icon: 'target',
    description: 'Dominates in the paint with scoring and rebounding',
    thresholds: { bronze: { ppg: 8, rpg: 5 }, silver: { ppg: 12, rpg: 7 }, gold: { ppg: 16, rpg: 9 }, hof: { ppg: 20, rpg: 12 } },
  },
  contactFinisher: {
    name: 'Contact Finisher', category: 'finishing' as const, icon: 'zap',
    description: 'Finishes through contact with ease',
    thresholds: { bronze: { ppg: 12, fg_pct: 42 }, silver: { ppg: 16, fg_pct: 46 }, gold: { ppg: 20, fg_pct: 50 }, hof: { ppg: 24, fg_pct: 54 } },
  },
  deadeye: {
    name: 'Deadeye', category: 'shooting' as const, icon: 'crosshair',
    description: 'Deadly shooter from beyond the arc',
    thresholds: { bronze: { three_pct: 30 }, silver: { three_pct: 35 }, gold: { three_pct: 40 }, hof: { three_pct: 45 } },
  },
  limitlessRange: {
    name: 'Limitless Range', category: 'shooting' as const, icon: 'target',
    description: 'Can score from anywhere on the court',
    thresholds: { bronze: { three_pct: 28, ppg: 8 }, silver: { three_pct: 33, ppg: 12 }, gold: { three_pct: 38, ppg: 16 }, hof: { three_pct: 43, ppg: 20 } },
  },
  clutchShooter: {
    name: 'Clutch Shooter', category: 'shooting' as const, icon: 'star',
    description: 'Ice in their veins from the free throw line',
    thresholds: { bronze: { ft_pct: 70 }, silver: { ft_pct: 78 }, gold: { ft_pct: 85 }, hof: { ft_pct: 92 } },
  },
  dimer: {
    name: 'Dimer', category: 'playmaking' as const, icon: 'users',
    description: 'Elite passer who makes teammates better',
    thresholds: { bronze: { apg: 3 }, silver: { apg: 5 }, gold: { apg: 8 }, hof: { apg: 12 } },
  },
  floorGeneral: {
    name: 'Floor General', category: 'playmaking' as const, icon: 'crown',
    description: 'Commands the offense with high basketball IQ',
    thresholds: { bronze: { apg: 4, ast_to_ratio: 1.5 }, silver: { apg: 6, ast_to_ratio: 2 }, gold: { apg: 8, ast_to_ratio: 2.5 }, hof: { apg: 10, ast_to_ratio: 3 } },
  },
  handlesForDays: {
    name: 'Handles for Days', category: 'playmaking' as const, icon: 'move',
    description: 'Takes care of the ball while creating plays',
    thresholds: { bronze: { apg: 3, low_to: 3 }, silver: { apg: 5, low_to: 2.5 }, gold: { apg: 7, low_to: 2 }, hof: { apg: 10, low_to: 1.5 } },
  },
  interceptor: {
    name: 'Interceptor', category: 'defense' as const, icon: 'shield',
    description: 'Ball hawk who disrupts passing lanes',
    thresholds: { bronze: { spg: 1 }, silver: { spg: 1.5 }, gold: { spg: 2 }, hof: { spg: 3 } },
  },
  rimProtector: {
    name: 'Rim Protector', category: 'defense' as const, icon: 'shield-check',
    description: 'Intimidating presence protecting the paint',
    thresholds: { bronze: { bpg: 1 }, silver: { bpg: 1.5 }, gold: { bpg: 2 }, hof: { bpg: 3 } },
  },
  pickPocket: {
    name: 'Pick Pocket', category: 'defense' as const, icon: 'hand',
    description: 'Quick hands that create turnovers',
    thresholds: { bronze: { spg: 1.2 }, silver: { spg: 1.8 }, gold: { spg: 2.5 }, hof: { spg: 3.5 } },
  },
  reboundChaser: {
    name: 'Rebound Chaser', category: 'rebounding' as const, icon: 'arrow-up',
    description: 'Relentless on the glass',
    thresholds: { bronze: { rpg: 5 }, silver: { rpg: 7 }, gold: { rpg: 10 }, hof: { rpg: 14 } },
  },
  boxOutBeast: {
    name: 'Box Out Beast', category: 'rebounding' as const, icon: 'square',
    description: 'Controls the boards with positioning',
    thresholds: { bronze: { rpg: 6 }, silver: { rpg: 8 }, gold: { rpg: 11 }, hof: { rpg: 15 } },
  },
  putbackBoss: {
    name: 'Putback Boss', category: 'rebounding' as const, icon: 'repeat',
    description: 'Scores on offensive rebounds',
    thresholds: { bronze: { rpg: 4, ppg: 8 }, silver: { rpg: 6, ppg: 12 }, gold: { rpg: 8, ppg: 16 }, hof: { rpg: 10, ppg: 20 } },
  },
};

function meetsThreshold(stats: SeasonStats, threshold: Record<string, number>): boolean {
  const avgTurnovers = stats.avgTurnovers ?? 2;
  const astToRatio = avgTurnovers > 0 ? stats.avgAssists / avgTurnovers : stats.avgAssists;

  for (const [key, value] of Object.entries(threshold)) {
    switch (key) {
      case 'ppg': if (stats.avgPoints < value) return false; break;
      case 'rpg': if (stats.avgRebounds < value) return false; break;
      case 'apg': if (stats.avgAssists < value) return false; break;
      case 'spg': if (stats.avgSteals < value) return false; break;
      case 'bpg': if (stats.avgBlocks < value) return false; break;
      case 'fg_pct': if (stats.fgPercentage < value) return false; break;
      case 'three_pct': if (stats.threePtPercentage < value) return false; break;
      case 'ft_pct': if (stats.ftPercentage < value) return false; break;
      case 'ast_to_ratio': if (astToRatio < value) return false; break;
      case 'low_to': if (avgTurnovers > value) return false; break;
    }
  }
  return true;
}

function getBadgeTier(stats: SeasonStats, thresholds: Record<BadgeTier, Record<string, number>>): BadgeTier | null {
  if (meetsThreshold(stats, thresholds.hof)) return 'hof';
  if (meetsThreshold(stats, thresholds.gold)) return 'gold';
  if (meetsThreshold(stats, thresholds.silver)) return 'silver';
  if (meetsThreshold(stats, thresholds.bronze)) return 'bronze';
  return null;
}

function calculatePlayerBadges(stats: SeasonStats): EarnedBadge[] {
  if (stats.gamesPlayed < 3) return [];
  const earnedBadges: EarnedBadge[] = [];
  for (const badge of Object.values(BADGE_DEFINITIONS)) {
    const tier = getBadgeTier(stats, badge.thresholds);
    if (tier) {
      earnedBadges.push({ name: badge.name, category: badge.category, tier, icon: badge.icon, description: badge.description });
    }
  }
  const tierOrder: Record<BadgeTier, number> = { hof: 0, gold: 1, silver: 2, bronze: 3 };
  earnedBadges.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
  return earnedBadges;
}

function calculateCardRatings(stats: SeasonStats): CardRatings {
  const normalize = (value: number, max: number, weight: number = 1): number => Math.min(99, Math.round((value / max) * 99 * weight));
  
  const offenseRaw = normalize(stats.avgPoints, 30, 0.4) + normalize(stats.fgPercentage, 60, 0.25) + normalize(stats.threePtPercentage, 50, 0.2) + normalize(stats.ftPercentage, 100, 0.15);
  const offense = Math.min(99, Math.round(offenseRaw));

  const defenseRaw = normalize(stats.avgSteals, 4, 0.35) + normalize(stats.avgBlocks, 4, 0.35) + normalize(stats.avgRebounds, 15, 0.3);
  const defense = Math.min(99, Math.round(defenseRaw));

  const avgTurnovers = stats.avgTurnovers ?? 2;
  const astToRatio = avgTurnovers > 0 ? stats.avgAssists / avgTurnovers : stats.avgAssists;
  const playmakingRaw = normalize(stats.avgAssists, 12, 0.6) + normalize(Math.min(astToRatio, 5), 5, 0.4);
  const playmaking = Math.min(99, Math.round(playmakingRaw));

  const athleticismRaw = normalize(stats.avgSteals, 4, 0.3) + normalize(stats.avgBlocks, 4, 0.3) + normalize(stats.avgPoints + stats.avgRebounds, 35, 0.4);
  const athleticism = Math.min(99, Math.round(athleticismRaw));

  const winPct = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 50;
  const toBonus = avgTurnovers < 2 ? 20 : avgTurnovers < 3 ? 10 : 0;
  const iqRaw = normalize(stats.fgPercentage, 60, 0.4) + normalize(winPct, 100, 0.3) + toBonus * 0.3;
  const iq = Math.min(99, Math.round(iqRaw));

  const overall = Math.round(offense * 0.25 + defense * 0.2 + playmaking * 0.2 + athleticism * 0.15 + iq * 0.2);

  return { overall: Math.min(99, overall), offense, defense, playmaking, athleticism, iq };
}

function determineCardRarity(stats: SeasonStats, badges: EarnedBadge[], ratings: CardRatings): CardRarity {
  const hofBadges = badges.filter(b => b.tier === 'hof').length;
  const goldBadges = badges.filter(b => b.tier === 'gold').length;
  const totalBadges = badges.length;

  if (stats.gamesPlayed >= 25 && ratings.overall >= 85 && hofBadges >= 2) return 'elite';
  if (stats.gamesPlayed >= 20 && ratings.overall >= 80 && (hofBadges >= 1 || goldBadges >= 3)) return 'diamond';
  if (stats.gamesPlayed >= 15 && ratings.overall >= 70 && goldBadges >= 2) return 'gold';
  if (stats.gamesPlayed >= 10 && ratings.overall >= 60 && totalBadges >= 3) return 'silver';
  return 'bronze';
}

function generatePlayerTitle(position: string, badges: EarnedBadge[], ratings: CardRatings): string {
  const topBadge = badges[0];
  
  // Position-based titles
  const positionTitles: Record<string, string[]> = {
    'Point Guard': ['Floor General', 'Court Commander', 'Playmaker'],
    'Shooting Guard': ['Sharpshooter', 'Scoring Machine', 'Two-Way Guard'],
    'Small Forward': ['Versatile Wing', 'Swiss Army Knife', 'Two-Way Threat'],
    'Power Forward': ['Paint Presence', 'Stretch Four', 'Double-Double Machine'],
    'Center': ['Rim Protector', 'Glass Cleaner', 'Paint Anchor'],
  };

  // Badge-based title overrides
  if (topBadge?.tier === 'hof') {
    switch (topBadge.category) {
      case 'finishing': return 'Elite Scorer';
      case 'shooting': return 'Lights Out Shooter';
      case 'playmaking': return 'Elite Playmaker';
      case 'defense': return 'Lockdown Defender';
      case 'rebounding': return 'Glass Dominator';
    }
  }

  // Rating-based titles
  if (ratings.overall >= 85) return 'All-Star Caliber';
  if (ratings.offense >= 80) return 'Offensive Threat';
  if (ratings.defense >= 80) return 'Defensive Anchor';
  if (ratings.playmaking >= 80) return 'Court Vision Master';

  // Default to position-based
  const titles = positionTitles[position] || ['Rising Star', 'Young Talent', 'Promising Prospect'];
  return titles[Math.floor(Math.random() * titles.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seasonStats, profile, seasonId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Calculate badges, ratings, and rarity
    const badges = calculatePlayerBadges(seasonStats);
    const ratings = calculateCardRatings(seasonStats);
    const rarity = determineCardRarity(seasonStats, badges, ratings);
    const playerTitle = generatePlayerTitle(profile.position, badges, ratings);

    // Generate AI scouting report
    let scoutingReport = "";
    if (LOVABLE_API_KEY) {
      const topBadges = badges.slice(0, 3).map(b => `${b.name} (${b.tier.toUpperCase()})`).join(', ');
      const prompt = `Write a 2-sentence scouting report for a ${profile.grade} ${profile.position} named ${profile.name} who plays for ${profile.team}. 
Stats: ${seasonStats.avgPoints.toFixed(1)} PPG, ${seasonStats.avgRebounds.toFixed(1)} RPG, ${seasonStats.avgAssists.toFixed(1)} APG.
Top badges earned: ${topBadges || 'None yet'}.
Overall rating: ${ratings.overall}/99. Rarity: ${rarity}.
Make it sound like an NBA 2K scouting report - energetic, specific, highlighting their strengths.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are an NBA 2K-style scouting report writer. Write brief, punchy scouting reports that highlight player strengths. Keep it to exactly 2 sentences." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          scoutingReport = data.choices?.[0]?.message?.content || "";
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
        scoutingReport = `${profile.name} brings energy and skill to the court. A ${profile.position} with room to grow and plenty of potential.`;
      }
    } else {
      scoutingReport = `${profile.name} brings energy and skill to the court. A ${profile.position} with room to grow and plenty of potential.`;
    }

    const statsSnapshot = {
      ppg: Math.round(seasonStats.avgPoints * 10) / 10,
      rpg: Math.round(seasonStats.avgRebounds * 10) / 10,
      apg: Math.round(seasonStats.avgAssists * 10) / 10,
      spg: Math.round(seasonStats.avgSteals * 10) / 10,
      bpg: Math.round(seasonStats.avgBlocks * 10) / 10,
      fg_pct: Math.round(seasonStats.fgPercentage * 10) / 10,
      three_pct: Math.round(seasonStats.threePtPercentage * 10) / 10,
      ft_pct: Math.round(seasonStats.ftPercentage * 10) / 10,
    };

    const cardData = {
      rarity,
      overall_rating: ratings.overall,
      offense_rating: ratings.offense,
      defense_rating: ratings.defense,
      playmaking_rating: ratings.playmaking,
      athleticism_rating: ratings.athleticism,
      iq_rating: ratings.iq,
      player_title: playerTitle,
      scouting_report: scoutingReport,
      stats_snapshot: statsSnapshot,
      badges_earned: badges,
      games_played: seasonStats.gamesPlayed,
      season_id: seasonId || null,
    };

    return new Response(JSON.stringify({ card: cardData, badges }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating trading card:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
