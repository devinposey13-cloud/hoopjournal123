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
import { Users, Flag, BarChart3, Trash2, Edit2, Key, Loader2, Search, Check, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

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

export function AdminPanel() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

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
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  // Filter users by search
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Update user name
  async function handleUpdateUserName() {
    if (!editingUser || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from('player_settings')
        .update({ name: editName.trim() })
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === editingUser.id ? { ...u, name: editName.trim() } : u
      ));
      toast.success('User name updated');
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user name');
    }
  }

  // Delete user profile
  async function handleDeleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user profile? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('player_settings')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User profile deleted');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user profile');
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

  // Stats
  const pendingReports = reports.filter(r => r.status === 'pending').length;
  const totalUsers = users.length;
  const publicProfiles = users.filter(u => u.is_profile_public).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Public Profiles</CardDescription>
            <CardTitle className="text-3xl">{publicProfiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Reports</CardDescription>
            <CardTitle className="text-3xl text-destructive">{pendingReports}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reports</CardDescription>
            <CardTitle className="text-3xl">{reports.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Flag className="w-4 h-4" />
            Content Reports
            {pendingReports > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingReports}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Metrics
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
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

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Team</th>
                  <th className="text-left p-3 font-medium">Grade</th>
                  <th className="text-left p-3 font-medium">Public</th>
                  <th className="text-left p-3 font-medium">Joined</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        {user.display_name && (
                          <div className="text-xs text-muted-foreground">@{user.display_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{user.team}</td>
                    <td className="p-3 text-muted-foreground">{user.grade}</td>
                    <td className="p-3">
                      {user.is_profile_public ? (
                        <Badge variant="secondary">Public</Badge>
                      ) : (
                        <Badge variant="outline">Private</Badge>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">
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
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User Name</DialogTitle>
                              <DialogDescription>
                                Update the display name for this user.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleUpdateUserName}>
                                Save Changes
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
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Users by join date</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    users.reduce((acc, user) => {
                      const month = format(new Date(user.created_at), 'MMM yyyy');
                      acc[month] = (acc[month] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).slice(-6).map(([month, count]) => (
                    <div key={month} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{month}</span>
                      <span className="font-medium">{count} users</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Users by grade level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    users.reduce((acc, user) => {
                      acc[user.grade] = (acc[user.grade] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).map(([grade, count]) => (
                    <div key={grade} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{grade}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Position Distribution</CardTitle>
                <CardDescription>Users by position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    users.reduce((acc, user) => {
                      acc[user.position] = (acc[user.position] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).map(([position, count]) => (
                    <div key={position} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{position}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
