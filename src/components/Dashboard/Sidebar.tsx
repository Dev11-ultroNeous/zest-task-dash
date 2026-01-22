import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  BarChart3, 
  Settings, 
  Tag,
  Briefcase,
  User,
  Heart,
  BookOpen,
  ChevronLeft,
  Plus,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/taskStore';
import { useRoles } from '@/hooks/useRoles';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase,
  User,
  Heart,
  BookOpen,
};

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'tasks', icon: CheckSquare, label: 'All Tasks' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
];

export function Sidebar({ activeView, onViewChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { categories, filters, setFilters } = useTaskStore();
  const { canManageRoles } = useRoles();
  const navigate = useNavigate();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col relative"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center flex-shrink-0">
          <CheckSquare className="w-5 h-5 text-primary-foreground" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-semibold text-lg text-sidebar-foreground"
          >
            TaskFlow
          </motion.div>
        )}
      </div>

      {/* Collapse button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors z-10"
      >
        <ChevronLeft className={cn("w-4 h-4 text-muted-foreground transition-transform", isCollapsed && "rotate-180")} />
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              activeView === item.id
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", activeView === item.id && "text-sidebar-primary")} />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}

        {/* Categories */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-6"
          >
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categories
              </span>
              <button className="p-1 hover:bg-sidebar-accent rounded transition-colors">
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setFilters({ category: 'all' })}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                  filters.category === 'all'
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Tag className="w-4 h-4" />
                <span className="text-sm">All Categories</span>
              </button>
              {categories.map((category) => {
                const IconComponent = iconMap[category.icon] || Tag;
                return (
                  <button
                    key={category.id}
                    onClick={() => setFilters({ category: category.name })}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                      filters.category === category.name
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent className="w-3 h-3" style={{ color: category.color }} />
                    </div>
                    <span className="text-sm">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Team Management - Only for managers */}
        {canManageRoles && (
          <button
            onClick={() => navigate('/team')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
          >
            <Users className="w-5 h-5" />
            {!isCollapsed && <span className="text-sm font-medium">Team</span>}
          </button>
        )}
        
        {/* Settings */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
        >
          <Settings className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
        </button>
      </div>
    </motion.aside>
  );
}
