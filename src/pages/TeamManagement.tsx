import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Code, 
  Mail, 
  Lock,
  Loader2,
  MoreVertical,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRoles, AppRole, TeamMember } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Dashboard/Sidebar';
import { Header } from '@/components/Dashboard/Header';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function TeamManagement() {
  const [activeView, setActiveView] = useState('team');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('developer');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    userRole, 
    canManageRoles, 
    assignRole,
    isLoading: rolesLoading 
  } = useRoles();

  // Fetch all team members
  const fetchAllMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]) || []);
      
      const members: TeamMember[] = (profiles || []).map(p => ({
        id: p.id,
        email: p.email || '',
        displayName: p.display_name || p.email?.split('@')[0] || 'Unknown',
        role: roleMap.get(p.id) || 'developer',
      }));

      setAllMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (canManageRoles) {
      fetchAllMembers();
    }
  }, [canManageRoles]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Create user via Supabase Auth admin functions
      // Note: This requires service role key in an edge function for production
      // For now, we'll use the regular signUp and then update the role
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: 'Error creating user',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        // Wait a moment for the trigger to create the profile and default role
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Now assign the selected role
        if (selectedRole !== 'developer') {
          await assignRole(data.user.id, selectedRole);
        }

        toast({
          title: 'User created successfully',
          description: `${email} has been added as ${selectedRole.replace('_', ' ')}`,
        });

        setIsAddUserOpen(false);
        setEmail('');
        setPassword('');
        setSelectedRole('developer');
        fetchAllMembers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    const success = await assignRole(userId, newRole);
    if (success) {
      fetchAllMembers();
    }
  };

  const getRoleIcon = (role: AppRole | null) => {
    switch (role) {
      case 'manager':
        return <Shield className="w-4 h-4" />;
      case 'team_leader':
        return <Users className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };

  const getRoleBadgeVariant = (role: AppRole | null): "default" | "secondary" | "outline" => {
    switch (role) {
      case 'manager':
        return 'default';
      case 'team_leader':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return 'Developer';
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (rolesLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageRoles) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              Only managers can access team management. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onAddTask={() => {}} 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
                <p className="text-muted-foreground">Manage your team members and their roles</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchAllMembers}
                  disabled={loadingMembers}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMembers ? 'animate-spin' : ''}`} />
                </Button>
                <Button onClick={() => setIsAddUserOpen(true)} className="btn-gradient gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Team Member
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Members</CardDescription>
                  <CardTitle className="text-3xl">{allMembers.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Managers</CardDescription>
                  <CardTitle className="text-3xl">
                    {allMembers.filter(m => m.role === 'manager').length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Developers</CardDescription>
                  <CardTitle className="text-3xl">
                    {allMembers.filter(m => m.role === 'developer').length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Team Members Table */}
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  View and manage all team members and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.displayName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                              {getRoleIcon(member.role)}
                              {formatRole(member.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {member.id !== user?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member.id, 'manager')}
                                    disabled={member.role === 'manager'}
                                  >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Make Manager
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member.id, 'team_leader')}
                                    disabled={member.role === 'team_leader'}
                                  >
                                    <Users className="w-4 h-4 mr-2" />
                                    Make Team Leader
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member.id, 'developer')}
                                    disabled={member.role === 'developer'}
                                  >
                                    <Code className="w-4 h-4 mr-2" />
                                    Make Developer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new account for a team member. They will receive their login credentials.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-email"
                  type="email"
                  placeholder="team.member@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                  disabled={loading}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Developer
                    </div>
                  </SelectItem>
                  <SelectItem value="team_leader">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team Leader
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Manager
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUserOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
