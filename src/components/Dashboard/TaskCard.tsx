import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isPast, isValid } from 'date-fns';
import { Calendar, Clock, Tag, MoreVertical, Trash2, Edit2, CheckCircle2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types/task';
import { useTasks } from '@/hooks/useTasks';
import { useRoles } from '@/hooks/useRoles';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const { toggleTaskStatus, deleteTask } = useTasks();
  const { canDeleteTasks, canCreateTasks } = useRoles();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleToggle = async () => {
    if (task.status === 'pending') {
      setIsCompleting(true);
      setShowConfetti(true);
      setTimeout(async () => {
        await toggleTaskStatus(task.id);
        setIsCompleting(false);
      }, 400);
      setTimeout(() => setShowConfetti(false), 600);
    } else {
      await toggleTaskStatus(task.id);
    }
  };

  const formatDueDate = (date: Date | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (!isValid(d)) return null;
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status === 'pending';
  const dueDateFormatted = formatDueDate(task.dueDate);

  const priorityStyles = {
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ y: -2 }}
      className={cn(
        "card-elevated p-4 group relative",
        task.status === 'completed' && "opacity-60"
      )}
    >
      {/* Confetti effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1.5 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-success/20 animate-confetti" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
            task.status === 'completed'
              ? "bg-success border-success"
              : "border-muted-foreground/30 hover:border-primary"
          )}
        >
          <AnimatePresence>
            {(task.status === 'completed' || isCompleting) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <CheckCircle2 className="w-3 h-3 text-success-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-medium text-foreground leading-tight",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h3>
            
            {/* Actions - only show edit for managers/team leaders */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {canCreateTasks && (
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDeleteTasks && (
                  <DropdownMenuItem
                    onClick={async () => await deleteTask(task.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {/* Priority */}
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", priorityStyles[task.priority])}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>

            {/* Category */}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {task.category}
            </span>

            {/* Assigned To */}
            {task.assignedToName && (
              <span className="text-xs text-primary flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assignedToName}
              </span>
            )}

            {/* Due date */}
            {dueDateFormatted && (
              <span className={cn(
                "text-xs flex items-center gap-1",
                isOverdue ? "text-destructive" : "text-muted-foreground"
              )}>
                <Calendar className="w-3 h-3" />
                {dueDateFormatted}
                {isOverdue && " (Overdue)"}
              </span>
            )}

            {/* Estimated time */}
            {task.estimatedMinutes && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}m
              </span>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-md bg-accent text-accent-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
