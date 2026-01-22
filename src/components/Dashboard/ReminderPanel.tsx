import { motion } from 'framer-motion';
import { format, isToday, isPast, isValid } from 'date-fns';
import { Bell, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';
import { Task } from '@/types/task';

interface ReminderPanelProps {
  onTaskClick: (task: Task) => void;
}

export function ReminderPanel({ onTaskClick }: ReminderPanelProps) {
  const { getTasksDueToday, getOverdueTasks, tasks } = useTaskStore();
  
  const todayTasks = getTasksDueToday();
  const overdueTasks = getOverdueTasks();
  
  // Get upcoming tasks (next 7 days, not today)
  const upcomingTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false;
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate > today && dueDate <= weekFromNow && !isToday(dueDate);
  }).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">Overdue</h3>
              <p className="text-xs text-muted-foreground">{overdueTasks.length} tasks need attention</p>
            </div>
          </div>
          <div className="space-y-2">
            {overdueTasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                <p className="text-xs text-destructive">
                  Due {task.dueDate && isValid(new Date(task.dueDate)) ? format(new Date(task.dueDate), 'MMM d') : 'Unknown'}
                </p>
              </button>
            ))}
            {overdueTasks.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{overdueTasks.length - 3} more overdue
              </p>
            )}
          </div>
        </div>
      )}

      {/* Due Today */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm">Due Today</h3>
            <p className="text-xs text-muted-foreground">
              {todayTasks.length === 0 ? 'No tasks due' : `${todayTasks.length} tasks`}
            </p>
          </div>
        </div>
        {todayTasks.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All caught up for today!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.slice(0, 4).map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    task.priority === 'high' ? 'bg-priority-high' :
                    task.priority === 'medium' ? 'bg-priority-medium' : 'bg-priority-low'
                  )} />
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm">Coming Up</h3>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </div>
        </div>
        {upcomingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming tasks
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.dueDate && isValid(new Date(task.dueDate)) ? format(new Date(task.dueDate), 'EEEE, MMM d') : 'No date'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
