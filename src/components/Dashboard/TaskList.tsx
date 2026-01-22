import { motion, AnimatePresence } from 'framer-motion';
import { ListFilter, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { TaskCard } from './TaskCard';
import { Task, FilterPriority, FilterStatus, SortBy, SortOrder } from '@/types/task';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskListProps {
  onEditTask: (task: Task) => void;
}

export function TaskList({ onEditTask }: TaskListProps) {
  const { getFilteredTasks, filters, setFilters } = useTaskStore();
  const tasks = getFilteredTasks();
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Tasks
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({pendingTasks.length} pending, {completedTasks.length} completed)
          </span>
        </h2>

        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ListFilter className="w-4 h-4" />
                {filters.priority === 'all' ? 'All Priorities' : filters.priority}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['all', 'high', 'medium', 'low'] as FilterPriority[]).map((priority) => (
                <DropdownMenuItem
                  key={priority}
                  onClick={() => setFilters({ priority })}
                  className={filters.priority === priority ? 'bg-accent' : ''}
                >
                  {priority === 'all' ? 'All Priorities' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {filters.status === 'all' ? 'All Status' : filters.status}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['all', 'pending', 'completed'] as FilterStatus[]).map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => setFilters({ status })}
                  className={filters.status === status ? 'bg-accent' : ''}
                >
                  {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="w-4 h-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {([
                { value: 'dueDate', label: 'Due Date' },
                { value: 'priority', label: 'Priority' },
                { value: 'createdAt', label: 'Created Date' },
                { value: 'title', label: 'Title' },
              ] as { value: SortBy; label: string }[]).map((sort) => (
                <DropdownMenuItem
                  key={sort.value}
                  onClick={() => setFilters({ sortBy: sort.value })}
                  className={filters.sortBy === sort.value ? 'bg-accent' : ''}
                >
                  {sort.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              >
                {filters.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">No tasks found</h3>
          <p className="text-sm text-muted-foreground">
            {filters.search
              ? 'Try adjusting your search or filters'
              : 'Create your first task to get started'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={onEditTask} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
