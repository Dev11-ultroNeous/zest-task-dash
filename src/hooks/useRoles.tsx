import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type AppRole = 'manager' | 'team_leader' | 'developer';

export interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: AppRole | null;
}

export function useRoles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user can create/assign tasks
  const canCreateTasks = userRole === 'manager' || userRole === 'team_leader';
  const canAssignTasks = userRole === 'manager' || userRole === 'team_leader';
  const canDeleteTasks = userRole === 'manager';
  const canManageRoles = userRole === 'manager';
  const isDeveloper = userRole === 'developer';

  // Fetch current user's role
  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // No role found - might be a new user, they'll get developer by default
        console.log('No role found for user, using default');
        setUserRole('developer');
      } else {
        setUserRole(data.role as AppRole);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('developer');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch team members (for assignment dropdown)
  const fetchTeamMembers = useCallback(async () => {
    if (!user || !canAssignTasks) {
      setTeamMembers([]);
      return;
    }

    try {
      // Get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map roles to profiles
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]) || []);
      
      const members: TeamMember[] = (profiles || []).map(p => ({
        id: p.id,
        email: p.email || '',
        displayName: p.display_name || p.email?.split('@')[0] || 'Unknown',
        role: roleMap.get(p.id) || null,
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [user, canAssignTasks]);

  // Assign role to a user (managers only)
  const assignRole = useCallback(async (userId: string, role: AppRole) => {
    if (!user || !canManageRoles) {
      toast({
        title: 'Permission denied',
        description: 'Only managers can assign roles',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Check if user already has a role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (error) throw error;
      }

      toast({
        title: 'Role assigned',
        description: `User role updated to ${role.replace('_', ' ')}`,
      });

      // Refresh team members
      fetchTeamMembers();
      return true;
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: 'Error assigning role',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [user, canManageRoles, toast, fetchTeamMembers]);

  // Get developers for task assignment
  const getDevelopers = useCallback(() => {
    return teamMembers.filter(m => m.role === 'developer');
  }, [teamMembers]);

  // Initialize
  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  useEffect(() => {
    if (canAssignTasks) {
      fetchTeamMembers();
    }
  }, [canAssignTasks, fetchTeamMembers]);

  return {
    userRole,
    isLoading,
    canCreateTasks,
    canAssignTasks,
    canDeleteTasks,
    canManageRoles,
    isDeveloper,
    teamMembers,
    getDevelopers,
    assignRole,
    fetchUserRole,
    fetchTeamMembers,
  };
}
