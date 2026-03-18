import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Flag, BarChart3, Trash2, Edit2, Key, Loader2, Search, Check, X, AlertTriangle, Phone, Copy, MessageSquare, UserCheck, ChevronDown, Activity, Cpu, Zap, TrendingUp, Clock, Shield, Star, Calendar as CalendarIcon, CreditCard, Trophy, ToggleLeft, Megaphone, Info, Bell } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type PlanId, planCatalog, getEffectivePlan, type UserAccessInfo } from '@/lib/plans';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AdminAccessControls } from '@/components/admin/AdminAccessControls';
import { AdminLeaderboards } from '@/components/admin/AdminLeaderboards';
import { AdminFeatureFlags } from '@/components/admin/AdminFeatureFlags';
import { AdminBroadcast } from '@/components/admin/AdminBroadcast';
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth';
import { AdminSlackAlerts } from '@/components/admin/AdminSlackAlerts';
import { ApprovalModeSelector } from '@/components/admin/ApprovalModeSelector';
import { dispatchSlackAlert } from '@/utils/slackAlerts';
import { format } from 'date-fns';

interface UserFeedback {
  id: string;
  user_id: string;
  category: string;
  message: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  team: string;
  position: string;
  number: number;
  height: string;
  grade: string;
  avatar_url: string | null;
  display_name: string | null;
  is_profile_public: boolean;
  created_at: string;
  username?: string | null;
}

interface ContentReport {
  id: string;
  reporter_user_id: string | null;
  reported_content: string;
  ai_response: string;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface PasswordResetRequest {
  id: string;
  user_id: string | null;
  phone: string;
  player_name: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface AccountApprovalRequest {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  approval_method?: string;
}

function MetricHint({ tip }: { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3 h-3 text-muted-foreground/50 cursor-help shrink-0" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

export function AdminPanel() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>([]);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<AccountApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [orphanUserId, setOrphanUserId] = useState('');
  const [orphanedUsers, setOrphanedUsers] = useState<Array<{
    id: string;
    email: string | null;
    phone: string | null;
    provider: string;
    created_at: string;
    last_sign_in_at: string | null;
    user_metadata: { full_name: string | null; name: string | null };
  }>>([]);
  const [loadingOrphans, setLoadingOrphans] = useState(false);
  const [orphansLoaded, setOrphansLoaded] = useState(false);
  const [deletingOrphan, setDeletingOrphan] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<{
    trials: any[];
    active: any[];
    trial_count: number;
    active_count: number;
  } | null>(null);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [planOverrides, setPlanOverrides] = useState<Map<string, any>>(new Map());
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [pendingOverride, setPendingOverride] = useState<{ userId: string; userName: string; currentPlan: string; newPlan: string } | null>(null);

  // Usage dashboard state
  const [usageStats, setUsageStats] = useState<{
    totalGames: number;
    gamesThisWeek: number;
    gamesThisMonth: number;
    gamesToday: number;
    activeUsersToday: number;
    activeUsersWeek: number;
    activeUsersMonth: number;
    coachMemoryEntries: number;
    coachChatsToday: number;
    scheduledGames: number;
    videoClips: number;
    milestones: number;
    xpProgressEntries: number;
    xpEarnedToday: number;
    newUsersToday: number;
    usersByDay: { date: string; count: number }[];
    gamesByDay: { date: string; count: number }[];
    xpByDay: { date: string; total: number }[];
  }>({
    totalGames: 0, gamesThisWeek: 0, gamesThisMonth: 0, gamesToday: 0,
    activeUsersToday: 0, activeUsersWeek: 0, activeUsersMonth: 0,
    coachMemoryEntries: 0, coachChatsToday: 0, scheduledGames: 0, videoClips: 0,
    milestones: 0, xpProgressEntries: 0, xpEarnedToday: 0, newUsersToday: 0,
    usersByDay: [], gamesByDay: [], xpByDay: [],
  });

  // Usage date filter
  const [usageDateFilter, setUsageDateFilter] = useState<'today' | '7d' | '30d'>('7d');

  // Fetch users and reports
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch all user profiles
      const { data: usersData, error: usersError } = await supabase
        .from('player_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch content reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('content_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      // Fetch password reset requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('password_reset_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setPasswordRequests(requestsData || []);

      // Fetch user feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;
      setUserFeedback(feedbackData || []);

      // Fetch account approval requests
      const { data: approvalData, error: approvalError } = await supabase
        .from('account_approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (approvalError) throw approvalError;
      setApprovalRequests(approvalData || []);

      // Fetch plan overrides for all users
      const { data: overridesData } = await supabase
        .from('plan_overrides')
        .select('*');
      const overridesMap = new Map<string, any>();
      (overridesData || []).forEach((o: any) => overridesMap.set(o.user_id, o));
      setPlanOverrides(overridesMap);

      // Fetch usage stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        gamesAll, gamesWeek, gamesMonth, gamesTodayResult,
        coachMem, coachChatsToday, schedGames, clips, milestones, xpProg
      ] = await Promise.all([
        supabase.from('games').select('id', { count: 'exact', head: true }),
        supabase.from('games').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('games').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
        supabase.from('games').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('coach_memory').select('id', { count: 'exact', head: true }),
        supabase.from('coach_memory').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('scheduled_games').select('id', { count: 'exact', head: true }),
        supabase.from('video_clips').select('id', { count: 'exact', head: true }),
        supabase.from('player_milestones').select('id', { count: 'exact', head: true }),
        supabase.from('player_xp_progress').select('id', { count: 'exact', head: true }),
      ]);

      const [activeToday, activeWeek, activeMonth] = await Promise.all([
        supabase.from('games').select('user_id').gte('created_at', todayStart),
        supabase.from('games').select('user_id').gte('created_at', weekAgo),
        supabase.from('games').select('user_id').gte('created_at', monthAgo),
      ]);

      // XP earned today
      const { data: xpTodayData } = await supabase
        .from('player_xp_progress')
        .select('current_xp')
        .gte('updated_at', todayStart);
      const xpEarnedToday = (xpTodayData || []).reduce((sum, row) => sum + (row.current_xp || 0), 0);

      // New users today
      const newUsersToday = (usersData || []).filter(u => u.created_at >= todayStart).length;

      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const usersByDay: { date: string; count: number }[] = [];
      const gamesByDay: { date: string; count: number }[] = [];

      // Fetch games for sparkline
      const { data: recentGames } = await supabase
        .from('games')
        .select('created_at')
        .gte('created_at', twoWeeksAgo.toISOString())
        .order('created_at', { ascending: true });

      for (let d = 0; d < 14; d++) {
        const dayDate = new Date(twoWeeksAgo.getTime() + d * 24 * 60 * 60 * 1000);
        const dayStr = format(dayDate, 'MMM d');
        const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).toISOString();
        const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1).toISOString();
        const userCount = (usersData || []).filter(u => u.created_at >= dayStart && u.created_at < dayEnd).length;
        const gameCount = (recentGames || []).filter(g => g.created_at >= dayStart && g.created_at < dayEnd).length;
        usersByDay.push({ date: dayStr, count: userCount });
        gamesByDay.push({ date: dayStr, count: gameCount });
      }

      setUsageStats({
        totalGames: gamesAll.count || 0,
        gamesThisWeek: gamesWeek.count || 0,
        gamesThisMonth: gamesMonth.count || 0,
        gamesToday: gamesTodayResult.count || 0,
        activeUsersToday: new Set(activeToday.data?.map(g => g.user_id) || []).size,
        activeUsersWeek: new Set(activeWeek.data?.map(g => g.user_id) || []).size,
        activeUsersMonth: new Set(activeMonth.data?.map(g => g.user_id) || []).size,
        coachMemoryEntries: coachMem.count || 0,
        coachChatsToday: coachChatsToday.count || 0,
        scheduledGames: schedGames.count || 0,
        videoClips: clips.count || 0,
        milestones: milestones.count || 0,
        xpProgressEntries: xpProg.count || 0,
        xpEarnedToday,
        newUsersToday,
        usersByDay,
        gamesByDay,
        xpByDay: [], // placeholder for now
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  // Email lookup state (from auth system)
  const [authEmailMap, setAuthEmailMap] = useState<Map<string, string>>(new Map());

  // Fetch auth emails on mount (admin-only edge function)
  useEffect(() => {
    async function fetchAuthEmails() {
      try {
        const { data, error } = await supabase.functions.invoke('admin-user-emails');
        if (!error && data?.emailMap) {
          setAuthEmailMap(new Map(Object.entries(data.emailMap)));
        }
      } catch (e) {
        console.error('Failed to fetch auth emails:', e);
      }
    }
    fetchAuthEmails();
  }, []);

  // Create email lookup: auth emails take priority, then approval requests as fallback
  const userEmailMap = new Map<string, string | null>();
  approvalRequests.forEach(req => {
    userEmailMap.set(req.user_id, req.email);
  });
  // Override/fill from auth emails
  authEmailMap.forEach((email, userId) => {
    if (email) {
      userEmailMap.set(userId, email);
    }
  });

  // Filter users by search (including email)
  const filteredUsers = users.filter(user => {
    const email = userEmailMap.get(user.user_id) || '';
    return user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Update user profile
  async function handleUpdateUser() {
    if (!editingUser || !editName.trim()) return;

    // Validate username format if provided
    const trimmedUsername = editUsername.trim().toLowerCase();
    if (trimmedUsername && !/^[a-z0-9]+$/.test(trimmedUsername)) {
      toast.error('Username can only contain lowercase letters and numbers');
      return;
    }

    setSavingUser(true);
    try {
      // Check if username is taken by another user
      if (trimmedUsername && trimmedUsername !== editingUser.username) {
        const { data: existingUser, error: checkError } = await (supabase as any)
          .from('player_settings')
          .select('id')
          .eq('username', trimmedUsername)
          .neq('id', editingUser.id)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          toast.error('This username is already taken');
          setSavingUser(false);
          return;
        }
      }

      const { error } = await (supabase as any)
        .from('player_settings')
        .update({
          name: editName.trim(),
          team: editTeam.trim(),
          grade: editGrade,
          username: trimmedUsername || null,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === editingUser.id ? { 
          ...u, 
          name: editName.trim(),
          team: editTeam.trim(),
          grade: editGrade,
          username: trimmedUsername || null
        } : u
      ));
      toast.success('User profile updated');
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user profile');
    } finally {
      setSavingUser(false);
    }
  }

  const grades = ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'];

  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // Delete user completely (including auth.users entry)
  async function handleDeleteUser(userId: string, authUserId: string) {
    if (!confirm('Are you sure you want to COMPLETELY delete this user? This will remove their account, all games, clips, and data. They will be able to sign up again with the same email. This cannot be undone.')) return;

    setDeletingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId: authUserId },
      });

      if (error) throw new Error(error.message || 'Failed to delete user');
      if (!data?.success) throw new Error(data?.error || 'Failed to delete user');

      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User completely deleted - they can now sign up again');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setDeletingUser(null);
    }
  }

  // Fetch orphaned auth users
  async function fetchOrphanedUsers() {
    setLoadingOrphans(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-orphaned-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch orphaned users');

      setOrphanedUsers(data.orphanedUsers || []);
      setOrphansLoaded(true);
    } catch (error) {
      console.error('Error fetching orphaned users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch orphaned users');
    } finally {
      setLoadingOrphans(false);
    }
  }

  // Fetch subscription data from Stripe
  async function fetchSubscriptionData() {
    setLoadingSubscriptions(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-subscriptions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch subscriptions');
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch subscriptions');
    } finally {
      setLoadingSubscriptions(false);
    }
  }

  // Inline admin override change from users table
  async function handleConfirmedOverrideChange() {
    if (!pendingOverride) return;
    const { userId, newPlan } = pendingOverride;
    setUpdatingPlan(userId);
    setPendingOverride(null);
    try {
      const existing = planOverrides.get(userId);
      const overrideValue = newPlan === 'none' ? null : newPlan;
      if (existing) {
        const { error } = await supabase
          .from('plan_overrides')
          .update({
            admin_override_plan: overrideValue,
            updated_by: session?.user?.id || null,
          })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plan_overrides')
          .insert({
            user_id: userId,
            admin_override_plan: overrideValue,
            subscription_plan: 'free',
            updated_by: session?.user?.id || null,
          });
        if (error) throw error;
      }
      // Update local state
      setPlanOverrides(prev => {
        const next = new Map(prev);
        next.set(userId, { ...(existing || {}), user_id: userId, admin_override_plan: overrideValue });
        return next;
      });
      toast.success(overrideValue ? `Admin override set to ${overrideValue}` : 'Admin override removed');
    } catch (error) {
      console.error('Error updating admin override:', error);
      toast.error('Failed to update admin override');
    } finally {
      setUpdatingPlan(null);
    }
  }

  // Delete orphaned auth user (exists in auth.users but not in player_settings)
  async function handleDeleteOrphanUser(userId?: string) {
    const targetId = userId || orphanUserId.trim();
    if (!targetId) {
      toast.error('Please enter a user ID');
      return;
    }

    if (!confirm('Are you sure you want to delete this orphaned auth user? This will allow them to sign up again with the same email.')) return;

    setDeletingOrphan(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId: targetId },
      });

      if (error) throw new Error(error.message || 'Failed to delete orphan user');
      if (!data?.success) throw new Error(data?.error || 'Failed to delete orphan user');

      toast.success('Orphaned user deleted - they can now sign up again');
      setOrphanUserId('');
      // Remove from local state
      setOrphanedUsers(prev => prev.filter(u => u.id !== targetId));
    } catch (error) {
      console.error('Error deleting orphan user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete orphan user');
    } finally {
      setDeletingOrphan(false);
    }
  }

  // Request password reset via edge function
  async function handlePasswordReset(userEmail: string, userId: string) {
    setResettingPassword(userId);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ targetUserId: userId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send password reset');

      toast.success('Password reset email sent to user');
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send password reset');
    } finally {
      setResettingPassword(null);
    }
  }

  // Update report status
  async function handleUpdateReport(reportId: string, status: string) {
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({ 
          status, 
          admin_notes: adminNotes,
          reviewed_by: session?.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.map(r => 
        r.id === reportId ? { 
          ...r, 
          status, 
          admin_notes: adminNotes,
          reviewed_by: session?.user?.id || null,
          reviewed_at: new Date().toISOString()
        } : r
      ));
      toast.success('Report updated');
      setSelectedReport(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report');
    }
  }

  // Generate a random password
  function generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Handle password reset request approval
  async function handleApprovePasswordRequest(request: PasswordResetRequest) {
    if (!request.user_id) {
      toast.error('Cannot reset password: No user account found for this phone number');
      return;
    }

    setProcessingRequest(request.id);
    const newPassword = generateRandomPassword();

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          targetUserId: request.user_id,
          newPassword: newPassword
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');

      // Update the request status
      await supabase
        .from('password_reset_requests')
        .update({ 
          status: 'approved',
          reviewed_by: session?.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      setPasswordRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'approved', reviewed_at: new Date().toISOString() } : r
      ));
      
      setGeneratedPassword(newPassword);
      toast.success('Password reset successful! Copy the new password to share with the user.');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setProcessingRequest(null);
    }
  }

  // Dismiss password reset request
  async function handleDismissPasswordRequest(requestId: string) {
    try {
      await supabase
        .from('password_reset_requests')
        .update({ 
          status: 'dismissed',
          reviewed_by: session?.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      setPasswordRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status: 'dismissed', reviewed_at: new Date().toISOString() } : r
      ));
      toast.success('Request dismissed');
    } catch (error) {
      console.error('Error dismissing request:', error);
      toast.error('Failed to dismiss request');
    }
  }

  // Stats
  const pendingReports = reports.filter(r => r.status === 'pending').length;
  const pendingPasswordRequests = passwordRequests.filter(r => r.status === 'pending').length;
  const pendingApprovals = approvalRequests.filter(r => r.status === 'pending').length;
  const unreadFeedback = userFeedback.filter(f => f.status === 'unread').length;
  const totalUsers = users.length;
  const publicProfiles = users.filter(u => u.is_profile_public).length;

  // Handle approval request
  async function handleApproveUser(request: AccountApprovalRequest) {
    try {
      // Update player_settings to set is_approved = true
      const { error: settingsError } = await supabase
        .from('player_settings')
        .update({ is_approved: true })
        .eq('user_id', request.user_id);

      if (settingsError) throw settingsError;

      // Update the approval request status
      const { error: approvalError } = await supabase
        .from('account_approval_requests')
        .update({ 
          status: 'approved',
          reviewed_by: session?.user?.id,
          reviewed_at: new Date().toISOString(),
          approval_method: 'manual'
        } as any)
        .eq('id', request.id);

      if (approvalError) throw approvalError;

      // Send approval notification email if we have an email address
      if (request.email) {
        try {
          await supabase.functions.invoke('send-approval-email', {
            body: {
              userId: request.user_id,
              email: request.email,
              username: request.username,
            },
          });
        } catch (emailError) {
          console.error('Failed to send approval email:', emailError);
          // Don't fail the approval if email fails - just log it
        }
      }

      setApprovalRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'approved', reviewed_at: new Date().toISOString() } : r
      ));
      toast.success('User approved successfully!');
      dispatchSlackAlert({
        category: 'admin_audit',
        title: `User Approved: @${request.username || 'Unknown'}`,
        summary: `Admin approved account for ${request.email || 'unknown email'}.`,
        details: { Username: `@${request.username || 'Unknown'}`, Email: request.email || 'N/A' },
        dedup_key: `approve_${request.id}`,
      });
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  }

  // Reject approval request
  async function handleRejectUser(requestId: string) {
    try {
      const { error } = await supabase
        .from('account_approval_requests')
        .update({ 
          status: 'rejected',
          reviewed_by: session?.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      setApprovalRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, status: 'rejected', reviewed_at: new Date().toISOString() } : r
      ));
      toast.success('User rejected');
      dispatchSlackAlert({
        category: 'admin_audit',
        title: 'User Rejected',
        summary: `Admin rejected an account approval request.`,
        dedup_key: `reject_${requestId}`,
      });
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  }

  // Get user name for feedback display
  const getUserName = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user?.name || 'Unknown User';
  };

  // Handle feedback status update
  async function handleUpdateFeedback(feedbackId: string, status: string) {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ 
          status, 
          admin_notes: feedbackNotes || null,
          reviewed_by: session?.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', feedbackId);

      if (error) throw error;

      setUserFeedback(prev => prev.map(f => 
        f.id === feedbackId ? { 
          ...f, 
          status, 
          admin_notes: feedbackNotes || null,
          reviewed_by: session?.user?.id || null,
          reviewed_at: new Date().toISOString()
        } : f
      ));
      toast.success('Feedback updated');
      setSelectedFeedback(null);
      setFeedbackNotes('');
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Failed to update feedback');
    }
  }

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: 'General Feedback',
      feature: 'Feature Request',
      bug: 'Bug Report',
      other: 'Other',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview - Expanded Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Total Users
              <MetricHint tip="Total registered player profiles across all accounts." />
            </CardDescription>
            <CardTitle className="text-3xl">{totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" /> New Today
              <MetricHint tip="Users who created an account today (since midnight)." />
            </CardDescription>
            <CardTitle className="text-3xl">{usageStats.newUsersToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" /> DAU
              <MetricHint tip="Daily Active Users — unique users who logged a game today." />
            </CardDescription>
            <CardTitle className="text-3xl">{usageStats.activeUsersToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" /> WAU
              <MetricHint tip="Weekly Active Users — unique users who logged a game in the last 7 days." />
            </CardDescription>
            <CardTitle className="text-3xl">{usageStats.activeUsersWeek}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Games Today
              <MetricHint tip="Total game stat entries logged today across all users." />
            </CardDescription>
            <CardTitle className="text-3xl">{usageStats.gamesToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" /> Coach Chats Today
              <MetricHint tip="New Coach AI memory entries created today from user conversations." />
            </CardDescription>
            <CardTitle className="text-3xl">{usageStats.coachChatsToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> XP Today
              <MetricHint tip="Sum of current XP across all users active today. Reflects total accumulated XP, not just earned today." />
            </CardDescription>
            <CardTitle className="text-3xl">{usageStats.xpEarnedToday.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Public Profiles
              <MetricHint tip="Players who enabled public visibility on their profile, making it discoverable by others." />
            </CardDescription>
            <CardTitle className="text-3xl">{publicProfiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Pending Reports
              <MetricHint tip="Content reports flagged by users (e.g. inappropriate AI responses) awaiting admin review." />
            </CardDescription>
            <CardTitle className="text-3xl text-destructive">{pendingReports}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              Unread Feedback
              <MetricHint tip="User-submitted feedback messages from Settings that haven't been reviewed by an admin." />
            </CardDescription>
            <CardTitle className="text-3xl text-primary">{unreadFeedback}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* System Health */}
      <AdminSystemHealth />

      <Tabs defaultValue="approvals" className="space-y-4">
        <div className="relative">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent pb-1 sm:pb-0">
            <TabsList className="w-max min-w-full h-auto gap-1 p-1 sm:w-full sm:flex-nowrap md:h-10">
          <TabsTrigger value="approvals" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0">
            <UserCheck className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Approvals</span>
            <span className="sm:hidden">Approve</span>
            {pendingApprovals > 0 && (
              <Badge variant="destructive" className="ml-0.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center md:h-5 md:w-auto md:px-1.5">{pendingApprovals}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0">
            <Users className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0">
            <Flag className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Reports</span>
            <span className="sm:hidden">Flag</span>
            {pendingReports > 0 && (
              <Badge variant="destructive" className="ml-0.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center md:h-5 md:w-auto md:px-1.5">{pendingReports}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="password-requests" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0">
            <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Password</span>
            <span className="sm:hidden">Pass</span>
            {pendingPasswordRequests > 0 && (
              <Badge variant="destructive" className="ml-0.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center md:h-5 md:w-auto md:px-1.5">{pendingPasswordRequests}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0">
            <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Feedback</span>
            <span className="sm:hidden">Feed</span>
            {unreadFeedback > 0 && (
              <Badge variant="destructive" className="ml-0.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center md:h-5 md:w-auto md:px-1.5">{unreadFeedback}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0 whitespace-nowrap">
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Usage</span>
            <span className="sm:hidden">Use</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0 whitespace-nowrap">
            <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Metrics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0 whitespace-nowrap">
            <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Access</span>
            <span className="sm:hidden">Plan</span>
          </TabsTrigger>
          
          <TabsTrigger value="leaderboards" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0 whitespace-nowrap">
            <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Leaders</span>
            <span className="sm:hidden">Top</span>
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0 whitespace-nowrap">
            <ToggleLeft className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Flags</span>
            <span className="sm:hidden">Flags</span>
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0 whitespace-nowrap">
            <Megaphone className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Broadcast</span>
            <span className="sm:hidden">Msg</span>
          </TabsTrigger>
          <TabsTrigger value="slack" className="gap-1.5 text-xs px-2 py-1.5 md:text-sm md:px-3 md:py-2 flex-1 min-w-0 whitespace-nowrap">
            <Bell className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="hidden sm:inline">Slack</span>
            <span className="sm:hidden">Slack</span>
          </TabsTrigger>
            </TabsList>
          </div>
          {/* Scroll indicator - fades on right edge when scrollable */}
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-muted to-transparent pointer-events-none sm:hidden" aria-hidden="true" />
        </div>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          {/* Approval Mode Selector */}
          <ApprovalModeSelector session={session} />

          {approvalRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No account approval requests yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Pending Approvals - Action Required */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400">
                    Action Required ({approvalRequests.filter(r => r.status === 'pending').length})
                  </h3>
                </div>
                
                {approvalRequests.filter(r => r.status === 'pending').length === 0 ? (
                  <Card className="border-dashed border-muted-foreground/30">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">All caught up! No pending requests.</p>
                    </CardContent>
                  </Card>
                ) : (
                  approvalRequests.filter(r => r.status === 'pending').map((request) => (
                    <Card key={request.id} className="border-2 border-amber-500/50 bg-amber-500/5">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-500 text-white hover:bg-amber-600">
                                New Request
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                              </span>
                            </div>
                            <div className="font-medium">
                              {request.email || 'No email'}
                            </div>
                            {request.username && (
                              <div className="text-sm text-muted-foreground">
                                @{request.username}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRejectUser(request.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApproveUser(request)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* History - Collapsible */}
              {approvalRequests.filter(r => r.status !== 'pending').length > 0 && (
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        <span className="text-sm font-medium">
                          History ({approvalRequests.filter(r => r.status !== 'pending').length})
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {approvalRequests.filter(r => r.status !== 'pending').map((request) => (
                      <Card key={request.id} className="bg-muted/30 border-muted">
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline"
                                  className={request.status === 'approved' 
                                    ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                                    : 'bg-destructive/10 text-destructive border-destructive/30'
                                  }
                                >
                                  {request.status === 'approved' ? 'Approved' : 'Rejected'}
                                </Badge>
                                {(request as any).approval_method && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {(request as any).approval_method === 'auto' ? '⚡ Auto' : (request as any).approval_method === 'conditional_flagged' ? '🚩 Flagged' : '👤 Manual'}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {request.reviewed_at && format(new Date(request.reviewed_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {request.email || 'No email'}
                                {request.username && ` (@${request.username})`}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {/* Orphaned Users Detection */}
          <Card className="border-amber-500/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Orphaned Auth Users
              </CardTitle>
              <CardDescription className="text-xs">
                Users in Cloud auth without application records (can't use the app properly)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={fetchOrphanedUsers}
                  disabled={loadingOrphans}
                >
                  {loadingOrphans ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Scan for Orphaned Users
                    </>
                  )}
                </Button>
                {orphansLoaded && (
                  <span className="text-sm text-muted-foreground">
                    Found {orphanedUsers.length} orphaned user{orphanedUsers.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {orphanedUsers.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-left p-2 font-medium">Provider</th>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Created</th>
                        <th className="text-right p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orphanedUsers.map((orphan) => (
                        <tr key={orphan.id} className="border-t">
                          <td className="p-2">
                            <div className="font-mono text-xs">{orphan.email || orphan.phone || 'N/A'}</div>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {orphan.provider}
                            </Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {orphan.user_metadata?.full_name || orphan.user_metadata?.name || '—'}
                          </td>
                          <td className="p-2 text-muted-foreground text-xs">
                            {format(new Date(orphan.created_at), 'MMM d, yyyy')}
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
                              onClick={() => handleDeleteOrphanUser(orphan.id)}
                              disabled={deletingOrphan}
                            >
                              {deletingOrphan ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Manual fallback */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Manual UUID Entry
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter auth user ID (UUID)"
                      value={orphanUserId}
                      onChange={(e) => setOrphanUserId(e.target.value)}
                      className="max-w-md font-mono text-sm"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteOrphanUser()}
                      disabled={deletingOrphan || !orphanUserId.trim()}
                    >
                      {deletingOrphan ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Plan distribution summary (by effective plan) */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(['free', 'pro', 'elite'] as const).map(plan => {
              const count = users.filter(u => {
                const o = planOverrides.get(u.user_id);
                const access: UserAccessInfo = {
                  subscriptionPlan: (o?.subscription_plan || 'free') as PlanId,
                  isGrandfathered: o?.is_grandfathered || false,
                  adminOverridePlan: o?.admin_override_plan || null,
                  promoAccessUntil: o?.promo_access_until || null,
                  promoEligible: o?.promo_eligible || false,
                  promoType: o?.promo_type || null,
                  promoLockedIn: o?.promo_locked_in || false,
                  promoStartDate: o?.promo_start_date || null,
                  promoSource: o?.promo_source || null,
                };
                return getEffectivePlan(access) === plan;
              }).length;
              return (
                <span key={plan} className="flex items-center gap-1">
                  <span className="capitalize font-medium text-foreground">{plan}</span>
                  <Badge variant="outline" className="h-5 text-[10px]">{count}</Badge>
                </span>
              );
            })}
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" />
              <span className="font-medium text-foreground">Founders</span>
              <Badge variant="outline" className="h-5 text-[10px]">
                {users.filter(u => planOverrides.get(u.user_id)?.is_grandfathered).length}
              </Badge>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Plan</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Team</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Grade</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Public</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Joined</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const userOverride = planOverrides.get(user.user_id);
                  const isUserGrandfathered = userOverride?.is_grandfathered || false;
                  const hasAdminOverride = !!userOverride?.admin_override_plan;
                  const isPromoLocked = userOverride?.promo_locked_in || false;
                  const userAccess: UserAccessInfo = {
                    subscriptionPlan: (userOverride?.subscription_plan || 'free') as PlanId,
                    isGrandfathered: isUserGrandfathered,
                    adminOverridePlan: userOverride?.admin_override_plan || null,
                    promoAccessUntil: userOverride?.promo_access_until || null,
                    promoEligible: userOverride?.promo_eligible || false,
                    promoType: userOverride?.promo_type || null,
                    promoLockedIn: isPromoLocked,
                    promoStartDate: userOverride?.promo_start_date || null,
                    promoSource: userOverride?.promo_source || null,
                  };
                  const effectivePlan = getEffectivePlan(userAccess);
                  const currentPlan = effectivePlan;

                  return (
                    <tr key={user.id} className="border-t">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          {user.display_name && (
                            <div className="text-xs text-muted-foreground">@{user.display_name}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground max-w-[200px] truncate" title={userEmailMap.get(user.user_id) || ''}>
                          {userEmailMap.get(user.user_id) || '—'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{planCatalog[effectivePlan].name}</span>
                            <Select
                              value={userOverride?.admin_override_plan || 'none'}
                              onValueChange={(val) => setPendingOverride({
                                userId: user.user_id,
                                userName: user.display_name || user.name,
                                currentPlan: effectivePlan,
                                newPlan: val,
                              })}
                              disabled={updatingPlan === user.user_id}
                            >
                              <SelectTrigger className="h-7 text-xs w-[110px]">
                                {updatingPlan === user.user_id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <SelectValue placeholder="Override..." />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Override</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="elite">Elite</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {isUserGrandfathered && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
                                <Star className="w-2.5 h-2.5" /> Founder
                              </Badge>
                            )}
                            {hasAdminOverride && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                Override: {userOverride.admin_override_plan}
                              </Badge>
                            )}
                            {isPromoLocked && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 text-primary border-primary/30">
                                Promo 🔒
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{user.team}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{user.grade}</td>
                      <td className="p-3 hidden lg:table-cell">
                        {user.is_profile_public ? (
                          <Badge variant="secondary">Public</Badge>
                        ) : (
                          <Badge variant="outline">Private</Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-sm hidden md:table-cell">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditName(user.name);
                                  setEditTeam(user.team);
                                  setEditGrade(user.grade);
                                  setEditUsername(user.username || '');
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User Profile</DialogTitle>
                                <DialogDescription>
                                  Update profile details for this user.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Name</Label>
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Player Name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Team</Label>
                                  <Input
                                    value={editTeam}
                                    onChange={(e) => setEditTeam(e.target.value)}
                                    placeholder="Team Name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Grade</Label>
                                  <Select value={editGrade} onValueChange={setEditGrade}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {grades.map((grade) => (
                                        <SelectItem key={grade} value={grade}>
                                          {grade}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Profile URL</Label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">hoopjournal.me/</span>
                                    <Input
                                      value={editUsername}
                                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                      placeholder="username"
                                      className="flex-1"
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Only lowercase letters and numbers allowed
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={handleUpdateUser} disabled={savingUser}>
                                  {savingUser ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    'Save Changes'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePasswordReset('', user.user_id)}
                            disabled={resettingPassword === user.user_id}
                          >
                            {resettingPassword === user.user_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Key className="w-4 h-4" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(user.id, user.user_id)}
                            disabled={deletingUser === user.id}
                          >
                            {deletingUser === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Flag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No content reports yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className={report.status === 'pending' ? 'border-destructive/50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          report.status === 'pending' ? 'destructive' :
                          report.status === 'reviewed' ? 'secondary' :
                          report.status === 'action_taken' ? 'default' : 'outline'
                        }>
                          {report.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {report.status === 'pending' && (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">User Message</Label>
                      <p className="text-sm bg-muted p-2 rounded mt-1">{report.reported_content}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">AI Response (Reported)</Label>
                      <p className="text-sm bg-muted p-2 rounded mt-1 max-h-32 overflow-y-auto">{report.ai_response}</p>
                    </div>
                    {report.reason && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <p className="text-sm">{report.reason}</p>
                      </div>
                    )}
                    {report.admin_notes && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                        <p className="text-sm">{report.admin_notes}</p>
                      </div>
                    )}

                    {report.status === 'pending' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSelectedReport(report);
                              setAdminNotes('');
                            }}
                          >
                            Review Report
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Review Content Report</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Admin Notes</Label>
                              <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add notes about this report..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Action</Label>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleUpdateReport(report.id, 'dismissed')}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Dismiss
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleUpdateReport(report.id, 'reviewed')}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Mark Reviewed
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="flex-1"
                                  onClick={() => handleUpdateReport(report.id, 'action_taken')}
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  Action Taken
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Password Requests Tab */}
        <TabsContent value="password-requests" className="space-y-4">
          {passwordRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No password reset requests yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {passwordRequests.map((request) => (
                <Card key={request.id} className={request.status === 'pending' ? 'border-amber-500/50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          request.status === 'pending' ? 'secondary' :
                          request.status === 'approved' ? 'default' : 'outline'
                        } className={request.status === 'pending' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' : ''}>
                          {request.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {request.status === 'pending' && (
                        <Key className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone Number</Label>
                        <p className="text-sm font-medium">{request.phone}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Player Name</Label>
                        <p className="text-sm font-medium">{request.player_name || 'Not provided'}</p>
                      </div>
                    </div>
                    {request.user_id && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Account Status</Label>
                        <p className="text-sm text-primary">✓ User account found</p>
                      </div>
                    )}
                    {!request.user_id && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Account Status</Label>
                        <p className="text-sm text-destructive">✗ No account found with this phone number</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleDismissPasswordRequest(request.id)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Dismiss
                        </Button>
                        <Button
                          onClick={() => handleApprovePasswordRequest(request)}
                          disabled={!request.user_id || processingRequest === request.id}
                        >
                          {processingRequest === request.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          Reset Password
                        </Button>
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <div className="text-sm text-muted-foreground">
                        Password was reset on {request.reviewed_at && format(new Date(request.reviewed_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Generated Password Dialog */}
          <Dialog open={!!generatedPassword} onOpenChange={(open) => !open && setGeneratedPassword(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Password Reset Successful</DialogTitle>
                <DialogDescription>
                  Share this temporary password with the user. They should change it after logging in.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                  <code className="flex-1 font-mono text-lg">{generatedPassword}</code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword || '');
                      toast.success('Password copied to clipboard');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  ⚠️ This password will not be shown again. Make sure to share it with the user now.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => setGeneratedPassword(null)}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          {userFeedback.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No user feedback yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {userFeedback.map((feedback) => (
                <Card key={feedback.id} className={feedback.status === 'unread' ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          feedback.status === 'unread' ? 'default' :
                          feedback.status === 'read' ? 'secondary' :
                          feedback.status === 'addressed' ? 'outline' : 'outline'
                        }>
                          {feedback.status}
                        </Badge>
                        <Badge variant="outline">
                          {getCategoryLabel(feedback.category)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(feedback.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {feedback.status === 'unread' && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <p className="text-sm font-medium">{getUserName(feedback.user_id)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Message</Label>
                      <p className="text-sm bg-muted p-3 rounded mt-1">{feedback.message}</p>
                    </div>
                    {feedback.admin_notes && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                        <p className="text-sm">{feedback.admin_notes}</p>
                      </div>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setFeedbackNotes(feedback.admin_notes || '');
                          }}
                        >
                          {feedback.status === 'unread' ? 'Review Feedback' : 'Update Status'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review Feedback</DialogTitle>
                          <DialogDescription>
                            Update the status and add notes for this feedback.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Category</Label>
                            <p className="text-sm font-medium">{getCategoryLabel(feedback.category)}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Message</Label>
                            <p className="text-sm bg-muted p-2 rounded mt-1">{feedback.message}</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Admin Notes</Label>
                            <Textarea
                              value={feedbackNotes}
                              onChange={(e) => setFeedbackNotes(e.target.value)}
                              placeholder="Add notes about this feedback..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Action</Label>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleUpdateFeedback(feedback.id, 'read')}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Mark as Read
                              </Button>
                              <Button
                                variant="default"
                                className="flex-1"
                                onClick={() => handleUpdateFeedback(feedback.id, 'addressed')}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Mark as Addressed
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Usage Dashboard Tab */}
        <TabsContent value="usage" className="space-y-6">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            {(['today', '7d', '30d'] as const).map((f) => (
              <Button
                key={f}
                variant={usageDateFilter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUsageDateFilter(f)}
              >
                {f === 'today' ? 'Today' : f === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </Button>
            ))}
          </div>

          {/* Active Users */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Active Users
              <MetricHint tip="Users who logged at least one game during the selected time period. Based on game creation timestamps." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className={usageDateFilter === 'today' ? 'border-primary/50' : ''}>
                <CardHeader className="pb-2">
                  <CardDescription>Today</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {usageStats.activeUsersToday}
                    <span className="text-xs font-normal text-muted-foreground">/ {totalUsers}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={totalUsers > 0 ? (usageStats.activeUsersToday / totalUsers) * 100 : 0} className="h-2" />
                </CardContent>
              </Card>
              <Card className={usageDateFilter === '7d' ? 'border-primary/50' : ''}>
                <CardHeader className="pb-2">
                  <CardDescription>This Week</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {usageStats.activeUsersWeek}
                    <span className="text-xs font-normal text-muted-foreground">/ {totalUsers}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={totalUsers > 0 ? (usageStats.activeUsersWeek / totalUsers) * 100 : 0} className="h-2" />
                </CardContent>
              </Card>
              <Card className={usageDateFilter === '30d' ? 'border-primary/50' : ''}>
                <CardHeader className="pb-2">
                  <CardDescription>This Month</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {usageStats.activeUsersMonth}
                    <span className="text-xs font-normal text-muted-foreground">/ {totalUsers}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={totalUsers > 0 ? (usageStats.activeUsersMonth / totalUsers) * 100 : 0} className="h-2" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feature Usage Counts */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Feature Usage
              <MetricHint tip="Counts of key features used during the selected period. Helps identify which features drive engagement." />
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card>
                <CardHeader className="pb-2">
                   <CardDescription className="flex items-center gap-1.5">
                    Games Logged
                    <MetricHint tip="Total game stat entries created by users in this period." />
                  </CardDescription>
                  <CardTitle className="text-2xl">
                    {usageDateFilter === 'today' ? usageStats.gamesToday
                      : usageDateFilter === '7d' ? usageStats.gamesThisWeek
                      : usageStats.gamesThisMonth}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                   <CardDescription className="flex items-center gap-1.5">
                    Coach AI Chats
                    <MetricHint tip="Total Coach AI memory entries stored. Each memory captures a key insight from a user's chat conversation." />
                  </CardDescription>
                  <CardTitle className="text-2xl">{usageStats.coachMemoryEntries}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                   <CardDescription className="flex items-center gap-1.5">
                    XP Earned
                    <MetricHint tip="Sum of current XP values for users active today. Represents total accumulated XP, not daily delta." />
                  </CardDescription>
                  <CardTitle className="text-2xl">{usageStats.xpEarnedToday.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Public Profiles</CardDescription>
                  <CardTitle className="text-2xl">{publicProfiles}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                   <CardDescription className="flex items-center gap-1.5">
                    Video Clips
                    <MetricHint tip="Total video clips uploaded by all users to the platform." />
                  </CardDescription>
                  <CardTitle className="text-2xl">{usageStats.videoClips}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* AI Credit Consumption */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> AI Credit Consumption
              <MetricHint tip="Estimates of AI API usage. Each coach chat, post-game recap, and memory extraction consumes AI credits." />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" /> Coach Memories
                    <MetricHint tip="Persistent memory entries extracted from Coach AI conversations. Each entry uses an AI call to extract and store." />
                  </CardDescription>
                  <CardTitle className="text-2xl">{usageStats.coachMemoryEntries}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">Total memory entries stored</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" /> AI Recaps (est.)
                    <MetricHint tip="Estimated AI-generated post-game recaps. Assumes ~1 recap per game logged. Each recap uses an AI call." />
                  </CardDescription>
                  <CardTitle className="text-2xl">{usageStats.totalGames}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">Based on total games logged</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                   <CardDescription className="flex items-center gap-1.5">
                    Milestones Earned
                    <MetricHint tip="Total milestone achievements unlocked across all users (e.g. first double-double, 100 points scored)." />
                  </CardDescription>
                  <CardTitle className="text-2xl">{usageStats.milestones}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                   <CardDescription className="flex items-center gap-1.5">
                    Scheduled Games
                    <MetricHint tip="Total upcoming games added to user schedules. Includes past scheduled games that were never deleted." />
                  </CardDescription>
                  <CardTitle className="text-2xl">{usageStats.scheduledGames}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Approval Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approval Funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{approvalRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Signups</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{approvalRequests.filter(r => r.status === 'approved').length}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{pendingApprovals}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {approvalRequests.length > 0
                      ? Math.round((approvalRequests.filter(r => r.status === 'approved').length / approvalRequests.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Approval Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sparklines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Signups — Last 14 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-24">
                  {usageStats.usersByDay.map((day) => {
                    const maxCount = Math.max(...usageStats.usersByDay.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.count}`}>
                        <span className="text-[9px] text-muted-foreground">{day.count > 0 ? day.count : ''}</span>
                        <div
                          className="w-full rounded-t bg-primary/80 min-h-[2px] transition-all"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                        <span className="text-[8px] text-muted-foreground truncate w-full text-center">{day.date.split(' ')[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Games Logged — Last 14 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-24">
                  {usageStats.gamesByDay.map((day) => {
                    const maxCount = Math.max(...usageStats.gamesByDay.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.count}`}>
                        <span className="text-[9px] text-muted-foreground">{day.count > 0 ? day.count : ''}</span>
                        <div
                          className="w-full rounded-t bg-accent min-h-[2px] transition-all"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                        <span className="text-[8px] text-muted-foreground truncate w-full text-center">{day.date.split(' ')[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                User Growth
              </CardTitle>
              <CardDescription>Monthly user signups</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const monthData = Object.entries(
                  users.reduce((acc, user) => {
                    const month = format(new Date(user.created_at), 'MMM yyyy');
                    acc[month] = (acc[month] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).slice(-8);
                const maxVal = Math.max(...monthData.map(([, c]) => c), 1);
                return (
                  <div className="space-y-4">
                    <div className="flex items-end gap-2 h-32">
                      {monthData.map(([month, count]) => {
                        const height = (count / maxVal) * 100;
                        return (
                          <div key={month} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-medium">{count}</span>
                            <div
                              className="w-full rounded-t bg-primary/80 min-h-[4px] transition-all"
                              style={{ height: `${Math.max(height, 3)}%` }}
                            />
                            <span className="text-[10px] text-muted-foreground truncate w-full text-center">{month.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total: {totalUsers} users</span>
                      <span>Latest: {monthData[monthData.length - 1]?.[1] || 0} this month</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Games & XP Growth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Games Logged Over Time
                </CardTitle>
                <CardDescription>Total games: {usageStats.totalGames}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Today</span>
                    <span className="font-medium">{usageStats.gamesToday}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">This Week</span>
                    <span className="font-medium">{usageStats.gamesThisWeek}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">This Month</span>
                    <span className="font-medium">{usageStats.gamesThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">All Time</span>
                    <span className="font-medium">{usageStats.totalGames}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Coach AI Usage
                </CardTitle>
                <CardDescription>AI interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coach Chats Today</span>
                    <span className="font-medium">{usageStats.coachChatsToday}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Memories</span>
                    <span className="font-medium">{usageStats.coachMemoryEntries}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Est. AI Recaps</span>
                    <span className="font-medium">{usageStats.totalGames}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">XP Entries</span>
                    <span className="font-medium">{usageStats.xpProgressEntries}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Users by grade level</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const gradeData = Object.entries(
                    users.reduce((acc, user) => {
                      acc[user.grade] = (acc[user.grade] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]);
                  const maxVal = Math.max(...gradeData.map(([, c]) => c), 1);
                  return (
                    <div className="space-y-2">
                      {gradeData.map(([grade, count]) => (
                        <div key={grade} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{grade}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <Progress value={(count / maxVal) * 100} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Position Distribution</CardTitle>
                <CardDescription>Users by position</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const posData = Object.entries(
                    users.reduce((acc, user) => {
                      acc[user.position] = (acc[user.position] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]);
                  const maxVal = Math.max(...posData.map(([, c]) => c), 1);
                  return (
                    <div className="space-y-2">
                      {posData.map(([position, count]) => (
                        <div key={position} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{position}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <Progress value={(count / maxVal) * 100} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report Status</CardTitle>
                <CardDescription>Content reports by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    reports.reduce((acc, report) => {
                      acc[report.status] = (acc[report.status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">{status.replace('_', ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p className="text-sm text-muted-foreground">No reports yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback Summary</CardTitle>
                <CardDescription>Feedback by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    userFeedback.reduce((acc, f) => {
                      acc[f.status] = (acc[f.status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">{status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  {userFeedback.length === 0 && (
                    <p className="text-sm text-muted-foreground">No feedback yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Access Controls Tab */}
        <TabsContent value="access" className="space-y-4">
          <AdminAccessControls users={users} approvalRequests={approvalRequests} />
        </TabsContent>



        {/* Leaderboards Tab */}
        <TabsContent value="leaderboards">
          <AdminLeaderboards />
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="flags" className="space-y-4">
          <AdminFeatureFlags />
        </TabsContent>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast" className="space-y-4">
          <AdminBroadcast />
        </TabsContent>

        {/* Slack Alerts Tab */}
        <TabsContent value="slack" className="space-y-4">
          <AdminSlackAlerts />
        </TabsContent>
      </Tabs>

      {/* Admin Override Confirmation Dialog */}
      <AlertDialog open={!!pendingOverride} onOpenChange={(open) => !open && setPendingOverride(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Admin Override</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingOverride?.newPlan === 'none' ? (
                <>Remove the admin override for <strong>{pendingOverride?.userName}</strong>? They will revert to their base subscription plan.</>
              ) : (
                <>Set an admin override of <strong className="capitalize">{pendingOverride?.newPlan}</strong> for <strong>{pendingOverride?.userName}</strong>? This overrides their billing plan without affecting their Stripe subscription.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedOverrideChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
