import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { useTaskStore } from '@/store/taskStore';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

export function AnalyticsView() {
  const { tasks, categories } = useTaskStore();

  // Tasks by priority
  const priorityData = [
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: 'hsl(0, 84%, 60%)' },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: 'hsl(38, 92%, 50%)' },
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: 'hsl(142, 76%, 36%)' },
  ];

  // Tasks by status
  const statusData = [
    { name: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: 'hsl(243, 75%, 59%)' },
    { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'hsl(142, 76%, 36%)' },
  ];

  // Tasks by category
  const categoryData = categories.map(cat => ({
    name: cat.name,
    tasks: tasks.filter(t => t.category === cat.name).length,
    completed: tasks.filter(t => t.category === cat.name && t.status === 'completed').length,
    color: cat.color,
  }));

  // Last 7 days completion trend
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });

  const trendData = last7Days.map(day => {
    const dayStart = startOfDay(day);
    const completed = tasks.filter(t => {
      if (!t.completedAt) return false;
      const completedDate = startOfDay(new Date(t.completedAt));
      return completedDate.getTime() === dayStart.getTime();
    }).length;
    
    const created = tasks.filter(t => {
      const createdDate = startOfDay(new Date(t.createdAt));
      return createdDate.getTime() === dayStart.getTime();
    }).length;

    return {
      date: format(day, 'EEE'),
      completed,
      created,
    };
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <h2 className="text-xl font-semibold text-foreground">Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Trend */}
        <motion.div variants={item} className="card-elevated p-5">
          <h3 className="font-medium text-foreground mb-4">Weekly Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="hsl(243, 75%, 59%)"
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                  name="Created"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(142, 76%, 36%)"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tasks by Priority */}
        <motion.div variants={item} className="card-elevated p-5">
          <h3 className="font-medium text-foreground mb-4">Tasks by Priority</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tasks by Category */}
        <motion.div variants={item} className="card-elevated p-5">
          <h3 className="font-medium text-foreground mb-4">Tasks by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="tasks" name="Total" fill="hsl(243, 75%, 59%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="completed" name="Completed" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Task Status Distribution */}
        <motion.div variants={item} className="card-elevated p-5">
          <h3 className="font-medium text-foreground mb-4">Task Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
