import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Loader2, ArrowLeft, Target, Repeat, Zap, Shield, HandMetal, Percent, Instagram } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ClipCard } from '@/components/ClipCard';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';

interface PublicProfileData {
  name: string;
  team: string;
  position: string;
  number: number;
  height: string;
  grade: string;
  avatar_url: string | null;
  user_id: string;
  instagram_url: string | null;
}

interface PublicClip {
  id: string;
  title: string;
  description?: string;
  url: string;
  date: string;
  isPublic: boolean;
}

interface SeasonStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  fgPercentage: number;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [clips, setClips] = useState<PublicClip[]>([]);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPublicProfile() {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Fetch profile by username
        const { data: profileData, error: profileError } = await (supabase as any)
          .from('player_settings')
          .select('*')
          .eq('username', username.toLowerCase())
          .eq('is_profile_public', true)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProfile({
          name: profileData.name,
          team: profileData.team,
          position: profileData.position,
          number: profileData.number,
          height: profileData.height,
          grade: profileData.grade,
          avatar_url: profileData.avatar_url,
          user_id: profileData.user_id,
          instagram_url: profileData.instagram_url,
        });

        // Fetch public clips for this user
        const { data: clipsData } = await supabase
          .from('video_clips')
          .select('*')
          .eq('user_id', profileData.user_id)
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (clipsData) {
          const clipsWithUrls = await Promise.all(
            clipsData.map(async (c) => {
              let url = '';
              if (c.file_path) {
                const { data: signedData } = await supabase.storage
                  .from('video-clips')
                  .createSignedUrl(c.file_path, 3600);
                url = signedData?.signedUrl || '';
              }
              return {
                id: c.id,
                title: c.title,
                description: c.description || undefined,
                url,
                date: c.date,
                isPublic: c.is_public,
              };
            })
          );
          setClips(clipsWithUrls);
        }

        // Fetch games for stats calculation
        const { data: gamesData } = await supabase
          .from('games')
          .select('*')
          .eq('user_id', profileData.user_id);

        if (gamesData && gamesData.length > 0) {
          const totals = gamesData.reduce(
            (acc, g) => ({
              points: acc.points + g.points,
              rebounds: acc.rebounds + g.rebounds,
              assists: acc.assists + g.assists,
              steals: acc.steals + g.steals,
              blocks: acc.blocks + g.blocks,
              fgMade: acc.fgMade + g.fg_made,
              fgAttempted: acc.fgAttempted + g.fg_attempted,
              wins: acc.wins + (g.is_win ? 1 : 0),
            }),
            { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fgMade: 0, fgAttempted: 0, wins: 0 }
          );

          const gamesPlayed = gamesData.length;
          setStats({
            gamesPlayed,
            wins: totals.wins,
            losses: gamesPlayed - totals.wins,
            avgPoints: Math.round((totals.points / gamesPlayed) * 10) / 10,
            avgRebounds: Math.round((totals.rebounds / gamesPlayed) * 10) / 10,
            avgAssists: Math.round((totals.assists / gamesPlayed) * 10) / 10,
            avgSteals: Math.round((totals.steals / gamesPlayed) * 10) / 10,
            avgBlocks: Math.round((totals.blocks / gamesPlayed) * 10) / 10,
            fgPercentage: totals.fgAttempted > 0 
              ? Math.round((totals.fgMade / totals.fgAttempted) * 1000) / 10 
              : 0,
          });
        } else {
          setStats({
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            avgPoints: 0,
            avgRebounds: 0,
            avgAssists: 0,
            avgSteals: 0,
            avgBlocks: 0,
            fgPercentage: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching public profile:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchPublicProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4">
          <img src={hoopJournalLogo} alt="Hoop Journal" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
        <p className="text-muted-foreground mb-6 text-center">
          This profile doesn't exist or isn't public.
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src={hoopJournalLogo} alt="Hoop Journal" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg">Hoop Journal</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar className="w-32 h-32 border-4 border-primary/20 mb-4">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
            <AvatarFallback className="bg-muted text-3xl">
              <User className="w-12 h-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          <p className="text-muted-foreground text-lg">
            #{profile.number} • {profile.position}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              {profile.team} • {profile.grade} • {profile.height}
            </p>
            {profile.instagram_url && (
              <a
                href={profile.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Tabs for Stats and Highlights */}
        <Tabs defaultValue="stats" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            {stats && stats.gamesPlayed > 0 ? (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <p className="text-lg font-semibold">
                    {stats.gamesPlayed} Games • {stats.wins}-{stats.losses} Record
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard label="Points" value={stats.avgPoints} icon={Target} />
                  <StatCard label="Rebounds" value={stats.avgRebounds} icon={Repeat} />
                  <StatCard label="Assists" value={stats.avgAssists} icon={Zap} />
                  <StatCard label="Steals" value={stats.avgSteals} icon={Shield} />
                  <StatCard label="Blocks" value={stats.avgBlocks} icon={HandMetal} />
                  <StatCard label="FG%" value={stats.fgPercentage} suffix="%" icon={Percent} />
                </div>
              </div>
            ) : (
              <div className="stat-card text-center py-12">
                <p className="text-muted-foreground">No stats available yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="highlights">
            {clips.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {clips.map((clip) => (
                  <ClipCard 
                    key={clip.id} 
                    clip={clip} 
                    showPlayerInfo={true}
                  />
                ))}
              </div>
            ) : (
              <div className="stat-card text-center py-12">
                <p className="text-muted-foreground">No public highlights yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
