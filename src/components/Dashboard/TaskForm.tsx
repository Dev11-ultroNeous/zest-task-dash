import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Tag, Clock, Bell, Plus, Trash2, User } from 'lucide-react';
import { format, addDays, addHours, setHours, setMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Task, Priority, Reminder } from '@/types/task';
import { useTaskStore } from '@/store/taskStore';
import { useTasks } from '@/hooks/useTasks';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingTask?: Task | null;
}

type ReminderType = 'on-due' | '1-day-before' | '1-hour-before' | 'custom';

interface ReminderConfig {
  type: ReminderType;
  customDate?: Date;
  customTime?: string;
}

export function TaskForm({ isOpen, onClose, editingTask }: TaskFormProps) {
  const { categories } = useTaskStore();
  const { addTask, updateTask } = useTasks();
  const { canAssignTasks, getDevelopers, teamMembers } = useRoles();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState<string>('09:00');
  const [category, setCategory] = useState('Work');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [reminderConfigs, setReminderConfigs] = useState<ReminderConfig[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string>('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setPriority(editingTask.priority);
      const taskDueDate = editingTask.dueDate ? new Date(editingTask.dueDate) : undefined;
      setDueDate(taskDueDate);
      if (taskDueDate) {
        setDueTime(format(taskDueDate, 'HH:mm'));
      }
      setCategory(editingTask.category);
      setEstimatedMinutes(editingTask.estimatedMinutes?.toString() || '');
      setTagsInput(editingTask.tags.join(', '));
      setAssignedTo(editingTask.assignedTo || '');
      // Convert existing reminders to configs
      const configs: ReminderConfig[] = editingTask.reminders.map(r => ({
        type: r.type,
        customDate: r.type === 'custom' ? new Date(r.time) : undefined,
        customTime: r.type === 'custom' ? format(new Date(r.time), 'HH:mm') : undefined,
      }));
      setReminderConfigs(configs);
    } else {
      resetForm();
    }
  }, [editingTask, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate(undefined);
    setDueTime('09:00');
    setCategory('Work');
    setEstimatedMinutes('');
    setTagsInput('');
    setReminderConfigs([]);
    setAssignedTo('');
  };

  const addReminder = () => {
    setReminderConfigs([...reminderConfigs, { type: '1-hour-before' }]);
  };

  const removeReminder = (index: number) => {
    setReminderConfigs(reminderConfigs.filter((_, i) => i !== index));
  };

  const updateReminderType = (index: number, type: ReminderType) => {
    const updated = [...reminderConfigs];
    updated[index] = { 
      ...updated[index], 
      type,
      customDate: type === 'custom' ? new Date() : undefined,
      customTime: type === 'custom' ? '09:00' : undefined,
    };
    setReminderConfigs(updated);
  };

  const updateReminderCustomDate = (index: number, date: Date | undefined) => {
    const updated = [...reminderConfigs];
    updated[index] = { ...updated[index], customDate: date };
    setReminderConfigs(updated);
  };

  const updateReminderCustomTime = (index: number, time: string) => {
    const updated = [...reminderConfigs];
    updated[index] = { ...updated[index], customTime: time };
    setReminderConfigs(updated);
  };

  const buildReminders = (taskId: string, finalDueDate: Date | null): Reminder[] => {
    if (!finalDueDate) return [];

    return reminderConfigs.map(config => {
      let reminderTime: Date;

      switch (config.type) {
        case 'on-due':
          reminderTime = new Date(finalDueDate);
          break;
        case '1-day-before':
          reminderTime = addDays(finalDueDate, -1);
          break;
        case '1-hour-before':
          reminderTime = addHours(finalDueDate, -1);
          break;
        case 'custom':
          if (config.customDate && config.customTime) {
            const [hours, minutes] = config.customTime.split(':').map(Number);
            reminderTime = setMinutes(setHours(new Date(config.customDate), hours), minutes);
          } else {
            reminderTime = new Date(finalDueDate);
          }
          break;
        default:
          reminderTime = new Date(finalDueDate);
      }

      return {
        id: uuidv4(),
        taskId,
        time: reminderTime,
        type: config.type,
        triggered: false,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // Combine date and time
    let finalDueDate: Date | null = null;
    if (dueDate) {
      const [hours, minutes] = dueTime.split(':').map(Number);
      finalDueDate = setMinutes(setHours(new Date(dueDate), hours), minutes);
    }

    const taskId = editingTask?.id || uuidv4();
    const reminders = buildReminders(taskId, finalDueDate);

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: finalDueDate,
      category,
      tags,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
      reminders,
      assignedTo: assignedTo || null,
    };

    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        await addTask(taskData);
      }

      onClose();
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions: { value: Priority; label: string; className: string }[] = [
    { value: 'high', label: 'High', className: 'priority-high' },
    { value: 'medium', label: 'Medium', className: 'priority-medium' },
    { value: 'low', label: 'Low', className: 'priority-low' },
  ];

  const reminderTypeLabels: Record<ReminderType, string> = {
    'on-due': 'At due time',
    '1-day-before': '1 day before',
    '1-hour-before': '1 hour before',
    'custom': 'Custom date/time',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                <h2 className="text-lg font-semibold text-foreground">
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="bg-secondary border-0"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add more details..."
                    className="bg-secondary border-0 resize-none"
                    rows={3}
                  />
                </div>

                {/* Priority & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <div className="flex gap-2">
                      {priorityOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPriority(option.value)}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                            priority === option.value
                              ? option.className
                              : "bg-secondary text-muted-foreground border-transparent hover:bg-accent"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-secondary border-0">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Due Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-secondary border-0",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueTime">Due Time</Label>
                    <Input
                      id="dueTime"
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>

                {/* Assign To (for managers/team leaders) */}
                {canAssignTasks && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Assign To
                    </Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger className="bg-secondary border-0">
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <span>{member.displayName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({member.role?.replace('_', ' ') || 'no role'})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Estimated Time */}
                <div className="space-y-2">
                  <Label htmlFor="estimated">Estimated Time (min)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="estimated"
                      type="number"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(e.target.value)}
                      placeholder="30"
                      className="bg-secondary border-0 pl-10"
                      min="1"
                    />
                  </div>
                </div>

                {/* Reminders Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      Reminders
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addReminder}
                      className="gap-1 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Add Reminder
                    </Button>
                  </div>

                  {reminderConfigs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2 bg-secondary rounded-lg">
                      No reminders set. Click "Add Reminder" to create one.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reminderConfigs.map((config, index) => (
                        <div key={index} className="bg-secondary rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Select
                              value={config.type}
                              onValueChange={(value: ReminderType) => updateReminderType(index, value)}
                            >
                              <SelectTrigger className="flex-1 bg-background border-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(reminderTypeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeReminder(index)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {config.type === 'custom' && (
                            <div className="grid grid-cols-2 gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal bg-background border-0 text-xs",
                                      !config.customDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {config.customDate ? format(config.customDate, 'PP') : 'Date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={config.customDate}
                                    onSelect={(date) => updateReminderCustomDate(index, date)}
                                    initialFocus
                                    className="pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                              <Input
                                type="time"
                                value={config.customTime || '09:00'}
                                onChange={(e) => updateReminderCustomTime(index, e.target.value)}
                                className="bg-background border-0 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="work, urgent, Q1 (comma separated)"
                      className="bg-secondary border-0 pl-10"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 btn-gradient"
                    disabled={!title.trim()}
                  >
                    {editingTask ? 'Save Changes' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
