import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function SummaryCards() {
  const { tasks, getTasksDueToday, getOverdueTasks, getCompletionRate, getCompletedTasksThisWeek } = useTaskStore();
  
  const activeTasks = tasks.filter(t => t.status === 'pending').length;
  const dueToday = getTasksDueToday().length;
  const overdue = getOverdueTasks().length;
  const completionRate = getCompletionRate();
  const completedThisWeek = getCompletedTasksThisWeek().length;

  const cards = [
    {
      title: 'Active Tasks',
      value: activeTasks,
      subtitle: `${completedThisWeek} completed this week`,
      icon: CheckCircle2,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Due Today',
      value: dueToday,
      subtitle: 'Tasks need attention',
      icon: Clock,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      title: 'Overdue',
      value: overdue,
      subtitle: overdue > 0 ? 'Needs immediate action' : 'All caught up!',
      icon: AlertTriangle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      subtitle: 'Overall productivity',
      icon: TrendingUp,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {cards.map((card) => (
        <motion.div
          key={card.title}
          variants={item}
          className="card-elevated p-5 hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              <p className="text-3xl font-bold mt-1 text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
