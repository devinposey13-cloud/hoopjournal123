import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Search, Shield, Star, Loader2, Calendar as CalendarIcon, Trash2, Crown, Users } from 'lucide-react';
import { type PlanId, planCatalog, getEffectivePlan, PRICING_LAUNCH_DATE, type UserAccessInfo } from '@/lib/plans';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PlanOverrideRecord {
  id: string;
  user_id: string;
  is_grandfathered: boolean;
  admin_override_plan: string | null;
  promo_access_until: string | null;
  subscription_plan: string;
  updated_at: string;
  updated_by: string | null;
  created_at: string;
}

interface AdminAccessControlsProps {
  users: Array<{
    id: string;
    user_id: string;
    name: string;
    team: string;
    display_name: string | null;
    username?: string | null;
  }>;
  approvalRequests: Array<{
    user_id: string;
    email: string | null;
  }>;
}

export function AdminAccessControls({ users, approvalRequests }: AdminAccessControlsProps) {
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [override, setOverride] = useState<PlanOverrideRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ grandfathered: number; total: number } | null>(null);

  // Editable fields
  const [isGrandfathered, setIsGrandfathered] = useState(false);
  const [adminOverridePlan, setAdminOverridePlan] = useState<string>('none');
  const [promoDate, setPromoDate] = useState<Date | undefined>(undefined);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free');

  const userEmailMap = new Map<string, string | null>();
  approvalRequests.forEach(req => {
    userEmailMap.set(req.user_id, req.email);
  });

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return false;
    const email = userEmailMap.get(user.user_id) || '';
    return user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username?.toLowerCase() || '').includes(searchQuery.toLowerCase());
  });

  // Fetch override for selected user
  useEffect(() => {
    if (!selectedUserId) {
      setOverride(null);
      return;
    }

    async function fetchOverride() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('plan_overrides')
          .select('*')
          .eq('user_id', selectedUserId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const rec = data as unknown as PlanOverrideRecord;
          setOverride(rec);
          setIsGrandfathered(rec.is_grandfathered);
          setAdminOverridePlan(rec.admin_override_plan || 'none');
          setPromoDate(rec.promo_access_until ? new Date(rec.promo_access_until) : undefined);
          setSubscriptionPlan(rec.subscription_plan);
        } else {
          setOverride(null);
          setIsGrandfathered(false);
          setAdminOverridePlan('none');
          setPromoDate(undefined);
          setSubscriptionPlan('free');
        }
      } catch (err) {
        console.error('Error fetching override:', err);
        toast.error('Failed to load plan override');
      } finally {
        setLoading(false);
      }
    }

    fetchOverride();
  }, [selectedUserId]);

  const selectedUser = users.find(u => u.user_id === selectedUserId);
  const selectedEmail = selectedUserId ? userEmailMap.get(selectedUserId) : null;

  const effectiveAccess: UserAccessInfo = {
    subscriptionPlan: subscriptionPlan as PlanId,
    isGrandfathered,
    adminOverridePlan: adminOverridePlan !== 'none' ? adminOverridePlan as PlanId : null,
    promoAccessUntil: promoDate ? promoDate.toISOString() : null,
  };
  const effectivePlan = getEffectivePlan(effectiveAccess);

  async function handleSave() {
    if (!selectedUserId) return;
    setSaving(true);

    const payload = {
      user_id: selectedUserId,
      is_grandfathered: isGrandfathered,
      admin_override_plan: adminOverridePlan !== 'none' ? adminOverridePlan : null,
      promo_access_until: promoDate ? promoDate.toISOString() : null,
      subscription_plan: subscriptionPlan,
      updated_by: session?.user?.id || null,
    };

    try {
      if (override) {
        const { error } = await supabase
          .from('plan_overrides')
          .update(payload)
          .eq('id', override.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plan_overrides')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Access controls updated');
      // Refetch
      const { data } = await supabase
        .from('plan_overrides')
        .select('*')
        .eq('user_id', selectedUserId)
        .maybeSingle();
      if (data) setOverride(data as unknown as PlanOverrideRecord);
    } catch (err) {
      console.error('Error saving override:', err);
      toast.error('Failed to save access controls');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveOverride() {
    if (!override) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('plan_overrides')
        .delete()
        .eq('id', override.id);
      if (error) throw error;

      setOverride(null);
      setIsGrandfathered(false);
      setAdminOverridePlan('none');
      setPromoDate(undefined);
      setSubscriptionPlan('free');
      toast.success('Override removed — user reverted to default');
    } catch (err) {
      console.error('Error removing override:', err);
      toast.error('Failed to remove override');
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkGrandfather() {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      // Get all users from player_settings created before launch date
      const { data: earlyUsers, error: fetchError } = await supabase
        .from('player_settings')
        .select('user_id, created_at')
        .lt('created_at', PRICING_LAUNCH_DATE);

      if (fetchError) throw fetchError;
      if (!earlyUsers || earlyUsers.length === 0) {
        toast.info('No users found created before the pricing launch date');
        setBulkLoading(false);
        return;
      }

      // Get existing plan_overrides
      const { data: existing } = await supabase
        .from('plan_overrides')
        .select('user_id, is_grandfathered');

      const existingMap = new Map((existing || []).map(e => [e.user_id, e.is_grandfathered]));

      let grandfatheredCount = 0;

      for (const user of earlyUsers) {
        const alreadyGrandfathered = existingMap.get(user.user_id);
        if (alreadyGrandfathered === true) continue; // already done

        if (existingMap.has(user.user_id)) {
          // Update existing row
          await supabase
            .from('plan_overrides')
            .update({ is_grandfathered: true, updated_by: session?.user?.id || null })
            .eq('user_id', user.user_id);
        } else {
          // Insert new row
          await supabase
            .from('plan_overrides')
            .insert({
              user_id: user.user_id,
              is_grandfathered: true,
              subscription_plan: 'free',
              updated_by: session?.user?.id || null,
            });
        }
        grandfatheredCount++;
      }

      setBulkResult({ grandfathered: grandfatheredCount, total: earlyUsers.length });
      toast.success(`Grandfathered ${grandfatheredCount} user(s) as Founding Members`);
    } catch (err) {
      console.error('Bulk grandfather error:', err);
      toast.error('Failed to bulk grandfather users');
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Bulk Grandfather Action */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            Bulk Grandfather
          </CardTitle>
          <CardDescription>
            Grant Founding Member status to all users created before {format(new Date(PRICING_LAUNCH_DATE), 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bulkResult && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><strong>{bulkResult.grandfathered}</strong> user(s) newly grandfathered out of <strong>{bulkResult.total}</strong> eligible.</p>
              {bulkResult.grandfathered === 0 && <p className="text-muted-foreground text-xs mt-1">All eligible users were already grandfathered.</p>}
            </div>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full" disabled={bulkLoading}>
                {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-2 text-amber-500" />}
                Grandfather All Early Users
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bulk Grandfather Confirmation</AlertDialogTitle>
                <AlertDialogDescription>
                  This will grant <strong>Founding Member</strong> (full Elite access) to every user created before {format(new Date(PRICING_LAUNCH_DATE), 'PPP')}. Users already grandfathered will be skipped.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkGrandfather}>Grandfather All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            User Access Controls
          </CardTitle>
          <CardDescription>Manage grandfathered status, plan overrides, and promotional access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchQuery.trim() && filteredUsers.length > 0 && (
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {filteredUsers.slice(0, 10).map(user => (
                <button
                  key={user.user_id}
                  onClick={() => {
                    setSelectedUserId(user.user_id);
                    setSearchQuery('');
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors text-sm",
                    selectedUserId === user.user_id && "bg-primary/10"
                  )}
                >
                  <div className="font-medium">{user.display_name || user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {userEmailMap.get(user.user_id) || user.username || 'No email'}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim() && filteredUsers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No users found</p>
          )}
        </CardContent>
      </Card>

      {/* Selected user controls */}
      {selectedUserId && selectedUser && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedUser.display_name || selectedUser.name}</CardTitle>
                <CardDescription>{selectedEmail || selectedUser.username || 'No email'}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  {planCatalog[effectivePlan].name}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Grandfathered toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      Founding Member
                    </Label>
                    <p className="text-xs text-muted-foreground">Full Elite access as an early supporter</p>
                  </div>
                  <Switch
                    checked={isGrandfathered}
                    onCheckedChange={setIsGrandfathered}
                  />
                </div>

                <Separator />

                {/* Subscription plan */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subscription Plan</Label>
                  <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">Starter ($8/mo)</SelectItem>
                      <SelectItem value="pro">Pro ($19/mo)</SelectItem>
                      <SelectItem value="elite">Elite ($49/mo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Admin override */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Admin Override Plan</Label>
                  <p className="text-xs text-muted-foreground">Grant a higher plan without a subscription</p>
                  <Select value={adminOverridePlan} onValueChange={setAdminOverridePlan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No override</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Promo access */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Promotional Access Until</Label>
                  <p className="text-xs text-muted-foreground">Grant temporary Elite access until a specific date</p>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal flex-1", !promoDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {promoDate ? format(promoDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={promoDate}
                          onSelect={setPromoDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {promoDate && (
                      <Button variant="ghost" size="sm" onClick={() => setPromoDate(undefined)}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Effective plan summary */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Effective Plan</p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground">{planCatalog[effectivePlan].name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {isGrandfathered ? '(Founding Member)' :
                       adminOverridePlan !== 'none' ? '(Admin Override)' :
                       promoDate && new Date(promoDate) > new Date() ? '(Promo)' :
                       '(Subscription)'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="flex-1" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save Changes
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Access Changes</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will update {selectedUser.display_name || selectedUser.name}'s access to <strong>{planCatalog[effectivePlan].name}</strong>.
                          {isGrandfathered && ' They will be marked as a Founding Member with full access.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSave}>Confirm</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {override && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" disabled={saving}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove All Overrides?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove all access overrides for this user. They will revert to the default Free plan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRemoveOverride}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedUserId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Search for a user above to manage their access controls</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
