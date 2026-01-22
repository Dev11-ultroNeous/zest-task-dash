import { motion } from 'framer-motion';
import { Search, Bell, Sun, Moon, Plus, LogOut, Shield, Users, Code } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/taskStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onAddTask: () => void;
  notificationPermission?: NotificationPermission;
  onRequestNotificationPermission?: () => Promise<boolean>;
}

export function Header({ onAddTask }: HeaderProps) {
  const { isDarkMode, toggleDarkMode, filters, setFilters, getOverdueTasks, getTasksDueToday } = useTaskStore();
  const { user, signOut } = useAuth();
  const { userRole, canCreateTasks } = useRoles();
  const navigate = useNavigate();
  const overdueTasks = getOverdueTasks();
  const todayTasks = getTasksDueToday();
  const notificationCount = overdueTasks.length + todayTasks.length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';

  const getRoleIcon = () => {
    switch (userRole) {
      case 'manager':
        return <Shield className="w-3 h-3" />;
      case 'team_leader':
        return <Users className="w-3 h-3" />;
      case 'developer':
        return <Code className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (): "default" | "secondary" | "outline" | "destructive" => {
    switch (userRole) {
      case 'manager':
        return 'default';
      case 'team_leader':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return '';
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="pl-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Only show New Task button for managers/team leaders */}
        {canCreateTasks && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={onAddTask}
              className="btn-gradient gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Task</span>
            </Button>
          </motion.div>
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* Avatar with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 space-y-1">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              {userRole && (
                <Badge variant={getRoleBadgeVariant()} className="gap-1 text-xs">
                  {getRoleIcon()}
                  {formatRole(userRole)}
                </Badge>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
